import React from 'react';

const I = ({ d, size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round" {...props}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const SkipBack = (p) => <I {...p} d={<><polyline points="19 20 9 12 19 4" /><line x1="5" y1="19" x2="5" y2="5" /></>} />;
export const StepBack = (p) => <I {...p} d="M15 18l-6-6 6-6" />;
export const Play = (p) => <I {...p} d="M5 3l14 9-14 9V3z" />;
export const Pause = (p) => <I {...p} d={<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>} />;
export const StepForward = (p) => <I {...p} d="M9 18l6-6-6-6" />;
export const SkipForward = (p) => <I {...p} d={<><polyline points="5 4 15 12 5 20" /><line x1="19" y1="5" x2="19" y2="19" /></>} />;
export const ZoomIn = (p) => <I {...p} d={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></>} />;
export const ZoomOut = (p) => <I {...p} d={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></>} />;
export const Camera = (p) => <I {...p} d={<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></>} />;
export const Sun = (p) => <I {...p} d={<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>} />;
export const Moon = (p) => <I {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />;
export const Film = (p) => <I {...p} d={<><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></>} />;
export const Settings = (p) => <I {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" /></>} />;
export const Search = (p) => <I {...p} d={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>} />;
export const Minus = (p) => <I {...p} d="M5 12h14" />;
export const Plus = (p) => <I {...p} d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />;
