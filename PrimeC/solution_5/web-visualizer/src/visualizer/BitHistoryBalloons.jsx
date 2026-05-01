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
  const px = -uy;
  const py = ux;
  const startWidth = Math.max(4, Math.min(8, bitHalf * 1.2));
  const endHalf = 12;
  const startX = anchorX + ux * Math.max(2, bitHalf);
  const startY = anchorY + uy * Math.max(2, bitHalf);
  const endX = edgePoint.x;
  const endY = edgePoint.y;
  const c1x = startX + dx * 0.26;
  const c1y = startY + dy * 0.10;
  const c2x = startX + dx * 0.70;
  const c2y = startY + dy * 0.92;
  const etx = edgePoint.tx;
  const ety = edgePoint.ty;

  return [
    `M ${startX + px * startWidth} ${startY + py * startWidth}`,
    `C ${c1x + px * startWidth} ${c1y + py * startWidth}, ${c2x + etx * endHalf} ${c2y + ety * endHalf}, ${endX + etx * endHalf} ${endY + ety * endHalf}`,
    `L ${endX - etx * endHalf} ${endY - ety * endHalf}`,
    `C ${c2x - etx * endHalf} ${c2y - ety * endHalf}, ${c1x - px * startWidth} ${c1y - py * startWidth}, ${startX - px * startWidth} ${startY - py * startWidth}`,
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
