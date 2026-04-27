/**
 * Best-effort runtime platform detection.
 *
 * Used by the toolbar/title-bar to reserve space for the macOS traffic-light
 * window controls in Electron, and to swap keyboard-shortcut display strings
 * between the Mac (`⌘`) and Windows (`Ctrl`) idioms.
 */

function probeUserAgent() {
  if (typeof navigator === 'undefined') return '';
  const uaDataPlatform = navigator.userAgentData?.platform || '';
  return `${uaDataPlatform} ${navigator.platform || ''} ${navigator.userAgent || ''} ${navigator.appVersion || ''}`;
}

export function detectIsMac() {
  return /(Mac|iPhone|iPad|iPod)/i.test(probeUserAgent());
}

export function detectIsWindows() {
  return /Win/i.test(probeUserAgent());
}

/**
 * Detect Electron host. Electron injects "Electron" into the UA and
 * exposes `process.versions.electron` on the renderer's `window`.
 * In browser mode we don't reserve space for traffic-light controls.
 */
export function detectIsElectron() {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')) return true;
  const proc = (typeof window !== 'undefined' && window.process) || null;
  return !!(proc && proc.versions && proc.versions.electron);
}
