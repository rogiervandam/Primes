import React from 'react';
import {
  playbackSpeedToPercent as playbackSpeedToMs,
  percentToPlaybackSpeed as msToPlaybackSpeed,
} from '../lib/unitConverters';
import { PreviewOptionButton } from './buttons';

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
  maskAnimationEnabled, onMaskAnimationEnabledChange,
  animationReplayPaused, onAnimationReplayPausedChange,
  maxStepDurationEnabled, onMaxStepDurationEnabledChange,
  maxStepDurationMs, onMaxStepDurationMsChange,
  eventDurationMode, onEventDurationModeChange,
}) {
  const playbackSpeedValue = msToPlaybackSpeed(playSpeed || 100);

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

      <div className="settings-section">
        <label>Animation timing</label>
        <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 8 }}>  
          <div className="timing-control">
            <span className="timing-title">Event duration target</span>
            <div className="timing-toggle" style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button
                type="button"
                className={`step-focus-mode-btn${(eventDurationMode || 'progressive') === 'progressive' ? ' active' : ''}`}
                onClick={() => onEventDurationModeChange && onEventDurationModeChange('progressive')}
                title="Tiered: 2s for the first 10 bits, 2s for the next 100, 2s for the rest (max ~6s)"
              >Progressive</button>
              <button
                type="button"
                className={`step-focus-mode-btn${eventDurationMode === 'linear' ? ' active' : ''}`}
                onClick={() => onEventDurationModeChange && onEventDurationModeChange('linear')}
                title="Linear: total duration scales with the bit count"
              >Linear</button>
            </div>
            <div className="timing-scale" aria-hidden="true">
              <span style={{ fontSize: '0.8em', opacity: 0.7 }}>{(eventDurationMode || 'progressive') === 'progressive' ? 'Tiered 2s per tier' : 'Scales with bits'}</span>
            </div>
          </div>
        </div>
        <div className="settings-row animation-timing-row" style={{ alignItems: 'flex-start', gap: 8 }}>          
          <div className="timing-control">
            <span className="timing-title">Overall speed</span>
            <input
              className="timing-slider"
              type="range"
              min={1}
              max={100}
              step={1}
              value={playbackSpeedValue}
              onChange={(e) => onPlaySpeedChange(playbackSpeedToMs(e.target.value))}
              title="Speed % applied to every per-event time target. 50% = twice as long, 200% = half as long."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Slow</span>
              <span className="timing-value">{playSpeed || 100}%</span>
              <span>Fast</span>
            </div>
          </div>
          <div className="timing-control">
            <span className="timing-title">Delay between events</span>
            <input
              className="timing-slider"
              type="range"
              min={0}
              max={5000}
              step={100}
              value={repeatAnim || 0}
              onChange={(e) => onRepeatAnimChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000))}
              title="Pause after one event finishes before the all-events widget advances to the next event."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Off</span>
              <span className="timing-value">{repeatAnim === 0 ? 'Off' : `${(repeatAnim / 1000).toFixed(1)}s`}</span>
              <span>Long</span>
            </div>
          </div>
          <div className="timing-control">
            <span className="timing-title">Delay between repeats</span>
            <input
              className="timing-slider"
              type="range"
              min={0}
              max={5000}
              step={100}
              value={delayBetweenRepeats || 0}
              onChange={(e) => onDelayBetweenRepeatsChange && onDelayBetweenRepeatsChange(clamp(parseInt(e.target.value || '0', 10) || 0, 0, 5000))}
              title="Pause between repeats when the single-event widget is in play mode."
            />
            <div className="timing-scale" aria-hidden="true">
              <span>Off</span>
              <span className="timing-value">{(delayBetweenRepeats || 0) === 0 ? 'Off' : `${((delayBetweenRepeats || 0) / 1000).toFixed(1)}s`}</span>
              <span>Long</span>
            </div>
          </div>
        </div>
        <div className="settings-row" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={maskAnimationEnabled !== false} onChange={(e) => onMaskAnimationEnabledChange(e.target.checked)} />
            Mask stamp animation
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={maxStepDurationEnabled === true} onChange={(e) => onMaxStepDurationEnabledChange && onMaxStepDurationEnabledChange(e.target.checked)} />
            Limit step duration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={animationReplayPaused === true} onChange={(e) => onAnimationReplayPausedChange(e.target.checked)} />
            Pause event replay
          </label>
        </div>
        {maxStepDurationEnabled === true && (
          <div className="settings-row" style={{ marginTop: 8 }}>
            <label className="overlay-inline-field overlay-inline-field-range" style={{ width: '100%' }}>
              <span>Max step duration</span>
              <input
                type="range"
                min={2000}
                max={30000}
                step={500}
                value={Math.max(2000, Math.min(30000, parseInt(maxStepDurationMs || 8000, 10) || 8000))}
                onChange={(e) => onMaxStepDurationMsChange && onMaxStepDurationMsChange(Math.max(2000, Math.min(30000, parseInt(e.target.value || '8000', 10) || 8000)))}
              />
              <span className="val">{(Math.max(2000, Math.min(30000, parseInt(maxStepDurationMs || 8000, 10) || 8000)) / 1000).toFixed(1)}s</span>
            </label>
          </div>
        )}
        {/* Per-event time targets — used when adaptiveDuration is on. The
            tier picked is based on the change count of the event; the
            resulting normal duration is divided by Overall speed %. */}
        {eventTimeTargets && onEventTimeTargetsChange && (
          <div className="settings-row" style={{ marginTop: 8, flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            <span className="timing-title" style={{ marginBottom: 4 }}>Per-event normal time targets (at 100% speed)</span>
            {[
              { key: 'none', label: '0 changes' },
              { key: 'one',  label: '1 change' },
              { key: 'two',  label: '2 changes' },
              { key: 'few',  label: '3–10 changes' },
              { key: 'many', label: '11–100 changes' },
              { key: 'lots', label: '> 100 changes' },
              { key: 'min',  label: 'Min (clamp ↓)' },
              { key: 'max',  label: 'Max (clamp ↑)' },
            ].map(({ key, label }) => (
              <label key={key} className="overlay-inline-field overlay-inline-field-range" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 130, fontSize: '0.85em' }}>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={key === 'max' ? 30000 : (key === 'lots' ? 20000 : 10000)}
                  step={50}
                  value={Math.max(0, parseInt(eventTimeTargets[key] || 0, 10) || 0)}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
                    onEventTimeTargetsChange({ ...eventTimeTargets, [key]: v });
                  }}
                />
                <span className="val" style={{ minWidth: 56, textAlign: 'right' }}>{((eventTimeTargets[key] || 0) / 1000).toFixed(2)}s</span>
              </label>
            ))}
          </div>
        )}
        <span className="settings-hint">Overall speed multiplies every per-event time target. Per-event tiers set how long an event takes at 100% speed; values are clamped to Min / Max. Delay between events is used by the all-events play. Delay between repeats is used by the single-event play.</span>
      </div>
    </>
  );
}

export default AnimationTab;
