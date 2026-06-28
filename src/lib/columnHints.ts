import type { CanonicalField } from './types';

export const COLUMN_HINTS: Record<CanonicalField, string[]> = {
  event_id: ['event_id', 'eventid', 'run_id', 'runid', 'algo_event_id'],
  event_date: [
    'event_date', 'event_datetime', 'signal_time', 'signal_date',
    'timestamp', 'datetime', 'date',
  ],
  osid: [
    'osid', 'stock_id', 'stockid', 'security_id', 'symbol_id',
    'ticker_id', 'id',
  ],
  bet_open_date: [
    'bet_open_date', 'open_date', 'entry_time', 'entry_date', 'bet_entry_date',
  ],
  bet_final_return: [
    'bet_final_return', 'actual_return', 'return', 'realized_return',
    'realised_return', 'pnl', 'ret', 'final_return', 'trade_return',
  ],
  est_tc: [
    'est_tc', 'transaction_cost', 'trans_cost', 'cost', 'trading_cost',
    'fees', 'tc',
  ],
  days_held: ['days_held', 'hold_days', 'holding_period', 'days', 'duration'],
  sector_group: ['sector_group', 'sector', 'gics_sector', 'industry', 'sector_code'],
  signal: ['signal', 'signal_strength', 'alpha', 'score', 'rank', 'confidence', 'model_score'],
  bet_open_weight: ['bet_open_weight', 'weight', 'position_size', 'size', 'allocation'],
  price_vs_ema20: ['price_vs_ema20', 'px_vs_ema20', 'ema20_distance', 'price_ema20'],
  price_vs_sma50: ['price_vs_sma50', 'px_vs_sma50', 'sma50_distance', 'price_sma50'],
  rlst: ['rlst', 'relative_strength', 'relative_strength_rank', 'rs_rank'],
  hotness_rank: ['hotness_rank', 'hotness', 'attention_rank', 'market_attention'],
};

export function detectMapping(
  sourceColumns: string[],
): Record<CanonicalField, { sourceColumn: string | null; confidence: 'high' | 'medium' | 'missing' }> {
  const result = {} as Record<CanonicalField, { sourceColumn: string | null; confidence: 'high' | 'medium' | 'missing' }>;
  const normalise = (s: string) => s.toLowerCase().replace(/[\s\-]/g, '_');
  const normalisedSrc = sourceColumns.map(c => ({ orig: c, norm: normalise(c) }));

  for (const [field, hints] of Object.entries(COLUMN_HINTS) as [CanonicalField, string[]][]) {
    let match: string | null = null;
    let confidence: 'high' | 'medium' | 'missing' = 'missing';

    // Exact match first
    for (const hint of hints) {
      const found = normalisedSrc.find(c => c.norm === hint);
      if (found) {
        match = found.orig;
        confidence = 'high';
        break;
      }
    }

    // Partial match fallback
    if (!match) {
      for (const hint of hints) {
        const found = normalisedSrc.find(c => c.norm.includes(hint) || hint.includes(c.norm));
        if (found) {
          match = found.orig;
          confidence = 'medium';
          break;
        }
      }
    }

    result[field] = { sourceColumn: match, confidence };
  }

  return result;
}
