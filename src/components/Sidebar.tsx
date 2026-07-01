import { Upload } from 'lucide-react';
import type { ThrottleConfig, DatasetMetadata, PortfolioResult, ThrottleResult } from '../lib/types';
import { formatSignedPercent } from '../lib/format';

interface Props {
  metadata: DatasetMetadata | null;
  config: ThrottleConfig;
  throttleResult: ThrottleResult | null;
  portfolioResult: PortfolioResult | null;
  eventIds: string[];
  selectedEventId: string;
  onEventChange: (id: string) => void;
  onConfigChange: (c: ThrottleConfig) => void;
  onUploadClick: () => void;
}

export function Sidebar({
  metadata, config, throttleResult, portfolioResult,
  eventIds, selectedEventId, onEventChange,
  onConfigChange, onUploadClick,
}: Props) {
  const net = portfolioResult?.netReturn ?? null;
  const capital = portfolioResult?.capitalDeployed ?? null;

  return (
    <aside className="sidebar" aria-label="Controls">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">SA</div>
        <div className="sidebar-title">Signal Analyzer</div>
      </div>

      {/* Dataset */}
      <div className="sidebar-section">
        <div className="sidebar-label">Dataset</div>
        {metadata ? (
          <>
            <div className="sidebar-dataset">{metadata.fileName}</div>
            <div className="sidebar-meta">{metadata.rowsUsable.toLocaleString()} usable rows</div>
            {metadata.isSample && (
              <span className="badge-sample" style={{ marginTop: 4, display: 'inline-block' }}>Sample</span>
            )}
          </>
        ) : (
          <div className="sidebar-meta">No file loaded</div>
        )}
        <button
          className="upload-btn"
          onClick={onUploadClick}
          style={{ marginTop: 8 }}
          aria-label="Upload or change file"
        >
          <Upload size={13} />
          {metadata ? 'Change file' : 'Upload file'}
        </button>
      </div>

      {/* Event selector — only shown when multiple events */}
      {eventIds.length > 1 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Event</div>
          <select
            className="sidebar-select"
            value={selectedEventId}
            onChange={e => onEventChange(e.target.value)}
            aria-label="Select event"
          >
            {eventIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
      )}

      {/* Time window */}
      <div className="sidebar-section">
        <div className="sidebar-label">Time window</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Start</div>
            <input
              type="time"
              className="sidebar-input"
              value={config.startTime}
              onChange={e => onConfigChange({ ...config, startTime: e.target.value })}
              aria-label="Window start time"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>End</div>
            <input
              type="time"
              className="sidebar-input"
              value={config.endTime}
              onChange={e => onConfigChange({ ...config, endTime: e.target.value })}
              aria-label="Window end time"
            />
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
          Overnight windows supported (end &lt; start).
        </div>
      </div>

      {/* Signal cap */}
      <div className="sidebar-section">
        <div className="sidebar-control-row">
          <div className="sidebar-control-label">
            <span>Signal cap</span>
            <span className="sidebar-control-value">{config.signalCap}</span>
          </div>
          <input
            type="range"
            className="sidebar-slider"
            min={1} max={50} step={1}
            value={config.signalCap}
            onChange={e => onConfigChange({ ...config, signalCap: parseInt(e.target.value) })}
            aria-label={`Signal cap: ${config.signalCap}`}
          />
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
          Max signals accepted. First come, first serve.
        </div>
      </div>

      {/* Summary */}
      {throttleResult && (
        <div className="sidebar-section">
          <div className="sidebar-label">Summary</div>
          <div className="sidebar-summary">
            <div className="summary-row">
              <span className="summary-label">Total signals</span>
              <span className="summary-value">{throttleResult.totalSignals}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">In window</span>
              <span className="summary-value accent">{throttleResult.summary.inWindowCount}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Accepted</span>
              <span className="summary-value">{throttleResult.summary.acceptedCount}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Skipped</span>
              <span className="summary-value">{throttleResult.summary.skippedCount}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Outside window</span>
              <span className="summary-value">{throttleResult.summary.outsideWindowCount}</span>
            </div>
            {throttleResult.summary.filteredOutCount > 0 && (
              <div className="summary-row">
                <span className="summary-label">Sector filtered</span>
                <span className="summary-value">{throttleResult.summary.filteredOutCount}</span>
              </div>
            )}

            {/* Net return + capital — from file data */}
            {net !== null && (
              <>
                <div className="summary-row" style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span className="summary-label">Net return</span>
                  <span className={`summary-value ${net >= 0 ? 'positive' : 'negative'}`}>
                    {formatSignedPercent(net)}
                  </span>
                </div>
                {capital !== null && (
                  <div className="summary-row">
                    <span className="summary-label">Capital deployed</span>
                    <span className={`summary-value ${capital > 1.0 ? 'negative' : capital > 0.8 ? 'warning' : ''}`}>
                      {(capital * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          First come, first serve.<br />
          Position size from file.
        </div>
      </div>
    </aside>
  );
}
