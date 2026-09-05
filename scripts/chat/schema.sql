-- Apply explicitly to an isolated PostgreSQL/Neon database. Never auto-migrate
-- from a page request. All state transitions below run in one transaction.
CREATE TABLE IF NOT EXISTS blog_chat_lock (id integer PRIMARY KEY CHECK(id=1));
INSERT INTO blog_chat_lock VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS blog_chat_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blog_chat_sessions (
 id uuid PRIMARY KEY, account_id uuid REFERENCES blog_chat_accounts ON DELETE CASCADE,
 used boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS blog_chat_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner uuid NOT NULL,
 title text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_chat_owner ON blog_chat_conversations(owner);
CREATE TABLE IF NOT EXISTS blog_chat_turns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES blog_chat_conversations ON DELETE CASCADE,
 owner uuid NOT NULL, session_id uuid NOT NULL, ip text NOT NULL,
 question text NOT NULL, answer text NOT NULL DEFAULT '', sources jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'pending', delivered boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz NOT NULL DEFAULT now()+interval '65 seconds',
 usage jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS blog_chat_turn_owner ON blog_chat_turns(owner, created_at);
CREATE TABLE IF NOT EXISTS blog_chat_otp (
 session_id uuid PRIMARY KEY REFERENCES blog_chat_sessions ON DELETE CASCADE,
 email text NOT NULL, digest text NOT NULL, expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0, sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blog_chat_limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE OR REPLACE FUNCTION blog_chat_limit(k text, maximum integer, seconds integer) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
 INSERT INTO blog_chat_limits VALUES(k,1,now()+make_interval(secs=>seconds))
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN blog_chat_limits.expires_at<=now() THEN 1 ELSE blog_chat_limits.count+1 END,
 expires_at=CASE WHEN blog_chat_limits.expires_at<=now() THEN now()+make_interval(secs=>seconds) ELSE blog_chat_limits.expires_at END
 RETURNING count INTO n;
 RETURN n<=maximum;
END $$;

CREATE OR REPLACE FUNCTION blog_chat_action(a text, sid uuid, p jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE s blog_chat_sessions; o uuid; c uuid; t blog_chat_turns; code blog_chat_otp; account uuid; result jsonb; request_ip text := p->>'ip';
BEGIN
 -- A short global row lock serializes quota/auth state, including new cookies.
 -- No external I/O happens while holding it. Appropriate for this bounded beta.
 PERFORM id FROM blog_chat_lock WHERE id=1 FOR UPDATE;
 DELETE FROM blog_chat_conversations WHERE updated_at<now()-interval '30 days';
 DELETE FROM blog_chat_conversations WHERE owner IN (SELECT id FROM blog_chat_sessions WHERE account_id IS NULL AND expires_at<now());
 DELETE FROM blog_chat_sessions WHERE expires_at<now();
 DELETE FROM blog_chat_otp WHERE expires_at<now();
 DELETE FROM blog_chat_limits WHERE expires_at<now();
 UPDATE blog_chat_turns SET status=CASE WHEN delivered THEN 'interrupted' ELSE 'failed' END WHERE status='pending' AND lease_until<now();
 IF a='session' THEN
   IF NOT blog_chat_limit('session:'||request_ip,40,3600) THEN RETURN '{"error":"rate_limited"}'; END IF;
   INSERT INTO blog_chat_sessions(id,expires_at) VALUES(sid,now()+interval '1 day') ON CONFLICT DO NOTHING;
 END IF;
 SELECT * INTO s FROM blog_chat_sessions WHERE id=sid AND expires_at>now();
 IF NOT FOUND THEN RETURN '{"error":"session_expired"}'; END IF;
 o:=coalesce(s.account_id,s.id);
 IF a IN ('session','status') THEN
   SELECT coalesce(jsonb_agg(x ORDER BY x.updated_at DESC),'[]') INTO result FROM (
     SELECT id,title,updated_at FROM blog_chat_conversations WHERE owner=o ORDER BY updated_at DESC LIMIT 30
   ) x;
   RETURN jsonb_build_object('authenticated',s.account_id IS NOT NULL,'used',s.used,'conversations',result);
 ELSIF a='load' THEN
   SELECT id INTO c FROM blog_chat_conversations WHERE id=(p->>'conversation')::uuid AND owner=o;
   IF c IS NULL THEN RETURN '{"error":"not_found"}'; END IF;
   SELECT coalesce(jsonb_agg(x ORDER BY x.created_at),'[]') INTO result FROM (
     SELECT id,question,answer,sources,status,created_at FROM blog_chat_turns WHERE conversation_id=c AND delivered ORDER BY created_at LIMIT 100
   ) x;
   RETURN jsonb_build_object('conversation',c,'turns',result);
 ELSIF a='reserve' THEN
   IF NOT blog_chat_limit('request:'||request_ip,30,3600) THEN RETURN '{"error":"rate_limited"}'; END IF;
   IF length(p->>'question') NOT BETWEEN 1 AND 2000 THEN RETURN '{"error":"invalid_question"}'; END IF;
   IF EXISTS(SELECT 1 FROM blog_chat_turns WHERE (owner=o OR ip=request_ip) AND status='pending') THEN RETURN '{"error":"busy"}'; END IF;
   IF s.account_id IS NULL AND (s.used OR EXISTS(SELECT 1 FROM blog_chat_limits WHERE key='free:'||request_ip)) THEN RETURN '{"error":"login_required"}'; END IF;
   IF (SELECT count(*) FROM blog_chat_turns WHERE status='pending')>=2 THEN RETURN '{"error":"busy"}'; END IF;
   -- Charge attempted upstream calls, even failed/empty calls, to budget protection.
   IF NOT blog_chat_limit('model:global',100,86400) OR NOT blog_chat_limit('model:ip:'||request_ip,10,86400)
      OR NOT blog_chat_limit('model:owner:'||o::text,20,86400) THEN RETURN '{"error":"budget_limited"}'; END IF;
   IF nullif(p->>'conversation','') IS NOT NULL THEN
     SELECT id INTO c FROM blog_chat_conversations WHERE id=(p->>'conversation')::uuid AND owner=o;
     IF c IS NULL THEN RETURN '{"error":"not_found"}'; END IF;
   ELSE
     INSERT INTO blog_chat_conversations(owner,title) VALUES(o,left(p->>'question',80)) RETURNING id INTO c;
   END IF;
   IF (SELECT count(*) FROM blog_chat_turns WHERE conversation_id=c AND delivered)>=100 THEN RETURN '{"error":"conversation_full"}'; END IF;
   INSERT INTO blog_chat_turns(conversation_id,owner,session_id,ip,question) VALUES(c,o,sid,request_ip,p->>'question') RETURNING * INTO t;
   SELECT coalesce(jsonb_agg(x ORDER BY x.created_at),'[]') INTO result FROM (
     SELECT question,left(answer,6000) AS answer,created_at FROM blog_chat_turns WHERE conversation_id=c AND delivered ORDER BY created_at DESC LIMIT 6
   ) x;
   RETURN jsonb_build_object('turn',t.id,'conversation',c,'history',result);
 ELSIF a IN ('mark','finish') THEN
   SELECT * INTO t FROM blog_chat_turns WHERE id=(p->>'turn')::uuid AND owner=o AND session_id=sid AND status='pending';
   IF NOT FOUND THEN RETURN '{"error":"not_found"}'; END IF;
   IF length(coalesce(p->>'answer',''))>0 THEN
     IF NOT t.delivered AND s.account_id IS NULL THEN
       UPDATE blog_chat_sessions SET used=true WHERE id=sid;
       PERFORM blog_chat_limit('free:'||t.ip,1,86400);
     END IF;
     UPDATE blog_chat_turns SET delivered=true,answer=left(p->>'answer',16000),sources=coalesce(p->'sources','[]') WHERE id=t.id;
   END IF;
   IF a='finish' THEN
     UPDATE blog_chat_turns SET status=CASE WHEN length(coalesce(p->>'answer',''))=0 THEN 'failed' WHEN p->>'status'='complete' THEN 'complete' ELSE 'interrupted' END,
       usage=coalesce(p->'usage','{}') WHERE id=t.id;
   END IF;
   UPDATE blog_chat_conversations SET updated_at=now() WHERE id=t.conversation_id;
   RETURN '{"ok":true}';
 ELSIF a='otp_send' THEN
   IF EXISTS(SELECT 1 FROM blog_chat_turns WHERE owner=o AND status='pending') THEN RETURN '{"error":"busy"}'; END IF;
   IF EXISTS(SELECT 1 FROM blog_chat_otp WHERE session_id=sid AND sent_at>now()-interval '60 seconds') THEN RETURN '{"error":"cooldown"}'; END IF;
   IF NOT blog_chat_limit('otp:session:'||sid::text,5,3600) OR NOT blog_chat_limit('otp:email:'||(p->>'emailHash'),3,3600)
     OR NOT blog_chat_limit('otp:ip:'||request_ip,10,86400) OR NOT blog_chat_limit('otp:global',30,86400) THEN RETURN '{"error":"rate_limited"}'; END IF;
   INSERT INTO blog_chat_otp(session_id,email,digest,expires_at) VALUES(sid,p->>'email',p->>'digest',now()+interval '10 minutes')
   ON CONFLICT(session_id) DO UPDATE SET email=excluded.email,digest=excluded.digest,expires_at=excluded.expires_at,attempts=0,sent_at=now();
   RETURN '{"ok":true}';
 ELSIF a='otp_verify' THEN
   IF NOT blog_chat_limit('verify:'||request_ip,20,3600) THEN RETURN '{"error":"rate_limited"}'; END IF;
   IF EXISTS(SELECT 1 FROM blog_chat_turns WHERE owner=o AND status='pending') THEN RETURN '{"error":"busy"}'; END IF;
   SELECT * INTO code FROM blog_chat_otp WHERE session_id=sid AND expires_at>now() AND attempts<5;
   IF NOT FOUND THEN RETURN '{"error":"invalid_code"}'; END IF;
   UPDATE blog_chat_otp SET attempts=attempts+1 WHERE session_id=sid;
   IF code.digest<>p->>'digest' OR code.email<>p->>'email' THEN RETURN '{"error":"invalid_code"}'; END IF;
   INSERT INTO blog_chat_accounts(email) VALUES(code.email) ON CONFLICT(email) DO UPDATE SET email=excluded.email RETURNING id INTO account;
   -- Authenticated switching must never move an existing account's conversations.
   IF s.account_id IS NULL THEN
     UPDATE blog_chat_conversations SET owner=account WHERE owner=sid;
     UPDATE blog_chat_turns SET owner=account WHERE owner=sid;
   END IF;
   INSERT INTO blog_chat_sessions(id,account_id,used,expires_at) VALUES((p->>'newSession')::uuid,account,true,now()+interval '30 days');
   DELETE FROM blog_chat_sessions WHERE id=sid;
   RETURN '{"ok":true}';
 ELSIF a IN ('delete_conversation','delete_account','logout') THEN
   IF EXISTS(SELECT 1 FROM blog_chat_turns WHERE owner=o AND status='pending') THEN RETURN '{"error":"busy"}'; END IF;
   IF a='delete_conversation' THEN
     DELETE FROM blog_chat_conversations WHERE id=(p->>'conversation')::uuid AND owner=o;
     IF NOT FOUND THEN RETURN '{"error":"not_found"}'; END IF;
   ELSIF a='delete_account' THEN
     DELETE FROM blog_chat_conversations WHERE owner=o;
     IF s.account_id IS NOT NULL THEN DELETE FROM blog_chat_accounts WHERE id=s.account_id;
     ELSE DELETE FROM blog_chat_sessions WHERE id=sid; END IF;
   ELSE
     IF s.account_id IS NULL THEN DELETE FROM blog_chat_conversations WHERE owner=sid; END IF;
     DELETE FROM blog_chat_sessions WHERE id=sid;
   END IF;
   RETURN '{"ok":true}';
 END IF;
 RETURN '{"error":"invalid_action"}';
END $$;
REVOKE ALL ON FUNCTION blog_chat_action(text,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION blog_chat_limit(text,integer,integer) FROM PUBLIC;
