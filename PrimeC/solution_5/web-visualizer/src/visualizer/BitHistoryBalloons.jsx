import React from 'react';
import BitHistoryBalloon from './BitHistoryBalloon';

/**
 * Renders the cluster of pinned (click-locked) bit-history balloons plus
 * the ephemeral hover balloon. Layout/clipping decisions are delegated to
 * `getVisibleBalloonStyles`; this component just maps the result onto
 * `<BitHistoryBalloon>` instances.
 */
function BitHistoryBalloons({
  pinnedBitIndices,
  hoveredBitInfo,
  computeBitInfo,
  getVisibleBalloonStyles,
  cachelineSize,
  currentStep,
  onUnpin,
  onHistoryClick,
}) {
  const hoverBalloonVisible = !!hoveredBitInfo && !pinnedBitIndices.includes(hoveredBitInfo.bitIndex);
  const visibleBalloonStyles = getVisibleBalloonStyles([
    ...pinnedBitIndices.map((bitIndex) => ({ kind: 'pinned', bitIndex })),
    ...(hoverBalloonVisible ? [{ kind: 'hover', bitIndex: hoveredBitInfo.bitIndex }] : []),
  ]);

  return (
    <>
      {pinnedBitIndices.map((bitIdx) => {
        const info = computeBitInfo(bitIdx);
        if (!info) return null;
        const bi = info.bitIndex;
        const entry = visibleBalloonStyles[`pinned-${bi}`];
        const visible = entry ? entry.visible !== false : true;
        return (
          <BitHistoryBalloon
            key={`locked-bit-${bi}`}
            info={info}
            pinned
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
            pinned={false}
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
