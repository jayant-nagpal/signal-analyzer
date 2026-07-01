import { describe, it, expect } from 'vitest';
import { computePortfolio } from '../lib/portfolio';
import { runThrottle } from '../lib/throttle';
import { normalizeRows } from '../lib/normalize';
import { buildInitialMapping } from '../lib/mapping';
import { SAMPLE_RAW_ROWS } from '../data/sampleSignals';

const SAMPLE_COLUMNS = [
  'event_id', 'event_date', 'osid', 'bet_final_return', 'est_tc',
  'days_held', 'sector_group', 'signal', 'bet_open_weight',
];

const ALL_SECTORS = new Set([
  'Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples',
  'Healthcare','Financials','Information Technology','Communication Services','Utilities','Real Estate'
]);

function getAcceptedSignals(cap: number) {
  const mapping = buildInitialMapping(SAMPLE_COLUMNS);
  const { signals } = normalizeRows(SAMPLE_RAW_ROWS, mapping, 'test', true);
  const inEvent = signals.filter(s => s.eventId === '100003');
  const result = runThrottle(inEvent, {
    startTime: '12:15',
    endTime: '13:15',
    signalCap: cap,
    holdingPeriodMins: 0,
    selectedSectors: ALL_SECTORS,
  });
  return result.acceptedSignals;
}

describe('Portfolio calculations', () => {
  it('Test 1: sample first 5 signals — net return is sum of (netReturn * |betOpenWeight|)', () => {
    const accepted = getAcceptedSignals(5);
    expect(accepted.length).toBe(5);
    const portfolio = computePortfolio(accepted);
    // position size comes from bet_open_weight (0.02 per signal)
    // net return = sum of sig.netReturn * Math.abs(sig.betOpenWeight ?? 0.02)
    const expected = accepted.reduce((sum, s) => {
      const pos = Math.abs(s.betOpenWeight ?? 0.02);
      return sum + (s.netReturn ?? 0) * pos;
    }, 0);
    expect(portfolio.netReturn).toBeCloseTo(expected, 5);
  });

  it('Test 2: capital deployed = sum of |betOpenWeight| across accepted signals', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted);
    const expected = accepted.reduce((sum, s) => sum + Math.abs(s.betOpenWeight ?? 0.02), 0);
    expect(portfolio.capitalDeployed).toBeCloseTo(expected, 6);
  });

  it('Test 3: win rate counts netReturn > 0', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted);
    const wins = accepted.filter(s => s.netReturn > 0).length;
    expect(portfolio.winRate).toBeCloseTo(wins / accepted.length, 6);
  });

  it('Test 4: transaction costs always deducted', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted);
    expect(portfolio.transactionCosts).toBeGreaterThan(0);
    expect(portfolio.netReturn).toBeLessThan(portfolio.grossReturn);
  });

  it('Test 5: no accepted signals returns safe zero values', () => {
    const portfolio = computePortfolio([]);
    expect(portfolio.acceptedCount).toBe(0);
    expect(portfolio.grossReturn).toBe(0);
    expect(portfolio.netReturn).toBe(0);
    expect(portfolio.capitalDeployed).toBe(0);
    expect(portfolio.winRate).toBe(0);
    expect(portfolio.contributions).toHaveLength(0);
  });
});
