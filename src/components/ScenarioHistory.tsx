import type { ScenarioHistoryItem } from '../lib/types';
import { formatSignedPercent, formatPercent } from '../lib/format';

interface Props {
  history: ScenarioHistoryItem[];
}

export function ScenarioHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="scenario-history">
      <div className="table-header">
        <div className="table-title">Scenario comparison</div>
        <div className="table-subtitle" style={{ marginTop: 2 }}>Last {history.length} setting{history.length !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cap</th>
              <th>Position</th>
              <th>Window</th>
              <th>Accepted</th>
              <th>Net return</th>
              <th>Capital</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, i) => (
              <tr key={i} className={i === 0 ? 'row-pos' : ''}>
                <td className="td-num">{item.cap}</td>
                <td className="td-num">{formatPercent(item.positionSize)}</td>
                <td className="td-num">{item.startTime}–{item.endTime}</td>
                <td className="td-num">{item.acceptedCount}</td>
                <td className={`td-num ${item.netReturn >= 0 ? 'td-pos' : 'td-neg'}`}>
                  {formatSignedPercent(item.netReturn)}
                </td>
                <td className="td-num">{formatPercent(item.capitalDeployed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
