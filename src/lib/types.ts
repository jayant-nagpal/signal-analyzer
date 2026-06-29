// ─── Core Data Types ──────────────────────────────────────────────────────────

export interface SignalRow {
  rowId: string;
  eventId: string;
  eventDate: Date;
  osid: string;
  betOpenDate?: Date | null;
  betFinalReturn: number;
  estTc: number;
  daysHeld?: number | null;
  sectorCode?: number | null;
  sectorName: string;
  signal?: number | null;
  betOpenWeight?: number | null;
  priceVsEma20?: number | null;
  priceVsSma50?: number | null;
  rlst?: number | null;
  hotnessRank?: number | null;
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

export interface SignalPortfolioContribution {
  signal: SignalDecision;
  grossContribution: number;
  costContribution: number;
  netContribution: number;
}

export interface PortfolioResult {
  acceptedCount: number;
  positionSize: number;
  grossReturn: number;
  transactionCosts: number;
  netReturn: number;
  capitalDeployed: number;
  winRate: number;
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
  | 'bet_final_return'
  | 'est_tc'
  | 'days_held'
  | 'sector_group'
  | 'signal'
  | 'bet_open_weight'
  | 'price_vs_ema20'
  | 'price_vs_sma50'
  | 'rlst'
  | 'hotness_rank';

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

export type ActiveTab = 'throttle' | 'portfolio';
