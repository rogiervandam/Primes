import React, { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeContext provider for visual theme and canvas color controls.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} props.value
 */
export function ThemeProvider({ children, value }) {
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;