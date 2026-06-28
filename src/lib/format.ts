import { SECTOR_MAP } from './constants';

export function formatPercent(value: number, decimals = 2): string {
  return (value * 100).toFixed(decimals) + '%';
}

export function formatSignedPercent(value: number, decimals = 2): string {
  const pct = value * 100;
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(decimals) + '%';
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatSector(sectorCodeOrName: string | number | null | undefined): string {
  if (sectorCodeOrName == null) return 'Unknown';
  if (typeof sectorCodeOrName === 'number') {
    return SECTOR_MAP[sectorCodeOrName] ?? `Sector ${sectorCodeOrName}`;
  }
  const num = parseInt(sectorCodeOrName, 10);
  if (!isNaN(num) && SECTOR_MAP[num]) return SECTOR_MAP[num];
  return sectorCodeOrName;
}

export function formatMoneyLikePercent(value: number): string {
  const pct = value * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(3) + '%';
}
