import React from 'react';
import { LinkIcon } from '../Icons';

export default function JoinedWidgetHeader({
  settings,
  setSettings,
  surrounding,
  handleExpandPanel,
  handleSplit,
  revealCurrentStepInPanel,
  onHideWidget,
}) {
  return (
    <div className="joined-widget-header">
      <button
        className="joined-widget-btn joined-widget-expand-btn"
        onClick={handleExpandPanel}
        onMouseDown={(event) => event.stopPropagation()}
        title="Open events and details panels"
      >▼</button>
      <span className="joined-widget-label">Events</span>
      {(surrounding?.prev?.length > 0 || surrounding?.next?.length > 0) && (
        <button
          className={`joined-widget-btn joined-widget-context-mode-btn${settings?.nearbyEventsMode ? ' active' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            setSettings((prev) => ({ ...prev, nearbyEventsMode: !prev.nearbyEventsMode }));
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title={settings?.nearbyEventsMode ? 'Show event title' : 'Show nearby events instead of title'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="3" x2="11" y2="3"/>
            <line x1="1" y1="6" x2="11" y2="6"/>
            <line x1="1" y1="9" x2="11" y2="9"/>
          </svg>
        </button>
      )}
      <button
        className="joined-widget-btn joined-widget-split-btn"
        onClick={handleSplit}
        onMouseDown={(event) => event.stopPropagation()}
        title="Split into two separate widgets"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="0.5" y="0.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
          <rect x="5.5" y="5.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        </svg>
      </button>
      <button
        className="joined-widget-btn joined-widget-locate-btn"
        onClick={(event) => { event.stopPropagation(); revealCurrentStepInPanel(); }}
        onMouseDown={(event) => event.stopPropagation()}
        title="Reveal current event in the events panel"
      ><LinkIcon size={12} /></button>
      <button
        className="joined-widget-btn joined-widget-close-btn"
        onClick={(event) => { event.stopPropagation(); onHideWidget?.(); }}
        onMouseDown={(event) => event.stopPropagation()}
        title="Hide widget"
      >▼</button>
    </div>
  );
}