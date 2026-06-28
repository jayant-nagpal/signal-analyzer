import type { SignalPortfolioContribution } from '../lib/types';
import { formatSignedPercent } from '../lib/format';

interface Props {
  contributions: SignalPortfolioContribution[];
}

export function SectorBreakdown({ contributions }: Props) {
  if (contributions.length === 0) return null;

  // Group by sector
  const sectorMap = new Map<string, { count: number; netContrib: number }>();
  for (const c of contributions) {
    const s = c.signal.sectorName;
    const cur = sectorMap.get(s) ?? { count: 0, netContrib: 0 };
    sectorMap.set(s, { count: cur.count + 1, netContrib: cur.netContrib + c.netContribution });
  }

  const sectors = [...sectorMap.entries()].sort((a, b) => Math.abs(b[1].netContrib) - Math.abs(a[1].netContrib));

  // Dominant sector for plain-English note
  const top = sectors[0];
  const total = contributions.length;

  return (
    <div className="sector-breakdown">
      <div className="chart-title">Sector breakdown</div>

      {sectors.map(([name, data]) => (
        <div className="sector-row" key={name}>
          <div>
            <div className="sector-name">{name}</div>
            <div className="sector-count">{data.count} signal{data.count !== 1 ? 's' : ''}</div>
          </div>
          <div className={`sector-contribution mono ${data.netContrib >= 0 ? 'td-pos' : 'td-neg'}`}>
            {formatSignedPercent(data.netContrib)}
          </div>
        </div>
      ))}

      {top && (
        <div className="plain-english-note">
          {top[1].count} of your {total} accepted signal{total !== 1 ? 's' : ''} {top[1].count === 1 ? 'was' : 'were'} in <strong>{top[0]}</strong>.
          They contributed {formatSignedPercent(top[1].netContrib)} combined.
        </div>
      )}
    </div>
  );
}
