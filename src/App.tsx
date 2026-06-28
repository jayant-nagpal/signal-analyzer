import { useState, useMemo, useCallback, useRef } from 'react';
import type {
  SignalRow, RawRow, ColumnMapping, DatasetMetadata,
  ThrottleConfig, ActiveTab, ScenarioHistoryItem,
} from './lib/types';
import { buildInitialMapping } from './lib/mapping';
import { normalizeRows } from './lib/normalize';
import { runThrottle } from './lib/throttle';
import { computePortfolio, computeCounterfactual } from './lib/portfolio';
import { parseFile } from './lib/parse/parseFile';
import { DEFAULT_CAP, DEFAULT_POSITION_SIZE, DEFAULT_START_TIME, DEFAULT_END_TIME } from './lib/constants';
import { SAMPLE_RAW_ROWS } from './data/sampleSignals';

import { Sidebar } from './components/Sidebar';
import { TabNav } from './components/TabNav';
import { EmptyState } from './components/EmptyState';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { SignalThrottlePage } from './pages/SignalThrottlePage';
import { PortfolioAnalyzerPage } from './pages/PortfolioAnalyzerPage';

// ── Sample column mapping ──────────────────────────────────────────────────────
const SAMPLE_COLUMNS = [
  'event_id', 'event_date', 'osid', 'bet_final_return', 'est_tc',
  'days_held', 'sector_group', 'signal', 'bet_open_weight',
];

