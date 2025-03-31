import type { CanvasKit, Font } from "canvaskit-wasm";

import type {
  FontEdging,
  FontHinting,
  SkFont,
  SkPaint,
  SkPoint,
  SkRect,
  SkTypeface,
} from "../types";

import { HostObject, getEnum, throwNotImplementedOnRNWeb } from "./Host";
import { JsiSkPaint } from "./JsiSkPaint";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkRect } from "./JsiSkRect";
import { JsiSkTypeface } from "./JsiSkTypeface";

export class JsiSkFont extends HostObject<Font, "Font"> implements SkFont {
  constructor(CanvasKit: CanvasKit, ref: Font) {
    super(CanvasKit, ref, "Font");
  }

  measureText(_text: string, _paint?: SkPaint | undefined) {
    return throwNotImplementedOnRNWeb<SkRect>();
  }

  dispose = () => {
    this.ref.delete();
  };

  getTextWidth(text: string, paint?: SkPaint | undefined) {
    const ids = this.getGlyphIDs(text);
    const widths = this.getGlyphWidths(ids, paint);
    return widths.reduce((a, b) => a + b, 0);
  }

  getMetrics() {
    const result = this.ref.getMetrics();
    return {
      ascent: result.ascent,
      descent: result.descent,
      leading: result.leading,
      bounds: result.bounds
        ? new JsiSkRect(this.CanvasKit, result.bounds)
        : undefined,
    };
  }

  getGlyphIDs(str: string, numCodePoints?: number) {
    // TODO: Fix return value in the C++ implementation
    return [...this.ref.getGlyphIDs(str, numCodePoints)];
  }

  // TODO: Fix return value in the C++ implementation, it return float32
  getGlyphWidths(glyphs: number[], paint?: SkPaint | null) {
    return [
      ...this.ref.getGlyphWidths(
        glyphs,
        paint ? JsiSkPaint.fromValue(paint) : null
      ),
    ];
  }

  getGlyphIntercepts(
    glyphs: number[],
    positions: SkPoint[],
    top: number,
    bottom: number
  ) {
    return [
      ...this.ref.getGlyphIntercepts(
        glyphs,
        positions.map((p) => Array.from(JsiSkPoint.fromValue(p))).flat(),
        top,
        bottom
      ),
    ];
  }

  getScaleX() {
    return this.ref.getScaleX();
  }

  getSize() {
    return this.ref.getSize();
  }

  getSkewX() {
    return this.ref.getSkewX();
  }

  isEmbolden() {
    return this.ref.isEmbolden();
  }

  getTypeface() {
    const tf = this.ref.getTypeface();
    return tf ? new JsiSkTypeface(this.CanvasKit, tf) : null;
  }

  setEdging(edging: FontEdging) {
    this.ref.setEdging(getEnum(this.CanvasKit, "FontEdging", edging));
  }

  setEmbeddedBitmaps(embeddedBitmaps: boolean) {
    this.ref.setEmbeddedBitmaps(embeddedBitmaps);
  }

  setHinting(hinting: FontHinting) {
    this.ref.setHinting(getEnum(this.CanvasKit, "FontHinting", hinting));
  }

  setLinearMetrics(linearMetrics: boolean) {
    this.ref.setLinearMetrics(linearMetrics);
  }

  setScaleX(sx: number) {
    this.ref.setScaleX(sx);
  }

  setSize(points: number) {
    this.ref.setSize(points);
  }

  setSkewX(sx: number) {
    this.ref.setSkewX(sx);
  }

  setEmbolden(embolden: boolean) {
    this.ref.setEmbolden(embolden);
  }

  setSubpixel(subpixel: boolean) {
    this.ref.setSubpixel(subpixel);
  }

  setTypeface(face: SkTypeface | null) {
    this.ref.setTypeface(face ? JsiSkTypeface.fromValue(face) : null);
  }
}
