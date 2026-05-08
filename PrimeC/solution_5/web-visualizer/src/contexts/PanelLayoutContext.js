import React, { createContext, useContext } from 'react';

const PanelLayoutContext = createContext(null);

export function PanelLayoutProvider({ children, value }) {
  return React.createElement(PanelLayoutContext.Provider, { value }, children);
}

export function usePanelLayoutContext() {
  const ctx = useContext(PanelLayoutContext);
  if (!ctx) {
    throw new Error('usePanelLayoutContext must be used within PanelLayoutProvider');
  }
  return ctx;
}

export default PanelLayoutContext;