// ── Default time window detection ─────────────────────────────────────────────
function detectDefaultWindow(signals: SignalRow[]): { startTime: string; endTime: string } {
  if (signals.length === 0) return { startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };
  const has1215 = signals.some(s => s.eventDate.getHours() === 12 && s.eventDate.getMinutes() === 15);
  if (has1215) return { startTime: '12:15', endTime: '13:15' };
  const earliest = signals[0].eventDate;
  const startH = earliest.getHours().toString().padStart(2, '0');
  const startM = earliest.getMinutes().toString().padStart(2, '0');
  const endDate = new Date(earliest.getTime() + 60 * 60 * 1000);
  const endH = endDate.getHours().toString().padStart(2, '0');
  const endM = endDate.getMinutes().toString().padStart(2, '0');
  return { startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` };
}

// ── Scenario history helper ───────────────────────────────────────────────────
function addScenario(
  history: ScenarioHistoryItem[],
  item: ScenarioHistoryItem,
): ScenarioHistoryItem[] {
  const filtered = history.filter(h =>
    !(h.cap === item.cap && h.positionSize === item.positionSize &&
      h.startTime === item.startTime && h.endTime === item.endTime)
  );
  return [item, ...filtered].slice(0, 3);
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('throttle');
  const [showMapping, setShowMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(true);

  // Config
  const [config, setConfig] = useState<ThrottleConfig>({
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    signalCap: DEFAULT_CAP,
    selectedSectors: new Set<string>(),
  });
  const [positionSize, setPositionSize] = useState(DEFAULT_POSITION_SIZE);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);
  const scenarioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Derived: portfolio result ──────────────────────────────────────────────
  const portfolioResult = useMemo(() => {
    if (!throttleResult) return null;
    return computePortfolio(throttleResult.acceptedSignals, positionSize);
  }, [throttleResult, positionSize]);

  // ── Derived: counterfactual ────────────────────────────────────────────────
  const counterfactualResult = useMemo(() => {
    if (!throttleResult) return null;
    return computeCounterfactual(
      throttleResult.skippedSignals,
      effectiveConfig.signalCap,
      positionSize,
    );
  }, [throttleResult, effectiveConfig.signalCap, positionSize]);

  // ── Scenario recording ─────────────────────────────────────────────────────
  const scheduleScenarioRecord = useCallback((
    cfg: ThrottleConfig,
    ps: number,
    accepted: number,
    netReturn: number,
    capitalDeployed: number,
  ) => {
    if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current);
    scenarioTimerRef.current = setTimeout(() => {
      setScenarioHistory(h => addScenario(h, {
        cap: cfg.signalCap,
        positionSize: ps,
        startTime: cfg.startTime,
        endTime: cfg.endTime,
        acceptedCount: accepted,
        netReturn,
        capitalDeployed,
        timestamp: Date.now(),
      }));
    }, 500);
  }, []);

  // ── Config change handlers ────────────────────────────────────────────────
  const handleConfigChange = useCallback((newCfg: ThrottleConfig) => {
    setConfig(newCfg);
    if (portfolioResult) {
      scheduleScenarioRecord(
        newCfg, positionSize,
        portfolioResult.acceptedCount, portfolioResult.netReturn, portfolioResult.capitalDeployed,
      );
    }
  }, [portfolioResult, positionSize, scheduleScenarioRecord]);

  const handlePositionSizeChange = useCallback((v: number) => {
    setPositionSize(v);
    if (portfolioResult) {
      scheduleScenarioRecord(
        effectiveConfig, v,
        portfolioResult.acceptedCount, portfolioResult.netReturn, portfolioResult.capitalDeployed,
      );
    }
  }, [portfolioResult, effectiveConfig, scheduleScenarioRecord]);

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
    setUploadStage('Running throttle...');
    setShowMapping(false);

    try {
      const { signals: normalized, metadata: meta } = normalizeRows(
        pendingRawRows, mapping, pendingColumns[0] ? 'Uploaded file' : 'Unknown',
      );

      if (normalized.length === 0) {
        setUploadError('No usable signal rows were found.');
        return;
      }

      const eventIds = meta.eventIds;
      const firstEventId = eventIds[0] ?? 'default_event';
      const window = detectDefaultWindow(normalized);

      setSignals(normalized);
      setMetadata({ ...meta, fileName: pendingRawRows.length + ' rows uploaded' });
      setSelectedEventId(firstEventId);
      setConfig(c => ({
        ...c,
        startTime: window.startTime,
        endTime: window.endTime,
        selectedSectors: new Set<string>(),
      }));
      setShowEmpty(false);
      setActiveTab('throttle');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to normalize rows.');
    }
  }, [mapping, pendingRawRows, pendingColumns]);

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
      selectedSectors: new Set<string>(),
    });
    setPositionSize(DEFAULT_POSITION_SIZE);
    setShowEmpty(false);
    setActiveTab('throttle');
    setUploadError(null);
    setScenarioHistory([]);
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
    setConfig(c => ({ ...c, startTime: window.startTime, endTime: window.endTime, selectedSectors: new Set<string>() }));
  }, [signals]);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasData = signals.length > 0 && !showEmpty;

  return (
    <div className="app-shell">
      {/* Sidebar always visible when data is loaded */}
      {hasData && (
        <Sidebar
          metadata={metadata}
          config={effectiveConfig}
          positionSize={positionSize}
          throttleResult={throttleResult}
          portfolioResult={portfolioResult}
          eventIds={metadata?.eventIds ?? []}
          selectedEventId={selectedEventId}
          onEventChange={handleEventChange}
          onConfigChange={handleConfigChange}
          onPositionSizeChange={handlePositionSizeChange}
          onUploadClick={handleUploadClick}
        />
      )}

      <div className="main-content">
        {/* Header */}
        {hasData && (
          <header className="main-header">
            <div className="main-header-title">
              {metadata?.isSample ? (
                <>Signal Analyzer <span className="badge-sample" style={{ marginLeft: 8 }}>Sample data</span></>
              ) : (
                <>Signal Analyzer</>
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

        {/* Tab nav */}
        {hasData && (
          <TabNav active={activeTab} onChange={setActiveTab} />
        )}

        {/* Content */}
        {!hasData ? (
          <EmptyState
            onFile={handleFile}
            onSample={handleLoadSample}
            error={uploadError}
            uploading={uploading}
            uploadStage={uploadStage}
          />
        ) : throttleResult ? (
          activeTab === 'throttle' ? (
            <SignalThrottlePage
              throttleResult={throttleResult}
              counterfactual={counterfactualResult}
              windowStart={effectiveConfig.startTime}
              windowEnd={effectiveConfig.endTime}
            />
          ) : (
            <PortfolioAnalyzerPage
              config={effectiveConfig}
              positionSize={positionSize}
              portfolioResult={portfolioResult!}
              allSectors={allSectors}
              scenarioHistory={scenarioHistory}
              onConfigChange={handleConfigChange}
              onPositionSizeChange={handlePositionSizeChange}
            />
          )
        ) : (
          <div className="page-scroll">
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
              No signals match the current filters.
            </div>
          </div>
        )}
      </div>

      {/* Column mapping modal */}
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
