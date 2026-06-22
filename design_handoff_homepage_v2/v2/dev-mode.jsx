// Dev Mode — full-viewport terminal takeover

function DevMode({ onSwitchMode }) {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState([]);
  const [booted, setBooted] = React.useState(false);
  const bodyRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const seq = [
      { kind: 'boot', text: '[ OK ] Loading joye.sh (dev mode)' },
      { kind: 'boot', text: '[ OK ] Mounting /posts … 5 files' },
      { kind: 'boot', text: '[ OK ] Connecting agent@joye.sh …' },
      { kind: 'spacer' },
      { kind: 'neofetch' },
      { kind: 'spacer' },
      { kind: 'text', tone: 'muted', text: 'Type `help` to see commands. Press ` or Esc to return.' },
      { kind: 'spacer' },
    ];
    const timers = [];
    seq.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setOutput(o => [...o, item]);
        if (i === seq.length - 1) setBooted(true);
      }, 110 * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [output]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSwitchMode();
      if (e.key === '`' && !document.activeElement?.matches('input,textarea')) onSwitchMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSwitchMode]);

  const push = (lines) => setOutput(o => [...o, ...lines]);
  const run = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) { push([{ kind: 'echo', text: '' }]); return; }
    push([{ kind: 'echo', text: trimmed }]);
    const [name, ...args] = trimmed.split(/\s+/);
    switch (name) {
      case 'help':
        push([
          { kind: 'text', tone: 'muted', text: 'Available commands:' },
          { kind: 'kv', k: '  help',    v: 'show this message' },
          { kind: 'kv', k: '  whoami',  v: 'about Joye' },
          { kind: 'kv', k: '  ls',      v: 'list sections (posts | notes | projects | skills)' },
          { kind: 'kv', k: '  cat',     v: 'cat <slug> — read a post (mock)' },
          { kind: 'kv', k: '  chat',    v: 'chat <msg> — talk to my agent' },
          { kind: 'kv', k: '  connect', v: 'social + contact' },
          { kind: 'kv', k: '  theme',   v: 'toggle light / dark' },
          { kind: 'kv', k: '  exit',    v: 'return to the site (or press Esc)' },
          { kind: 'kv', k: '  clear',   v: 'clear screen' },
        ]); break;
      case 'whoami':
        push([
          { kind: 'text', text: `${PROFILE.name} — ${PROFILE.about.line1}` },
          { kind: 'text', tone: 'muted', text: `  location · ${PROFILE.location}` },
          { kind: 'text', tone: 'muted', text: '  school   · University of Melbourne · BSc Computing & Software · 2027' },
          { kind: 'text', tone: 'muted', text: '  working  · atypica @ Tezign · fAIshion.ai · AIXCut' },
          { kind: 'text', tone: 'muted', text: '  motto    · ' + PROFILE.motto },
        ]); break;
      case 'ls':
        if (!args[0] || args[0] === 'posts') {
          push([
            { kind: 'text', tone: 'muted', text: `posts/  —  ${RECENT_POSTS.length} entries` },
            ...RECENT_POSTS.map(p => ({ kind: 'post', ...p })),
          ]);
        } else if (args[0] === 'notes') {
          push([
            { kind: 'text', tone: 'muted', text: `notes/  —  ${RECENT_NOTES.length} entries` },
            ...RECENT_NOTES.map(n => ({ kind: 'kv', k: `  [${n.type}]`, v: n.title })),
          ]);
        } else if (args[0] === 'projects' || args[0] === 'repos') {
          push([
            { kind: 'text', tone: 'muted', text: 'open-source/' },
            ...OPEN_SOURCE.map(r => ({ kind: 'repo', ...r })),
          ]);
        } else if (args[0] === 'skills') {
          push(Object.entries(SKILLS).flatMap(([k, v]) => [
            { kind: 'kv', k: `  ${k}`, v: v.join('  ') },
          ]));
        } else {
          push([{ kind: 'text', tone: 'err', text: `ls: unknown target '${args[0]}'` }]);
        } break;
      case 'cat':
        if (!args[0]) { push([{ kind: 'text', tone: 'err', text: 'usage: cat <slug>' }]); break; }
        const post = RECENT_POSTS.find(p => p.slug === args[0] || p.slug.includes(args[0]));
        if (!post) { push([{ kind: 'text', tone: 'err', text: `no such post: ${args[0]}` }]); break; }
        push([
          { kind: 'text', tone: 'ok', text: `─── ${post.title}` },
          { kind: 'text', tone: 'muted', text: `   ${post.date}  ·  /blog/${post.slug}` },
          { kind: 'link', label: 'read on site', href: `/blog/${post.slug}` },
        ]); break;
      case 'chat':
        if (!args.length) {
          push([{ kind: 'text', tone: 'muted', text: 'usage: chat <question>' }]);
          break;
        }
        push([{ kind: 'agent-thinking' }]);
        setTimeout(() => {
          setOutput(o => {
            const copy = o.slice(0, -1);
            copy.push({ kind: 'agent', text: mockAgentReply(args.join(' ')) });
            return copy;
          });
        }, 900); break;
      case 'connect':
        push([
          { kind: 'link', label: 'github',   href: PROFILE.github },
          { kind: 'link', label: 'linkedin', href: PROFILE.linkedin },
          { kind: 'link', label: 'email',    href: `mailto:${PROFILE.email}` },
        ]); break;
      case 'theme':
        document.documentElement.classList.toggle('dark');
        push([{ kind: 'text', tone: 'ok', text: 'theme toggled.' }]);
        break;
      case 'exit': case 'quit': onSwitchMode(); break;
      case 'clear': setOutput([]); break;
      default:
        push([{ kind: 'text', tone: 'err', text: `command not found: ${name}` }]);
    }
  };

  return (
    <div onClick={() => inputRef.current?.focus()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'hsl(var(--background))',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 18px',
        borderBottom: '1px solid hsl(var(--border))',
        background: 'hsl(var(--term-chrome))',
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {['#ff6058','#ffbd2e','#28c93f'].map(c => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ color: 'hsl(var(--muted-foreground))' }}>guest@joye.sh · ~</div>
        <div style={{ flex: 1 }} />
        <button onClick={onSwitchMode} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: '1px solid hsl(var(--border))',
          borderRadius: 999, padding: '4px 12px', cursor: 'pointer',
          color: 'hsl(var(--foreground))', fontSize: 11,
          fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          <span>human mode</span>
          <kbd style={{
            background: 'hsl(var(--muted))', padding: '0 5px',
            borderRadius: 3, fontSize: 10, border: '1px solid hsl(var(--border))',
          }}>esc</kbd>
        </button>
      </div>

      <div ref={bodyRef} style={{
        flex: 1, overflowY: 'auto', padding: '20px 26px',
        fontSize: 13.5, lineHeight: 1.75,
      }}>
        {output.map((line, i) => <DevOutputLine key={i} line={line} />)}
        {booted && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, position: 'relative' }}>
            <DevPrompt />
            <span style={{ whiteSpace: 'pre' }}>{input}</span>
            <span style={{
              display: 'inline-block', width: 8, height: '1em',
              background: 'hsl(var(--primary))',
              animation: 'blink 1.1s steps(2) infinite',
            }} />
            <input ref={inputRef} value={input} autoFocus
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { run(input); setInput(''); } }}
              style={{ position: 'absolute', opacity: 0, left: -9999 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function DevPrompt() {
  return (
    <span style={{ color: 'hsl(var(--muted-foreground))' }}>
      <span style={{ color: 'hsl(var(--primary))' }}>guest</span>
      <span>@joye.sh</span>
      <span style={{ color: 'hsl(var(--primary))', margin: '0 6px 0 4px' }}>$</span>
    </span>
  );
}

function DevOutputLine({ line }) {
  if (!line) return null;
  const muted = 'hsl(var(--muted-foreground))';
  const primary = 'hsl(var(--primary))';
  const fg = 'hsl(var(--foreground))';
  const ok = 'hsl(var(--term-ok))';
  if (line.kind === 'spacer') return <div style={{ height: 8 }} />;
  if (line.kind === 'boot') {
    return (
      <div style={{ color: muted, fontSize: 12.5 }}>
        <span style={{ color: ok }}>{line.text.match(/^\[ OK \]/)?.[0]}</span>
        <span>{line.text.replace(/^\[ OK \]/, '')}</span>
      </div>
    );
  }
  if (line.kind === 'neofetch') return <Neofetch />;
  if (line.kind === 'echo') {
    return <div style={{ display: 'flex', gap: 8 }}><DevPrompt /><span>{line.text}</span></div>;
  }
  if (line.kind === 'text') {
    const color = line.tone === 'muted' ? muted :
                  line.tone === 'err' ? 'hsl(var(--destructive))' :
                  line.tone === 'ok' ? ok : fg;
    return <div style={{ color }}>{line.text}</div>;
  }
  if (line.kind === 'kv') {
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: primary, minWidth: 160 }}>{line.k}</span>
        <span style={{ color: muted, flex: 1, minWidth: 200 }}>{line.v}</span>
      </div>
    );
  }
  if (line.kind === 'post') {
    return (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ color: muted, minWidth: 92 }}>{line.date}</span>
        <a href={`/blog/${line.slug}`} style={{ color: primary, minWidth: 240 }}>{line.slug}</a>
        <span style={{ color: fg, flex: 1, minWidth: 200 }}>{line.title}</span>
      </div>
    );
  }
  if (line.kind === 'repo') {
    return (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <a href={`https://github.com/joyehuang/${line.name}`} target="_blank" style={{ color: primary, minWidth: 200 }}>{line.name}</a>
        <span style={{ color: muted, minWidth: 60 }}>★ {line.stars}</span>
        <span style={{ color: fg, flex: 1, minWidth: 200 }}>{line.description}</span>
      </div>
    );
  }
  if (line.kind === 'link') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ color: primary, minWidth: 100 }}>{line.label}</span>
        <a href={line.href} target="_blank" style={{ color: primary, textDecoration: 'underline' }}>{line.href}</a>
      </div>
    );
  }
  if (line.kind === 'agent-thinking') {
    return <div style={{ color: muted, fontStyle: 'italic' }}><span style={{ color: primary }}>agent ▸ </span><span className="agent-dots">thinking</span></div>;
  }
  if (line.kind === 'agent') {
    return (
      <div style={{
        margin: '6px 0 2px', padding: '10px 14px', borderRadius: 10,
        background: 'hsl(var(--muted))',
        border: '1px solid hsl(var(--border))',
        color: fg,
      }}>
        <span style={{ color: primary, fontWeight: 600 }}>agent ▸ </span>
        {line.text}
      </div>
    );
  }
  return null;
}

