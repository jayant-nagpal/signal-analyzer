// ─── Core Data Types ──────────────────────────────────────────────────────────

export interface SignalRow {
  rowId: string;
  eventId: string;
  eventDate: Date;
  osid: string;
  betOpenDate?: Date | null;
  betCloseDate?: Date | null;
  betFinalReturn: number;
  estTc: number;
  daysHeld?: number | null;
  exitType?: 0 | -1 | null; // 0 = normal, -1 = stop-loss
  sectorCode?: number | null;
  sectorName: string;
  signal?: number | null;
  betOpenWeight?: number | null; // e.g. 0.02 = long 2%, -0.02 = short 2%
  betType?: string | null; // 'Active' | 'New' | 'Close'
  priceVsEma20?: number | null;
  priceVsSma50?: number | null;
  rlst?: number | null;
  hotnessRank?: number | null;
  liquidityRank?: number | null;
  wLiq?: number | null;
  sourceRow: Record<string, unknown>;
}

export interface SignalDecision extends SignalRow {
  arrivalRank: number | null;
  status: 'accepted' | 'skipped' | 'outside_window' | 'filtered_out' | 'ignored_hold';
  reason: string;
  grossReturn: number;
  transactionCost: number;
  netReturn: number;
  batchIndex: number | null; // which holding-period batch accepted this signal (null if not accepted)
}

// ─── Throttle ─────────────────────────────────────────────────────────────────

export interface ThrottleConfig {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  signalCap: number;
  holdingPeriodMins: number; // 0 = no holding period (classic mode)
  selectedSectors: Set<string>;
}

export interface ThrottleSummary {
  totalSignals: number;
  inWindowCount: number;
  acceptedCount: number;
  skippedCount: number;
  outsideWindowCount: number;
  filteredOutCount: number;
  ignoredHoldCount: number;
  batchCount: number; // how many holding-period batches fired
}

export interface ThrottleResult {
  totalSignals: number;
  inWindowSignals: SignalDecision[];
  acceptedSignals: SignalDecision[];
  skippedSignals: SignalDecision[];
  outsideWindowSignals: SignalDecision[];
  filteredOutSignals: SignalDecision[];
  ignoredHoldSignals: SignalDecision[];
  summary: ThrottleSummary;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
// Position size comes from bet_open_weight in the file (not a slider)

export interface SignalPortfolioContribution {
  signal: SignalDecision;
  positionSize: number;      // abs(bet_open_weight) per signal
  grossContribution: number;
  costContribution: number;
  netContribution: number;
}

export interface PortfolioResult {
  acceptedCount: number;
  positionSize: number;       // avg abs(bet_open_weight) across accepted signals
  grossReturn: number;
  transactionCosts: number;
  netReturn: number;
  capitalDeployed: number;    // sum of abs(bet_open_weight) across accepted
  winRate: number;
  stopLossCount: number;      // signals with exitType = -1
  contributions: SignalPortfolioContribution[];
  capitalWarning: 'none' | 'amber' | 'red';
  costConsumedPct: number | null;
}

// ─── Counterfactual ───────────────────────────────────────────────────────────

export interface CounterfactualResult {
  n: number;
  netReturn: number;
  signals: SignalDecision[];
}

export interface BestCapResult {
  cap: number;
  netReturn: number;
  acceptedCount: number;
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

export type CanonicalField =
  | 'event_id'
  | 'event_date'
  | 'osid'
  | 'bet_open_date'
  | 'bet_close_date'
  | 'bet_final_return'
  | 'est_tc'
  | 'days_held'
  | 'exit_type'
  | 'sector_group'
  | 'signal'
  | 'bet_open_weight'
  | 'bet_type'
  | 'price_vs_ema20'
  | 'price_vs_sma50'
  | 'rlst'
  | 'hotness_rank'
  | 'liquidity_rank'
  | 'w_liq';

export type MappingConfidence = 'high' | 'medium' | 'missing';

export interface FieldMapping {
  canonical: CanonicalField;
  sourceColumn: string | null;
  confidence: MappingConfidence;
  required: boolean;
}

export type ColumnMapping = Record<CanonicalField, FieldMapping>;

// ─── Dataset metadata ─────────────────────────────────────────────────────────

export interface DataQualityWarning {
  rowIndex: number;
  field: string;
  reason: string;
}

export interface DatasetMetadata {
  fileName: string;
  rowsParsed: number;
  rowsUsable: number;
  invalidRows: number;
  warnings: DataQualityWarning[];
  dateRange: { min: Date; max: Date } | null;
  eventIds: string[];
  sectors: string[];
  returnUnitInferred: 'decimal' | 'percent';
  costUnitInferred: 'decimal' | 'percent';
  isSample: boolean;
}

export type RawRow = Record<string, unknown>;

// ─── Scenario History ─────────────────────────────────────────────────────────

export interface ScenarioHistoryItem {
  cap: number;
  positionSize: number;
  startTime: string;
  endTime: string;
  acceptedCount: number;
  netReturn: number;
  capitalDeployed: number;
  timestamp: number;
}

// ─── App State ────────────────────────────────────────────────────────────────

export type ActiveTab = 'throttle';
