import React, { createContext, useContext } from 'react';

const PlaybackContext = createContext(null);

export function PlaybackProvider({ children, value }) {
  return React.createElement(PlaybackContext.Provider, { value }, children);
}

export function usePlaybackContext() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlaybackContext must be used within PlaybackProvider');
  }
  return ctx;
}

export default PlaybackContext;