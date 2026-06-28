import type { ParseResult } from './csv';
import { parseCSV } from './csv';
import { parseXLSX } from './xlsx';
import { parseParquet } from './parquet';

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCSV(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file);
  if (name.endsWith('.parquet')) return parseParquet(file);
  throw new Error('Choose a CSV, XLSX, or parquet file.');
}
