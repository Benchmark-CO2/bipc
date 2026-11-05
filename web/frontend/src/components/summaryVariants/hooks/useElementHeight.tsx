import { useEffect, useState } from 'react';
import { useResizeObserver } from './useResizeObserver';

export function useElementHeight<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [height, setHeight] = useState(0);
  const { ref: resizeObserverRef } = useResizeObserver<T>((element) => {
    setHeight(entry.contentRect.height);
  });
  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, height };
}