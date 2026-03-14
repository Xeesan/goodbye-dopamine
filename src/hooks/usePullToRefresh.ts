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

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing.current) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || !indicatorRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    if (dy > 0 && containerRef.current?.scrollTop === 0) {
      // Dampen the pull distance
      const pull = Math.min(dy * 0.4, threshold * 1.5);
      indicatorRef.current.style.height = `${pull}px`;
      indicatorRef.current.style.opacity = `${Math.min(pull / threshold, 1)}`;
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || !indicatorRef.current) return;
    pulling.current = false;
    const h = parseFloat(indicatorRef.current.style.height || '0');
    if (h >= threshold) {
      refreshing.current = true;
      indicatorRef.current.style.height = '40px';
      indicatorRef.current.style.opacity = '1';
      indicatorRef.current.classList.add('ptr-active');
      try { await onRefresh(); } catch {}
      refreshing.current = false;
    }
    indicatorRef.current.classList.remove('ptr-active');
    indicatorRef.current.style.height = '0px';
    indicatorRef.current.style.opacity = '0';
  }, [onRefresh, threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, indicatorRef };
}
