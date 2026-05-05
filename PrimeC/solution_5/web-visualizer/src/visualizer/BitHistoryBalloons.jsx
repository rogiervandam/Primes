import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BitHistoryBalloon from './BitHistoryBalloon';

function connectorPathFor({ anchorX, anchorY, bitHalf, box }) {
  const edgePad = 20;
  const edgeTargets = [
    {
      x: Math.max(box.left + edgePad, Math.min(box.right - edgePad, anchorX)),
      y: box.top,
      tx: 1,
      ty: 0,
    },
    {
      x: Math.max(box.left + edgePad, Math.min(box.right - edgePad, anchorX)),
      y: box.bottom,
      tx: 1,
      ty: 0,
    },
    {
      x: box.left,
      y: Math.max(box.top + edgePad, Math.min(box.bottom - edgePad, anchorY)),
      tx: 0,
      ty: 1,
    },
    {
      x: box.right,
      y: Math.max(box.top + edgePad, Math.min(box.bottom - edgePad, anchorY)),
      tx: 0,
      ty: 1,
    },
  ];
  let edgePoint = edgeTargets[0];
  let bestDist = Infinity;
  for (const candidate of edgeTargets) {
    const dx = candidate.x - anchorX;
    const dy = candidate.y - anchorY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      edgePoint = candidate;
    }
  }

  const dx = edgePoint.x - anchorX;
  const dy = edgePoint.y - anchorY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular at start (along main direction axis)
  const px = -uy;
  const py = ux;
  // Perpendicular at end edge (the edge's tangent direction)
  const etx = edgePoint.tx;
  const ety = edgePoint.ty;

  // Very narrow at the bit tip (pointy), wide at the balloon face
  const startWidth = Math.max(1.5, Math.min(3, bitHalf * 0.5));
  const endHalf = 22;

  const startX = anchorX + ux * Math.max(2, bitHalf);
  const startY = anchorY + uy * Math.max(2, bitHalf);
  const endX = edgePoint.x;
  const endY = edgePoint.y;

  // Symmetric control points at 35% and 65% along the path to avoid S-curve
  // twisting. Blend the perpendicular direction from start-axis (px,py) toward
  // end-edge tangent (etx,ety) so the width transition is smooth and the
  // filled shape never self-intersects regardless of direction.
  const c1x = startX + dx * 0.35;
  const c1y = startY + dy * 0.35;
  const c2x = startX + dx * 0.65;
  const c2y = startY + dy * 0.65;

  // Blend perpendicular at each control point to smoothly taper from tip to base.
  const c1w = startWidth * 0.7 + endHalf * 0.3;
  const c2w = startWidth * 0.2 + endHalf * 0.8;
  const c1px = px * 0.7 + etx * 0.3;
  const c1py = py * 0.7 + ety * 0.3;
  const c2px = px * 0.2 + etx * 0.8;
  const c2py = py * 0.2 + ety * 0.8;

  return [
    `M ${startX + px * startWidth} ${startY + py * startWidth}`,
    `C ${c1x + c1px * c1w} ${c1y + c1py * c1w}, ${c2x + c2px * c2w} ${c2y + c2py * c2w}, ${endX + etx * endHalf} ${endY + ety * endHalf}`,
    `L ${endX - etx * endHalf} ${endY - ety * endHalf}`,
    `C ${c2x - c2px * c2w} ${c2y - c2py * c2w}, ${c1x - c1px * c1w} ${c1y - c1py * c1w}, ${startX - px * startWidth} ${startY - py * startWidth}`,
    'Z',
  ].join(' ');
}

/**
 * Renders the cluster of pinned (click-locked) bit-history balloons plus
 * the ephemeral hover balloon. Layout/clipping decisions are delegated to
 * `getVisibleBalloonStyles`; this component maps those results onto
 * connector paths and `<BitHistoryBalloon>` instances.
 */
function BitHistoryBalloons({
  pinnedBitIndices,
  hoveredBitInfo,
  computeBitInfo,
  getVisibleBalloonStyles,
  liveLayout,
  cachelineSize,
  currentStep,
  onUnpin,
  onHistoryClick,
}) {
  const balloonRefs = useRef(new Map());
  const [measuredBoxes, setMeasuredBoxes] = useState({});
  const hoverBalloonVisible = !!hoveredBitInfo && !pinnedBitIndices.includes(hoveredBitInfo.bitIndex);
  const visibleBalloonStyles = getVisibleBalloonStyles([
    ...pinnedBitIndices.map((bitIndex) => ({ kind: 'pinned', bitIndex })),
    ...(hoverBalloonVisible ? [{ kind: 'hover', bitIndex: hoveredBitInfo.bitIndex }] : []),
  ]);

  const setBalloonRef = (key, node) => {
    if (node) balloonRefs.current.set(key, node);
    else balloonRefs.current.delete(key);
  };

  useLayoutEffect(() => {
    const nextBoxes = {};
    for (const [key, entry] of Object.entries(visibleBalloonStyles)) {
      if (entry?.visible === false) continue;
      const node = balloonRefs.current.get(key);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      nextBoxes[key] = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    }
    setMeasuredBoxes((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextBoxes);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => {
        const a = prev[key];
        const b = nextBoxes[key];
        return a && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.right - b.right) < 0.5 &&
          Math.abs(a.top - b.top) < 0.5 && Math.abs(a.bottom - b.bottom) < 0.5;
      })) {
        return prev;
      }
      return nextBoxes;
    });
  }, [visibleBalloonStyles]);

  const connectors = useMemo(() => Object.entries(visibleBalloonStyles)
    .filter(([, entry]) => entry?.visible !== false && entry?.connector)
    .map(([key, entry]) => ({
      key,
      path: connectorPathFor({
        ...entry.connector,
        box: measuredBoxes[key] || entry.connector.box,
      }),
    })), [measuredBoxes, visibleBalloonStyles]);

  return (
    <>
      {connectors.length > 0 && (
        <svg className="bit-history-connectors" aria-hidden="true">
          {connectors.map(({ key, path }) => (
            <path key={`connector-${key}`} className="bit-history-connector-shape" d={path} />
          ))}
        </svg>
      )}

      {pinnedBitIndices.map((bitIdx) => {
        const info = computeBitInfo(bitIdx);
        if (!info) return null;
        const bi = info.bitIndex;
        const entry = visibleBalloonStyles[`pinned-${bi}`];
        const visible = entry ? entry.visible !== false : true;
        return (
          <BitHistoryBalloon
            key={`locked-bit-${bi}`}
            ref={(node) => setBalloonRef(`pinned-${bi}`, node)}
            info={info}
            pinned
            liveLayout={liveLayout}
            style={entry?.panelStyle}
            clipped={!visible}
            cachelineSize={cachelineSize}
            currentStep={currentStep}
            onClose={() => onUnpin(bi)}
            onHistoryClick={onHistoryClick}
            keyPrefix="locked"
          />
        );
      })}

      {hoverBalloonVisible && (() => {
        const info = hoveredBitInfo;
        const bi = info.bitIndex;
        const entry = visibleBalloonStyles[`hover-${bi}`];
        const visible = entry ? entry.visible !== false : true;
        return (
          <BitHistoryBalloon
            info={info}
            ref={(node) => setBalloonRef(`hover-${bi}`, node)}
            pinned={false}
            liveLayout={liveLayout}
            style={entry?.panelStyle}
            clipped={!visible}
            cachelineSize={cachelineSize}
            currentStep={currentStep}
            onHistoryClick={onHistoryClick}
            keyPrefix="hover"
          />
        );
      })()}
    </>
  );
}

export default BitHistoryBalloons;
