import type { SkCanvas, SkPaint } from "../../skia/types";

export interface DrawingContext {
  canvas: SkCanvas;
  paint: SkPaint;
  opacity: number;
}
