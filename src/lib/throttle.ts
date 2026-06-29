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
 *   e.g. start=12:15, end=06:55 → in-window if timeMins >= 12:15 OR timeMins <= 06:55
 *
 * Same-day: start=12:15, end=13:15 → in-window if 12:15 <= timeMins <= 13:15
 */
function isInWindow(date: Date, startMins: number, endMins: number): boolean {
  const t = sigMins(date);
  if (endMins >= startMins) {
    // Normal same-day window
    return t >= startMins && t <= endMins;
  } else {
    // Overnight window (e.g. 22:00 → 06:00)
    return t >= startMins || t <= endMins;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function runThrottle(signals: SignalRow[], config: ThrottleConfig): ThrottleResult {
  const startMins = timeToMinutes(config.startTime);
  const endMins   = timeToMinutes(config.endTime);
  const holdMins  = config.holdingPeriodMins ?? 0;

  const filteredOut:    SignalDecision[] = [];
  const outsideWindow:  SignalDecision[] = [];
  const inWindow:       SignalDecision[] = [];

  for (const sig of signals) {
    const grossReturn     = sig.betFinalReturn;
    const transactionCost = sig.estTc;
    const netReturn       = grossReturn - transactionCost;

    const base: Omit<SignalDecision, 'arrivalRank' | 'status' | 'reason' | 'batchIndex'> = {
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
        batchIndex: null,
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
        batchIndex: null,
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
      batchIndex: null,
      status: 'skipped',
      reason: '',
    });
  }

  // Sort in-window signals by full timestamp (overnight-safe because Date is absolute)
  const sorted = [...inWindow].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const accepted:     SignalDecision[] = [];
  const skipped:      SignalDecision[] = [];
  const ignoredHold:  SignalDecision[] = [];

  if (holdMins === 0) {
    // ── Classic mode: no holding period ──────────────────────────────────────
    let rank = 0;
    for (const sig of sorted) {
      rank++;
      if (rank <= config.signalCap) {
        accepted.push({ ...sig, arrivalRank: rank, batchIndex: 1, status: 'accepted', reason: 'Accepted.' });
      } else {
        skipped.push({ ...sig, arrivalRank: rank, batchIndex: null, status: 'skipped', reason: 'Cap already full.' });
      }
    }
  } else {
    // ── Holding period mode ───────────────────────────────────────────────────
    // State machine:
    //   - holdUntilMs: epoch ms when the current hold expires (0 = not holding)
    //   - batchCap: slots remaining in current batch
    //   - batchIdx: which batch we're in
    //
    // Rules:
    //   - When holdUntilMs === 0, we are looking for signals (up to cap per batch).
    //   - Each accepted signal starts/extends the hold: hold until
    //     FIRST accepted signal's time + holdMins.
    //   - During the hold window, ALL subsequent signals are ignored_hold.
    //   - After hold expires, open a new batch (new cap).
    //   - Skipped = arrived when we were looking but batch cap already full.

    let holdUntilMs  = 0;   // 0 = not holding
    let batchStart   = 0;   // timestamp of first accepted in current batch
    let batchCap     = 0;   // remaining slots in current batch
    let batchIdx     = 0;
    let globalRank   = 0;

    for (const sig of sorted) {
      const sigMs = sig.eventDate.getTime();

      // Check if hold has expired
      if (holdUntilMs > 0 && sigMs > holdUntilMs) {
        // Hold elapsed — open a fresh batch
        holdUntilMs = 0;
        batchCap    = 0;
        batchStart  = 0;
      }

      if (holdUntilMs > 0) {
        // We are inside a hold window — ignore this signal
        ignoredHold.push({
          ...sig,
          arrivalRank: null,
          batchIndex: null,
          status: 'ignored_hold',
          reason: `In holding period until ${new Date(holdUntilMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}.`,
        });
        continue;
      }

      // We are in "looking" mode
      if (batchCap === 0) {
        // Start a fresh batch
        batchIdx++;
        batchCap = config.signalCap;
      }

      globalRank++;

      if (batchCap > 0) {
        // Accept
        if (batchStart === 0) {
          // First accepted in this batch — set hold timer
          batchStart  = sigMs;
          holdUntilMs = sigMs + holdMins * 60_000;
        }
        batchCap--;
        accepted.push({
          ...sig,
          arrivalRank: globalRank,
          batchIndex: batchIdx,
          status: 'accepted',
          reason: `Accepted (batch ${batchIdx}).`,
        });
      } else {
        skipped.push({
          ...sig,
          arrivalRank: globalRank,
          batchIndex: null,
          status: 'skipped',
          reason: `Cap full in batch ${batchIdx}.`,
        });
      }
    }
  }

  const summary = {
    totalSignals:     signals.length,
    inWindowCount:    inWindow.length,
    acceptedCount:    accepted.length,
    skippedCount:     skipped.length,
    outsideWindowCount: outsideWindow.length,
    filteredOutCount: filteredOut.length,
    ignoredHoldCount: ignoredHold.length,
    batchCount:       holdMins > 0 ? Math.max(...accepted.map(s => s.batchIndex ?? 0), 0) : (accepted.length > 0 ? 1 : 0),
  };

  return {
    totalSignals: signals.length,
    inWindowSignals: [...accepted, ...skipped],
    acceptedSignals: accepted,
    skippedSignals:  skipped,
    outsideWindowSignals: outsideWindow,
    filteredOutSignals:   filteredOut,
    ignoredHoldSignals:   ignoredHold,
    summary,
  };
}
