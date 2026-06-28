import { useState } from 'react';
import type { SignalDecision } from '../lib/types';
import { formatTime, formatSignedPercent } from '../lib/format';

interface Props {
  title: string;
  subtitle?: string;
  signals: SignalDecision[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  footer?: React.ReactNode;
}

export function SignalTable({ title, subtitle, signals, collapsible, defaultCollapsed, footer }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="table-section">
      <div className="table-header">
        <div>
          <div className="table-title">{title} <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>({signals.length})</span></div>
          {subtitle && <div className="table-subtitle">{subtitle}</div>}
        </div>
        {collapsible && (
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        )}
      </div>

      {!collapsed && signals.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>OSID</th>
                <th>Arrival time</th>
                <th>Sector</th>
                <th>Gross return</th>
                <th>Trading cost</th>
                <th>Net return</th>
              </tr>
            </thead>
            <tbody>
              {signals.map(sig => (
                <tr
                  key={sig.rowId}
                  className={sig.netReturn > 0 ? 'row-pos' : sig.netReturn < 0 ? 'row-neg' : ''}
                >
                  <td className="td-num">#{sig.arrivalRank ?? '—'}</td>
                  <td className="td-num">{sig.osid}</td>
                  <td className="td-num">{formatTime(sig.eventDate)}</td>
                  <td>{sig.sectorName}</td>
                  <td className={`td-num ${sig.grossReturn >= 0 ? 'td-pos' : 'td-neg'}`}>
                    {formatSignedPercent(sig.grossReturn)}
                  </td>
                  <td className="td-num td-neg">
                    -{formatSignedPercent(sig.transactionCost).replace('+', '')}
                  </td>
                  <td className={`td-num ${sig.netReturn >= 0 ? 'td-pos' : 'td-neg'}`}>
                    {formatSignedPercent(sig.netReturn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!collapsed && signals.length === 0 && (
        <div style={{ padding: '16px', color: 'var(--muted)', fontSize: 12 }}>No signals in this group.</div>
      )}

      {!collapsed && footer && <div>{footer}</div>}
    </div>
  );
}
