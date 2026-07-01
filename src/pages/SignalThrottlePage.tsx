import type { ThrottleResult, CounterfactualResult, PortfolioResult, BestCapResult } from '../lib/types';
import { VerdictBanner } from '../components/VerdictBanner';
import { KpiCard } from '../components/KpiCard';
import { SignalTimeline } from '../components/SignalTimeline';
import { SignalTable } from '../components/SignalTable';
import { formatSignedPercent, formatPercent } from '../lib/format';

interface Props {
  throttleResult: ThrottleResult;
  portfolioResult: PortfolioResult;
  counterfactual: CounterfactualResult | null;
  bestCap: BestCapResult | null;
  windowStart: string;
  windowEnd: string;
  signalCap: number;
}

function buildVerdict(result: ThrottleResult, portfolio: PortfolioResult): React.ReactNode {
  const { acceptedCount, skippedCount, inWindowCount, outsideWindowCount } = result.summary;

  if (inWindowCount === 0) {
    return (
      <span>No signals arrived inside this window. Widen the time window or check your event_date column.</span>
    );
  }

  const capWarn = portfolio.capitalWarning === 'red'
    ? <span className="v-warn"> Capital exceeds 100%.</span>
    : portfolio.capitalWarning === 'amber'
    ? <span className="v-warn-amber"> Over 80% of portfolio deployed.</span>
    : null;

  const stopWarn = portfolio.stopLossCount > 0
    ? <span className="v-warn-amber"> {portfolio.stopLossCount} stop-loss exit{portfolio.stopLossCount > 1 ? 's' : ''} in accepted set.</span>
    : null;

  return (
    <span>
      <span className="v-num">{inWindowCount}</span> in window.{' '}
      Accepted <span className="v-num v-pos">{acceptedCount}</span>.{' '}
      Skipped <span className="v-num v-neg">{skippedCount}</span>.{' '}
      <span className="v-num">{outsideWindowCount}</span> outside window.
      {capWarn}
      {stopWarn}
    </span>
  );
}

export function SignalThrottlePage({
  throttleResult,
  portfolioResult,
  counterfactual,
  bestCap,
  windowStart,
  windowEnd,
  signalCap,
}: Props) {
  const { summary, acceptedSignals, skippedSignals, outsideWindowSignals, filteredOutSignals } = throttleResult;

  const allTimelineSignals = [
    ...acceptedSignals,
    ...skippedSignals,
    ...outsideWindowSignals,
  ];

  // Counterfactual box
  const skippedCounterfactual = (
    <>
      {counterfactual && counterfactual.n > 0 && (
        <div className="counterfactual-box">
          <div className="counterfactual-main">
            If you had taken the next <strong>{counterfactual.n}</strong> skipped signal{counterfactual.n !== 1 ? 's' : ''} instead,
            net return would have been{' '}
            <span
              className={counterfactual.netReturn >= 0 ? 'td-pos' : 'td-neg'}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatSignedPercent(counterfactual.netReturn)}
            </span>.
          </div>
          <div className="counterfactual-note">
            Counterfactual only. The throttle does not know future returns.
          </div>
        </div>
      )}
      {bestCap && bestCap.cap !== signalCap && (
        <div className="counterfactual-box" style={{ marginTop: counterfactual && counterfactual.n > 0 ? 8 : 0 }}>
          <div className="counterfactual-main">
            Best cap across all options:{' '}
            <strong>cap = {bestCap.cap}</strong> →{' '}
            <span
              className={bestCap.netReturn >= 0 ? 'td-pos' : 'td-neg'}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatSignedPercent(bestCap.netReturn)}
            </span>
            {' '}net ({bestCap.acceptedCount} signals).
          </div>
          <div className="counterfactual-note">
            Counterfactual only. The throttle does not know future returns.
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="page-scroll">
      <VerdictBanner
        question="Which signals would we actually trade under the cap?"
        answer={buildVerdict(throttleResult, portfolioResult)}
      />

      {/* KPI grid */}
      <div className="kpi-grid">
        <KpiCard label="Total signals" value={summary.totalSignals} tone="neutral" />
        <KpiCard label="In window" value={summary.inWindowCount} tone="accent" />
        <KpiCard label="Accepted" value={summary.acceptedCount} tone={summary.acceptedCount > 0 ? 'positive' : 'neutral'} />
        <KpiCard label="Skipped" value={summary.skippedCount} tone={summary.skippedCount > 0 ? 'negative' : 'neutral'} />
        <KpiCard label="Outside window" value={summary.outsideWindowCount} tone="neutral" />
        {summary.filteredOutCount > 0 && (
          <KpiCard label="Sector filtered" value={summary.filteredOutCount} tone="warning" />
        )}
      </div>

      {/* Net return + capital — from file, not computed */}
      {portfolioResult.acceptedCount > 0 && (
        <div className="kpi-grid" style={{ marginTop: 0 }}>
          <KpiCard
            label="Net return"
            value={formatSignedPercent(portfolioResult.netReturn)}
            tone={portfolioResult.netReturn >= 0 ? 'positive' : 'negative'}
          />
          <KpiCard
            label="Gross return"
            value={formatSignedPercent(portfolioResult.grossReturn)}
            tone="neutral"
          />
          <KpiCard
            label="Transaction costs"
            value={formatSignedPercent(portfolioResult.transactionCosts)}
            tone="warning"
          />
          <KpiCard
            label="Capital deployed"
            value={formatPercent(portfolioResult.capitalDeployed)}
            tone={portfolioResult.capitalWarning === 'red' ? 'negative' : portfolioResult.capitalWarning === 'amber' ? 'warning' : 'neutral'}
          />
          <KpiCard
            label="Win rate"
            value={formatPercent(portfolioResult.winRate)}
            tone={portfolioResult.winRate >= 0.5 ? 'positive' : 'negative'}
          />
          {portfolioResult.stopLossCount > 0 && (
            <KpiCard
              label="Stop-loss exits"
              value={portfolioResult.stopLossCount}
              tone="warning"
            />
          )}
        </div>
      )}

      {/* Timeline */}
      {allTimelineSignals.length > 0 && (
        <SignalTimeline
          signals={allTimelineSignals}
          windowStart={windowStart}
          windowEnd={windowEnd}
        />
      )}

      {/* Accepted */}
      <SignalTable
        title="Accepted signals"
        subtitle="First come, first serve. The throttle does not look ahead."
        signals={acceptedSignals}
      />

      {/* Skipped */}
      <SignalTable
        title={`Skipped signals (${summary.skippedCount})`}
        subtitle="These arrived after the cap was full."
        signals={skippedSignals}
        collapsible
        defaultCollapsed={false}
        footer={skippedCounterfactual}
      />

      {/* Outside window */}
      {outsideWindowSignals.length > 0 && (
        <SignalTable
          title={`Outside window (${outsideWindowSignals.length})`}
          subtitle="Signals before or after the selected time window. Not counted."
          signals={outsideWindowSignals}
          collapsible
          defaultCollapsed
        />
      )}

      {/* Sector filtered */}
      {filteredOutSignals.length > 0 && (
        <SignalTable
          title={`Sector filtered (${filteredOutSignals.length})`}
          subtitle="These sectors were toggled off."
          signals={filteredOutSignals}
          collapsible
          defaultCollapsed
        />
      )}
    </div>
  );
}
