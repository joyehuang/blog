// Human Mode — faithful 1:1 rebuild of blog/src/pages/index.astro

function Header({ onSwitchMode, onToggleTheme, theme, devModeAvailable }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0 12px', borderBottom: '1px solid hsl(var(--border))',
      position: 'relative', zIndex: 10, flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>
        <a href="/">Joye Personal Blog</a>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 14 }}>
        {NAV.map(n => (
          <a key={n.title} href={n.link} style={{ color: 'hsl(var(--muted-foreground))' }}>{n.title}</a>
        ))}
        <IconBtn label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </IconBtn>
        <IconBtn label="Toggle theme" onClick={onToggleTheme}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </IconBtn>
        {devModeAvailable && (
          <button onClick={onSwitchMode} title="Switch to developer mode (press `)" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: '1px solid hsl(var(--border))',
            borderRadius: 999, padding: '4px 10px', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))', fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#28c93f' }} />
            dev mode
            <kbd style={{
              background: 'hsl(var(--muted))', padding: '0 5px',
              borderRadius: 3, fontSize: 10, border: '1px solid hsl(var(--border))',
            }}>`</kbd>
          </button>
        )}
      </nav>
    </header>
  );
}

function IconBtn({ children, label, onClick }) {
  return (
    <button onClick={onClick} title={label} style={{
      background: 'transparent', border: 0, padding: 6, cursor: 'pointer',
      color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center',
    }}>{children}</button>
  );
}

function HeroSection() {
  return (
    <section id="content-header" className="animate" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 28, marginTop: 40, marginBottom: 40, position: 'relative', zIndex: 5,
    }}>
      <img src="assets/avatar.png" alt="" style={{
        height: 112, width: 112, borderRadius: '50%',
        border: '1px solid hsl(var(--border))', padding: 4,
        background: 'hsl(var(--card))',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>{PROFILE.name}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 28px', fontSize: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />
            </svg>
            {PROFILE.location}
          </span>
          <a href={PROFILE.github} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.7c-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 7.32c.85.004 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
            Source code
          </a>
        </div>
      </div>
      <a href={PROFILE.linkedin} target="_blank" style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        borderRadius: 999, border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))', padding: '8px 16px',
        fontSize: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            position: 'absolute', width: 8, height: 8, borderRadius: '50%',
            background: '#4ade80', opacity: 0.75, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
          }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
        </span>
        <span style={{ fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>Connect Me!</span>
      </a>
    </section>
  );
}

// ── Inline Terminal ──────────────────────────────────────────────────────────

function TerminalCollapsed({ onOpen, onEscalate }) {
  // One-line collapsed teaser matching the reference screenshot.
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 12.5, color: 'hsl(var(--muted-foreground))',
      }}>
        <span style={{ color: 'hsl(var(--primary))' }}>// power user?</span>
        <span>  Skip the scroll — try the interactive CLI. Type </span>
        <CmdChip>help</CmdChip><span> , </span>
        <CmdChip>chat</CmdChip><span> , or </span>
        <CmdChip>ls posts</CmdChip><span> .</span>
      </div>
      <button
        onClick={onOpen}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          width: '100%', padding: '10px 14px',
          borderRadius: 10, cursor: 'pointer',
          border: '1px solid ' + (hover ? 'hsl(var(--foreground) / 0.3)' : 'hsl(var(--border))'),
          background: 'hsl(var(--term-surface))',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13, color: 'hsl(var(--foreground))',
          transition: 'border-color 0.2s',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', gap: 6 }}>
          {['#ff6058','#ffbd2e','#28c93f'].map(c => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </span>
        <span style={{ color: 'hsl(var(--primary))', marginLeft: 6 }}>$</span>
        <span style={{ flex: 1, color: 'hsl(var(--foreground))' }}>
          chat hire-me
          <span style={{
            display: 'inline-block', width: 7, height: '1em',
            background: 'hsl(var(--primary))', verticalAlign: '-2px', marginLeft: 4,
            animation: 'blink 1.1s steps(2) infinite',
          }} />
        </span>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
          click or <kbd style={{
            background: 'hsl(var(--muted))', padding: '0 5px', borderRadius: 3,
            border: '1px solid hsl(var(--border))', fontSize: 10, margin: '0 2px',
          }}>`</kbd> to open
        </span>
      </button>
    </div>
  );
}

