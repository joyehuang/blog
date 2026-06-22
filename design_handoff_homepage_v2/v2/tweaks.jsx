const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "startMode": "human",
  "theme": "dark",
  "terminalCollapsed": true,
  "showDevModeButton": true,
  "highlightInDark": false
}/*EDITMODE-END*/;

function TweaksPanel({ values, setValues, visible }) {
  if (!visible) return null;
  const update = (k, v) => {
    setValues(prev => ({ ...prev, [k]: v }));
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*'); } catch {}
  };
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      width: 288, padding: 14, borderRadius: 14,
      background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--border))',
      boxShadow: '0 24px 48px -16px rgba(0,0,0,0.3)',
      fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px dashed hsl(var(--border))', paddingBottom: 8,
      }}>
        <span style={{ fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>Tweaks</span>
        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}>v2</span>
      </div>
      <Row label="Theme">
        <Seg value={values.theme} onChange={v => update('theme', v)}
             options={[['light','light'],['dark','dark']]} />
      </Row>
      <Row label="Start mode">
        <Seg value={values.startMode} onChange={v => update('startMode', v)}
             options={[['human','human'],['dev','dev']]} />
      </Row>
      <Row label="Terminal">
        <Seg value={String(values.terminalCollapsed)} onChange={v => update('terminalCollapsed', v === 'true')}
             options={[['true','collapsed'],['false','open']]} />
      </Row>
      <Row label="Dev-mode btn">
        <Seg value={String(values.showDevModeButton)} onChange={v => update('showDevModeButton', v === 'true')}
             options={[['true','show'],['false','hide']]} />
      </Row>
      <Row label="Dark tint">
        <Seg value={String(values.highlightInDark)} onChange={v => update('highlightInDark', v === 'true')}
             options={[['false','off'],['true','on']]} />
      </Row>
      <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
        Press <kbd style={{ padding: '0 4px', border: '1px solid hsl(var(--border))', borderRadius: 3 }}>`</kbd> anywhere to enter dev mode.
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      {children}
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'hsl(var(--muted))', borderRadius: 6,
      padding: 2, fontSize: 11,
    }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '4px 6px', border: 0, cursor: 'pointer',
          background: value === v ? 'hsl(var(--background))' : 'transparent',
          color: value === v ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
          borderRadius: 4, fontFamily: 'inherit', fontSize: 11,
        }}>{label}</button>
      ))}
    </div>
  );
}

Object.assign(window, { TweaksPanel, TWEAK_DEFAULTS });
