import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './panel.css';
import { send, usePanel } from './state.ts';
import { MainView } from './main-view.tsx';
import { BenchView, LogView, MacrosView, SetupView, WorkshopView } from './views.tsx';

const STUDIO_TABS = ['Setup', 'Macros', 'Workshop', 'Bench', 'Log'] as const;
type StudioTab = (typeof STUDIO_TABS)[number];

function App() {
  const { init, status, meta } = usePanel();
  const [view, setView] = useState<'main' | 'studio'>('main');
  const [tab, setTab] = useState<StudioTab>('Setup');
  const [focusNote, setFocusNote] = useState(0);

  useEffect(
    () =>
      window.cog.on('panel:focus', (what: string) => {
        if (what === 'note') {
          setView('studio');
          setTab('Bench');
          setFocusNote((n) => n + 1);
        } else if (what === 'tab:Main') {
          setView('main');
        } else if (what.startsWith('tab:')) {
          setView('studio');
          setTab(what.slice(4) as StudioTab);
        }
      }),
    []
  );

  if (!init || !status) return <div className="content muted">Starting…</div>;
  if (view === 'main') {
    return (
      <div className="app main-app">
        {status.styleError ? <div className="banner err">A style file has an error — the last valid version keeps playing. See Studio › Log.</div> : null}
        <MainView status={status} onStudio={() => setView('studio')} />
      </div>
    );
  }

  const s = status.session;
  const frozen = !!status.style?.frozen;
  return (
    <div className="app">
      <header className="top">
        <button className="back" onClick={() => setView('main')}>
          ‹ Back
        </button>
        <h1>Studio</h1>
        <span className="style-name">
          {status.style?.name ?? 'no style'}
          {frozen ? ' · frozen reference' : status.styleDirty ? ' · unsaved' : ''}
        </span>
        {status.styleDirty && !frozen ? (
          <>
            <button className="btn" onClick={() => send({ type: 'saveStyle' })}>
              Save
            </button>
            <button className="btn" onClick={() => send({ type: 'revertStyle' })}>
              Revert
            </button>
          </>
        ) : null}
        <span className="spacer" />
        <span className={`pill ${s.playing ? 'on' : ''}`}>
          <span className="dot" />
          {s.playing ? s.phase : 'idle'}
        </span>
      </header>
      {status.diskChanged ? (
        <div className="banner">
          The style file changed on disk while you had unsaved edits. <b>Revert</b> loads the file; <b>Save</b> keeps your edits and overwrites it.
        </div>
      ) : null}
      {status.styleError ? <div className="banner err">Style file error — the last valid style keeps playing. See Log.</div> : null}
      <nav className="tabs">
        {STUDIO_TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <main className="content">
        {tab === 'Setup' && <SetupView status={status} meta={meta} />}
        {tab === 'Macros' && <MacrosView status={status} meta={meta} />}
        {tab === 'Workshop' && <WorkshopView status={status} meta={meta} />}
        {tab === 'Bench' && <BenchView status={status} meta={meta} focusNote={focusNote} />}
        {tab === 'Log' && <LogView status={status} meta={meta} />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
