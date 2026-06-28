import type { SignalRow, ThrottleConfig, ThrottleResult, SignalDecision } from './types';

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function signalTimeMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function runThrottle(signals: SignalRow[], config: ThrottleConfig): ThrottleResult {
  const startMins = timeToMinutes(config.startTime);
  const endMins = timeToMinutes(config.endTime);

  const filteredOut: SignalDecision[] = [];
  const outsideWindow: SignalDecision[] = [];
  const inWindow: SignalDecision[] = [];

  for (const sig of signals) {
    const timeMins = signalTimeMinutes(sig.eventDate);
    const grossReturn = sig.betFinalReturn;
    const transactionCost = sig.estTc;
    const netReturn = grossReturn - transactionCost;

    // 1. Sector filter first
    if (config.selectedSectors.size > 0 && !config.selectedSectors.has(sig.sectorName)) {
      filteredOut.push({
        ...sig,
        arrivalRank: null,
        status: 'filtered_out',
        reason: `Sector "${sig.sectorName}" is filtered out.`,
        grossReturn,
        transactionCost,
        netReturn,
      });
      continue;
    }

    // 2. Time window second
    if (timeMins < startMins) {
      outsideWindow.push({
        ...sig,
        arrivalRank: null,
        status: 'outside_window',
        reason: 'Before signal window.',
        grossReturn,
        transactionCost,
        netReturn,
      });
      continue;
    }

    if (timeMins > endMins) {
      outsideWindow.push({
        ...sig,
        arrivalRank: null,
        status: 'outside_window',
        reason: 'After signal window.',
        grossReturn,
        transactionCost,
        netReturn,
      });
      continue;
    }

    // In window + selected sector
    inWindow.push({
      ...sig,
      arrivalRank: null, // will be assigned below
      status: 'skipped', // placeholder
      reason: '',
      grossReturn,
      transactionCost,
      netReturn,
    });
  }

  // 3. Apply cap — strict first come first serve, one signal at a time.
  // Within the same minute, CSV row order is the tiebreaker (data is already
  // in arrival order; sub-minute precision is not available in the source).
  const accepted: SignalDecision[] = [];
  const skipped: SignalDecision[] = [];

  // Sort by timestamp, preserving original row order for same-minute ties.
  const sorted = [...inWindow].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  let rank = 0;
  for (const sig of sorted) {
    rank++;
    if (rank <= config.signalCap) {
      accepted.push({ ...sig, arrivalRank: rank, status: 'accepted', reason: 'Accepted.' });
    } else {
      skipped.push({ ...sig, arrivalRank: rank, status: 'skipped', reason: 'Cap already full.' });
    }
  }

  const summary = {
    totalSignals: signals.length,
    inWindowCount: inWindow.length,
    acceptedCount: accepted.length,
    skippedCount: skipped.length,
    outsideWindowCount: outsideWindow.length,
    filteredOutCount: filteredOut.length,
  };

  return {
    totalSignals: signals.length,
    inWindowSignals: [...accepted, ...skipped],
    acceptedSignals: accepted,
    skippedSignals: skipped,
    outsideWindowSignals: outsideWindow,
    filteredOutSignals: filteredOut,
    summary,
  };
}
