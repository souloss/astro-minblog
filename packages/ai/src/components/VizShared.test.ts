import { describe, expect, it } from "vitest";
import { getScaledCanvasStyles } from "./VizShared.tsx";

describe("getScaledCanvasStyles", () => {
  it("keeps wrapper size unchanged at scale 1", () => {
    const result = getScaledCanvasStyles({ width: 320, height: 180 }, 1);

    expect(result.scaledStyle).toEqual({ width: "320px", height: "180px" });
    expect(result.transformStyle).toEqual({
      transform: "scale(1)",
      transformOrigin: "top left",
    });
  });

  it("expands wrapper size when zooming in", () => {
    const result = getScaledCanvasStyles({ width: 320, height: 180 }, 1.4);

    expect(result.scaledStyle).toEqual({ width: "448px", height: "252px" });
    expect(result.transformStyle.transform).toBe("scale(1.4)");
  });

  it("shrinks wrapper size when zooming out", () => {
    const result = getScaledCanvasStyles({ width: 320, height: 180 }, 0.5);

    expect(result.scaledStyle).toEqual({ width: "160px", height: "90px" });
    expect(result.transformStyle.transform).toBe("scale(0.5)");
  });

  it("keeps top-left transform origin for predictable drag panning", () => {
    const result = getScaledCanvasStyles({ width: 200, height: 120 }, 1.8);

    expect(result.transformStyle.transformOrigin).toBe("top left");
  });
});
