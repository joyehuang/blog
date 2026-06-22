// JoJo — joye.sh's ASCII mascot.
// Soft rounded-corner box, two dots for eyes, learns on idle.
// 7 lines tall. Breathes, blinks, peeks at cursor, speaks.

const JOJO_QUIPS_IDLE = [
  'learning...',
  'reading rust docs',
  'brewing coffee',
  '01101000 01101001',
  'thinking ✦',
  'sudo be-happy',
  'mounting /thoughts',
  '// TODO: learn haskell',
  'fetching joy...',
  'indexing melbourne',
];
const JOJO_QUIPS_GREET = [
  'hi! i\'m jojo',
  'welcome :)',
  'oh hey there',
  'you made it',
];
const JOJO_QUIPS_HOVER = [
  'ooh, interested?',
  'click it!',
  'that\'s a good one',
  'fan favorite',
];

// Eyes: ['●','●'] default. When blinking → ['‾','‾']. When looking → ['◕','◕'] / directional.
// Mouth: ' ᴗ ' default, ' o ' when speaking, ' - ' when thinking.

function JoJo({
  size = 'md',              // 'sm' | 'md'
  speak = null,             // string | null — force speech
  autoQuips = true,         // cycle idle quips
  quipPool = 'idle',        // 'idle' | 'greet' | 'hover'
  onClick = null,
  style = {},
  followCursor = true,
  accent = 'hsl(var(--primary))',
}) {
  const [eyes, setEyes] = React.useState(['●', '●']);
  const [mouth, setMouth] = React.useState('ᴗ');
  const [bubble, setBubble] = React.useState(speak);
  const [gaze, setGaze] = React.useState({ x: 0, y: 0 }); // -1..1
  const rootRef = React.useRef(null);

  // Breathing — pure CSS via className
  // Blink loop
  React.useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setEyes(['‾', '‾']);
      setTimeout(() => { if (alive) setEyes(e => renderEyes(gaze)); }, 140);
      const next = 2800 + Math.random() * 2600;
      setTimeout(tick, next);
    };
    const t = setTimeout(tick, 1500);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line
  }, []);

  // Follow cursor (gaze shift)
  React.useEffect(() => {
    if (!followCursor) return;
    const onMove = (e) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(400, window.innerWidth / 3);
      const dy = (e.clientY - cy) / Math.max(400, window.innerHeight / 3);
      const clampedX = Math.max(-1, Math.min(1, dx));
      const clampedY = Math.max(-1, Math.min(1, dy));
      setGaze({ x: clampedX, y: clampedY });
      setEyes(renderEyes({ x: clampedX, y: clampedY }));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [followCursor]);

  // Autoquips
  React.useEffect(() => {
    if (!autoQuips || speak) return;
    const pool = quipPool === 'greet' ? JOJO_QUIPS_GREET
      : quipPool === 'hover' ? JOJO_QUIPS_HOVER
      : JOJO_QUIPS_IDLE;
    let i = Math.floor(Math.random() * pool.length);
    let alive = true;
    const say = () => {
      if (!alive) return;
      setBubble(pool[i % pool.length]);
      setMouth('o');
      setTimeout(() => { if (alive) setMouth('ᴗ'); }, 400);
      setTimeout(() => { if (alive) setBubble(null); }, 3200);
      i++;
      setTimeout(say, 6000 + Math.random() * 4000);
    };
    const t = setTimeout(say, 1800);
    return () => { alive = false; clearTimeout(t); };
  }, [autoQuips, quipPool, speak]);

  React.useEffect(() => {
    if (speak) setBubble(speak);
  }, [speak]);

  const fontSize = size === 'sm' ? 12 : 14;
  const lineHeight = 1.15;

  // Compose the 7-line body. Eyes inserted as spans so we can update them.
  // Layout:
  //   ╭──────╮
  //   │ ● ● │
  //   │  ᴗ  │
  //   ╰─┬──┬─╯
  //     │  │
  //     ┴  ┴
  //
  // (learning indicator `... ` floats to the right of head)

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 8,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize,
        lineHeight,
        color: accent,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      <pre
        className="jojo-breathe"
        style={{ margin: 0, letterSpacing: 0.5, whiteSpace: 'pre' }}
      >
{'  ╭──────╮\n'}
{'  │ '}<span>{eyes[0]}</span>{'  '}<span>{eyes[1]}</span>{' │\n'}
{'  │  '}<span>{mouth}</span>{'   │\n'}
{'  ╰─┬──┬─╯\n'}
{'    │  │  \n'}
{'    ╵  ╵  \n'}
      </pre>

      {bubble && (
        <div
          className="jojo-bubble"
          style={{
            marginTop: 6,
            background: 'hsl(var(--card, 220 13% 12%))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            padding: '6px 10px',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: size === 'sm' ? 11 : 12,
            position: 'relative',
            maxWidth: 220,
            whiteSpace: 'nowrap',
            animation: 'jojo-bubble-in .25s ease-out both',
          }}
        >
          {bubble}
          <span style={{
            position: 'absolute',
            left: -5, top: 12,
            width: 8, height: 8,
            background: 'hsl(var(--card, 220 13% 12%))',
            borderLeft: '1px solid hsl(var(--border))',
            borderBottom: '1px solid hsl(var(--border))',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  );
}

// Given a gaze vector in [-1,1], pick an eye glyph that looks to one side.
function renderEyes({ x, y }) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ay > 0.55 && ay > ax) {
    return y < 0 ? ['⦿', '⦿'] : ['◉', '◉'];
  }
  if (ax > 0.3) {
    return x < 0 ? ['◖', '◖'] : ['◗', '◗'];
  }
  return ['●', '●'];
}

// Global stylesheet (breathing + bubble). Injects once.
(function injectJojoStyles() {
  if (document.getElementById('jojo-style')) return;
  const s = document.createElement('style');
  s.id = 'jojo-style';
  s.textContent = `
    @keyframes jojo-breathe {
      0%, 100% { transform: translateY(0) scaleY(1); }
      50% { transform: translateY(-1px) scaleY(1.015); }
    }
    .jojo-breathe {
      animation: jojo-breathe 3.2s ease-in-out infinite;
      transform-origin: 50% 100%;
    }
    @keyframes jojo-bubble-in {
      from { opacity: 0; transform: translateX(-4px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, { JoJo, JOJO_QUIPS_IDLE, JOJO_QUIPS_GREET, JOJO_QUIPS_HOVER });
