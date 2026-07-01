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
    selectedSectors: ALL_SECTORS,
  });
  return result.acceptedSignals;
}

describe('Portfolio calculations', () => {
  it('Test 1: sample first 5 signals at 2% position => net ≈ -0.0005894', () => {
    const accepted = getAcceptedSignals(5);
    expect(accepted.length).toBe(5);
    const portfolio = computePortfolio(accepted, 0.02);
    // Expected: sum of net * 0.02
    // sig1: (-0.0095 - 0.00057) = -0.01007 * 0.02 = -0.0002014
    // sig2: (-0.0148 - 0.00069) = -0.01549 * 0.02 = -0.0003098
    // sig3: (-0.0033 - 0.00067) = -0.00397 * 0.02 = -0.0000794
    // sig4: (0.0086 - 0.00041)  = 0.00819  * 0.02 = 0.0001638
    // sig5: (-0.0076 - 0.00053) = -0.00813 * 0.02 = -0.0001626
    // Total ≈ -0.0005894
    expect(portfolio.netReturn).toBeCloseTo(-0.0005894, 5);
  });

  it('Test 2: capital deployed = accepted count * position size', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted, 0.02);
    expect(portfolio.capitalDeployed).toBeCloseTo(0.10, 6);
  });

  it('Test 3: win rate counts netReturn > 0', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted, 0.02);
    const wins = accepted.filter(s => s.netReturn > 0).length;
    expect(portfolio.winRate).toBeCloseTo(wins / accepted.length, 6);
  });

  it('Test 4: transaction costs always deducted', () => {
    const accepted = getAcceptedSignals(5);
    const portfolio = computePortfolio(accepted, 0.02);
    expect(portfolio.transactionCosts).toBeGreaterThan(0);
    expect(portfolio.netReturn).toBeLessThan(portfolio.grossReturn);
  });

  it('Test 5: no accepted signals returns safe zero values', () => {
    const portfolio = computePortfolio([], 0.02);
    expect(portfolio.acceptedCount).toBe(0);
    expect(portfolio.grossReturn).toBe(0);
    expect(portfolio.netReturn).toBe(0);
    expect(portfolio.capitalDeployed).toBe(0);
    expect(portfolio.winRate).toBe(0);
    expect(portfolio.contributions).toHaveLength(0);
  });
});
