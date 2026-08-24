import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean; // < 768px
  isTablet: boolean; // 768px - 1023px
  isLaptop: boolean; // 1024px - 1439px
  isDesktop: boolean; // >= 1440px
  is2K: boolean; // >= 1920px
}

function getBreakpoint(width: number): Breakpoint {
  if (width < 480) return "xs";
  if (width < 640) return "sm";
  if (width < 768) return "md";
  if (width < 1024) return "lg";
  if (width < 1280) return "xl";
  if (width < 1536) return "2xl";
  return "3xl";
}

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === "undefined") {
      return {
        width: 1280,
        height: 800,
        breakpoint: "xl",
        isMobile: false,
        isTablet: false,
        isLaptop: false,
        isDesktop: true,
        is2K: false,
      };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    return {
      width,
      height,
      breakpoint,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isLaptop: width >= 1024 && width < 1440,
      isDesktop: width >= 1440,
      is2K: width >= 1920,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: number | undefined;

    const handleResize = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const breakpoint = getBreakpoint(width);
        setViewport({
          width,
          height,
          breakpoint,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isLaptop: width >= 1024 && width < 1440,
          isDesktop: width >= 1440,
          is2K: width >= 1920,
        });
      }, 100);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
}
