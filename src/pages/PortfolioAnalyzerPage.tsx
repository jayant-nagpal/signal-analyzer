import type { ThrottleConfig, PortfolioResult, ScenarioHistoryItem } from '../lib/types';
import { VerdictBanner } from '../components/VerdictBanner';
import { KpiCard } from '../components/KpiCard';
import { ControlsPanel } from '../components/ControlsPanel';
import { ContributionChart } from '../components/ContributionChart';
import { SectorBreakdown } from '../components/SectorBreakdown';
import { ScenarioHistory } from '../components/ScenarioHistory';
import { formatSignedPercent, formatPercent } from '../lib/format';

interface Props {
  config: ThrottleConfig;
  positionSize: number;
  portfolioResult: PortfolioResult;
  allSectors: string[];
  scenarioHistory: ScenarioHistoryItem[];
  onConfigChange: (c: ThrottleConfig) => void;
  onPositionSizeChange: (v: number) => void;
}

function buildVerdict(p: PortfolioResult, config: ThrottleConfig): React.ReactNode {
  if (p.acceptedCount === 0) {
    return <span>No signals were accepted with these settings. Adjust the window, cap, or sector filter.</span>;
  }

  if (p.capitalWarning === 'red') {
    return (
      <span>
        <span className="v-warn">Capital deployed exceeds 100%.</span>{' '}
        Lower the cap or position size before trusting this scenario.
      </span>
    );
  }

  const netStr = (
    <span className={p.netReturn >= 0 ? 'v-pos' : 'v-neg'}>
      {formatSignedPercent(p.netReturn)}
    </span>
  );

  const costNote = p.costConsumedPct !== null ? (
    <>Transaction costs consumed <span className="v-num">{formatPercent(p.costConsumedPct)}</span> of gross return.</>
  ) : (
    <>Costs were deducted from every accepted signal.</>
  );

  return (
    <span>
      With cap=<span className="v-num">{config.signalCap}</span> and position size=
      <span className="v-num">{formatPercent(p.positionSize)}</span>, you deployed{' '}
      <span className="v-num">{formatPercent(p.capitalDeployed)}</span> of capital.
      {' '}Net portfolio return: {netStr}. {costNote}
    </span>
  );
}

export function PortfolioAnalyzerPage({
  config, positionSize, portfolioResult, allSectors, scenarioHistory,
  onConfigChange, onPositionSizeChange,
}: Props) {
  const p = portfolioResult;

  return (
    <div className="page-scroll">
      <VerdictBanner
        question="What did the accepted signals do to the portfolio?"
        answer={buildVerdict(p, config)}
      />

      <div className="portfolio-layout">
        {/* Left controls */}
        <div>
          <ControlsPanel
            config={config}
            positionSize={positionSize}
            allSectors={allSectors}
            capitalDeployed={p.capitalDeployed}
            acceptedCount={p.acceptedCount}
            capitalWarning={p.capitalWarning}
            onConfigChange={onConfigChange}
            onPositionSizeChange={onPositionSizeChange}
          />
        </div>

        {/* Right results */}
        <div className="results-panel">
          {/* KPIs */}
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KpiCard
              label="Gross return"
              value={formatSignedPercent(p.grossReturn)}
              tone={p.grossReturn >= 0 ? 'positive' : 'negative'}
              subtitle="Before costs"
            />
            <KpiCard
              label="Trading costs"
              value={`-${formatSignedPercent(p.transactionCosts).replace('+', '')}`}
              tone="negative"
              subtitle="Always deducted"
            />
            <KpiCard
              label="Net return"
              value={formatSignedPercent(p.netReturn)}
              tone={p.netReturn >= 0 ? 'positive' : 'negative'}
              subtitle="After costs"
            />
            <KpiCard
              label="Capital deployed"
              value={formatPercent(p.capitalDeployed)}
              tone={p.capitalWarning === 'red' ? 'negative' : p.capitalWarning === 'amber' ? 'warning' : 'accent'}
              subtitle={`${p.acceptedCount} × ${formatPercent(positionSize)}`}
            />
            <KpiCard
              label="Win rate"
              value={p.acceptedCount > 0 ? formatPercent(p.winRate) : '—'}
              tone={p.winRate >= 0.5 ? 'positive' : p.winRate > 0 ? 'negative' : 'neutral'}
              subtitle="Net positive signals"
            />
          </div>

          {/* Contribution chart */}
          <ContributionChart contributions={p.contributions} />

          {/* Sector breakdown */}
          {p.contributions.length > 0 && <SectorBreakdown contributions={p.contributions} />}

          {/* Scenario history */}
          {scenarioHistory.length > 0 && <ScenarioHistory history={scenarioHistory} />}
        </div>
      </div>
    </div>
  );
}
