import { useEffect } from 'react';
import type { CanonicalField, ColumnMapping } from '../lib/types';
import { REQUIRED_FIELDS } from '../lib/constants';
import { updateMapping, isMappingComplete } from '../lib/mapping';
import type { RawRow } from '../lib/types';

const ALL_FIELDS: CanonicalField[] = [
  'event_id', 'event_date', 'osid', 'bet_final_return', 'est_tc',
  'sector_group', 'days_held', 'signal', 'bet_open_weight',
  'bet_open_date', 'price_vs_ema20', 'price_vs_sma50', 'rlst', 'hotness_rank',
];

const FIELD_LABELS: Record<CanonicalField, string> = {
  event_id: 'Event ID',
  event_date: 'Event date / time',
  osid: 'Stock ID (osid)',
  bet_open_date: 'Position open date',
  bet_final_return: 'Final return',
  est_tc: 'Transaction cost',
  days_held: 'Days held',
  sector_group: 'Sector',
  signal: 'Signal strength',
  bet_open_weight: 'Position weight',
  price_vs_ema20: 'Price vs EMA20',
  price_vs_sma50: 'Price vs SMA50',
  rlst: 'Relative strength',
  hotness_rank: 'Hotness rank',
};

interface Props {
  mapping: ColumnMapping;
  sourceColumns: string[];
  rawRows: RawRow[];
  returnUnit: 'decimal' | 'percent';
  costUnit: 'decimal' | 'percent';
  onMappingChange: (m: ColumnMapping) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ColumnMappingModal({
  mapping, sourceColumns, rawRows, returnUnit, costUnit,
  onMappingChange, onConfirm, onCancel,
}: Props) {
  const complete = isMappingComplete(mapping);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const previewRows = rawRows.slice(0, 5);
  const mappedCols = REQUIRED_FIELDS.map(f => mapping[f].sourceColumn).filter(Boolean) as string[];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm column mapping">
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="modal-title">Confirm column mapping</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
              {rawRows.length.toLocaleString()} rows · {sourceColumns.length} columns
            </div>
          </div>
          <button className="modal-close" onClick={onCancel} aria-label="Close modal">×</button>
        </div>

        <div className="modal-body">
          {/* Unit inference */}
          <div className="unit-info">
            <strong>Return unit:</strong> {returnUnit === 'decimal' ? 'Decimal (e.g. 0.0052 = +0.52%)' : 'Percent (will divide by 100)'}
            {' · '}
            <strong>Cost unit:</strong> {costUnit === 'decimal' ? 'Decimal (e.g. 0.0007)' : 'Percent (will divide by 100)'}
          </div>

          {/* Mapping grid */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Field mapping</div>
            <div className="mapping-grid">
              {ALL_FIELDS.map(field => {
                const fm = mapping[field];
                const isRequired = (REQUIRED_FIELDS as string[]).includes(field);
                const conf = fm.sourceColumn ? fm.confidence : 'missing';
                return (
                  <>
                    <div key={`label-${field}`} className="mapping-field-label">
                      {FIELD_LABELS[field]}
                      {isRequired
                        ? <span className="req-badge">Required</span>
                        : <span className="opt-badge">Optional</span>}
                    </div>
                    <select
                      key={`sel-${field}`}
                      className={`mapping-select${fm.sourceColumn ? ' has-value' : isRequired ? ' missing' : ''}`}
                      value={fm.sourceColumn ?? ''}
                      onChange={e => onMappingChange(updateMapping(mapping, field, e.target.value || null))}
                      aria-label={`Map ${FIELD_LABELS[field]}`}
                    >
                      <option value="">— not mapped —</option>
                      {sourceColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <div key={`conf-${field}`}>
                      <span className={`conf-badge ${conf === 'high' ? 'conf-high' : conf === 'medium' ? 'conf-medium' : 'conf-missing'}`}>
                        {conf === 'high' ? 'Auto' : conf === 'medium' ? 'Guess' : 'Missing'}
                      </span>
                    </div>
                  </>
                );
              })}
            </div>
          </div>

          {/* Preview rows */}
          {mappedCols.length > 0 && previewRows.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                First 5 rows preview
              </div>
              <div className="preview-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {mappedCols.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {mappedCols.map(col => (
                          <td key={col} className="td-num">{String(row[col] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {!complete && <span style={{ color: 'var(--red)' }}>Map all required fields to continue.</span>}
            {complete && <span style={{ color: 'var(--green)' }}>All required fields mapped.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button
              className="btn-primary"
              onClick={onConfirm}
              disabled={!complete}
              aria-disabled={!complete}
            >
              Run analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
