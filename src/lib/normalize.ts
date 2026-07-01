import type {
  SignalRow, RawRow, ColumnMapping, DatasetMetadata, DataQualityWarning,
} from './types';
import { SECTOR_MAP } from './constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumber(val: unknown): number | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  const str = String(val).trim().replace(/,/g, '').replace(/%/g, '').replace(/\s/g, '');
  const n = parseFloat(str);
  return isFinite(n) ? n : null;
}

function parseDate(val: unknown): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // Excel serial number
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  // ISO and common formats
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // MM/DD/YYYY HH:mm
  const re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/;
  const m = str.match(re);
  if (m) {
    return new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5]);
  }

  return null;
}

function get(row: RawRow, col: string | null): unknown {
  if (!col) return undefined;
  return row[col];
}

function rowId(eventId: string, osid: string, date: Date, idx: number): string {
  return `${eventId}:${osid}:${date.toISOString()}:${idx}`;
}

function sectorName(codeOrName: string | number | null): string {
  if (codeOrName == null) return 'Unknown';
  if (typeof codeOrName === 'number') return SECTOR_MAP[codeOrName] ?? `Sector ${codeOrName}`;
  const n = parseInt(String(codeOrName), 10);
  if (!isNaN(n) && SECTOR_MAP[n]) return SECTOR_MAP[n];
  return String(codeOrName);
}

function sectorCode(codeOrName: string | number | null): number | null {
  if (codeOrName == null) return null;
  const n = typeof codeOrName === 'number' ? codeOrName : parseInt(String(codeOrName), 10);
  return isNaN(n) ? null : n;
}

// ─── Unit detection ───────────────────────────────────────────────────────────

function inferReturnUnit(rows: RawRow[], col: string): 'decimal' | 'percent' {
  const vals = rows.slice(0, 200).map(r => parseNumber(r[col])).filter((v): v is number => v !== null);
  if (vals.length === 0) return 'decimal';
  const medianAbs = vals.map(Math.abs).sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  return medianAbs > 0.25 ? 'percent' : 'decimal';
}

function inferCostUnit(rows: RawRow[], col: string): 'decimal' | 'percent' {
  const vals = rows.slice(0, 200).map(r => parseNumber(r[col])).filter((v): v is number => v !== null);
  if (vals.length === 0) return 'decimal';
  const medianAbs = vals.map(Math.abs).sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  return medianAbs > 0.05 ? 'percent' : 'decimal';
}

// ─── Main normalize ───────────────────────────────────────────────────────────

export interface NormalizeResult {
  signals: SignalRow[];
  metadata: DatasetMetadata;
}

