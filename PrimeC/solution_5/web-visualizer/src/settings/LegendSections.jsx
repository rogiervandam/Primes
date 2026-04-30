import React from 'react';

/**
 * Reusable legend content rendered in both the Legend tab inside the
 * Settings panel and the floating-legend popover.
 *
 * Pure JSX — purely visual.
 *
 * @param {object} props
 * @param {boolean} [props.detailed=true] - When true, include the per-row
 *   description text. When false, render a compact label-only variant.
 * @param {function} [props.onAction] - Optional. Called with an action key
 *   string when the user clicks a legend row that has an associated settings
 *   control. Known keys: 'primeOverlay', 'rangeOverlay', 'multiplesOverlay',
 *   'heatMap', 'animRipple', 'animFade', 'animPulse', 'animSequential'.
 *   When omitted the legend is purely informational (no click targets).
 */
export default function LegendSections({ detailed = true, onAction }) {
  /**
   * Render a legend row that triggers a settings action when clicked.
   * Falls back to a plain div when `onAction` is not provided.
   */
  const ActionRow = ({ actionKey, title, children }) => {
    if (!onAction) return <div className="legend-row">{children}</div>;
    return (
      <div
        className="legend-row legend-row--actionable"
        role="button"
        tabIndex={0}
        title={title}
        onClick={() => onAction(actionKey)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onAction(actionKey)}
      >
        {children}
      </div>
    );
  };

  return (
    <>
      <div className="legend-section">
        <div className="legend-section-label">Bit states</div>
        <div className="legend-rows">
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-set" />
            <span className="legend-row-label">Set (composite)</span>
            {detailed && <span className="legend-row-desc">Bit was cleared in the sieve — number is marked composite</span>}
          </div>
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-cleared" />
            <span className="legend-row-label">Unset (prime candidate)</span>
            {detailed && <span className="legend-row-desc">Bit has not been cleared — number is still a prime candidate</span>}
          </div>
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-changed" />
            <span className="legend-row-label">Just changed</span>
            {detailed && <span className="legend-row-desc">Bits modified by the current event (highlighted during playback)</span>}
          </div>
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-target" />
            <span className="legend-row-label">Target</span>
            {detailed && <span className="legend-row-desc">Bits targeted by the current sieve step (may overlap with changed)</span>}
          </div>
        </div>
      </div>
      <div className="legend-section">
        <div className="legend-section-label">Overlays</div>
        <div className="legend-rows">
          <ActionRow actionKey="primeOverlay" title="Click to toggle the primes overlay (Layout tab)">
            <span className="legend-swatch legend-swatch-prime" />
            <span className="legend-row-label">Primes overlay <span className="legend-tag">gold · p</span></span>
            {detailed && <span className="legend-row-desc">Bits whose represented number is prime</span>}
          </ActionRow>
          <ActionRow actionKey="rangeOverlay" title="Click to toggle the range overlay (Layout tab)">
            <span className="legend-swatch legend-swatch-range" />
            <span className="legend-row-label">Range overlay <span className="legend-tag">cyan · r</span></span>
            {detailed && <span className="legend-row-desc">Bits within the selected bit-index range</span>}
          </ActionRow>
          <ActionRow actionKey="multiplesOverlay" title="Click to toggle the multiples overlay (Layout tab)">
            <span className="legend-swatch legend-swatch-multiples" />
            <span className="legend-row-label">Multiples overlay <span className="legend-tag">purple · ×</span></span>
            {detailed && <span className="legend-row-desc">Bits whose number is a multiple of the selected prime/factor</span>}
          </ActionRow>
          <ActionRow actionKey="heatMap" title="Click to toggle the cache-line heat map (Layout tab)">
            <span className="legend-swatch legend-swatch-heat-hot" />
            <span className="legend-row-label">Heat map — hot</span>
            {detailed && <span className="legend-row-desc">Cacheline recently or frequently accessed (red = hottest)</span>}
          </ActionRow>
          <ActionRow actionKey="heatMap" title="Click to toggle the cache-line heat map (Layout tab)">
            <span className="legend-swatch legend-swatch-heat-cold" />
            <span className="legend-row-label">Heat map — cold</span>
            {detailed && <span className="legend-row-desc">Cacheline rarely or long-ago accessed (blue = coldest)</span>}
          </ActionRow>
        </div>
      </div>
      <div className="legend-section">
        <div className="legend-section-label">Animations</div>
        <div className="legend-rows">
          <ActionRow actionKey="animRipple" title="Click to switch to Ripple animation style (Animation tab)">
            <span className="legend-anim-icon">◎</span>
            <span className="legend-row-label">Ripple</span>
            {detailed && <span className="legend-row-desc">Contracting ring that pulses outward from changed bits</span>}
          </ActionRow>
          <ActionRow actionKey="animFade" title="Click to switch to Fade animation style (Animation tab)">
            <span className="legend-anim-icon" style={{ opacity: 0.5 }}>◼</span>
            <span className="legend-row-label">Fade</span>
            {detailed && <span className="legend-row-desc">Changed bits fade in from bright to settled color</span>}
          </ActionRow>
          <ActionRow actionKey="animPulse" title="Click to switch to Pulse animation style (Animation tab)">
            <span className="legend-anim-icon" style={{ color: 'var(--accent)' }}>✦</span>
            <span className="legend-row-label">Pulse</span>
            {detailed && <span className="legend-row-desc">Changed bits emit a glowing halo pulse</span>}
          </ActionRow>
          <ActionRow actionKey="animSequential" title="Click to switch to Sequential reveal animation (Animation tab)">
            <span className="legend-anim-icon">→</span>
            <span className="legend-row-label">Sequential reveal</span>
            {detailed && <span className="legend-row-desc">Bits are uncovered one-by-one in the order they were changed</span>}
          </ActionRow>
        </div>
      </div>
      <div className="legend-section">
        <div className="legend-section-label">Interactions</div>
        <div className="legend-rows">
          <div className="legend-row">
            <span className="legend-anim-icon">🖱</span>
            <span className="legend-row-label">Click bit</span>
            {detailed && <span className="legend-row-desc">Pin a tooltip balloon showing the bit&apos;s number and history</span>}
          </div>
          <div className="legend-row">
            <span className="legend-anim-icon">⇕</span>
            <span className="legend-row-label">Scroll / pinch</span>
            {detailed && <span className="legend-row-desc">Zoom the grid in or out</span>}
          </div>
          <div className="legend-row">
            <span className="legend-anim-icon">✥</span>
            <span className="legend-row-label">Drag</span>
            {detailed && <span className="legend-row-desc">Pan the canvas to navigate around the grid</span>}
          </div>
        </div>
      </div>
    </>
  );
}
