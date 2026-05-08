import { useMemo } from 'react';

/**
 * Computes the three CSS style objects used to position and style the canvas
 * and its surrounding container.
 *
 * @param {object} params
 * @param {object|null} params.canvasAnchorPx        - { left, top } viewport anchor in px, or null
 * @param {string}      params.introPhase            - Current intro animation phase
 * @param {object}      params.camera3DContainerStyle - Base container style from use3DCamera
 * @param {object|null} params.canvasColors          - Per-theme canvas background overrides
 * @param {string}      params.theme                 - Current theme ('dark' | 'light')
 * @param {object}      params.eventTitleSettings    - Event title banner settings (scale, dragOffsetX/Y)
 * @returns {{ renderCanvasStyle, mergedCamera3DContainerStyle, eventTitleStyle }}
 */
export function useCanvasStyles({
  canvasAnchorPx,
  introPhase,
  camera3DContainerStyle,
  canvasColors,
  theme,
  eventTitleSettings,
}) {
  const renderCanvasStyle = useMemo(() => (
    // Unified: canvas is ALWAYS the oversized centered plane,
    // regardless of mode3D. mode3D only controls whether the
    // camera is tilted; the canvas placement is identical. This
    // is what eliminates the "2D in a different place than 3D"
    // jump on toggle and the placement drift on panel toggles.
    //
    // Applied to .canvas-transform-wrapper (not to canvas elements directly)
    // so that the 3D CSS transform lives on a div, not on the drawing canvases.
    // Safari creates one GPU compositing layer per element that has a 3D
    // transform; when a canvas in that layer draws, Safari briefly exposes a
    // black backing store during the GPU texture upload → visible black flash.
    // With a single wrapper div the three canvases share one GPU layer and
    // draw updates are atomic with respect to the compositor.
    //
    // left/top use pixel offsets from `canvasAnchorPx` (computed so
    // that the canvas center sits at the VIEWPORT center, not the
    // container center). When a side panel toggles the container
    // reshapes; without viewport anchoring the canvas's `50%/50%`
    // moves with the container and the user sees the content slide.
    {
      position: 'absolute',
      left: canvasAnchorPx ? `${canvasAnchorPx.left}px` : '50%',
      top: canvasAnchorPx ? `${canvasAnchorPx.top}px` : '50%',
      // Only the centering translate lives here. The 3D rotation (rotateX/Y)
      // is applied directly to the single GL canvas element so that only one
      // GPU compositing layer is created — avoids Safari black-flicker that
      // occurred when multiple canvases shared the same rotated wrapper layer.
      // preserve-3d is needed so the canvas's own rotation is interpreted in
      // the parent's 3D context rather than being flattened to 2D.
      transform: introPhase === 'hidden'
        ? 'translate(-50%, -50%) scale(0.02)'
        : 'translate(-50%, -50%)',
      transition: introPhase === 'scaling'
        ? 'transform 3800ms cubic-bezier(0.22, 1, 0.36, 1), opacity 2000ms ease-out'
        : undefined,
      opacity: introPhase === 'hidden' ? 0 : 1,
      transformStyle: 'preserve-3d',
    }
  ), [canvasAnchorPx, introPhase]);

  // Merge a px-based `perspectiveOrigin` into the container style so the
  // 3D vanishing point sits at the VIEWPORT center, matching where the
  // canvas itself is anchored. The Camera3D default is `50% 50%` of the
  // container, but the container reshapes when side panels toggle, so
  // its center moves in viewport space — producing a large projected
  // offset (especially noticeable with the events panel on the left,
  // which shifts the container's left edge by hundreds of px). Pinning
  // perspective-origin to the canvas anchor keeps the projection stable.
  const mergedCamera3DContainerStyle = useMemo(() => {
    // Derive the effective canvas background: user override (if any) or theme default.
    // Themes.dark.BACKGROUND = [26,26,26], Themes.light.BACKGROUND = [245,245,245].
    const THEME_BG = { dark: [26, 26, 26], light: [245, 245, 245] };
    const customBg = canvasColors && canvasColors[theme];
    const bg = customBg || THEME_BG[theme] || THEME_BG.dark;
    const bgCss = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    const base = !canvasAnchorPx ? camera3DContainerStyle : {
      ...camera3DContainerStyle,
      perspectiveOrigin: `${canvasAnchorPx.left}px ${canvasAnchorPx.top}px`,
    };
    return { ...base, background: bgCss };
  }, [camera3DContainerStyle, canvasAnchorPx, canvasColors, theme]);

  const eventTitleStyle = useMemo(() => {
    const scale = Math.max(0.7, Math.min(1.6, (eventTitleSettings.scale || 100) / 100));
    const ox = Number.isFinite(eventTitleSettings.dragOffsetX) ? eventTitleSettings.dragOffsetX : 0;
    const oy = Number.isFinite(eventTitleSettings.dragOffsetY) ? eventTitleSettings.dragOffsetY : 0;
    return {
      fontSize: `${14 * scale}px`,
      padding: `${Math.round(10 * scale)}px ${Math.round(14 * scale)}px`,
      // Width stays stable across events so the sliders don't jump around.
      width: `${Math.round(420 * scale)}px`,
      maxWidth: `min(${Math.round(520 * scale)}px, calc(100% - 160px))`,
      minHeight: `${Math.round(150 * scale)}px`,
      // Anchored by bottom-left (see CSS .step-focus-banner: bottom/left fixed).
      // Drag offset nudges from the anchored origin.
      transform: `translate(${ox}px, ${oy}px)`,
    };
  }, [eventTitleSettings]);

  return { renderCanvasStyle, mergedCamera3DContainerStyle, eventTitleStyle };
}
