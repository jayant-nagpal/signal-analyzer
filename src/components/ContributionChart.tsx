import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { SignalPortfolioContribution } from '../lib/types';
import { formatSignedPercent, formatSector } from '../lib/format';

interface Props {
  contributions: SignalPortfolioContribution[];
}

interface ChartDatum {
  osid: string;
  value: number;
  sector: string;
  gross: number;
  tc: number;
  net: number;
  posSize: number;
}

export function ContributionChart({ contributions }: Props) {
  if (contributions.length === 0) {
    return (
      <div className="chart-wrap">
        <div className="chart-title">Contribution to portfolio (%)</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '20px 0' }}>No accepted signals.</div>
      </div>
    );
  }

  const data: ChartDatum[] = [...contributions]
    .sort((a, b) => b.netContribution - a.netContribution)
    .map(c => ({
      osid: c.signal.osid,
      value: parseFloat((c.netContribution * 100).toFixed(4)),
      sector: c.signal.sectorName,
      gross: c.signal.grossReturn,
      tc: c.signal.transactionCost,
      net: c.signal.netReturn,
      posSize: c.signal.betFinalReturn, // use actual return for tooltip context
    }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{payload: ChartDatum}> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="timeline-tooltip" style={{ position: 'relative', left: 0, top: 0 }}>
        <div className="tt-row"><span className="tt-label">OSID</span><span className="tt-value">{d.osid}</span></div>
        <div className="tt-row"><span className="tt-label">Sector</span><span className="tt-value">{formatSector(d.sector)}</span></div>
        <div className="tt-row"><span className="tt-label">Gross return</span><span className={`tt-value ${d.gross >= 0 ? 'pos' : 'neg'}`}>{formatSignedPercent(d.gross)}</span></div>
        <div className="tt-row"><span className="tt-label">Trading cost</span><span className="tt-value neg">-{formatSignedPercent(d.tc).replace('+', '')}</span></div>
        <div className="tt-row"><span className="tt-label">Net return</span><span className={`tt-value ${d.net >= 0 ? 'pos' : 'neg'}`}>{formatSignedPercent(d.net)}</span></div>
        <div className="tt-row"><span className="tt-label">Portfolio contribution</span><span className={`tt-value ${d.value >= 0 ? 'pos' : 'neg'}`}>{d.value >= 0 ? '+' : ''}{d.value.toFixed(4)}%</span></div>
      </div>
    );
  };

  return (
    <div className="chart-wrap">
      <div className="chart-title">Contribution to portfolio (%)</div>
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 32 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 50 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={v => `${v}%`}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="osid"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine x={0} stroke="var(--border-strong)" />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
