import { describe, it, expect } from "vitest";

describe("Viewport Breakpoint Classification", () => {
  function getBreakpoint(width: number) {
    if (width < 480) return "xs";
    if (width < 640) return "sm";
    if (width < 768) return "md";
    if (width < 1024) return "lg";
    if (width < 1280) return "xl";
    if (width < 1536) return "2xl";
    return "3xl";
  }

  it("correctly identifies mobile viewport (< 768px)", () => {
    expect(getBreakpoint(320)).toBe("xs");
    expect(getBreakpoint(375)).toBe("xs");
    expect(getBreakpoint(414)).toBe("xs");
    expect(getBreakpoint(500)).toBe("sm");
    expect(getBreakpoint(700)).toBe("md");
  });

  it("correctly identifies tablet and laptop viewports (768px - 1439px)", () => {
    expect(getBreakpoint(768)).toBe("lg");
    expect(getBreakpoint(820)).toBe("lg");
    expect(getBreakpoint(1024)).toBe("xl");
    expect(getBreakpoint(1280)).toBe("2xl");
  });

  it("correctly identifies desktop and 2K screens (>= 1536px)", () => {
    expect(getBreakpoint(1536)).toBe("3xl");
    expect(getBreakpoint(1920)).toBe("3xl");
    expect(getBreakpoint(2560)).toBe("3xl");
  });
});
