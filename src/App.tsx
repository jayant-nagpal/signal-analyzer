import { useState, useCallback, useRef } from 'react';
import { parseFile } from './lib/parse';
import type { ParseResult } from './lib/parse';
import type { Position } from './lib/types';
import { UploadScreen } from './components/UploadScreen';
import { OverviewPage } from './pages/OverviewPage';
import { DrilldownPage } from './pages/DrilldownPage';
import './App.css';

type View = 'overview' | 'drilldown';

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const res = parseFile(text);
        if (res.positions.length === 0) throw new Error('No positions found in file.');
        setResult(res);
        setView('overview');
        setSelectedPosition(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Could not read file.');
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleDrilldown = useCallback((pos: Position) => {
    setSelectedPosition(pos);
    setView('drilldown');
  }, []);

  const handleBack = useCallback(() => {
    setView('overview');
    setSelectedPosition(null);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setView('overview');
    setSelectedPosition(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  if (!result && !loading) {
    return <UploadScreen onFile={handleFile} error={error} fileInputRef={fileInputRef} />;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Parsing position data…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <svg className="logo" viewBox="0 0 28 28" fill="none" aria-label="Position Lens">
            <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5" stroke="#22C98A" strokeWidth="1.5" />
            <line x1="14" y1="2" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="22" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="14" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <line x1="22" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="app-name">Position Lens</span>
          {result && (
            <span className="topbar-meta">
              Event {result.eventId} · {result.positions.length} positions · {result.rowCount.toLocaleString()} rows · parsed in {result.parseTimeMs}ms
            </span>
          )}
        </div>
        <div className="topbar-right">
          {view === 'drilldown' && (
            <button className="btn-ghost" onClick={handleBack}>← Overview</button>
          )}
          <button className="btn-ghost" onClick={handleReset}>Upload new file</button>
        </div>
      </header>

      {/* Content */}
      <main className="main-content">
        {view === 'overview' && result && (
          <OverviewPage result={result} onDrilldown={handleDrilldown} />
        )}
        {view === 'drilldown' && selectedPosition && result && (
          <DrilldownPage position={selectedPosition} allPositions={result.positions} />
        )}
      </main>
    </div>
  );
}