function mockAgentReply(q) {
  const lower = q.toLowerCase();
  if (lower.includes('building') || lower.includes('what')) {
    return 'Right now — atypica (multi-agent research at Tezign), a styling agent at fAIshion.ai, and a video-editing agent at AIXCut. All three share the same substrate: reliable tool-calling loops with durable memory.';
  }
  if (lower.includes('hire') || lower.includes('intern')) {
    return "I'm open to part-time / internship roles in AI agents, LLM apps, and full-stack. Email me: " + PROFILE.email;
  }
  if (lower.includes('stack') || lower.includes('tech')) {
    return 'TypeScript + Next.js + Astro for frontend. Python for research. Claude / OpenAI for model layer. Supabase, Vercel, Inngest for infra.';
  }
  return "Good question — I'll wire the real agent endpoint here soon. Meanwhile, `connect` to reach me directly.";
}

function Neofetch() {
  const rows = [
    ['OS',       'joye.sh 4.0.5 (astro-pure)'],
    ['Host',     `${PROFILE.name} · Melbourne, AU · AEDT`],
    ['Role',     PROFILE.about.line1],
    ['School',   'University of Melbourne · BSc Computing · Y2'],
    ['Works',    'atypica @ Tezign · fAIshion.ai · AIXCut'],
    ['Stack',    'TypeScript · React · Python · Claude'],
    ['Stars',    `${OPEN_SOURCE.reduce((a,r) => a + r.stars, 0)} across 2 OSS repos`],
    ['Contact',  PROFILE.email],
  ];
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
        <JoJo size="md" autoQuips quipPool="greet" />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: 'hsl(var(--muted-foreground))',
          marginLeft: 4, marginTop: 4, letterSpacing: 0.5,
        }}>jojo v0.1 · learning</div>
      </div>
      <div style={{ flex: 1, minWidth: 300 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'hsl(var(--primary))',
          paddingBottom: 4, marginBottom: 6,
          borderBottom: '1px dashed hsl(var(--border))',
          display: 'inline-block',
        }}>{PROFILE.name}@joye.sh</div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: 'hsl(var(--primary))', fontWeight: 500, minWidth: 90 }}>{k}</span>
            <span style={{ color: 'hsl(var(--foreground))', flex: 1, minWidth: 200 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DevMode });
