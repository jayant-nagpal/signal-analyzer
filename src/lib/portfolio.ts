import type { SignalDecision, PortfolioResult, SignalPortfolioContribution, CounterfactualResult, BestCapResult } from './types';

// Position size comes from bet_open_weight in the file.
// If a signal has no bet_open_weight, fall back to DEFAULT_POSITION_SIZE.
const DEFAULT_POSITION_SIZE = 0.02; // 2%

function getPositionSize(sig: SignalDecision): number {
  return sig.betOpenWeight != null ? Math.abs(sig.betOpenWeight) : DEFAULT_POSITION_SIZE;
}

export function computePortfolio(acceptedSignals: SignalDecision[]): PortfolioResult {
  if (acceptedSignals.length === 0) {
    return {
      acceptedCount: 0,
      positionSize: DEFAULT_POSITION_SIZE,
      grossReturn: 0,
      transactionCosts: 0,
      netReturn: 0,
      capitalDeployed: 0,
      winRate: 0,
      stopLossCount: 0,
      contributions: [],
      capitalWarning: 'none',
      costConsumedPct: null,
    };
  }

  const contributions: SignalPortfolioContribution[] = acceptedSignals.map(sig => {
    const ps = getPositionSize(sig);
    return {
      signal: sig,
      positionSize: ps,
      grossContribution: sig.grossReturn * ps,
      costContribution: sig.transactionCost * ps,
      netContribution: sig.netReturn * ps,
    };
  });

  const grossReturn = contributions.reduce((s, c) => s + c.grossContribution, 0);
  const transactionCosts = contributions.reduce((s, c) => s + c.costContribution, 0);
  const netReturn = contributions.reduce((s, c) => s + c.netContribution, 0);
  const capitalDeployed = contributions.reduce((s, c) => s + c.positionSize, 0);
  const winRate = acceptedSignals.filter(s => s.netReturn > 0).length / acceptedSignals.length;
  const stopLossCount = acceptedSignals.filter(s => s.exitType === -1).length;
  const avgPositionSize = capitalDeployed / acceptedSignals.length;

  let capitalWarning: 'none' | 'amber' | 'red' = 'none';
  if (capitalDeployed > 1.0) capitalWarning = 'red';
  else if (capitalDeployed > 0.8) capitalWarning = 'amber';

  let costConsumedPct: number | null = null;
  if (grossReturn > 0) costConsumedPct = transactionCosts / grossReturn;

  return {
    acceptedCount: acceptedSignals.length,
    positionSize: avgPositionSize,
    grossReturn,
    transactionCosts,
    netReturn,
    capitalDeployed,
    winRate,
    stopLossCount,
    contributions,
    capitalWarning,
    costConsumedPct,
  };
}

export function computeCounterfactual(
  skippedSignals: SignalDecision[],
  signalCap: number,
): CounterfactualResult {
  const n = Math.min(signalCap, skippedSignals.length);
  const batch = [...skippedSignals]
    .sort((a, b) => (a.arrivalRank ?? 0) - (b.arrivalRank ?? 0))
    .slice(0, n);
  const netReturn = batch.reduce((s, sig) => s + sig.netReturn * getPositionSize(sig), 0);
  return { n, netReturn, signals: batch };
}

export function computeBestCap(inWindowSignals: SignalDecision[]): BestCapResult {
  const sorted = [...inWindowSignals].sort((a, b) => (a.arrivalRank ?? 0) - (b.arrivalRank ?? 0));
  let bestCap = 1;
  let bestNet = -Infinity;
  let bestAccepted = 0;

  for (let cap = 1; cap <= sorted.length; cap++) {
    const batch = sorted.slice(0, cap);
    const net = batch.reduce((s, sig) => s + sig.netReturn * getPositionSize(sig), 0);
    if (net > bestNet) {
      bestNet = net;
      bestCap = cap;
      bestAccepted = cap;
    }
  }

  return { cap: bestCap, netReturn: bestNet, acceptedCount: bestAccepted };
}
