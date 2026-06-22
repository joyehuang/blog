function App() {
  const [values, setValues] = React.useState(TWEAK_DEFAULTS);
  const [mode, setMode] = React.useState(TWEAK_DEFAULTS.startMode);
  const [tweaksVisible, setTweaksVisible] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', values.theme === 'dark');
  }, [values.theme]);

  // Hide the highlightColor gradient in dark unless user opts in
  React.useEffect(() => {
    const el = document.querySelector('.highlight-gradient');
    if (!el) return;
    if (values.theme === 'dark' && !values.highlightInDark) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  }, [values.theme, values.highlightInDark]);

  const toggleTheme = () => setValues(v => ({ ...v, theme: v.theme === 'dark' ? 'light' : 'dark' }));

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' && mode === 'human' && !document.activeElement?.matches('input,textarea')) {
        e.preventDefault(); setMode('dev');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setTweaksVisible(true);
      if (d.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const switchMode = () => setMode(m => m === 'human' ? 'dev' : 'human');

  return (
    <>
      {mode === 'human' ? (
        <HumanMode
          onSwitchMode={switchMode}
          onToggleTheme={toggleTheme}
          theme={values.theme}
          showDevButton={values.showDevModeButton}
          terminalCollapsed={values.terminalCollapsed}
        />
      ) : (
        <DevMode onSwitchMode={switchMode} />
      )}
      <TweaksPanel values={values} setValues={setValues} visible={tweaksVisible} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
