import type { RawRow } from '../lib/types';

// ── Sample signal event — 100003 (2025-09-29) ────────────────────────────────
// 20 signals: 14 inside 12:15-13:15 window, 6 outside
// Expected with cap=5, position=2%: net ≈ -0.059%

export const SAMPLE_RAW_ROWS: RawRow[] = [
  // ── In-window signals (12:15–13:15) ────────────────────────────────────────
  {
    event_id: '100003', event_date: '2025-09-29 12:15:00', osid: '44347',
    bet_final_return: '-0.0095', est_tc: '0.00057', days_held: '3',
    sector_group: '8', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:15:00', osid: '45356',
    bet_final_return: '-0.0148', est_tc: '0.00069', days_held: '3',
    sector_group: '2', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:25:00', osid: '12150',
    bet_final_return: '-0.0033', est_tc: '0.00067', days_held: '3',
    sector_group: '7', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:30:00', osid: '36099',
    bet_final_return: '0.0086', est_tc: '0.00041', days_held: '3',
    sector_group: '2', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:35:00', osid: '10267',
    bet_final_return: '-0.0076', est_tc: '0.00053', days_held: '3',
    sector_group: '3', signal: '1', bet_open_weight: '-0.02',
  },
  // Signals 6-14: in-window, become skipped when cap=5
  {
    event_id: '100003', event_date: '2025-09-29 12:40:00', osid: '22301',
    bet_final_return: '0.0042', est_tc: '0.00048', days_held: '2',
    sector_group: '8', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:45:00', osid: '31144',
    bet_final_return: '-0.0061', est_tc: '0.00039', days_held: '4',
    sector_group: '5', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:50:00', osid: '19823',
    bet_final_return: '0.0031', est_tc: '0.00052', days_held: '2',
    sector_group: '3', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:55:00', osid: '77401',
    bet_final_return: '-0.0022', est_tc: '0.00044', days_held: '3',
    sector_group: '7', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 12:55:00', osid: '81205',
    bet_final_return: '0.0058', est_tc: '0.00061', days_held: '2',
    sector_group: '8', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:00:00', osid: '44122',
    bet_final_return: '-0.0039', est_tc: '0.00035', days_held: '5',
    sector_group: '2', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:05:00', osid: '52900',
    bet_final_return: '0.0071', est_tc: '0.00058', days_held: '3',
    sector_group: '5', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:10:00', osid: '61033',
    bet_final_return: '-0.0018', est_tc: '0.00047', days_held: '2',
    sector_group: '3', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:15:00', osid: '70449',
    bet_final_return: '0.0029', est_tc: '0.00043', days_held: '4',
    sector_group: '7', signal: '1', bet_open_weight: '-0.02',
  },
  // ── Outside-window signals (after 13:15) ────────────────────────────────────
  {
    event_id: '100003', event_date: '2025-09-29 13:20:00', osid: '88312',
    bet_final_return: '-0.0054', est_tc: '0.00040', days_held: '3',
    sector_group: '8', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:25:00', osid: '91022',
    bet_final_return: '0.0067', est_tc: '0.00055', days_held: '2',
    sector_group: '2', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:30:00', osid: '34756',
    bet_final_return: '-0.0041', est_tc: '0.00037', days_held: '5',
    sector_group: '3', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:35:00', osid: '20099',
    bet_final_return: '0.0015', est_tc: '0.00029', days_held: '1',
    sector_group: '7', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:40:00', osid: '15678',
    bet_final_return: '-0.0033', est_tc: '0.00042', days_held: '3',
    sector_group: '5', signal: '1', bet_open_weight: '-0.02',
  },
  {
    event_id: '100003', event_date: '2025-09-29 13:45:00', osid: '48800',
    bet_final_return: '0.0048', est_tc: '0.00051', days_held: '2',
    sector_group: '8', signal: '1', bet_open_weight: '-0.02',
  },
];

// ── Note on sample behavior ───────────────────────────────────────────────────
// Two signals share timestamp 12:15 (osid 44347 + 45356).
// With cap=5: both 12:15 signals accepted as a tied group, then 12:25, 12:30, 12:35
// Accepted = 5, skipped = 9 in-window, outside-window = 6
// Net ≈ -0.059% at 2% position
