import type { SignalRow, ThrottleConfig, ThrottleResult, SignalDecision } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:mm" → minutes since midnight */
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Signal's time-of-day in minutes */
function sigMins(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Returns true if a signal falls inside the window [startTime, endTime].
 *
 * Overnight support: if endTime < startTime the window wraps midnight.
 *   e.g. start=22:00, end=06:00 → in-window if timeMins >= 22:00 OR timeMins <= 06:00
 */
function isInWindow(date: Date, startMins: number, endMins: number): boolean {
  const t = sigMins(date);
  if (endMins >= startMins) {
    return t >= startMins && t <= endMins;
  } else {
    return t >= startMins || t <= endMins;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function runThrottle(signals: SignalRow[], config: ThrottleConfig): ThrottleResult {
  const startMins = timeToMinutes(config.startTime);
  const endMins   = timeToMinutes(config.endTime);

  const filteredOut:   SignalDecision[] = [];
  const outsideWindow: SignalDecision[] = [];
  const inWindow:      SignalDecision[] = [];

  for (const sig of signals) {
    const grossReturn     = sig.betFinalReturn;
    const transactionCost = sig.estTc;
    const netReturn       = grossReturn - transactionCost;

    const base: Omit<SignalDecision, 'arrivalRank' | 'status' | 'reason'> = {
      ...sig,
      grossReturn,
      transactionCost,
      netReturn,
    };

    // 1. Sector filter
    if (config.selectedSectors.size > 0 && !config.selectedSectors.has(sig.sectorName)) {
      filteredOut.push({
        ...base,
        arrivalRank: null,
        status: 'filtered_out',
        reason: `Sector "${sig.sectorName}" is filtered out.`,
      });
      continue;
    }

    // 2. Time window (overnight-aware)
    if (!isInWindow(sig.eventDate, startMins, endMins)) {
      outsideWindow.push({
        ...base,
        arrivalRank: null,
        status: 'outside_window',
        reason: sigMins(sig.eventDate) < startMins && endMins >= startMins
          ? 'Before signal window.'
          : 'After signal window.',
      });
      continue;
    }

    inWindow.push({
      ...base,
      arrivalRank: null,
      status: 'skipped',
      reason: '',
    });
  }

  // Sort in-window signals by full timestamp (overnight-safe — Date is absolute)
  const sorted = [...inWindow].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const accepted: SignalDecision[] = [];
  const skipped:  SignalDecision[] = [];

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
    totalSignals:       signals.length,
    inWindowCount:      inWindow.length,
    acceptedCount:      accepted.length,
    skippedCount:       skipped.length,
    outsideWindowCount: outsideWindow.length,
    filteredOutCount:   filteredOut.length,
  };

  return {
    totalSignals:         signals.length,
    inWindowSignals:      [...accepted, ...skipped],
    acceptedSignals:      accepted,
    skippedSignals:       skipped,
    outsideWindowSignals: outsideWindow,
    filteredOutSignals:   filteredOut,
    summary,
  };
}
