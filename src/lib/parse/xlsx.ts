import * as XLSX from 'xlsx';
import type { RawRow } from '../types';
import type { ParseResult } from './csv';

export async function parseXLSX(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    throw new Error('Could not parse this file. Check the format or export as CSV.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in the workbook.');

  const sheet = workbook.Sheets[sheetName];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

  if (rows.length === 0) throw new Error('No usable signal rows were found.');

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    rows,
    columns,
    rowCount: rows.length,
    colCount: columns.length,
    errors: [],
  };
}
