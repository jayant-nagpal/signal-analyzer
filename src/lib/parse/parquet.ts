import type { RawRow } from '../types';
import type { ParseResult } from './csv';

export async function parseParquet(file: File): Promise<ParseResult> {
  let parquet: typeof import('parquet-wasm');
  try {
    parquet = await import('parquet-wasm');
    if (typeof (parquet as unknown as Record<string, unknown>).default === 'function') {
      await ((parquet as unknown as Record<string, unknown>).default as () => Promise<void>)();
    }
  } catch {
    throw new Error('Parquet parsing failed. Please export CSV or check parquet schema.');
  }

  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  let table: { schema?: { fields?: Array<{ name: string }> }; numRows?: number; getChildAt?: (i: number) => unknown };
  try {
    table = parquet.readParquet(uint8) as typeof table;
  } catch {
    throw new Error('Parquet parsing failed. Please export CSV or check parquet schema.');
  }

  const fields = table?.schema?.fields ?? [];
  const columns = fields.map((f) => f.name);
  const numRows = table?.numRows ?? 0;

  const rows: RawRow[] = [];
  for (let i = 0; i < numRows; i++) {
    const row: RawRow = {};
    columns.forEach((col, ci) => {
      const vector = (table.getChildAt as (i: number) => { get: (i: number) => unknown } | null)?.(ci);
      row[col] = vector ? vector.get(i) : null;
    });
    rows.push(row);
  }

  if (rows.length === 0) throw new Error('No usable signal rows were found in the parquet file.');

  return {
    rows,
    columns,
    rowCount: rows.length,
    colCount: columns.length,
    errors: [],
  };
}
