import { useState, useMemo, useCallback } from 'react';
import type {
  SignalRow, RawRow, ColumnMapping, DatasetMetadata, ThrottleConfig,
} from './lib/types';
import { buildInitialMapping } from './lib/mapping';
import { normalizeRows } from './lib/normalize';
import { runThrottle } from './lib/throttle';
import { computePortfolio, computeCounterfactual, computeBestCap } from './lib/portfolio';
import { parseFile } from './lib/parse/parseFile';
import { DEFAULT_CAP, DEFAULT_START_TIME, DEFAULT_END_TIME } from './lib/constants';
import { SAMPLE_RAW_ROWS } from './data/sampleSignals';

import { Sidebar } from './components/Sidebar';
import { EmptyState } from './components/EmptyState';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { SignalThrottlePage } from './pages/SignalThrottlePage';

// ── Sample column mapping ──────────────────────────────────────────────────────
const SAMPLE_COLUMNS = [
  'event_id', 'event_date', 'osid', 'bet_final_return', 'est_tc',
  'days_held', 'sector_group', 'signal', 'bet_open_weight',
];

// ── Default time window detection ─────────────────────────────────────────────
function detectDefaultWindow(signals: SignalRow[]): { startTime: string; endTime: string } {
  if (signals.length === 0) return { startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };

  // Find the earliest signal time and auto-set a 1-hour window
  const earliest = signals[0].eventDate;
  const startH = earliest.getHours().toString().padStart(2, '0');
  const startM = earliest.getMinutes().toString().padStart(2, '0');
  const endDate = new Date(earliest.getTime() + 60 * 60 * 1000);
  const endH = endDate.getHours().toString().padStart(2, '0');
  const endM = endDate.getMinutes().toString().padStart(2, '0');
  return { startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` };
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // Dataset state
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [pendingRawRows, setPendingRawRows] = useState<RawRow[]>([]);
  const [pendingColumns, setPendingColumns] = useState<string[]>([]);

  // UI state
  const [showMapping, setShowMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(true);

  // Config — only throttle controls: time window, cap, sectors
  const [config, setConfig] = useState<ThrottleConfig>({
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    signalCap: DEFAULT_CAP,
    holdingPeriodMins: 0,
    selectedSectors: new Set<string>(),
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // ── Derived: filtered signals by eventId ───────────────────────────────────
  const filteredSignals = useMemo(() => {
    if (!selectedEventId || signals.length === 0) return signals;
    return signals.filter(s => s.eventId === selectedEventId);
  }, [signals, selectedEventId]);

  // ── Derived: sectors present ───────────────────────────────────────────────
  const allSectors = useMemo(() => {
    const s = new Set(filteredSignals.map(sig => sig.sectorName));
    return [...s].filter(x => x !== 'Unknown').sort();
  }, [filteredSignals]);

  // ── Ensure config sectors are initialized ─────────────────────────────────
  const effectiveConfig = useMemo<ThrottleConfig>(() => {
    if (config.selectedSectors.size === 0 && allSectors.length > 0) {
      return { ...config, selectedSectors: new Set(allSectors) };
    }
    return config;
  }, [config, allSectors]);

  // ── Derived: throttle result ───────────────────────────────────────────────
  const throttleResult = useMemo(() => {
    if (filteredSignals.length === 0) return null;
    return runThrottle(filteredSignals, effectiveConfig);
  }, [filteredSignals, effectiveConfig]);

  // ── Derived: portfolio result (position size from file) ───────────────────
  const portfolioResult = useMemo(() => {
    if (!throttleResult) return null;
    return computePortfolio(throttleResult.acceptedSignals);
  }, [throttleResult]);

  // ── Derived: counterfactual ────────────────────────────────────────────────
  const counterfactualResult = useMemo(() => {
    if (!throttleResult) return null;
    return computeCounterfactual(
      throttleResult.skippedSignals,
      effectiveConfig.signalCap,
    );
  }, [throttleResult, effectiveConfig.signalCap]);

  // ── Derived: best cap scan ─────────────────────────────────────────────────
  const bestCapResult = useMemo(() => {
    if (!throttleResult) return null;
    const inWindow = [...throttleResult.acceptedSignals, ...throttleResult.skippedSignals];
    if (inWindow.length === 0) return null;
    return computeBestCap(inWindow);
  }, [throttleResult]);

  // ── Config change handler ─────────────────────────────────────────────────
  const handleConfigChange = useCallback((newCfg: ThrottleConfig) => {
    setConfig(newCfg);
  }, []);

  // ── File upload flow ──────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setUploadStage('Reading file...');

    try {
      setUploadStage('Detecting columns...');
      const parsed = await parseFile(file);
      setPendingRawRows(parsed.rows);
      setPendingColumns(parsed.columns);
      const initMapping = buildInitialMapping(parsed.columns);
      setMapping(initMapping);
      setUploading(false);
      setUploadStage('Confirm mapping...');
      setShowMapping(true);
    } catch (err) {
      setUploading(false);
      setUploadError(err instanceof Error ? err.message : 'Could not parse this file.');
    }
  }, []);

  const handleMappingConfirm = useCallback(() => {
    if (!mapping || pendingRawRows.length === 0) return;
    setShowMapping(false);

    try {
      const { signals: normalized, metadata: meta } = normalizeRows(
        pendingRawRows, mapping, 'Uploaded file',
      );

      if (normalized.length === 0) {
        setUploadError('No usable signal rows were found. Check that event_date, osid, bet_final_return, and est_tc are mapped correctly.');
        return;
      }

      const eventIds = meta.eventIds;
      const firstEventId = eventIds[0] ?? 'default_event';
      const window = detectDefaultWindow(normalized);

      setSignals(normalized);
      setMetadata(meta);
      setSelectedEventId(firstEventId);
      setConfig({
        startTime: window.startTime,
        endTime: window.endTime,
        signalCap: DEFAULT_CAP,
        holdingPeriodMins: 0,
        selectedSectors: new Set<string>(),
      });
      setShowEmpty(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process file.');
    }
  }, [mapping, pendingRawRows]);

  // ── Sample data loader ────────────────────────────────────────────────────
  const handleLoadSample = useCallback(() => {
    const sampleMapping = buildInitialMapping(SAMPLE_COLUMNS);
    const { signals: normalized, metadata: meta } = normalizeRows(
      SAMPLE_RAW_ROWS, sampleMapping, 'Sample signal event', true,
    );

    setSignals(normalized);
    setMetadata(meta);
    setSelectedEventId('100003');
    setConfig({
      startTime: '12:15',
      endTime: '13:15',
      signalCap: DEFAULT_CAP,
      holdingPeriodMins: 0,
      selectedSectors: new Set<string>(),
    });
    setShowEmpty(false);
    setUploadError(null);
  }, []);

  // ── Reset to upload screen ────────────────────────────────────────────────
  const handleUploadClick = useCallback(() => {
    setShowEmpty(true);
    setUploadError(null);
  }, []);

  // ── Event selector ────────────────────────────────────────────────────────
  const handleEventChange = useCallback((id: string) => {
    setSelectedEventId(id);
    const evtSignals = signals.filter(s => s.eventId === id);
    const window = detectDefaultWindow(evtSignals);
    setConfig(c => ({
      ...c,
      startTime: window.startTime,
      endTime: window.endTime,
      holdingPeriodMins: 0,
      selectedSectors: new Set<string>(),
    }));
  }, [signals]);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasData = signals.length > 0 && !showEmpty;

  return (
    <div className="app-shell">
      {hasData && (
        <Sidebar
          metadata={metadata}
          config={effectiveConfig}
          throttleResult={throttleResult}
          portfolioResult={portfolioResult}
          eventIds={metadata?.eventIds ?? []}
          selectedEventId={selectedEventId}
          onEventChange={handleEventChange}
          onConfigChange={handleConfigChange}
          onUploadClick={handleUploadClick}
        />
      )}

      <div className="main-content">
        {hasData && (
          <header className="main-header">
            <div className="main-header-title">
              Signal Analyzer
              {metadata?.isSample && (
                <span className="badge-sample" style={{ marginLeft: 8 }}>Sample data</span>
              )}
            </div>
            <div className="main-header-meta">
              {metadata && (
                <>
                  <span>{metadata.rowsUsable.toLocaleString()} signals</span>
                  {metadata.eventIds.length > 0 && <span>Event: {selectedEventId}</span>}
                  {metadata.dateRange && (
                    <span>
                      {metadata.dateRange.min.toLocaleDateString()} – {metadata.dateRange.max.toLocaleDateString()}
                    </span>
                  )}
                </>
              )}
            </div>
          </header>
        )}

        {!hasData ? (
          <EmptyState
            onFile={handleFile}
            onSample={handleLoadSample}
            error={uploadError}
            uploading={uploading}
            uploadStage={uploadStage}
          />
        ) : throttleResult ? (
          <SignalThrottlePage
            throttleResult={throttleResult}
            portfolioResult={portfolioResult!}
            counterfactual={counterfactualResult}
            bestCap={bestCapResult}
            windowStart={effectiveConfig.startTime}
            windowEnd={effectiveConfig.endTime}
            signalCap={effectiveConfig.signalCap}
          />
        ) : (
          <div className="page-scroll">
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
              No signals match the current filters.
            </div>
          </div>
        )}
      </div>

      {showMapping && mapping && (
        <ColumnMappingModal
          mapping={mapping}
          sourceColumns={pendingColumns}
          rawRows={pendingRawRows}
          returnUnit={metadata?.returnUnitInferred ?? 'decimal'}
          costUnit={metadata?.costUnitInferred ?? 'decimal'}
          onMappingChange={setMapping}
          onConfirm={handleMappingConfirm}
          onCancel={() => { setShowMapping(false); setUploading(false); }}
        />
      )}
    </div>
  );
}
