import { useCallback, useEffect, useRef } from 'react';
import { applyPan } from '../visualizer/gestures/pan';
import { applyRotate } from '../visualizer/gestures/rotate';
import { applyWheel } from '../visualizer/gestures/wheel';
import { getTwoPointerState } from '../visualizer/gestures/pinch';

/**
 * Sets up all pointer / mouse / wheel event listeners on the canvas container
 * element, including 3D-rotation drag, minimap click, pan, hover balloons, and
 * the cinematic fly-to-element on single click.
 *
 * Returns nothing — this hook is purely a side-effect registration.
 */
export function usePointerGestures({
  rendererRef,
  containerRef,
  camera3DRef,
  getCanvasPlaneMetrics,
  getMinimapDetailH,
  updateMinimapAvailability,
  enableTiltAndResize,
  scheduleBalloonRelayout,
  schedulePostLayoutRefresh,
  seekStepAnimation,
  computeBitInfo,
  setZoom,
  setHoveredBitInfo,
  setPinnedBitIndices,
  setBalloonLiveLayout,
  areBalloonsEnabled,
  isBalloonClickEnabled,
  isBalloonHoverEnabled,
  lastHoveredIdxRef,
  balloonLiveLayoutTimerRef,
  stepScrubProgressValueRef,
  globalPausedRef,
  cancelViewportAnimation,
  collapseSettingsIfOpen,
  onInspectCanvasUnit,
}) {
  // Cinematic fly-to on element click (in 3D mode)
  const flyToElement = useCallback((bitIdx) => {
    const cam = camera3DRef.current;
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!cam || !cam.enabled || !r || !el) return;

    const pos = r.bitIndexToCanvas(bitIdx);
    if (!pos) return;

    const metrics = getCanvasPlaneMetrics();
    if (!metrics) return;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
    const elem = r.identifyElement(bitIdx);
    if (!elem) return;

    // Determine the best zoom level and element bounds for focus
    let targetZoom = r.zoom;
    let targetType = 'bit';

    // Choose focus level based on current zoom
    if (r.zoom < 2) {
      targetType = 'vector';
      targetZoom = Math.min(8, r.zoom * 4);
    } else if (r.zoom < 6) {
      targetType = 'byte';
      targetZoom = Math.min(12, r.zoom * 2);
    } else {
      targetType = 'bit';
      targetZoom = Math.min(20, r.zoom * 1.5);
    }

    const bounds = r.getElementBounds(targetType, targetType === 'bit' ? bitIdx :
      targetType === 'byte' ? elem.byteIdx :
      targetType === 'vector' ? elem.vectorIdx : elem.clIdx);

    const target = bounds ? { canvasX: bounds.cx, canvasY: bounds.cy } : { canvasX: pos.x, canvasY: pos.y };

    cam.flyTo(
      target,
      {
        containerW: planeW,
        containerH: planeH,
        centerX: planeOffsetX + rect.width / 2,
        centerY: planeOffsetY + rect.height / 2,
      },
      { panX: r.panX, panY: r.panY, zoom: r.zoom },
      targetZoom,
      1200
    );
  }, [getCanvasPlaneMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth 2D pan to center the canvas on a given bit (items 102 & 103)
  const panAnimRef = useRef(null);
  const panToElement2D = useCallback((bitIdx) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return;
    const pos = r.bitIndexToCanvas(bitIdx);
    if (!pos) return;
    const rect = el.getBoundingClientRect();
    const viewW = rect.width;
    const viewH = rect.height;
    // Compute target pan so the bit is centred in the viewport.
    // pos.x/pos.y are in CSS-pixel canvas-space (includes current panX/panY).
    // To center the bit: newPanX = r.panX + (viewW/2 - pos.x)
    const targetPanX = r.panX + (viewW / 2 - pos.x);
    const targetPanY = r.panY + (viewH / 2 - pos.y);
    // Cancel any existing pan animation
    if (panAnimRef.current != null) {
      cancelAnimationFrame(panAnimRef.current);
      panAnimRef.current = null;
    }
    if (cancelViewportAnimation) cancelViewportAnimation();
    const startPanX = r.panX;
    const startPanY = r.panY;
    const duration = 500;
    const startedAt = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // Cubic ease-out spring feel
      const eased = 1 - Math.pow(1 - t, 3);
      r.panX = startPanX + (targetPanX - startPanX) * eased;
      r.panY = startPanY + (targetPanY - startPanY) * eased;
      r.render();
      updateMinimapAvailability();
      r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
      scheduleBalloonRelayout(true);
      if (t < 1) {
        panAnimRef.current = requestAnimationFrame(tick);
      } else {
        panAnimRef.current = null;
      }
    };
    panAnimRef.current = requestAnimationFrame(tick);
  }, [cancelViewportAnimation, getMinimapDetailH, scheduleBalloonRelayout, updateMinimapAvailability]); // eslint-disable-line react-hooks/exhaustive-deps

  const hitTestCanvasLabelUnit = useCallback((renderer, canvasX, canvasY) => {
    if (!renderer || typeof renderer._labelHeight !== 'function') return null;

    const labelH = renderer._labelHeight();
    const rowD = renderer._rowDims?.();
    const vecD = renderer._vectorDims?.();
    const u64GapX = renderer._u64GapX?.() ?? 0;
    const u64GapY = renderer._u64GapY?.() ?? 0;
    const vecPerVRow = renderer._vectorGroupsPerVisualRow?.();
    const numVec = renderer._numVectorsPerRow?.();
    if (!rowD || !vecD || !Number.isFinite(vecPerVRow) || !Number.isFinite(numVec) || numVec <= 0 || vecPerVRow <= 0) return null;

    const vRowHeight = labelH + rowD.h + u64GapY;
    const relY = canvasY - renderer.panY;
    if (relY < 0) return null;
    const visualRow = Math.floor(relY / vRowHeight);
    const yInRow = relY - visualRow * vRowHeight;
    if (yInRow < 0 || yInRow > labelH) return null;

    const relX = canvasX - renderer.panX;
    if (relX < 0) return null;
    const vectorStep = vecD.w + u64GapX;
    const vectorInRow = Math.floor(relX / vectorStep);
    if (vectorInRow < 0 || vectorInRow >= vecPerVRow) return null;

    const vectorLeft = vectorInRow * vectorStep;
    const vectorRight = vectorLeft + vecD.w;
    if (relX < vectorLeft || relX > vectorRight) return null;

    const globalVectorIndex = visualRow * vecPerVRow + vectorInRow;
    const cachelineIndex = Math.floor(globalVectorIndex / numVec);
    if (cachelineIndex < 0) return null;

    return { type: 'group', index: globalVectorIndex };
  }, []);

  // Mouse pan & zoom on canvas (with 3D rotation support)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let gestureMode = 'none';
    let activePointerId = null;
    let startX = 0, startY = 0, panSX = 0, panSY = 0;
    let didDrag = false;
    let mouseRotateActive = false;
    let pointerDownCanvasCoords = null;
    // item 141: multi-touch state
    const activePointers = new Map(); // pointerId → { clientX, clientY }
    let pinchStart = null;    // { dist, angle, cx, cy, zoom, panX, panY }
    let pinchLastAngle = 0;   // for incremental camera rotation
    // item 329: three-finger tilt gesture state
    let tiltTouchCentroid = null; // { cx, cy } centroid of the three active fingers

    // item 329: compute centroid of the first 3 active pointers
    const getThreePointerCentroid = (pointers) => {
      if (pointers.size < 3) return null;
      let sumX = 0, sumY = 0, count = 0;
      for (const pt of pointers.values()) {
        if (count >= 3) break;
        sumX += pt.clientX;
        sumY += pt.clientY;
        count++;
      }
      return count >= 3 ? { cx: sumX / 3, cy: sumY / 3 } : null;
    };

    const eventToCanvasCoords = (event, fallbackClientX = event.clientX, fallbackClientY = event.clientY) => {
      const metrics = getCanvasPlaneMetrics();
      if (!metrics) return { x: 0, y: 0 };
      if (metrics.viewportToCanvas) {
        const point = metrics.viewportToCanvas(fallbackClientX, fallbackClientY);
        if (point) return point;
      }
      const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
      const x = fallbackClientX - rect.left;
      const y = fallbackClientY - rect.top;
      const cam = camera3DRef.current;
      if (cam && cam.enabled) {
        return cam.screenToCanvas(x, y, planeW, planeH, planeOffsetX, planeOffsetY);
      }
      return { x: x + planeOffsetX, y: y + planeOffsetY };
    };

    const onContextMenu = (e) => {
      // Right-click / ctrl-click is reserved for tilt gestures on the canvas.
      if (e.button === 2 || e.ctrlKey || e.metaKey) e.preventDefault();
    };

    const onAuxClick = (e) => {
      const cam = camera3DRef.current;
      if (cam && cam.enabled && (e.button === 1 || e.button === 2)) e.preventDefault();
    };

    const isSecondaryRotateGesture = (event, cam) => {
      if (!cam) return false;
      if (event.button === 1 || event.button === 2 || event.which === 3) return true;
      if (event.button === 0 && (event.ctrlKey || event.metaKey)) return true;
      return (event.buttons & 2) === 2;
    };

    const isPointWithinRect = (clientX, clientY, rect) => (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );

    const hideHoverBalloon = () => {
      lastHoveredIdxRef.current = -1;
      setHoveredBitInfo(null);
    };

    const clearInteraction = () => {
      const wasPan = gestureMode === 'pan';
      gestureMode = 'none';
      activePointerId = null;
      mouseRotateActive = false;
      pointerDownCanvasCoords = null;
      activePointers.clear(); // item 141
      pinchStart = null;      // item 141
      tiltTouchCentroid = null; // item 329
      el.classList.remove('dragging');
      // item 253: restore balloon transitions after pan ends, then re-measure connectors
      if (wasPan) {
        setBalloonLiveLayout(false);
        scheduleBalloonRelayout(true);
      }
    };

    const onPointerDown = (e) => {
      if (mouseRotateActive) return;
      const r = rendererRef.current;
      if (!r) return;
      // Don't capture pointer for interactive overlays inside the canvas area.
      // Without this, setPointerCapture() swallows the pointerup so buttons
      // in .step-focus-banner and .bit-history-panel never fire click events.
      if (e.target.closest('.step-focus-banner, .bit-history-panel, .detail-inspector-overlay, .joined-events-widget')) return;
      // item 141: track all pointers; ignore 3rd+ finger
      activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      // item 329: three-finger drag activates 3D tilt gesture
      if (activePointers.size === 3) {
        enableTiltAndResize();
        const liveCam3f = camera3DRef.current;
        if (liveCam3f) liveCam3f.cancelAllAnimations();
        // Release any existing single-pointer capture from pan/pinch
        if (activePointerId != null && el.releasePointerCapture) {
          try { el.releasePointerCapture(activePointerId); } catch (_) {}
        }
        const centroid = getThreePointerCentroid(activePointers);
        if (centroid) {
          tiltTouchCentroid = centroid;
          gestureMode = 'tiltTouch';
          activePointerId = null;
          pinchStart = null;
        }
        return;
      }
      if (gestureMode === 'pinch' || gestureMode === 'tiltTouch') return;
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left; // eslint-disable-line no-unused-vars
      const rawY = e.clientY - rect.top;  // eslint-disable-line no-unused-vars
      const canvasW = rect.width;         // eslint-disable-line no-unused-vars
      const canvasH = rect.height;        // eslint-disable-line no-unused-vars

      const cam = camera3DRef.current;
      if (isSecondaryRotateGesture(e, cam)) {
        enableTiltAndResize();
        // Cancel any in-flight camera animation (e.g. the startup intro tilt)
        // so the drag starts from whatever angle the camera is at right now.
        const liveCam = camera3DRef.current;
        if (liveCam) liveCam.cancelAllAnimations();
        e.preventDefault();
        e.stopPropagation();
        hideHoverBalloon();
        gestureMode = 'rotate';
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        didDrag = false;
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        return;
      }

      // Check minimap hit first.  The minimap is drawn on a position:fixed
      // canvas covering the full viewport, so _minimapRect.mx/my are in
      // viewport (clientX/Y) coordinates — not container-relative coords.
      const hit = r.minimapHitTest(e.clientX, e.clientY);
      if (hit) {
        hideHoverBalloon();
        gestureMode = 'minimap';
        activePointerId = e.pointerId;
        didDrag = true;
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        r.panX = hit.panX;
        r.panY = hit.panY;
        r.render();
        updateMinimapAvailability();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
        el.classList.add('dragging');
        return;
      }

      hideHoverBalloon();
      gestureMode = 'pan';
      activePointerId = e.pointerId;
      didDrag = false;
      pointerDownCanvasCoords = eventToCanvasCoords(e);
      startX = e.clientX; startY = e.clientY;
      if (r) { panSX = r.panX; panSY = r.panY; }
      // Cancel any in-flight viewport animation so pan starts from the current position.
      if (cancelViewportAnimation) cancelViewportAnimation();
      const liveCam3 = camera3DRef.current;
      if (liveCam3) liveCam3.cancelAllAnimations();
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      // item 141: if a 2nd finger is already down, transition to pinch
      if (activePointers.size === 2) {
        const twoState = getTwoPointerState(activePointers);
        if (twoState) {
          pinchStart = { ...twoState, zoom: r.zoom, panX: r.panX, panY: r.panY };
          pinchLastAngle = twoState.angle;
          gestureMode = 'pinch';
          // release single-pointer capture so the 2nd pointer isn't redirected
          if (el.releasePointerCapture && activePointerId != null) {
            try { el.releasePointerCapture(activePointerId); } catch (_) {}
          }
          activePointerId = null;
        }
      }
    };

    const onPointerMove = (e) => {
      if (mouseRotateActive) return;
      // item 141: keep pointer position fresh for pinch state
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      }
      const r = rendererRef.current;
      if (!r) return;
      const cam = camera3DRef.current;

      // item 141: two-finger pinch-zoom-rotate
      if (gestureMode === 'pinch' && pinchStart) {
        const twoState = getTwoPointerState(activePointers);
        if (twoState) {
          const scaleRatio = twoState.dist / Math.max(1, pinchStart.dist);
          const newZoom = Math.max(0.1, Math.min(64, pinchStart.zoom * scaleRatio));
          // Zoom around the initial pinch centre, panned by centre drift
          const contentX = (pinchStart.cx - pinchStart.panX) / Math.max(0.0001, pinchStart.zoom);
          const contentY = (pinchStart.cy - pinchStart.panY) / Math.max(0.0001, pinchStart.zoom);
          r.zoom = newZoom;
          r.panX = twoState.cx - contentX * newZoom;
          r.panY = twoState.cy - contentY * newZoom;
          // Incremental camera rotation from twist (only if 3D mode is active)
          if (cam && cam.enabled) {
            const angleDelta = twoState.angle - pinchLastAngle;
            cam.rotate(angleDelta * 40, 0); // 40 camera-degrees per radian of twist
          }
          pinchLastAngle = twoState.angle;
          setZoom(r.zoom);
          r.render();
          updateMinimapAvailability();
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
          scheduleBalloonRelayout();
        }
        return;
      }

      // item 329: three-finger drag — tilt the 3D camera
      if (gestureMode === 'tiltTouch') {
        if (cam && cam.enabled) {
          const newCentroid = getThreePointerCentroid(activePointers);
          if (newCentroid && tiltTouchCentroid) {
            cam.rotate(newCentroid.cx - tiltTouchCentroid.cx, newCentroid.cy - tiltTouchCentroid.cy);
            r.render();
            r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
            if (updateMinimapAvailability) updateMinimapAvailability();
            scheduleBalloonRelayout();
            tiltTouchCentroid = newCentroid;
          }
        }
        return;
      }

      if (gestureMode === 'none' && cam) {
        const secondaryPressed = ((e.buttons & 2) === 2) || (((e.buttons & 1) === 1) && (e.ctrlKey || e.metaKey));
        if (secondaryPressed) {
          enableTiltAndResize();
          const liveCam2 = camera3DRef.current;
          if (liveCam2) liveCam2.cancelAllAnimations();
          gestureMode = 'rotate';
          activePointerId = e.pointerId;
          startX = e.clientX;
          startY = e.clientY;
          didDrag = false;
          if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
          el.classList.add('dragging');
          return;
        }
      }

      if (activePointerId != null && e.pointerId !== activePointerId) return;

      if (gestureMode === 'rotate' && cam && cam.enabled) {
        hideHoverBalloon();
        didDrag = true;
        const next = applyRotate({
          camera: cam,
          renderer: r,
          event: e,
          startX,
          startY,
          getMinimapDetailH,
          scheduleBalloonRelayout,
        });
        startX = next.startX;
        startY = next.startY;
        return;
      }

      if (gestureMode === 'minimap') {
        hideHoverBalloon();
        const hit = r.minimapHitTest(e.clientX, e.clientY);
        if (hit) {
          r.panX = hit.panX;
          r.panY = hit.panY;
          r.render();
          updateMinimapAvailability();
          r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, getMinimapDetailH());
          scheduleBalloonRelayout();
        }
        return;
      }

      if (gestureMode === 'pan') {
        hideHoverBalloon();
        didDrag = true;
        // item 253: disable balloon CSS transitions during pan so getBoundingClientRect()
        // returns the current (not pre-transition) position, keeping connectors in sync.
        setBalloonLiveLayout(true);
        applyPan({
          renderer: r,
          event: e,
          startX,
          startY,
          panStartX: panSX,
          panStartY: panSY,
          getMinimapDetailH,
          updateMinimapAvailability,
          scheduleBalloonRelayout,
        });
        return;
      }

      // Suppress the hover popup when the cursor is over an overlay (toolbar,
      // settings/events/details panels, timing panel, minimap, event-title banner,
      // trace-info popover). The pointermove listener is bound to window so it
      // fires everywhere; we probe the element under the cursor to gate the popup.
      if (!areBalloonsEnabled || !isBalloonHoverEnabled) {
        if (lastHoveredIdxRef.current !== -1) {
          lastHoveredIdxRef.current = -1;
          setHoveredBitInfo(null);
        }
        return;
      }

      const overOverlay = (() => {
        if (typeof document === 'undefined') return false;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (!hit) return false;
        // item 252: also check bounding rect of .double-timeline since its title/annotation
        // bars have pointer-events:none and are skipped by elementFromPoint.
        const dtl = document.querySelector('.double-timeline');
        if (dtl) {
          const r2 = dtl.getBoundingClientRect();
          if (e.clientX >= r2.left && e.clientX <= r2.right && e.clientY >= r2.top && e.clientY <= r2.bottom) {
            return true;
          }
        }
        return !!hit.closest(
          '.toolbar, .events-panel, .settings-sidebar, .detail-panel, .timing-panel, ' +
          '.step-focus-banner, .events-panel-floating-title, .joined-events-widget, ' +
          '.minimap-overlay-canvas, .trace-info-popover, .debug-tools-panel, ' +
          '.bit-history-panel, .double-timeline'
        );
      })();
      if (overOverlay) {
        if (lastHoveredIdxRef.current !== -1) {
          lastHoveredIdxRef.current = -1;
          setHoveredBitInfo(null);
        }
        return;
      }

      const coords = eventToCanvasCoords(e);
      const idx = r.canvasToBitIndex(coords.x, coords.y);
      el.style.cursor = 'crosshair';
      if (idx !== lastHoveredIdxRef.current) {
        lastHoveredIdxRef.current = idx;
        if (idx >= 0) {
          setHoveredBitInfo(computeBitInfo(idx));
        } else {
          setHoveredBitInfo(null);
        }
      }
    };

    const onPointerEnd = (e) => {
      if (mouseRotateActive) return;
      // item 141: remove from multi-touch tracking
      activePointers.delete(e.pointerId);
      // item 329: handle three-finger tilt gesture end
      if (gestureMode === 'tiltTouch') {
        tiltTouchCentroid = null;
        if (activePointers.size === 2) {
          // Two fingers remain — transition back to pinch
          const twoState = getTwoPointerState(activePointers);
          const rp = rendererRef.current;
          if (twoState && rp) {
            pinchStart = { ...twoState, zoom: rp.zoom, panX: rp.panX, panY: rp.panY };
            pinchLastAngle = twoState.angle;
            gestureMode = 'pinch';
          } else {
            clearInteraction();
          }
        } else if (activePointers.size < 2) {
          clearInteraction();
          schedulePostLayoutRefresh(null);
        }
        return;
      }
      // item 141: handle pinch end before the single-pointer guard below
      if (gestureMode === 'pinch') {
        if (activePointers.size === 1) {
          // One finger remains — smoothly transition back to pan
          const entry = activePointers.entries().next().value;
          if (entry) {
            const [pId, pt] = entry;
            const rp = rendererRef.current;
            gestureMode = 'pan';
            activePointerId = pId;
            startX = pt.clientX;
            startY = pt.clientY;
            if (rp) { panSX = rp.panX; panSY = rp.panY; }
            if (el.setPointerCapture) { try { el.setPointerCapture(pId); } catch (_) {} }
          }
        } else if (activePointers.size === 0) {
          clearInteraction();
        }
        pinchStart = null;
        return;
      }
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      const rect = el.getBoundingClientRect();
      const releasedOverCanvas = isPointWithinRect(e.clientX, e.clientY, rect);
      const r = rendererRef.current;

      if (gestureMode === 'rotate') {
        clearInteraction();
        // Resize the canvas to match the final tilt angle. During the gesture
        // refreshCanvasLayout is no longer called every frame (getCanvasTargetSize
        // now reads from the camera ref directly, decoupling it from the
        // camera3DTransform state that changes each pointer-move).
        schedulePostLayoutRefresh(null);
        return;
      }

      if (gestureMode === 'none' && !releasedOverCanvas) {
        clearInteraction();
        return;
      }

      if (!didDrag && gestureMode !== 'minimap' && r) {
        // Ignore "clicks" that originate from interactive overlays sitting on
        // top of the canvas (event-title widget, bit-history popups, detail
        // inspector). Pointerdown on those overlays never reaches the canvas
        // listener, but pointerup is bound to window and would otherwise
        // toggle a pinned bit beneath the overlay — creating accidental
        // popups when the user is interacting with the widget itself.
        const t = e.target;
        if (t && typeof t.closest === 'function' && t.closest(
          '.step-focus-banner, .bit-history-panel, .detail-inspector-overlay, .toolbar, .events-panel, .settings-sidebar, .detail-panel, .timing-panel, .trace-info-popover, .debug-tools-panel, .joined-events-widget'
        )) {
          clearInteraction();
          return;
        }
        // item 144: true canvas click — dismiss the settings panel if it is open
        collapseSettingsIfOpen?.();
        if (!areBalloonsEnabled || !isBalloonClickEnabled) {
          clearInteraction();
          return;
        }
        const coords = pointerDownCanvasCoords || eventToCanvasCoords(e);
        const canvasLabelUnit = onInspectCanvasUnit ? hitTestCanvasLabelUnit(r, coords.x, coords.y) : null;
        if (canvasLabelUnit) {
          onInspectCanvasUnit(canvasLabelUnit);
          clearInteraction();
          return;
        }
        const idx = r.canvasToBitIndex(coords.x, coords.y);
        if (idx >= 0) {
          const cam = camera3DRef.current;
          if (cam && cam.enabled) {
            flyToElement(idx);
          } else {
            // 2D mode: animated pan to center on the clicked bit (item 102)
            panToElement2D(idx);
          }
          if ((e.detail || 0) >= 2) {
            setPinnedBitIndices([idx]);
          } else {
            setPinnedBitIndices((prev) => (
              prev.includes(idx) ? prev.filter((value) => value !== idx) : [...prev, idx]
            ));
          }
        } else {
          // Clicking on empty grid no longer clears pinned balloons —
          // balloons stay pinned until the user explicitly unpins them.
        }
      }

      clearInteraction();
    };

    const onWheel = (e) => {
      e.preventDefault();
      const r = rendererRef.current;
      if (!r) return;
      const coords = eventToCanvasCoords(e);
      applyWheel({
        renderer: r,
        event: e,
        cursorX: coords.x,
        cursorY: coords.y,
        setZoom,
        getMinimapDetailH,
        updateMinimapAvailability,
        scheduleBalloonRelayout,
      });

      const pausedProgress = Math.max(0, Math.min(100, Number(stepScrubProgressValueRef.current) || 0));
      if (globalPausedRef.current && pausedProgress > 0 && pausedProgress < 100) {
        // Keep paused in-flight animation overlays visible after zoom changes.
        seekStepAnimation(pausedProgress / 100);
      }
      setBalloonLiveLayout(true);
      if (balloonLiveLayoutTimerRef.current != null) clearTimeout(balloonLiveLayoutTimerRef.current);
      scheduleBalloonRelayout(true);
      balloonLiveLayoutTimerRef.current = setTimeout(() => {
        balloonLiveLayoutTimerRef.current = null;
        setBalloonLiveLayout(false);
        scheduleBalloonRelayout(true);
      }, 140);
    };

    const onMouseDown = (e) => {
      const secondary = e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      if (!secondary) return;
      enableTiltAndResize();
      const liveCam3 = camera3DRef.current;
      if (liveCam3) liveCam3.cancelAllAnimations();
      e.preventDefault();
      e.stopPropagation();
      hideHoverBalloon();
      mouseRotateActive = true;
      gestureMode = 'rotate';
      activePointerId = null;
      startX = e.clientX;
      startY = e.clientY;
      didDrag = false;
      el.classList.add('dragging');
    };

    const onMouseMove = (e) => {
      if (!mouseRotateActive) return;
      const cam = camera3DRef.current;
      const r = rendererRef.current;
      if (!cam || !cam.enabled || !r) {
        clearInteraction();
        return;
      }
      const stillSecondary = (e.buttons & 2) === 2 || ((e.buttons & 1) === 1 && (e.ctrlKey || e.metaKey));
      if (!stillSecondary) {
        clearInteraction();
        return;
      }
      didDrag = true;
      const next = applyRotate({
        camera: cam,
        renderer: r,
        event: e,
        startX,
        startY,
        getMinimapDetailH,
        updateMinimapAvailability,
        scheduleBalloonRelayout,
      });
      startX = next.startX;
      startY = next.startY;
    };

    const onMouseUp = () => {
      if (!mouseRotateActive) return;
      clearInteraction();
      schedulePostLayoutRefresh(null);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('auxclick', onAuxClick);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const onMouseLeave = () => {
      if (gestureMode === 'none') {
        lastHoveredIdxRef.current = -1;
        setHoveredBitInfo(null);
      }
      el.style.cursor = 'crosshair';
    };
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('auxclick', onAuxClick);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [computeBitInfo, flyToElement, panToElement2D, getCanvasPlaneMetrics, getMinimapDetailH, updateMinimapAvailability, enableTiltAndResize, scheduleBalloonRelayout, schedulePostLayoutRefresh, areBalloonsEnabled, isBalloonClickEnabled, isBalloonHoverEnabled, seekStepAnimation, onInspectCanvasUnit, hitTestCanvasLabelUnit]); // eslint-disable-line react-hooks/exhaustive-deps
}
