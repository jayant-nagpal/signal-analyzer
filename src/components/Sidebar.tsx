import { Upload } from 'lucide-react';
import type { ThrottleConfig, DatasetMetadata, PortfolioResult, ThrottleResult } from '../lib/types';
import { formatSignedPercent, formatPercent } from '../lib/format';

interface Props {
  metadata: DatasetMetadata | null;
  config: ThrottleConfig;
  positionSize: number;
  throttleResult: ThrottleResult | null;
  portfolioResult: PortfolioResult | null;
  eventIds: string[];
  selectedEventId: string;
  onEventChange: (id: string) => void;
  onConfigChange: (c: ThrottleConfig) => void;
  onPositionSizeChange: (v: number) => void;
  onUploadClick: () => void;
}

export function Sidebar({
  metadata, config, positionSize, throttleResult, portfolioResult,
  eventIds, selectedEventId, onEventChange,
  onConfigChange, onPositionSizeChange, onUploadClick,
}: Props) {
  const net = portfolioResult?.netReturn ?? null;

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
            {metadata.isSample && <span className="badge-sample" style={{ marginTop: 4, display: 'inline-block' }}>Sample</span>}
          </>
        ) : (
          <div className="sidebar-meta">No file loaded</div>
        )}
        <button className="upload-btn" onClick={onUploadClick} style={{ marginTop: 8 }} aria-label="Upload or change file">
          <Upload size={13} />
          {metadata ? 'Change file' : 'Upload file'}
        </button>
      </div>

      {/* Event selector */}
      {eventIds.length > 1 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Event ID</div>
          <select
            className="sidebar-select"
            value={selectedEventId}
            onChange={e => onEventChange(e.target.value)}
            aria-label="Select event ID"
          >
            {eventIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <div className="sidebar-meta" style={{ marginTop: 4 }}>Analyzing one event at a time.</div>
        </div>
      )}

      {/* Window */}
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
      </div>

      {/* Cap */}
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
      </div>

      {/* Holding period */}
      <div className="sidebar-section">
        <div className="sidebar-control-row">
          <div className="sidebar-control-label">
            <span>Holding period</span>
            <span className="sidebar-control-value">
              {config.holdingPeriodMins === 0 ? 'Off' : `${config.holdingPeriodMins} min`}
            </span>
          </div>
          <input
            type="range"
            className="sidebar-slider"
            min={0} max={480} step={5}
            value={config.holdingPeriodMins}
            onChange={e => onConfigChange({ ...config, holdingPeriodMins: parseInt(e.target.value) })}
            aria-label={`Holding period: ${config.holdingPeriodMins === 0 ? 'Off' : config.holdingPeriodMins + ' minutes'}`}
          />
        </div>
        {config.holdingPeriodMins > 0 && (
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
            Signals during hold are ignored. New batch opens after {config.holdingPeriodMins} min.
          </div>
        )}
      </div>

      {/* Position size */}
      <div className="sidebar-section">
        <div className="sidebar-control-row">
          <div className="sidebar-control-label">
            <span>Position size</span>
            <span className="sidebar-control-value">{formatPercent(positionSize)}</span>
          </div>
          <input
            type="range"
            className="sidebar-slider"
            min={0.5} max={10} step={0.5}
            value={positionSize * 100}
            onChange={e => onPositionSizeChange(parseFloat(e.target.value) / 100)}
            aria-label={`Position size: ${formatPercent(positionSize)}`}
          />
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
                <span className="summary-label">Filtered out</span>
                <span className="summary-value">{throttleResult.summary.filteredOutCount}</span>
              </div>
            )}
            {throttleResult.summary.ignoredHoldCount > 0 && (
              <div className="summary-row">
                <span className="summary-label">Ignored (hold)</span>
                <span className="summary-value">{throttleResult.summary.ignoredHoldCount}</span>
              </div>
            )}
            {throttleResult.summary.batchCount > 1 && (
              <div className="summary-row">
                <span className="summary-label">Batches</span>
                <span className="summary-value accent">{throttleResult.summary.batchCount}</span>
              </div>
            )}
            {net !== null && (
              <div className="summary-row" style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span className="summary-label">Net portfolio</span>
                <span className={`summary-value ${net >= 0 ? 'positive' : 'negative'}`}>
                  {formatSignedPercent(net)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          First come, first serve throttle.<br />
          The throttle does not look ahead.
        </div>
      </div>
    </aside>
  );
}
