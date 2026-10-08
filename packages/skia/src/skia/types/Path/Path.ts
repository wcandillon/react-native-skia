import type { SkRect } from "../Rect";
import type { SkPoint } from "../Point";
import type { StrokeJoin, StrokeCap } from "../Paint";
import type { SkJSIInstance } from "../JsiInstance";

/**
 * Options used for Path.stroke(). If an option is omitted, a sensible default will be used.
 */
export interface StrokeOpts {
  /** The width of the stroked lines. */
  width?: number;
  miter_limit?: number;
  /**
   * if > 1, increase precision, else if (0 < resScale < 1) reduce precision to
   * favor speed and size
   */
  precision?: number;
  join?: StrokeJoin;
  cap?: StrokeCap;
}

export enum FillType {
  Winding,
  EvenOdd,
  InverseWinding,
  InverseEvenOdd,
}

export enum PathOp {
  Difference, //!< subtract the op path from the first path
  Intersect, //!< intersect the two paths
  Union, //!< union (inclusive-or) the two paths
  XOR, //!< exclusive-or the two paths
  ReverseDifference,
}

export enum PathVerb {
  Move,
  Line,
  Quad,
  Conic,
  Cubic,
  Close,
}

export type PathCommand = number[];

export const isPath = (obj: SkJSIInstance<string> | null): obj is SkPath => {
  "worklet";
  return obj !== null && obj.__typename__ === "Path";
};

export interface SkPath extends SkJSIInstance<"Path"> {
  /**
   * Returns the number of points in this path. Initially zero.
   */
  countPoints(): number;

  /**
   * Returns minimum and maximum axes values of the lines and curves in Path.
   * Returns (0, 0, 0, 0) if Path contains no points.
   * Returned bounds width and height may be larger or smaller than area affected
   * when Path is drawn.
   *
   * Behaves identically to getBounds() when Path contains
   * only lines. If Path contains curves, computed bounds includes
   * the maximum extent of the quad, conic, or cubic; is slower than getBounds();
   * and unlike getBounds(), does not cache the result.
   */
  computeTightBounds(): SkRect;

  /**
   * Returns true if the point (x, y) is contained by Path, taking into
   * account FillType.
   * @param x
   * @param y
   */
  contains(x: number, y: number): boolean;

  /**
   * Returns a copy of this Path.
   */
  copy(): SkPath;

  /**
   * Returns true if other path is equal to this path.
   * @param other
   */
  equals(other: SkPath): boolean;

  /**
   * Returns minimum and maximum axes values of Point array.
   * Returns (0, 0, 0, 0) if Path contains no points. Returned bounds width and height may
   * be larger or smaller than area affected when Path is drawn.
   */
  getBounds(): SkRect;

  /**
   * Return the FillType for this path.
   */
  getFillType(): FillType;

  /**
   * Returns the Point at index in Point array. Valid range for index is
   * 0 to countPoints() - 1.
   * @param index
   */
  getPoint(index: number): SkPoint;

  /**
   * Returns true if there are no verbs in the path.
   */
  isEmpty(): boolean;

  /**
   * Returns true if the path is volatile; it will not be altered or discarded
   * by the caller after it is drawn. Path by default have volatile set false, allowing
   * Surface to attach a cache of data which speeds repeated drawing. If true, Surface
   * may not speed repeated drawing.
   */
  isVolatile(): boolean;

  getLastPt(): { x: number; y: number };

  /**
   * Returns this path as an SVG string.
   */
  toSVGString(): string;

  /**
   * Interpolates between Path with point array of equal size.
   * Copy verb array and weights to result, and set result path to a weighted
   * average of this path array and ending path.

   *  weight is most useful when between zero (ending path) and
      one (this path); will work with values outside of this
      range.

   * interpolate() returns undefined if path is not
   * the same size as ending path. Call isInterpolatable() to check Path
   * compatibility prior to calling interpolate().

   * @param ending  path to interpolate with
   * @param weight  contribution of this path, and
   *                 one minus contribution of ending path
   * @return        New path of interpolated averages or null if 
   *                not interpolatable
   * */
  interpolate(end: SkPath, weight: number): SkPath | null;

  /** Returns true if Path contain equal verbs and equal weights.
   *     @param compare  path to compare
   *     @return         true if Path can be interpolated equivalent
   *
   * */
  isInterpolatable(compare: SkPath): boolean;

  /**
   * Serializes the contents of this path as a series of commands.
   */
  toCmds(): PathCommand[];
}
