import { useRef, useEffect, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  // Keep latest onRefresh in a ref to avoid re-attaching listeners
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const resetIndicator = useCallback(() => {
    const ind = indicatorRef.current;
    if (!ind) return;
    ind.classList.remove('ptr-active');
    ind.style.height = '0px';
    ind.style.opacity = '0';
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only enable on touch-capable devices
    if (!('ontouchstart' in window)) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing.current) return;
      // Only trigger if scrolled to top
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const ind = indicatorRef.current;
      if (!pulling.current || !ind || refreshing.current) return;
      // Abort if user scrolled down since start
      if (el.scrollTop > 0) {
        pulling.current = false;
        ind.style.height = '0px';
        ind.style.opacity = '0';
        return;
      }
      const dy = Math.max(0, e.touches[0].clientY - startY.current);
      if (dy > 0) {
        const pull = Math.min(dy * 0.4, threshold * 1.5);
        ind.style.height = `${pull}px`;
        ind.style.opacity = `${Math.min(pull / threshold, 1)}`;
      }
    };

    const handleTouchEnd = async () => {
      const ind = indicatorRef.current;
      if (!pulling.current || !ind) return;
      pulling.current = false;

      const h = parseFloat(ind.style.height || '0');
      if (h >= threshold && !refreshing.current) {
        refreshing.current = true;
        ind.style.height = '40px';
        ind.style.opacity = '1';
        ind.classList.add('ptr-active');
        try {
          await onRefreshRef.current();
        } catch {
          // swallow — refresh errors shouldn't crash
        } finally {
          refreshing.current = false;
          // Guard: element may have unmounted during async refresh
          if (indicatorRef.current) {
            indicatorRef.current.classList.remove('ptr-active');
            indicatorRef.current.style.height = '0px';
            indicatorRef.current.style.opacity = '0';
          }
        }
        return;
      }

      // Below threshold — snap back
      ind.style.height = '0px';
      ind.style.opacity = '0';
    };

    const handleTouchCancel = () => {
      pulling.current = false;
      resetIndicator();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchCancel);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [threshold, resetIndicator]);

  return { containerRef, indicatorRef };
}