export function normalizeRows(
  rawRows: RawRow[],
  mapping: ColumnMapping,
  fileName: string,
  isSample = false,
): NormalizeResult {
  const m = mapping;
  const returnCol = m.bet_final_return.sourceColumn;
  const costCol = m.est_tc.sourceColumn;

  const returnUnit = returnCol ? inferReturnUnit(rawRows, returnCol) : 'decimal';
  const costUnit = costCol ? inferCostUnit(rawRows, costCol) : 'decimal';

  const warnings: DataQualityWarning[] = [];
  const signals: SignalRow[] = [];
  const seenIds = new Set<string>();
  let invalidCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 1;

    const eventDate = parseDate(get(row, m.event_date.sourceColumn));
    if (!eventDate) {
      warnings.push({ rowIndex: rowNum, field: 'event_date', reason: 'Invalid or missing date' });
      invalidCount++;
      continue;
    }

    const osidRaw = get(row, m.osid.sourceColumn);
    if (osidRaw == null || String(osidRaw).trim() === '') {
      warnings.push({ rowIndex: rowNum, field: 'osid', reason: 'Missing osid' });
      invalidCount++;
      continue;
    }

    const retRaw = parseNumber(get(row, returnCol));
    if (retRaw == null) {
      warnings.push({ rowIndex: rowNum, field: 'bet_final_return', reason: 'Missing or invalid return' });
      invalidCount++;
      continue;
    }

    const tcRaw = parseNumber(get(row, costCol));
    if (tcRaw == null) {
      warnings.push({ rowIndex: rowNum, field: 'est_tc', reason: 'Missing or invalid transaction cost' });
      invalidCount++;
      continue;
    }

    const eventIdRaw = get(row, m.event_id.sourceColumn);
    const eventId = eventIdRaw != null && String(eventIdRaw).trim() !== ''
      ? String(eventIdRaw).trim()
      : 'default_event';

    const osid = String(osidRaw).trim();
    const betFinalReturn = returnUnit === 'percent' ? retRaw / 100 : retRaw;
    const estTc = costUnit === 'percent' ? Math.abs(tcRaw) / 100 : Math.abs(tcRaw);

    const sectorRaw = get(row, m.sector_group.sourceColumn);
    const sectorNameStr = sectorName(sectorRaw as string | number | null);
    const sectorCodeNum = sectorCode(sectorRaw as string | number | null);

    const id = rowId(eventId, osid, eventDate, i);
    if (seenIds.has(id)) {
      warnings.push({ rowIndex: rowNum, field: 'rowId', reason: 'Duplicate row id detected' });
    }
    seenIds.add(id);

    const daysHeldRaw = parseNumber(get(row, m.days_held.sourceColumn));
    const signalRaw = parseNumber(get(row, m.signal.sourceColumn));
    const weightRaw = parseNumber(get(row, m.bet_open_weight.sourceColumn));
    const betOpenDateRaw = parseDate(get(row, m.bet_open_date.sourceColumn));
    const priceVsEma20 = parseNumber(get(row, m.price_vs_ema20.sourceColumn));
    const priceVsSma50 = parseNumber(get(row, m.price_vs_sma50.sourceColumn));
    const rlst = parseNumber(get(row, m.rlst.sourceColumn));
    const hotnessRank = parseNumber(get(row, m.hotness_rank.sourceColumn));

    if (Math.abs(estTc) > Math.abs(betFinalReturn) && betFinalReturn !== 0) {
      warnings.push({ rowIndex: rowNum, field: 'est_tc', reason: 'Cost exceeds absolute return' });
    }

    signals.push({
      rowId: id,
      eventId,
      eventDate,
      osid,
      betOpenDate: betOpenDateRaw ?? null,
      betFinalReturn,
      estTc,
      daysHeld: daysHeldRaw ?? null,
      sectorCode: sectorCodeNum,
      sectorName: sectorNameStr,
      signal: signalRaw ?? (m.signal.sourceColumn ? signalRaw : 1),
      betOpenWeight: weightRaw ?? null,
      priceVsEma20: priceVsEma20 ?? null,
      priceVsSma50: priceVsSma50 ?? null,
      rlst: rlst ?? null,
      hotnessRank: hotnessRank ?? null,
      sourceRow: row,
    });
  }

  // Sort by eventDate asc, then rowId
  signals.sort((a, b) => {
    const dt = a.eventDate.getTime() - b.eventDate.getTime();
    if (dt !== 0) return dt;
    return a.rowId.localeCompare(b.rowId);
  });

  const dates = signals.map(s => s.eventDate.getTime());
  const eventIds = [...new Set(signals.map(s => s.eventId))];
  const sectors = [...new Set(signals.map(s => s.sectorName))].filter(s => s !== 'Unknown');

  return {
    signals,
    metadata: {
      fileName,
      rowsParsed: rawRows.length,
      rowsUsable: signals.length,
      invalidRows: invalidCount,
      warnings,
      dateRange: dates.length > 0
        ? { min: new Date(Math.min(...dates)), max: new Date(Math.max(...dates)) }
        : null,
      eventIds,
      sectors,
      returnUnitInferred: returnUnit,
      costUnitInferred: costUnit,
      isSample,
    },
  };
}
