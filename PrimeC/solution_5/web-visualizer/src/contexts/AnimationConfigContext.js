import React, { createContext, useContext } from 'react';

const AnimationConfigContext = createContext(null);

export function AnimationConfigProvider({ children, value }) {
  return React.createElement(AnimationConfigContext.Provider, { value }, children);
}

export function useAnimationConfigContext() {
  const ctx = useContext(AnimationConfigContext);
  if (!ctx) {
    throw new Error('useAnimationConfigContext must be used within AnimationConfigProvider');
  }
  return ctx;
}

export default AnimationConfigContext;