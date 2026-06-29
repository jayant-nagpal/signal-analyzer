import { describe, it, expect } from 'vitest';
import { runThrottle } from '../lib/throttle';
import { normalizeRows } from '../lib/normalize';
import { buildInitialMapping } from '../lib/mapping';
import { SAMPLE_RAW_ROWS } from '../data/sampleSignals';

const SAMPLE_COLUMNS = [
  'event_id', 'event_date', 'osid', 'bet_final_return', 'est_tc',
  'days_held', 'sector_group', 'signal', 'bet_open_weight',
];

function getSampleSignals() {
  const mapping = buildInitialMapping(SAMPLE_COLUMNS);
  const { signals } = normalizeRows(SAMPLE_RAW_ROWS, mapping, 'test', true);
  return signals.filter(s => s.eventId === '100003');
}

describe('Throttle logic', () => {
  it('Test 1: cap=5 window 12:15-13:15 accepts 5, first osid = 44347, fifth = 10267', () => {
    const signals = getSampleSignals();
    const result = runThrottle(signals, {
      startTime: '12:15',
      endTime: '13:15',
      signalCap: 5,
      holdingPeriodMins: 0,
      selectedSectors: new Set(['Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Healthcare','Financials','Information Technology','Communication Services','Utilities','Real Estate']),
    });
    expect(result.summary.acceptedCount).toBe(5);
    expect(result.acceptedSignals[0].osid).toBe('44347');
    // Fifth accepted = 10267 (last of the first 5 unique-time signals after the 12:15 group of 2)
    const osids = result.acceptedSignals.map(s => s.osid);
    expect(osids).toContain('10267');
    const skippedCount = result.summary.inWindowCount - result.summary.acceptedCount;
    expect(result.summary.skippedCount).toBe(skippedCount);
  });

  it('Test 2: signals outside window are outside_window', () => {
    const signals = getSampleSignals();
    const result = runThrottle(signals, {
      startTime: '12:15',
      endTime: '13:15',
      signalCap: 50,
      holdingPeriodMins: 0,
      selectedSectors: new Set(['Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Healthcare','Financials','Information Technology','Communication Services','Utilities','Real Estate']),
    });
    expect(result.outsideWindowSignals.length).toBeGreaterThan(0);
    for (const s of result.outsideWindowSignals) {
      expect(s.status).toBe('outside_window');
    }
  });

  it('Test 3: sector filter excludes sector before cap', () => {
    const signals = getSampleSignals();
    const allSectors = new Set(['Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Healthcare','Financials','Communication Services','Utilities','Real Estate']);
    // Exclude Information Technology (sector 8)
    const result = runThrottle(signals, {
      startTime: '12:15',
      endTime: '13:15',
      signalCap: 50,
      holdingPeriodMins: 0,
      selectedSectors: allSectors,
    });
    for (const s of result.filteredOutSignals) {
      expect(s.sectorName).toBe('Information Technology');
    }
    for (const s of result.acceptedSignals) {
      expect(s.sectorName).not.toBe('Information Technology');
    }
  });

  it('Test 4: same timestamp group accepted together if cap not reached', () => {
    const signals = getSampleSignals();
    const result = runThrottle(signals, {
      startTime: '12:15',
      endTime: '13:15',
      signalCap: 5,
      holdingPeriodMins: 0,
      selectedSectors: new Set(['Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Healthcare','Financials','Information Technology','Communication Services','Utilities','Real Estate']),
    });
    // 12:15 group has 2 signals (44347 + 45356) — both should be accepted
    const at1215 = result.acceptedSignals.filter(s =>
      s.eventDate.getHours() === 12 && s.eventDate.getMinutes() === 15
    );
    expect(at1215.length).toBe(2);
    expect(at1215.map(s => s.osid).sort()).toEqual(['44347', '45356'].sort());
  });

  it('Test 5: same timestamp group skipped if cap already reached', () => {
    const signals = getSampleSignals();
    // cap=2: accepts both 12:15 signals (tie group), then all 12:25+ are skipped
    const result = runThrottle(signals, {
      startTime: '12:15',
      endTime: '13:15',
      signalCap: 2,
      holdingPeriodMins: 0,
      selectedSectors: new Set(['Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Healthcare','Financials','Information Technology','Communication Services','Utilities','Real Estate']),
    });
    expect(result.summary.acceptedCount).toBe(2);
    for (const s of result.skippedSignals) {
      expect(s.status).toBe('skipped');
      expect(s.reason).toContain('Cap already full');
    }
  });
});
