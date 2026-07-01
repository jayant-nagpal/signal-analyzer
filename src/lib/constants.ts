import type { CanonicalField } from './types';

export const REQUIRED_FIELDS: CanonicalField[] = [
  'event_date',
  'osid',
  'bet_final_return',
  'est_tc',
  'sector_group',
];

export const RECOMMENDED_FIELDS: CanonicalField[] = [
  'event_id',
  'days_held',
  'signal',
  'bet_open_weight',
];

export const SECTOR_MAP: Record<number, string> = {
  1: 'Energy',
  2: 'Materials',
  3: 'Industrials',
  4: 'Consumer Discretionary',
  5: 'Consumer Staples',
  6: 'Healthcare',
  7: 'Financials',
  8: 'Information Technology',
  9: 'Communication Services',
  10: 'Utilities',
  11: 'Real Estate',
};

export const DEFAULT_CAP = 5;
export const DEFAULT_POSITION_SIZE = 0.02;
export const DEFAULT_START_TIME = '12:15';
export const DEFAULT_END_TIME = '13:15';
export const DEFAULT_HOLDING_PERIOD_MINS = 0; // 0 = disabled (classic mode)
