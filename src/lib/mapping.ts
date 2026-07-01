import type { CanonicalField, ColumnMapping, FieldMapping } from './types';
import { REQUIRED_FIELDS } from './constants';
import { detectMapping } from './columnHints';

export function buildInitialMapping(sourceColumns: string[]): ColumnMapping {
  const detected = detectMapping(sourceColumns);

  const allFields: CanonicalField[] = [
    'event_id', 'event_date', 'osid', 'bet_open_date', 'bet_final_return',
    'est_tc', 'days_held', 'sector_group', 'signal', 'bet_open_weight',
    'price_vs_ema20', 'price_vs_sma50', 'rlst', 'hotness_rank',
  ];

  const mapping = {} as ColumnMapping;
  for (const field of allFields) {
    const d = detected[field];
    mapping[field] = {
      canonical: field,
      sourceColumn: d.sourceColumn,
      confidence: d.confidence,
      required: (REQUIRED_FIELDS as string[]).includes(field),
    };
  }
  return mapping;
}

export function isMappingComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_FIELDS.every(f => mapping[f].sourceColumn !== null);
}

export function updateMapping(
  mapping: ColumnMapping,
  field: CanonicalField,
  sourceColumn: string | null,
): ColumnMapping {
  return {
    ...mapping,
    [field]: { ...mapping[field], sourceColumn, confidence: 'high' } as FieldMapping,
  };
}
