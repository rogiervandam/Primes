import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manage a draggable + resizable absolutely-positioned floating panel
 * that stays clamped inside its parent element.
 *
 * Usage:
 *   const { panelRef, panelStyle, onHeaderMouseDown, onResizeMouseDown } =
 *     useFloatingPanel({ defaultWidth: 620, defaultHeight: 520, minWidth: 420, minHeight: 280 });
 *
 *   return (
 *     <div ref={panelRef} style={panelStyle}>
 *       <header onMouseDown={onHeaderMouseDown}>...</header>
 *       <div onMouseDown={onResizeMouseDown} className="resize-handle" />
 *     </div>
 *   );
 *
 * The header handler is a no-op when the click hits a button/select/input,
 * so interactive controls inside the header keep working.
 */
export function useFloatingPanel({
  defaultWidth,
  defaultHeight,
  minWidth = 320,
  minHeight = 240,
} = {}) {
  const panelRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [pos, setPos] = useState(null); // null = center on parent on first layout

  // Center on first layout
  useEffect(() => {
    const parent = panelRef.current?.parentElement;
    if (!parent || pos) return;
    const parentRect = parent.getBoundingClientRect();
    const left = Math.max(8, Math.floor((parentRect.width - size.width) / 2));
    const top = Math.max(8, Math.floor((parentRect.height - size.height) / 2));
    setPos({ left, top });
  }, [pos, size.width, size.height]);

  const clampToParent = useCallback((left, top, width, height) => {
    const parent = panelRef.current?.parentElement;
    if (!parent) return { left, top };
    const pr = parent.getBoundingClientRect();
    const maxLeft = Math.max(0, pr.width - width);
    const maxTop = Math.max(0, pr.height - height);
    return {
      left: Math.max(0, Math.min(maxLeft, left)),
      top: Math.max(0, Math.min(maxTop, top)),
    };
  }, []);

  const onHeaderMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
    const parent = panelRef.current?.parentElement;
    if (!parent) return;
    const startLeft = pos?.left ?? 0;
    const startTop = pos?.top ?? 0;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startLeft, startTop };
    e.preventDefault();
  };

  const onResizeMouseDown = (e) => {
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (dragStateRef.current) {
        const ds = dragStateRef.current;
        const nextLeft = ds.startLeft + (e.clientX - ds.startX);
        const nextTop = ds.startTop + (e.clientY - ds.startY);
        setPos(clampToParent(nextLeft, nextTop, size.width, size.height));
      } else if (resizeStateRef.current) {
        const rs = resizeStateRef.current;
        const parent = panelRef.current?.parentElement;
        const pr = parent ? parent.getBoundingClientRect() : { width: 4000, height: 4000 };
        const maxW = Math.max(minWidth, pr.width - (pos?.left ?? 0));
        const maxH = Math.max(minHeight, pr.height - (pos?.top ?? 0));
        const nextW = Math.max(minWidth, Math.min(maxW, rs.startW + (e.clientX - rs.startX)));
        const nextH = Math.max(minHeight, Math.min(maxH, rs.startH + (e.clientY - rs.startY)));
        setSize({ width: nextW, height: nextH });
      }
    };
    const onUp = () => {
      dragStateRef.current = null;
      resizeStateRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [clampToParent, pos, size.width, size.height, minWidth, minHeight]);

  const panelStyle = {
    width: size.width,
    height: size.height,
    left: pos?.left ?? 0,
    top: pos?.top ?? 0,
    visibility: pos ? 'visible' : 'hidden',
  };

  return { panelRef, panelStyle, size, pos, onHeaderMouseDown, onResizeMouseDown };
}
