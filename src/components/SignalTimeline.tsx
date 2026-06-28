import { useState, useRef, useCallback } from 'react';
import type { SignalDecision } from '../lib/types';
import { formatTime, formatSignedPercent } from '../lib/format';

interface TooltipState {
  x: number;
  y: number;
  signal: SignalDecision;
}

interface Props {
  signals: SignalDecision[];
  windowStart: string;
  windowEnd: string;
}

function hmToDate(hhmm: string, refDate: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(refDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Color per signal status:
 *  accepted     → green
 *  skipped      → red
 *  outside_window / filtered_out / anything else → gray (muted)
 */
function dotColor(sig: SignalDecision): string {
  if (sig.status === 'accepted') return 'var(--green)';
  if (sig.status === 'skipped') return 'var(--red)';
  return 'var(--muted)';
}

function dotOpacity(sig: SignalDecision): number {
  if (sig.status === 'outside_window') return 0.45;
  if (sig.status === 'filtered_out') return 0.3;
  return 0.9;
}

export function SignalTimeline({ signals, windowStart, windowEnd }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const allSignals = signals;
  if (allSignals.length === 0) return null;

  const dates = allSignals.map(s => s.eventDate.getTime());
  const minTs = Math.min(...dates);
  const maxTs = Math.max(...dates);

  // Extend range slightly so window lines don't collapse to edges
  const refDate = allSignals[0].eventDate;
  const winStartTs = hmToDate(windowStart, refDate).getTime();
  const winEndTs = hmToDate(windowEnd, refDate).getTime();

  // Timeline spans from min(data, window) to max(data, window) + padding
  const timelineMin = Math.min(minTs, winStartTs);
  const timelineMax = Math.max(maxTs, winEndTs);
  const range = timelineMax - timelineMin || 1;

  const HEIGHT = 60;
  const PAD_H = 24;
  const DOT_R = 5;

  const xPct = useCallback(
    (ts: number) => Math.max(0, Math.min(100, ((ts - timelineMin) / range) * 100)),
    [timelineMin, range],
  );

  const winStartPct = xPct(winStartTs);
  const winEndPct = xPct(winEndTs);

  function handleMouseEnter(e: React.MouseEvent, sig: SignalDecision) {
    setTooltip({ x: e.clientX, y: e.clientY, signal: sig });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (tooltip) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  }

  // Clamp tooltip to viewport
  const TT_W = 200;
  const TT_H = 180;
  const ttLeft = tooltip
    ? Math.min(tooltip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1600) - TT_W - 8)
    : 0;
  const ttTop = tooltip
    ? Math.min(tooltip.y - 10, (typeof window !== 'undefined' ? window.innerHeight : 900) - TT_H - 8)
    : 0;

  return (
    <div className="timeline-wrap" ref={wrapRef}>
      <div className="timeline-title">Signal arrival timeline</div>
      <div
        className="timeline-svg-wrap"
        onMouseLeave={() => setTooltip(null)}
        onMouseMove={handleMouseMove}
      >
        <svg
          width="100%"
          height={HEIGHT + PAD_H * 2}
          viewBox={`0 0 1000 ${HEIGHT + PAD_H * 2}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Window highlight */}
          <rect
            x={`${winStartPct}%`}
            width={`${winEndPct - winStartPct}%`}
            y={PAD_H}
            height={HEIGHT}
            fill="rgba(124,139,255,0.06)"
            rx="2"
          />
          {/* Baseline */}
          <line
            x1="0" y1={PAD_H + HEIGHT / 2}
            x2="100%" y2={PAD_H + HEIGHT / 2}
            stroke="var(--border)" strokeWidth="1"
          />
          {/* Window boundary lines */}
          <line
            x1={`${winStartPct}%`} y1={PAD_H}
            x2={`${winStartPct}%`} y2={PAD_H + HEIGHT}
            stroke="rgba(124,139,255,0.4)" strokeWidth="1" strokeDasharray="4,3"
          />
          <line
            x1={`${winEndPct}%`} y1={PAD_H}
            x2={`${winEndPct}%`} y2={PAD_H + HEIGHT}
            stroke="rgba(124,139,255,0.4)" strokeWidth="1" strokeDasharray="4,3"
          />

          {/* Window labels */}
          <text
            x={`${winStartPct}%`} y={PAD_H - 6}
            fontSize="9" fill="rgba(124,139,255,0.7)"
            textAnchor="middle" style={{ fontFamily: 'var(--font-mono)' }}
          >
            {windowStart}
          </text>
          <text
            x={`${winEndPct}%`} y={PAD_H - 6}
            fontSize="9" fill="rgba(124,139,255,0.7)"
            textAnchor="middle" style={{ fontFamily: 'var(--font-mono)' }}
          >
            {windowEnd}
          </text>

          {/* Dots — outside_window drawn first (below) */}
          {allSignals
            .slice()
            .sort((a, b) => {
              // Draw outside_window + filtered_out below accepted/skipped
              const rank = (s: SignalDecision) =>
                s.status === 'outside_window' || s.status === 'filtered_out' ? 0 : 1;
              return rank(a) - rank(b);
            })
            .map((sig) => {
              const cx = xPct(sig.eventDate.getTime());
              const cy = PAD_H + HEIGHT / 2;
              return (
                <circle
                  key={sig.rowId}
                  cx={`${cx}%`}
                  cy={cy}
                  r={DOT_R}
                  fill={dotColor(sig)}
                  opacity={dotOpacity(sig)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => handleMouseEnter(e, sig)}
                />
              );
            })}
        </svg>
      </div>

      {/* Tooltip — fixed position, clamped to viewport */}
      {tooltip && (
        <div
          className="timeline-tooltip"
          style={{ left: ttLeft, top: ttTop, position: 'fixed' }}
        >
          <div className="tt-row">
            <span className="tt-label">OSID</span>
            <span className="tt-value">{tooltip.signal.osid}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Time</span>
            <span className="tt-value">{formatTime(tooltip.signal.eventDate)}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Sector</span>
            <span className="tt-value">{tooltip.signal.sectorName}</span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Gross</span>
            <span className={`tt-value ${tooltip.signal.grossReturn >= 0 ? 'pos' : 'neg'}`}>
              {formatSignedPercent(tooltip.signal.grossReturn)}
            </span>
          </div>
          <div className="tt-row">
            <span className="tt-label">TC</span>
            <span className="tt-value neg">
              -{formatSignedPercent(tooltip.signal.transactionCost).replace('+', '')}
            </span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Net</span>
            <span className={`tt-value ${tooltip.signal.netReturn >= 0 ? 'pos' : 'neg'}`}>
              {formatSignedPercent(tooltip.signal.netReturn)}
            </span>
          </div>
          <div className="tt-row">
            <span className="tt-label">Status</span>
            <span
              className={`tt-value ${
                tooltip.signal.status === 'accepted'
                  ? 'tt-status-accepted'
                  : tooltip.signal.status === 'skipped'
                  ? 'tt-status-skipped'
                  : 'tt-status-outside'
              }`}
            >
              {tooltip.signal.status.replace(/_/g, ' ')}
            </span>
          </div>
          {tooltip.signal.arrivalRank !== null && (
            <div className="tt-row">
              <span className="tt-label">Rank</span>
              <span className="tt-value">#{tooltip.signal.arrivalRank}</span>
            </div>
          )}
        </div>
      )}

      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--green)' }} />
          <span>Accepted</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--red)' }} />
          <span>Skipped</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--muted)', opacity: 0.5 }} />
          <span>Outside window</span>
        </div>
        <div className="legend-item" style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 11 }}>
          Shaded area = signal window
        </div>
      </div>
    </div>
  );
}
