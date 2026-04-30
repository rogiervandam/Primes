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
export const Thermometer = (p) => <I {...p} d={<><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" /></>} />;
export const PlayPause = (p) => (
  <I {...p} d={<><polygon points="3 4, 3 20, 11 12" fill="currentColor" stroke="currentColor" /><rect x="14" y="4" width="3" height="16" fill="currentColor" stroke="none" /><rect x="19" y="4" width="3" height="16" fill="currentColor" stroke="none" /></>} />
);
// Annotation toggle icon for cacheline labels (tag with "123" text)
export const CLAnnotate = (p) => (
  <I {...p} d={<>
    <rect x="2" y="7" width="16" height="10" rx="2" strokeWidth="1.8" />
    <path d="M18 12l4-3v6l-4-3z" strokeWidth="1.5" />
    <line x1="6"  y1="10" x2="6"  y2="14" strokeWidth="1.5" />
    <line x1="9"  y1="10" x2="9"  y2="14" strokeWidth="1.5" />
    <line x1="12" y1="10" x2="12" y2="14" strokeWidth="1.5" />
  </>} />
);
// Star icon used for the prime number overlay toggle
export const PrimeStar = (p) => (
  <I {...p} d={<>
    <polygon
      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      fill="currentColor" stroke="currentColor" strokeWidth="1.5"
    />
  </>} />
);
// Eye icon — used for "show controls"
export const Eye = (p) => (
  <I {...p} d={<>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>} />
);
// Eye-off icon — used for "hide controls"
export const EyeOff = (p) => (
  <I {...p} d={<>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>} />
);
// Panel layout icons — used for the toolbar panel-toggle group
// Left sidebar panel (Steps / Events)
export const PanelLeft = (p) => (
  <I {...p} d={<>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
    <line x1="9" y1="3" x2="9" y2="21" strokeWidth="1.8" />
  </>} />
);
// Bottom panel (Detail / bit-analysis)
export const PanelBottom = (p) => (
  <I {...p} d={<>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
    <line x1="3" y1="15" x2="21" y2="15" strokeWidth="1.8" />
  </>} />
);
// Right sidebar panel (Settings)
export const PanelRight = (p) => (
  <I {...p} d={<>
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
    <line x1="15" y1="3" x2="15" y2="21" strokeWidth="1.8" />
  </>} />
);
// Hyperlink / chain-link icon — used for "locate in events panel"
export const LinkIcon = (p) => (
  <I {...p} d={<>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </>} />
);
// Clipboard copy icon — used for "copy event description to clipboard"
export const CopyIcon = (p) => (
  <I {...p} d={<>
    <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="1.8" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="1.8" />
  </>} />
);
