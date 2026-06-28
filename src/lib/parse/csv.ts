import Papa from 'papaparse';
import type { RawRow } from '../types';

export interface ParseResult {
  rows: RawRow[];
  columns: string[];
  rowCount: number;
  colCount: number;
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Could not parse this file. Check the format or export as CSV.'));
          return;
        }
        const rows = results.data as RawRow[];
        const columns = results.meta.fields ?? [];
        resolve({
          rows,
          columns,
          rowCount: rows.length,
          colCount: columns.length,
          errors: results.errors.map(e => e.message),
        });
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`));
      },
    });
  });
}
