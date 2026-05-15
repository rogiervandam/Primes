import React from 'react';
import { PanelLeft, PanelBottom, PanelRight } from '../components/Icons.jsx';
import { usePanelLayoutContext } from '../contexts/PanelLayoutContext';

export default function ToolbarPanelToggles() {
  const {
    isEventsPanelCollapsed,
    toggleEventsPanel,
    isDetailOpen,
    toggleDetailPanel,
    isSettingsCollapsed,
    toggleSettingsPanel,
    isAllEventsWidgetHidden,
    showAllEventsWidget,
  } = usePanelLayoutContext();

  return (
    <div className="panel-toggle-group">
      {isEventsPanelCollapsed && isAllEventsWidgetHidden && (
        <button
          className="btn-icon panel-toggle-btn panel-toggle-btn--popout"
          onClick={showAllEventsWidget}
          title="Show events widget"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="4.5" width="8" height="8" rx="1.2" />
            <path d="M7 1.5h6.5v6.5" />
            <path d="M13.5 1.5L8.5 6.5" />
          </svg>
        </button>
      )}

      <button
        className={`btn-icon panel-toggle-btn${!isEventsPanelCollapsed ? ' active' : ''}`}
        onClick={toggleEventsPanel}
        title={isEventsPanelCollapsed ? 'Show Events panel' : 'Hide Events panel'}
      >
        <PanelLeft size={15} />
      </button>

      <button
        className={`btn-icon panel-toggle-btn${isDetailOpen ? ' active' : ''}`}
        onClick={toggleDetailPanel}
        title={isDetailOpen ? 'Hide Detail panel' : 'Show Detail panel'}
      >
        <PanelBottom size={15} />
      </button>

      <button
        className={`btn-icon panel-toggle-btn${!isSettingsCollapsed ? ' active' : ''}`}
        onClick={toggleSettingsPanel}
        title={isSettingsCollapsed ? 'Show Settings panel' : 'Hide Settings panel'}
      >
        <PanelRight size={15} />
      </button>
    </div>
  );
}