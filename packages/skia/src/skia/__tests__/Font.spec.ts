import { loadFont } from "../../renderer/__tests__/setup";

import { setupSkia } from "./setup";

describe("Font API", () => {
  it("measureText doesn't throw on web", () => {
    setupSkia();
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", 32);
    expect(() => font.measureText("Hello World")).not.toThrow();
    const rect = font.measureText("Hello World");
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    // The ink bounds start above the baseline.
    expect(rect.y).toBeLessThan(0);
  });

  it("measureText width grows with the text length", () => {
    setupSkia();
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", 32);
    const one = font.measureText("A").width;
    const two = font.measureText("AA").width;
    const three = font.measureText("AAA").width;
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
    // "AAA" spans two full advances plus the ink width of the last "A",
    // so it is roughly three times the width of a single "A".
    expect(three).toBeGreaterThan(2 * one);
    expect(three).toBeLessThan(4 * one);
  });

  it("measureText is consistent with the sum of the glyph advances", () => {
    setupSkia();
    const fontSize = 32;
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", fontSize);
    const text = "Hello World";
    const advances = font
      .getGlyphWidths(font.getGlyphIDs(text))
      .reduce((a, b) => a + b, 0);
    const rect = font.measureText(text);
    // The ink bounds are contained within the advance width (modulo bearings)
    // and shouldn't differ from it by more than a glyph's worth of bearing.
    expect(rect.x + rect.width).toBeLessThanOrEqual(advances);
    expect(rect.width).toBeGreaterThan(advances - fontSize);
  });

  it("measureText returns an empty rect for an empty string", () => {
    setupSkia();
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", 32);
    const rect = font.measureText("");
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });

  it("measureText returns an empty rect for whitespace only", () => {
    setupSkia();
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", 32);
    const rect = font.measureText("   ");
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});
