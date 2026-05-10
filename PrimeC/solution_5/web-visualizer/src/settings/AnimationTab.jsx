import React, { useTransition } from 'react';
import {
  playbackSpeedToPercent as playbackSpeedToMs,
  percentToPlaybackSpeed as msToPlaybackSpeed,
} from '../lib/unitConverters';
import { PreviewOptionButton } from './buttons';
import { DEFAULT_EVENT_TIME_TARGETS } from '../lib/viewPrefs';

// ─── Per-event timing curve editor ──────────────────────────────────────────

/** Keys/labels/representative change counts for the 6 editable tiers. */
const TIER_KEYS   = ['none', 'one',  'two',    'few',    'many',    'lots'];
const TIER_LABELS = ['0',    '1',    '2',      '3–10',   '11–100',  '>100'];

/** SVG viewport dimensions and padding. */
const VW = 272, VH = 126;
const PL = 28, PR = 6, PT = 6, PB = 24;
const DW = VW - PL - PR;   // data area width
const DH = VH - PT - PB;   // data area height

/**
 * Square-root-compressed y scale so short durations (< 1 s) remain
 * readable alongside long ones (up to 16 s).
 *   top    → Y_MAX ms
 *   bottom → 0 ms
 */
const Y_MAX = 16000;
const yForMs  = (ms) => PT + DH * (1 - Math.sqrt(Math.max(0, ms) / Y_MAX));
const msForSvgY = (sy) => {
  const norm = 1 - Math.max(0, Math.min(DH, sy - PT)) / DH;
  return Math.round(Y_MAX * norm * norm);
};

/** Evenly-spaced x coordinate for tier index i (0 … 5). */
const xForIdx = (i) => PL + (i / (TIER_KEYS.length - 1)) * DW;

/** Horizontal reference lines drawn behind the curve. */
const Y_REFS       = [500, 1000, 2000, 4000, 8000];
const Y_REF_LABELS = ['0.5s', '1s', '2s', '4s', '8s'];

function fmtMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`;
  return `${ms}ms`;
}

/**
 * Interactive SVG curve editor for the six per-event time-target tiers.
 * Each control point is draggable vertically; min/max clamp handles are
 * shown as dashed horizontal lines.
 */
function TimingCurveEditor({ eventTimeTargets, onEventTimeTargetsChange }) {
  const svgRef  = React.useRef(null);
  const [dragging, setDragging] = React.useState(null); // tier key | null
  const [tooltip, setTooltip]   = React.useState(null); // { key, ms } | null

  const getMs = (key) => Math.max(0, Number(eventTimeTargets[key]) || 0);

  /** Convert a DOM clientY to SVG y-coordinate. */
  const toSvgY = React.useCallback((clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return (clientY - r.top) * (VH / r.height);
  }, []);

  const commitDrag = React.useCallback((clientY) => {
    if (!dragging) return;
    const sy = toSvgY(clientY);
    if (sy === null) return;
    const ms = Math.max(0, Math.min(Y_MAX, msForSvgY(sy)));
    onEventTimeTargetsChange({ ...eventTimeTargets, [dragging]: ms });
    setTooltip({ key: dragging, ms });
  }, [dragging, eventTimeTargets, onEventTimeTargetsChange, toSvgY]);

  const onMouseMove  = React.useCallback((e) => commitDrag(e.clientY), [commitDrag]);
  const onTouchMove  = React.useCallback((e) => {
    if (e.touches.length) { e.preventDefault(); commitDrag(e.touches[0].clientY); }
  }, [commitDrag]);
  const stopDrag = React.useCallback(() => setDragging(null), []);

  const points = TIER_KEYS.map((key, i) => {
    const ms = getMs(key);
    return { key, i, x: xForIdx(i), ms, y: yForMs(ms), label: TIER_LABELS[i] };
  });

  /* Closed filled area beneath the curve */
  const fillD = [
    `M${points[0].x},${PT + DH}`,
    ...points.map(p => `L${p.x},${p.y}`),
    `L${points[points.length - 1].x},${PT + DH}`,
    'Z',
  ].join(' ');

  /* Open polyline for the stroke */
  const polyPts = points.map(p => `${p.x},${p.y}`).join(' ');

  const minY  = yForMs(getMs('min'));
  const maxY  = yForMs(getMs('max'));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      width={VW}
      height={VH}
      className="timing-curve-svg"
      style={{ touchAction: 'none', userSelect: 'none', cursor: dragging ? 'ns-resize' : 'default' }}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={onTouchMove}
      onTouchEnd={stopDrag}
      onTouchCancel={stopDrag}
      aria-label="Per-event duration curve — drag points to adjust timing"
    >
      {/* ── Y-axis reference lines ── */}
      {Y_REFS.map((ms, j) => {
        const y = yForMs(ms);
        return (
          <g key={ms}>
            <line x1={PL} y1={y} x2={VW - PR} y2={y}
              stroke="var(--border)" strokeWidth="0.5" />
            <text x={PL - 3} y={y + 3} textAnchor="end"
              fontSize="6.5" fill="var(--fg-dim)">{Y_REF_LABELS[j]}</text>
          </g>
        );
      })}

      {/* ── Vertical tier guide lines ── */}
      {points.map(p => (
        <line key={p.key} x1={p.x} y1={PT} x2={p.x} y2={PT + DH}
          stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,4" />
      ))}

      {/* ── Clamp boundary lines ── */}
      <line x1={PL} y1={minY} x2={VW - PR} y2={minY}
        stroke="var(--fg-dim)" strokeWidth="1" strokeDasharray="3,3" opacity="0.65" />
      <text x={VW - PR - 1} y={minY - 2} textAnchor="end"
        fontSize="6" fill="var(--fg-dim)" opacity="0.8">min</text>

      <line x1={PL} y1={maxY} x2={VW - PR} y2={maxY}
        stroke="var(--accent-dim)" strokeWidth="1" strokeDasharray="3,3" opacity="0.65" />
      <text x={VW - PR - 1} y={maxY - 2} textAnchor="end"
        fontSize="6" fill="var(--accent-dim)" opacity="0.8">max</text>

      {/* ── Filled area ── */}
      <path d={fillD} fill="var(--accent)" opacity="0.10" />

      {/* ── Curve stroke ── */}
      <polyline points={polyPts} fill="none"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* ── Control points ── */}
      {points.map(p => {
        const active = dragging === p.key;
        const showTip = active || (tooltip?.key === p.key && !dragging);
        const tipMs = active ? (tooltip?.ms ?? p.ms) : p.ms;
        /* Place the tooltip above the dot; flip below if too close to top edge */
        const tipY = p.y < PT + 14 ? p.y + 16 : p.y - 9;

        return (
          <g key={p.key}>
            {/* Invisible wider hit-target for easier grabbing */}
            <rect
              x={p.x - 10} y={PT}
              width={20} height={DH}
              fill="transparent"
              style={{ cursor: 'ns-resize' }}
              onMouseDown={(e) => { e.preventDefault(); setDragging(p.key); setTooltip({ key: p.key, ms: p.ms }); }}
              onMouseEnter={() => setTooltip({ key: p.key, ms: p.ms })}
              onMouseLeave={() => { if (!dragging) setTooltip(null); }}
              onTouchStart={(e) => { e.preventDefault(); setDragging(p.key); setTooltip({ key: p.key, ms: p.ms }); }}
            />
            {/* Dot */}
            <circle cx={p.x} cy={p.y}
              r={active ? 6 : 4.5}
              fill="var(--accent)"
              stroke="var(--bg-surface)" strokeWidth="1.5"
              style={{ pointerEvents: 'none' }}
            />
            {/* Tooltip value */}
            {showTip && (
              <text x={p.x} y={tipY}
                textAnchor="middle" fontSize="8" fontWeight="600"
                fill="var(--fg-bright)"
                style={{ pointerEvents: 'none' }}>
                {fmtMs(tipMs)}
              </text>
            )}
          </g>
        );
      })}

      {/* ── X-axis tier labels ── */}
      {points.map(p => (
        <text key={p.key} x={p.x} y={VH - 10}
          textAnchor="middle" fontSize="7" fill="var(--fg-muted)">{p.label}</text>
      ))}
      <text x={PL + DW / 2} y={VH - 1}
        textAnchor="middle" fontSize="6" fill="var(--fg-dim)">number of changes</text>
    </svg>
  );
}

/**
 * AnimationTab — content for the "Animation" tab of the settings sidebar.
 *
 * Pure presentation. All state lives in the parent. Closure-captured
 * locals from the original SettingsPanel.jsx (`clamp`,
 * `playbackSpeedValue`) are recreated here from props because they are
 * trivial; this keeps the parent prop list smaller.
 *
 * Mirrors the LegendTab pattern. The LayoutTab extraction is still TODO
 * (see docs/AI_MAINTENANCE.md §7) — it has many more closure-captured
 * locals and helpers and needs the prerequisite refactor first.
 */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function AnimationTab({
  animStyle, onAnimStyleChange,
  animMode, onAnimModeChange,
  playSpeed, onPlaySpeedChange,
  repeatAnim, onRepeatAnimChange,
  delayBetweenRepeats, onDelayBetweenRepeatsChange,
  eventTimeTargets, onEventTimeTargetsChange,
  eventDurationMode, onEventDurationModeChange,
  bitAnimationMode, onBitAnimationModeChange,
  isAutoAnimateOnSelect, onAutoAnimateOnSelectChange,
  animateBitsMode, onAnimateBitsModeChange,  // item 244
}) {
  const playbackSpeedValue = msToPlaybackSpeed(playSpeed || 100);
  // Wrap slider onChange callbacks in startTransition so React deprioritises
  // these updates relative to rAF-driven canvas rendering. The settings
  // sliders fire on every pointermove; without this, rapid dragging forces
  // synchronous Visualizer re-renders that compete with animation frames.
  const [, startTransition] = useTransition();

  return (
    <>
      <div className="settings-section">
        <label>Animation style</label>
        <div className="preview-btn-grid preview-btn-grid-3">
          <PreviewOptionButton
            compact
            label="Ripple"
            hint="Contracting ripple ring"
            active={(animStyle || 'ripple') === 'ripple'}
            onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'ripple' ? 'none' : 'ripple')}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <circle cx="24" cy="11" r="8" />
                <circle cx="24" cy="11" r="4" />
                <circle cx="24" cy="11" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Fade"
            hint="Soft fading highlight"
            active={(animStyle || 'ripple') === 'fade'}
            onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'fade' ? 'none' : 'fade')}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <rect x="4" y="5" width="8" height="12" opacity="0.3" />
                <rect x="16" y="5" width="8" height="12" opacity="0.5" />
                <rect x="28" y="5" width="8" height="12" opacity="0.75" />
                <rect x="40" y="5" width="4" height="12" opacity="1" />
              </svg>
            )}
          />
          <PreviewOptionButton
            compact
            label="Pulse"
            hint="Expand and contract"
            active={(animStyle || 'ripple') === 'pulse'}
            onClick={() => onAnimStyleChange((animStyle || 'ripple') === 'pulse' ? 'none' : 'pulse')}
            preview={(
              <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                <circle cx="12" cy="11" r="3" />
                <circle cx="24" cy="11" r="5" />
                <circle cx="36" cy="11" r="7" />
              </svg>
            )}
          />
        </div>
      </div>

      {animStyle !== 'none' && (
        <div className="settings-section">
          <label>Animation mode</label>
          <div className="preview-btn-grid preview-btn-grid-3">
            <PreviewOptionButton
              compact
              label="All"
              hint="All bits at once"
              active={(animMode || 'all') === 'all'}
              onClick={() => onAnimModeChange('all')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="6" y="6" width="8" height="8" />
                  <rect x="20" y="6" width="8" height="8" />
                  <rect x="34" y="6" width="8" height="8" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Sequential"
              hint="Step through bits"
              active={(animMode || 'all') === 'sequential'}
              onClick={() => onAnimModeChange('sequential')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="6" y="6" width="8" height="8" opacity="1" />
                  <rect x="20" y="6" width="8" height="8" opacity="0.6" />
                  <rect x="34" y="6" width="8" height="8" opacity="0.3" />
                  <line x1="14" y1="10" x2="20" y2="10" />
                  <line x1="28" y1="10" x2="34" y2="10" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Bounce"
              hint="Forward and backward"
              active={(animMode || 'all') === 'bounce'}
              onClick={() => onAnimModeChange('bounce')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <line x1="6" y1="10" x2="42" y2="10" />
                  <polygon points="42,10 36,7 36,13" fill="currentColor" stroke="none" />
                  <polygon points="6,10 12,7 12,13" fill="currentColor" stroke="none" />
                </svg>
              )}
            />
          </div>
        </div>
      )}

      {onBitAnimationModeChange && (
        <div className="settings-section">
          <label>Timeline animation mode</label>
          <div className="preview-btn-grid preview-btn-grid-3">
            <PreviewOptionButton
              compact
              label="Mask"
              hint="Stamp groups"
              active={(bitAnimationMode || 'bit') === 'mask'}
              onClick={() => onBitAnimationModeChange('mask')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="4" y="5" width="12" height="12" rx="1" />
                  <rect x="19" y="5" width="12" height="12" rx="1" />
                  <rect x="34" y="5" width="12" height="12" rx="1" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Bits"
              hint="Individual bits"
              active={(bitAnimationMode || 'bit') === 'bit'}
              onClick={() => onBitAnimationModeChange('bit')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <circle cx="8" cy="11" r="5" fill="currentColor" stroke="none" opacity="1" />
                  <circle cx="24" cy="11" r="5" fill="currentColor" stroke="none" opacity="0.5" />
                  <circle cx="40" cy="11" r="5" fill="currentColor" stroke="none" opacity="0.2" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Both"
              hint="Lockstep"
              active={(bitAnimationMode || 'bit') === 'combined'}
              onClick={() => onBitAnimationModeChange('combined')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="3" y="5" width="13" height="12" rx="1" opacity="0.9" />
                  <circle cx="29" cy="11" r="4" fill="currentColor" stroke="none" opacity="1" />
                  <circle cx="41" cy="11" r="4" fill="currentColor" stroke="none" opacity="0.35" />
                </svg>
              )}
            />
          </div>
          <span className="settings-hint">Applies to events with mask write-order data. Mask = stamp groups; Bits = individual bits; Both = lockstep.</span>
        </div>
      )}

      <div className="settings-section">
        <label>Animation timing</label>
        <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 8 }}>  
          <div className="timing-control">
            <span className="timing-title">Event duration target</span>
            <div className="preview-btn-grid preview-btn-grid-3" style={{ marginTop: 4 }}>
              <PreviewOptionButton
                compact
                label="Progressive"
                hint="Tiered 2s per tier"
                active={(eventDurationMode || 'progressive') === 'progressive'}
                onClick={() => onEventDurationModeChange && onEventDurationModeChange('progressive')}
                preview={(
                  <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                    <rect x="4" y="15" width="8" height="3" />
                    <rect x="14" y="11" width="8" height="7" />
                    <rect x="24" y="7" width="8" height="11" />
                    <rect x="34" y="3" width="8" height="15" />
                  </svg>
                )}
              />
              <PreviewOptionButton
                compact
                label="Linear"
                hint="Scales with bits"
                active={eventDurationMode === 'linear'}
                onClick={() => onEventDurationModeChange && onEventDurationModeChange('linear')}
                preview={(
                  <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                    <line x1="6" y1="18" x2="42" y2="4" />
                    <circle cx="6" cy="18" r="2.5" fill="currentColor" stroke="none" />
                    <circle cx="42" cy="4" r="2.5" fill="currentColor" stroke="none" />
                  </svg>
                )}
              />
            </div>
          </div>
        </div>
        <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 8, marginTop: '1.5em' }}>          
          <div className="timing-control">
            <span className="timing-title" style={{ minHeight: '2.5em'}}>Overall speed</span>
            <input
              className="timing-slider"
              type="range"
              min={1}
              max={100}
              step={1}
              value={playbackSpeedValue}
              onChange={(e) => startTransition(() => onPlaySpeedChange(playbackSpeedToMs(e.target.value)))}
              title="Speed % applied to every per-event time target. 50% = twice as long, 200% = half as long."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Slow</span>
              <span className="timing-value">{playSpeed || 100}%</span>
              <span>Fast</span>
            </div>
          </div>
          <div className="timing-control">
            <span className="timing-title" style={{ minHeight: '2.5em'}}>Delay between events</span>
            <input
              className="timing-slider"
              type="range"
              min={0}
              max={5000}
              step={100}
              value={repeatAnim || 0}
              onChange={(e) => startTransition(() => onRepeatAnimChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000)))}
              title="Pause after one event finishes before the all-events widget advances to the next event."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Off</span>
              <span className="timing-value">{repeatAnim === 0 ? 'Off' : `${(repeatAnim / 1000).toFixed(1)}s`}</span>
              <span>Long</span>
            </div>
          </div>
          <div className="timing-control">
            <span className="timing-title" style={{ minHeight: '2.5em'}}>Delay between repeats</span>
            <input
              className="timing-slider"
              type="range"
              min={0}
              max={5000}
              step={100}
              value={delayBetweenRepeats || 0}
              onChange={(e) => startTransition(() => onDelayBetweenRepeatsChange && onDelayBetweenRepeatsChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000)))}
              title="Pause between repeats when the single-event widget is in play mode."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Off</span>
              <span className="timing-value">{(delayBetweenRepeats || 0) === 0 ? 'Off' : `${((delayBetweenRepeats || 0) / 1000).toFixed(1)}s`}</span>
              <span>Long</span>
            </div>
          </div>
        </div>
        {/* Per-event time targets — drag control points on the curve to
            adjust how long each event takes based on its change count.
            The curve uses a sqrt-compressed y axis so short durations
            remain visible alongside long ones. Min / max are hard clamps. */}
        {eventTimeTargets && onEventTimeTargetsChange && (
          <div className="settings-row timing-curve-section" style={{ marginTop: 8, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="timing-title">Per-event normal time targets</span>
              <button
                type="button"
                className="timing-curve-reset-btn"
                onClick={() => onEventTimeTargetsChange({ ...DEFAULT_EVENT_TIME_TARGETS })}
                title="Reset all tiers and clamps to their default values"
              >Reset defaults</button>
            </div>
            <span className="settings-hint" style={{ marginTop: 0 }}>
              Drag the dots up/down — X = number of changes, Y = target duration (at 100% speed).
            </span>

            {/* Interactive SVG curve */}
            <TimingCurveEditor
              eventTimeTargets={eventTimeTargets}
              onEventTimeTargetsChange={onEventTimeTargetsChange}
            />

            {/* Min / Max clamp sliders */}
            <div className="timing-clamp-row">
              <label className="timing-clamp-field">
                <span className="timing-clamp-label">Min clamp ↓</span>
                <div className="timing-clamp-input-row">
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={50}
                    value={Math.max(0, Number(eventTimeTargets.min) || 0)}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                      startTransition(() => onEventTimeTargetsChange({ ...eventTimeTargets, min: v }));
                    }}
                  />
                  <span className="val">{fmtMs(Math.max(0, Number(eventTimeTargets.min) || 0))}</span>
                </div>
              </label>
              <label className="timing-clamp-field">
                <span className="timing-clamp-label">Max clamp ↑</span>
                <div className="timing-clamp-input-row">
                  <input
                    type="range"
                    min={1000}
                    max={30000}
                    step={500}
                    value={Math.max(1000, Number(eventTimeTargets.max) || 15000)}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                      startTransition(() => onEventTimeTargetsChange({ ...eventTimeTargets, max: v }));
                    }}
                  />
                  <span className="val">{fmtMs(Math.max(0, Number(eventTimeTargets.max) || 15000))}</span>
                </div>
              </label>
            </div>
          </div>
        )}
        <span className="settings-hint">Overall speed multiplies every per-event time target. Per-event tiers set how long an event takes at 100% speed; values are clamped to Min / Max. Delay between events is used by the all-events play. Delay between repeats is used by the single-event play.</span>
      </div>

      {onAutoAnimateOnSelectChange != null && (
        <div className="settings-section">
          <label>Selection behaviour</label>
          <label className="settings-toggle-row" title="When enabled, selecting an event in the events panel automatically starts the per-event animation loop. Disable to navigate freely without triggering animations.">
            <input
              type="checkbox"
              checked={isAutoAnimateOnSelect !== false}
              onChange={(e) => onAutoAnimateOnSelectChange(e.target.checked)}
            />
            <span>Auto-animate on event select</span>
          </label>
          <span className="settings-hint">When on, clicking an event in the list immediately plays its animation. Turn off to browse events without triggering the animation loop.</span>
        </div>
      )}

      {/* item 244: animate only changed bits (default) or all targeted bits */}
      {onAnimateBitsModeChange != null && (
        <div className="settings-section">
          <label>Animate bits</label>
          <div className="preview-btn-grid preview-btn-grid-2">
            <PreviewOptionButton
              compact
              label="Changed bits"
              hint="Only animate bits that actually changed state"
              active={(animateBitsMode || 'changed') === 'changed'}
              onClick={() => onAnimateBitsModeChange('changed')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="8" y="6" width="8" height="10" opacity="0.25" />
                  <rect x="20" y="6" width="8" height="10" fill="var(--accent, #64b4ff)" opacity="0.9" />
                  <rect x="32" y="6" width="8" height="10" opacity="0.25" />
                </svg>
              )}
            />
            <PreviewOptionButton
              compact
              label="Targeted bits"
              hint="Animate all bits targeted by the event; already-set bits shown in amber"
              active={(animateBitsMode || 'changed') === 'targeted'}
              onClick={() => onAnimateBitsModeChange('targeted')}
              preview={(
                <svg viewBox="0 0 48 22" width="48" height="22" aria-hidden="true">
                  <rect x="8" y="6" width="8" height="10" fill="#f59e0b" opacity="0.8" />
                  <rect x="20" y="6" width="8" height="10" fill="var(--accent, #64b4ff)" opacity="0.9" />
                  <rect x="32" y="6" width="8" height="10" fill="#f59e0b" opacity="0.8" />
                </svg>
              )}
            />
          </div>
          <span className="settings-hint">
            <strong>Changed bits</strong>: default, only newly-set bits animate.{' '}
            <strong>Targeted bits</strong>: shows all bits the sieve tried to set — already-set bits appear in amber.
          </span>
        </div>
      )}
    </>
  );
}

export default AnimationTab;
