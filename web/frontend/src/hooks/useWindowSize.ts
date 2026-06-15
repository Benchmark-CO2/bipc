import { useEffect, useState } from "react";

type WindowSize = {
  width: number;
  height: number;
};

const FALLBACK_SIZE: WindowSize = { width: 1440, height: 900 };

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    if (typeof window === "undefined") return FALLBACK_SIZE;
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
