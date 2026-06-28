import type { ThrottleConfig } from '../lib/types';
import { formatPercent } from '../lib/format';

interface Props {
  config: ThrottleConfig;
  positionSize: number;
  allSectors: string[];
  capitalDeployed: number;
  acceptedCount: number;
  capitalWarning: 'none' | 'amber' | 'red';
  onConfigChange: (config: ThrottleConfig) => void;
  onPositionSizeChange: (v: number) => void;
}

export function ControlsPanel({
  config, positionSize, allSectors, capitalDeployed, acceptedCount,
  capitalWarning, onConfigChange, onPositionSizeChange,
}: Props) {
  function toggleSector(sector: string) {
    const next = new Set(config.selectedSectors);
    if (next.has(sector)) next.delete(sector);
    else next.add(sector);
    onConfigChange({ ...config, selectedSectors: next });
  }

  const allSelected = allSectors.length === config.selectedSectors.size;

  return (
    <div className="controls-panel">
      <div className="controls-panel-header">Controls</div>

      {/* Signal cap */}
      <div className="controls-section">
        <div className="control-label">
          <span>Signal cap</span>
          <span className="control-value">{config.signalCap}</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min={1} max={50} step={1}
          value={config.signalCap}
          onChange={e => onConfigChange({ ...config, signalCap: parseInt(e.target.value) })}
          aria-label="Signal cap"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          <span>1</span><span>50</span>
        </div>
      </div>

      {/* Position size */}
      <div className="controls-section">
        <div className="control-label">
          <span>Position size</span>
          <span className="control-value">{formatPercent(positionSize)}</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min={0.5} max={10} step={0.5}
          value={positionSize * 100}
          onChange={e => onPositionSizeChange(parseFloat(e.target.value) / 100)}
          aria-label="Position size"
        />
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
          Total capital deployed: <span className="mono">{formatPercent(capitalDeployed)}</span>
          {' '}({acceptedCount} × {formatPercent(positionSize)})
        </div>
        {capitalWarning === 'red' && <div className="capital-warn-red">Capital deployed exceeds 100%. Lower cap or position size.</div>}
        {capitalWarning === 'amber' && <div className="capital-warn-amber">High capital usage. Check capacity.</div>}
      </div>

      {/* Time window */}
      <div className="controls-section">
        <div className="control-label" style={{ marginBottom: 8 }}>Time window</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Start</div>
            <input
              type="time"
              className="control-input"
              value={config.startTime}
              onChange={e => onConfigChange({ ...config, startTime: e.target.value })}
              aria-label="Window start time"
            />
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, paddingTop: 16 }}>–</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>End</div>
            <input
              type="time"
              className="control-input"
              value={config.endTime}
              onChange={e => onConfigChange({ ...config, endTime: e.target.value })}
              aria-label="Window end time"
            />
          </div>
        </div>
      </div>

      {/* Sector filter */}
      {allSectors.length > 0 && (
        <div className="controls-section">
          <div className="control-label" style={{ marginBottom: 8 }}>
            <span>Sector filter</span>
            <button
              className="btn-ghost"
              style={{ fontSize: 10, padding: '2px 6px' }}
              onClick={() => onConfigChange({
                ...config,
                selectedSectors: allSelected ? new Set() : new Set(allSectors),
              })}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="sector-toggles">
            {allSectors.map(sector => (
              <button
                key={sector}
                className={`sector-toggle-btn${config.selectedSectors.has(sector) ? ' active' : ''}`}
                onClick={() => toggleSector(sector)}
                aria-pressed={config.selectedSectors.has(sector)}
              >
                {sector}
              </button>
            ))}
          </div>
          {!allSelected && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Deselected sectors do not take cap slots.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
