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

  // 3. Apply cap — first come first serve, group same timestamps
  const accepted: SignalDecision[] = [];
  const skipped: SignalDecision[] = [];
  let rank = 0;

  // Group inWindow by timestamp
  const groups: Map<number, SignalDecision[]> = new Map();
  for (const sig of inWindow) {
    const ts = sig.eventDate.getTime();
    if (!groups.has(ts)) groups.set(ts, []);
    groups.get(ts)!.push(sig);
  }

  const sortedTimestamps = [...groups.keys()].sort((a, b) => a - b);

  for (const ts of sortedTimestamps) {
    const group = groups.get(ts)!;
    if (rank >= config.signalCap) {
      // Cap already full — skip entire group
      for (const sig of group) {
        skipped.push({ ...sig, arrivalRank: rank + 1, status: 'skipped', reason: 'Cap already full.' });
      }
    } else {
      // Accept entire group (tie rule)
      for (const sig of group) {
        rank++;
        accepted.push({ ...sig, arrivalRank: rank, status: 'accepted', reason: 'Accepted.' });
      }
    }
  }

  // Re-rank skipped in arrival order
  let skipRank = rank + 1;
  for (const sig of skipped) {
    sig.arrivalRank = skipRank++;
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
