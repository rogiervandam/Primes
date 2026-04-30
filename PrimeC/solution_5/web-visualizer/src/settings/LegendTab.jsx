import React from 'react';
import LegendSections from './LegendSections';

/**
 * LegendTab — content for the "Legend" tab of the settings sidebar.
 *
 * Pure presentation. State (`legendDetailed`, `floatPos`, `legendFloating`)
 * is owned by the parent SettingsPanel because the floating legend window
 * is rendered separately (outside the sidebar) and shares this state.
 *
 * Future tabs (LayoutTab, AnimationTab) should follow the same prop-drilling
 * pattern; see docs/AI_MAINTENANCE.md §7 for the planned extraction.
 */
function LegendTab({
  legendDetailed,
  setLegendDetailed,
  floatPos,
  setFloatPos,
  setLegendFloating,
  onToggleCollapse,
  onAction,
}) {
  return (
    <div className="legend-tab-content">
      <div className="legend-tab-header">
        <span className="legend-tab-title">Visualizer Legend</span>
        <div className="legend-tab-controls">
          <button
            type="button"
            className={`legend-detail-btn${legendDetailed ? ' active' : ''}`}
            onClick={() => setLegendDetailed((d) => !d)}
            title={legendDetailed ? 'Show compact legend' : 'Show detailed legend'}
          >
            {legendDetailed ? 'Compact' : 'Detailed'}
          </button>
          <button
            type="button"
            className="legend-float-btn"
            title="Float legend panel (collapses settings)"
            onClick={() => {
              if (!floatPos) setFloatPos({ x: window.innerWidth - 380, y: 60 });
              setLegendFloating(true);
              onToggleCollapse && onToggleCollapse();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
      <LegendSections detailed={legendDetailed} onAction={onAction} />
    </div>
  );
}

export default LegendTab;