function CmdChip({ children }) {
  return (
    <code style={{
      display: 'inline-block', padding: '0 6px', borderRadius: 4,
      background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))',
      color: 'hsl(var(--foreground))', fontSize: 11.5,
    }}>{children}</code>
  );
}

function TerminalInline({ onEscalate }) {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState([
    { kind: 'banner' },
    { kind: 'text', tone: 'muted', text: 'Welcome. Type `help`, or press ` for fullscreen dev mode.' },
  ]);
  const inputRef = React.useRef(null);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [output]);

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
          { kind: 'text', text: '  help       show this message' },
          { kind: 'text', text: '  whoami     about Joye' },
          { kind: 'text', text: '  ls posts   recent posts' },
          { kind: 'text', text: '  chat <q>   talk to my agent (mock)' },
          { kind: 'text', text: '  connect    social links' },
          { kind: 'text', text: '  dev        open fullscreen dev mode' },
          { kind: 'text', text: '  clear      clear the screen' },
        ]); break;
      case 'whoami':
        push([
          { kind: 'text', text: `${PROFILE.name} · ${PROFILE.about.line1}` },
          { kind: 'text', tone: 'muted', text: '  ↳ University of Melbourne · CS, 2nd year' },
          { kind: 'text', tone: 'muted', text: '  ↳ atypica @ Tezign · fAIshion.ai · AIXCut' },
        ]); break;
      case 'ls':
        if (args[0] === 'posts' || !args[0]) {
          push([
            { kind: 'text', tone: 'muted', text: `recent ${Math.min(5, RECENT_POSTS.length)} posts:` },
            ...RECENT_POSTS.slice(0, 5).map(p => ({ kind: 'post', ...p })),
          ]);
        } else {
          push([{ kind: 'text', tone: 'err', text: `ls: unknown target '${args[0]}'` }]);
        } break;
      case 'chat':
        push([{ kind: 'agent', text: args.length
          ? 'Thinking about that — the real agent endpoint is still wiring up. Try `dev` for the full experience.'
          : 'Try `chat what are you building?`' }]); break;
      case 'connect':
        push([
          { kind: 'link', label: 'github',   href: 'https://github.com/joyehuang' },
          { kind: 'link', label: 'linkedin', href: PROFILE.linkedin },
          { kind: 'link', label: 'mail',     href: `mailto:${PROFILE.email}` },
        ]); break;
      case 'dev':
        onEscalate(); break;
      case 'clear':
        setOutput([]); break;
      default:
        push([{ kind: 'text', tone: 'err', text: `command not found: ${name} — try \`help\`` }]);
    }
  };

  return (
    <div onClick={() => inputRef.current?.focus()} style={{
      position: 'relative', borderRadius: 14,
      border: '1px solid hsl(var(--border))',
      background: 'hsl(var(--term-surface))',
      boxShadow: '0 24px 48px -28px rgba(0,0,0,0.28), 0 8px 24px -16px rgba(0,0,0,0.12)',
      overflow: 'hidden', fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      cursor: 'text',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', height: 36, padding: '0 14px',
        background: 'hsl(var(--term-chrome))',
        borderBottom: '1px solid hsl(var(--border))',
        fontSize: 11.5, color: 'hsl(var(--muted-foreground))',
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {['#ff6058','#ffbd2e','#28c93f'].map(c => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', letterSpacing: 0.5 }}>joye — shell</div>
        <div style={{ fontSize: 10.5, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <kbd style={{
            display: 'inline-block', padding: '0 5px', borderRadius: 3,
            border: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))',
            fontSize: 10,
          }}>`</kbd>
          <span>fullscreen</span>
        </div>
      </div>

      <div ref={bodyRef} style={{
        height: 340, maxHeight: '55vh', overflowY: 'auto',
        padding: '14px 18px', fontSize: 13, lineHeight: 1.7,
        color: 'hsl(var(--foreground))',
      }}>
        {output.map((line, i) => <OutputLine key={i} line={line} />)}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, position: 'relative' }}>
          <Prompt />
          <span style={{ whiteSpace: 'pre' }}>{input}</span>
          <span style={{
            display: 'inline-block', width: 7, height: '1em',
            background: 'hsl(var(--primary))', verticalAlign: 'middle',
            animation: 'blink 1.1s steps(2) infinite',
          }} />
          <input ref={inputRef} value={input} autoFocus
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { run(input); setInput(''); }
            }}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: -9999 }} />
        </div>
      </div>
    </div>
  );
}

function Prompt() {
  return (
    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
      <span style={{ color: 'hsl(var(--primary))' }}>guest</span>
      <span>@joye.sh</span>
      <span style={{ color: 'hsl(var(--primary))', margin: '0 6px 0 4px' }}>$</span>
    </span>
  );
}

function OutputLine({ line }) {
  if (!line) return null;
  const muted = 'hsl(var(--muted-foreground))';
  const primary = 'hsl(var(--primary))';
  const fg = 'hsl(var(--foreground))';
  const ok = 'hsl(var(--term-ok))';
  if (line.kind === 'banner') {
    return (
      <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px dashed hsl(var(--border))' }}>
        <div style={{ fontSize: 12.5, letterSpacing: 4, textTransform: 'uppercase', color: primary, fontWeight: 600 }}>
          joye.sh — interactive cli
        </div>
        <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
          // power user? skip the scroll.
        </div>
      </div>
    );
  }
  if (line.kind === 'echo') {
    return <div style={{ display: 'flex', gap: 8 }}><Prompt /><span>{line.text}</span></div>;
  }
  if (line.kind === 'text') {
    const color = line.tone === 'muted' ? muted : line.tone === 'err' ? 'hsl(var(--destructive))' : line.tone === 'ok' ? ok : fg;
    return <div style={{ color }}>{line.text}</div>;
  }
  if (line.kind === 'post') {
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: muted, minWidth: 90 }}>{line.date}</span>
        <a style={{ color: primary, minWidth: 220 }} href={`/blog/${line.slug}`}>{line.slug}</a>
        <span style={{ color: fg, flex: 1, minWidth: 200 }}>{line.title}</span>
      </div>
    );
  }
  if (line.kind === 'agent') {
    return <div><span style={{ color: primary }}>agent ▸ </span><span>{line.text}</span></div>;
  }
  if (line.kind === 'link') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ color: primary, minWidth: 90 }}>{line.label}</span>
        <a href={line.href} target="_blank" style={{ color: primary, textDecoration: 'underline' }}>{line.href}</a>
      </div>
    );
  }
  return null;
}

// ── Page sections ────────────────────────────────────────────────────────────

function SectionResponsive({ title, children }) {
  return (
    <section className="post-section">
      <div className="post-section-title"><h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h2></div>
      <div className="post-section-body">{children}</div>
      <style>{`
        .post-section { display: flex; flex-direction: column; gap: 20px; }
        .post-section-body { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 768px) {
          .post-section { flex-direction: row; gap: 0; }
          .post-section-title { min-width: 144px; }
        }
      `}</style>
    </section>
  );
}

function LinkCard({ heading, subheading, date, href, bullet }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href={href} target="_blank"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', borderRadius: 16,
        border: '1px solid ' + (hover ? 'hsl(var(--foreground) / 0.25)' : 'hsl(var(--border))'),
        background: 'hsl(var(--muted))', padding: '12px 20px', transition: 'all 0.2s',
        boxShadow: hover ? '0 2px 8px hsl(var(--foreground) / 0.05)' : 'none',
      }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{heading}</h3>
        {subheading && <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>{subheading}</p>}
        {date && <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>{date}</p>}
        {bullet && <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'hsl(var(--muted-foreground))', fontSize: 14 }}><li>{bullet}</li></ul>}
      </div>
    </a>
  );
}

function PostListItem({ post }) {
  return (
    <a href={`/blog/${post.slug}`} style={{
      display: 'flex', gap: 16, padding: '6px 0', fontSize: 15,
    }}>
      <span style={{ color: 'hsl(var(--muted-foreground))', minWidth: 90, fontSize: 13 }}>{post.date}</span>
      <span style={{ flex: 1 }}>{post.title}</span>
    </a>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
      border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))',
      fontSize: 13,
    }}>{children}</span>
  );
}

function SkillRow({ title, skills }) {
  return (
    <div className="skill-row">
      <h3 className="skill-title">{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
        {skills.map(s => <Pill key={s}>{s}</Pill>)}
      </div>
      <style>{`
        .skill-row { display: flex; flex-direction: column; gap: 8px; }
        .skill-title { margin: 0; font-size: 15px; font-weight: 500; }
        @media (min-width: 768px) {
          .skill-row { flex-direction: row; gap: 20px; align-items: center; }
          .skill-title { width: 20%; }
        }
      `}</style>
    </div>
  );
}

function HumanMode({ onSwitchMode, onToggleTheme, theme, showDevButton, terminalCollapsed }) {
  const [termOpen, setTermOpen] = React.useState(!terminalCollapsed);
  React.useEffect(() => { setTermOpen(!terminalCollapsed); }, [terminalCollapsed]);
  return (
    <div style={{
      maxWidth: 1120, width: '100%',
      padding: '0 16px', margin: '0 auto',
      position: 'relative', zIndex: 1,
    }}>
      <Header onSwitchMode={onSwitchMode} onToggleTheme={onToggleTheme} theme={theme} devModeAvailable={showDevButton} />
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <HeroSection />

        <div id="content" className="animate" style={{
          display: 'flex', flexDirection: 'column', gap: 40,
          width: '100%', maxWidth: '83.33%',
        }}>
          <div style={{ marginTop: -8 }}>
            {termOpen
              ? <TerminalInline onEscalate={onSwitchMode} />
              : <TerminalCollapsed onOpen={() => setTermOpen(true)} onEscalate={onSwitchMode} />}
          </div>

          <SectionResponsive title="About">
            <p style={{ color: 'hsl(var(--muted-foreground))', margin: 0, fontSize: 15 }}>{PROFILE.about.line1}</p>
            <p style={{ color: 'hsl(var(--muted-foreground))', margin: 0, fontSize: 15, lineHeight: 1.7 }}>{PROFILE.about.line2}</p>
            <a href="/about" style={{
              alignSelf: 'flex-end', marginTop: 6, fontSize: 14,
              color: 'hsl(var(--primary))',
            }}>More about me →</a>
          </SectionResponsive>

          <SectionResponsive title="Blog">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RECENT_POSTS.map(p => <li key={p.slug}><PostListItem post={p} /></li>)}
            </ul>
            <a href="/blog" style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 14, color: 'hsl(var(--primary))' }}>More blogs →</a>
          </SectionResponsive>

          <SectionResponsive title="Notes">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RECENT_NOTES.map((n, i) => (
                <li key={i} style={{
                  borderRadius: 16, border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))', padding: '10px 20px',
                  display: 'flex', alignItems: 'center', gap: 12, fontSize: 15,
                }}>
                  <span style={{ minWidth: 60, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{n.type}</span>
                  <span style={{ flex: 1 }}>{n.title}</span>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>→</span>
                </li>
              ))}
            </ul>
            <a href="/archive" style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 14, color: 'hsl(var(--primary))' }}>More notes →</a>
          </SectionResponsive>

          <SectionResponsive title="Experience">
            {EXPERIENCE.map(e => (
              <LinkCard key={e.heading} heading={e.heading} subheading={e.subheading} bullet={e.bullet} href="#" />
            ))}
          </SectionResponsive>

          <SectionResponsive title="Open Source">
            {OPEN_SOURCE.map(r => (
              <LinkCard key={r.name} heading={r.name} subheading={r.description} date={`⭐ ${r.stars}`} href={`https://github.com/joyehuang/${r.name}`} />
            ))}
          </SectionResponsive>

          <SectionResponsive title="Education">
            <div style={{
              borderRadius: 16, border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))', padding: '14px 20px',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>墨尔本大学</h3>
              <p style={{ margin: '4px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>理学学士 - 计算与软件工程</p>
              <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>2月 2024 - 6月 2027</p>
            </div>
          </SectionResponsive>

          <SectionResponsive title="Skills">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(SKILLS).map(([k, v]) => <SkillRow key={k} title={k} skills={v} />)}
            </div>
          </SectionResponsive>

          <footer style={{
            marginTop: 40, paddingTop: 20,
            borderTop: '1px solid hsl(var(--border))',
            color: 'hsl(var(--muted-foreground))', fontSize: 13,
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <span>© 2026 Joye · Built with Astro Pure</span>
            <span>“{PROFILE.motto}”</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { HumanMode });
