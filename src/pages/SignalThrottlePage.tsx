import type { ThrottleResult, CounterfactualResult } from '../lib/types';
import { VerdictBanner } from '../components/VerdictBanner';
import { KpiCard } from '../components/KpiCard';
import { SignalTimeline } from '../components/SignalTimeline';
import { SignalTable } from '../components/SignalTable';
import { formatSignedPercent } from '../lib/format';

interface Props {
  throttleResult: ThrottleResult;
  counterfactual: CounterfactualResult | null;
  windowStart: string;
  windowEnd: string;
}

function buildVerdict(result: ThrottleResult): React.ReactNode {
  const { acceptedCount, inWindowCount, skippedCount, outsideWindowCount } = result.summary;

  if (inWindowCount === 0) {
    return <span>No signals arrived inside this window. Widen the time window or check the event_date mapping.</span>;
  }

  if (acceptedCount === 0) {
    return <span>No signals were accepted. Adjust the time window, sector filter, or cap.</span>;
  }

  return (
    <span>
      <span className="v-num">{inWindowCount}</span> signals arrived inside the window.
      You accepted <span className="v-num">{acceptedCount}</span> first come first serve.{' '}
      {skippedCount > 0 && <><span className="v-num">{skippedCount}</span> {skippedCount === 1 ? 'was' : 'were'} skipped. </>}
      {outsideWindowCount > 0 && <><span className="v-num">{outsideWindowCount}</span> {outsideWindowCount === 1 ? 'was' : 'were'} outside the window.</>}
    </span>
  );
}

export function SignalThrottlePage({ throttleResult, counterfactual, windowStart, windowEnd }: Props) {
  const { summary, acceptedSignals, skippedSignals, outsideWindowSignals, filteredOutSignals } = throttleResult;

  const allTimelineSignals = [
    ...acceptedSignals,
    ...skippedSignals,
    ...outsideWindowSignals,
  ];

  const counterfactualFooter = counterfactual && counterfactual.n > 0 ? (
    <div className="counterfactual-box">
      <div className="counterfactual-main">
        If you had taken the next{' '}
        <strong>{counterfactual.n}</strong> skipped signal{counterfactual.n !== 1 ? 's' : ''} instead,
        portfolio return would have been{' '}
        <span className={counterfactual.netReturn >= 0 ? 'td-pos' : 'td-neg'} style={{ fontFamily: 'var(--font-mono)' }}>
          {formatSignedPercent(counterfactual.netReturn)}
        </span>.
      </div>
      <div className="counterfactual-note">
        Counterfactual only. The throttle does not know future returns.
      </div>
    </div>
  ) : null;

  return (
    <div className="page-scroll">
      <VerdictBanner
        question="Which signals would we actually trade under the cap?"
        answer={buildVerdict(throttleResult)}
      />

      {/* KPI Summary */}
      <div className="kpi-grid">
        <KpiCard label="Total signals" value={summary.totalSignals} tone="neutral" />
        <KpiCard label="In window" value={summary.inWindowCount} tone="accent" />
        <KpiCard label="Accepted" value={summary.acceptedCount} tone={summary.acceptedCount > 0 ? 'positive' : 'neutral'} />
        <KpiCard label="Skipped" value={summary.skippedCount} tone={summary.skippedCount > 0 ? 'negative' : 'neutral'} />
        <KpiCard label="Outside window" value={summary.outsideWindowCount} tone="neutral" />
        {summary.filteredOutCount > 0 && (
          <KpiCard label="Filtered by sector" value={summary.filteredOutCount} tone="warning" />
        )}
      </div>

      {/* Timeline */}
      {allTimelineSignals.length > 0 && (
        <SignalTimeline
          signals={allTimelineSignals}
          windowStart={windowStart}
          windowEnd={windowEnd}
        />
      )}

      {/* Accepted signals */}
      <SignalTable
        title="Accepted signals"
        subtitle="First come, first serve. The throttle does not look ahead."
        signals={acceptedSignals}
      />

      {/* Skipped signals */}
      <SignalTable
        title="Skipped signals"
        subtitle="These arrived after the cap was full."
        signals={skippedSignals}
        collapsible
        defaultCollapsed={false}
        footer={counterfactualFooter}
      />

      {/* Outside window */}
      {outsideWindowSignals.length > 0 && (
        <SignalTable
          title="Outside window"
          subtitle="Signals before or after the selected time window."
          signals={outsideWindowSignals}
          collapsible
          defaultCollapsed
        />
      )}

      {/* Filtered out */}
      {filteredOutSignals.length > 0 && (
        <SignalTable
          title="Filtered by sector"
          subtitle="These sectors were toggled off and did not take cap slots."
          signals={filteredOutSignals}
          collapsible
          defaultCollapsed
        />
      )}
    </div>
  );
}
