import type { SkJSIInstance } from "./JsiInstance";
import type { SkColor } from "./Color";
import type { SkRect } from "./Rect";
import type { SkRRect } from "./RRect";

export interface ShapeBlobOptions {
  /**
   * The scale, in pixels per local unit, at which the sprites are rasterized.
   * Omitted (the default), it follows the device scale of the canvas the blob
   * is drawn on. Set it when the blob is recorded into a picture: a picture
   * recording canvas has no device scale, so pass the scale the picture will
   * be drawn at (for instance `PixelRatio.get()`).
   */
  rasterScale?: number;
}

/**
 * A mutable batch of filled rectangles, rounded rectangles and circles, drawn
 * with `canvas.drawShapes(blob)` in a single draw call.
 *
 * Every distinct shape (kind, size and radii) is rasterized once into an
 * atlas, and each shape is a textured quad tinted by its color: thousands of
 * shapes cost one `drawVertices`. Fill only: no strokes, shaders or gradients.
 *
 * `setPosition` and `setColor` patch one shape in place without allocating;
 * they can be called from a worklet while another thread draws the blob. A
 * picture that recorded the blob keeps the shapes as they were at record time.
 */
export interface SkShapeBlob extends SkJSIInstance<"ShapeBlob"> {
  /**
   * Adds a filled rectangle and returns its index. Its position is its
   * top-left corner.
   */
  addRect(rect: SkRect, color: SkColor): number;
  /**
   * Adds a filled rounded rectangle (uniform radii `rx`, `ry`) and returns its
   * index. Its position is the top-left corner of its bounds.
   */
  addRRect(rrect: SkRRect, color: SkColor): number;
  /**
   * Adds a filled circle and returns its index. Its position is its center.
   */
  addCircle(cx: number, cy: number, r: number, color: SkColor): number;
  /**
   * Moves the shape at `index` so that its position (top-left corner, or the
   * center of a circle) is at (x, y). Worklet-safe, no allocation.
   */
  setPosition(index: number, x: number, y: number): void;
  /**
   * Changes the color of the shape at `index`. Worklet-safe, no allocation.
   */
  setColor(index: number, color: SkColor): void;
  /**
   * The number of shapes in the blob.
   */
  readonly count: number;
}
