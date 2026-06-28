import type { SignalDecision, PortfolioResult, SignalPortfolioContribution, CounterfactualResult } from './types';

export function computePortfolio(
  acceptedSignals: SignalDecision[],
  positionSize: number,
): PortfolioResult {
  if (acceptedSignals.length === 0) {
    return {
      acceptedCount: 0,
      positionSize,
      grossReturn: 0,
      transactionCosts: 0,
      netReturn: 0,
      capitalDeployed: 0,
      winRate: 0,
      contributions: [],
      capitalWarning: 'none',
      costConsumedPct: null,
    };
  }

  const contributions: SignalPortfolioContribution[] = acceptedSignals.map(sig => ({
    signal: sig,
    grossContribution: sig.grossReturn * positionSize,
    costContribution: sig.transactionCost * positionSize,
    netContribution: sig.netReturn * positionSize,
  }));

  const grossReturn = contributions.reduce((s, c) => s + c.grossContribution, 0);
  const transactionCosts = contributions.reduce((s, c) => s + c.costContribution, 0);
  const netReturn = contributions.reduce((s, c) => s + c.netContribution, 0);
  const capitalDeployed = acceptedSignals.length * positionSize;
  const winRate = acceptedSignals.filter(s => s.netReturn > 0).length / acceptedSignals.length;

  let capitalWarning: 'none' | 'amber' | 'red' = 'none';
  if (capitalDeployed > 1.0) capitalWarning = 'red';
  else if (capitalDeployed > 0.8) capitalWarning = 'amber';

  let costConsumedPct: number | null = null;
  if (grossReturn > 0) {
    costConsumedPct = transactionCosts / grossReturn;
  }

  return {
    acceptedCount: acceptedSignals.length,
    positionSize,
    grossReturn,
    transactionCosts,
    netReturn,
    capitalDeployed,
    winRate,
    contributions,
    capitalWarning,
    costConsumedPct,
  };
}

export function computeCounterfactual(
  skippedSignals: SignalDecision[],
  signalCap: number,
  positionSize: number,
): CounterfactualResult {
  const n = Math.min(signalCap, skippedSignals.length);
  // Take first N skipped signals by arrival order
  const batch = [...skippedSignals]
    .sort((a, b) => (a.arrivalRank ?? 0) - (b.arrivalRank ?? 0))
    .slice(0, n);

  const netReturn = batch.reduce((s, sig) => s + sig.netReturn * positionSize, 0);

  return { n, netReturn, signals: batch };
}
