import type { SkFont } from "../Font";
import type { SkRect } from "../Rect";
import type { SkPoint } from "../Point";
import type { SkRRect } from "../RRect";
import type { StrokeJoin, StrokeCap } from "../Paint";
import type { SkMatrix } from "../Matrix";
import type { SkJSIInstance } from "../JsiInstance";

/**
 * Options used for Path.stroke(). If an option is omitted, a sensible default will be used.
 */
export interface StrokeOpts {
  /** The width of the stroked lines. */
  width?: number;
  // eslint-disable-next-line camelcase
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

export const isPath = (obj: SkJSIInstance<string> | null): obj is SkPath =>
  obj !== null && obj.__typename__ === "Path";

export interface SkPath extends SkJSIInstance<"Path"> {
  /**
   * Appends arc to Path, as the start of new contour. Arc added is part of ellipse
   * bounded by oval, from startAngle through sweepAngle. Both startAngle and
   * sweepAngle are measured in degrees, where zero degrees is aligned with the
   * positive x-axis, and positive sweeps extends arc clockwise.
   * Returns the modified path for easier chaining.
   * @param oval
   * @param startAngle
   * @param sweepAngle
   */
  addArc(
    oval: SkRect,
    startAngleInDegrees: number,
    sweepAngleInDegrees: number
  ): SkPath;

  /**
   * Adds oval to Path, appending kMove_Verb, four kConic_Verb, and kClose_Verb.
   * Oval is upright ellipse bounded by Rect oval with radii equal to half oval width
   * and half oval height. Oval begins at start and continues clockwise by default.
   * Returns the modified path for easier chaining.
   * @param oval
   * @param isCCW - if the path should be drawn counter-clockwise or not
   * @param startIndex - index of initial point of ellipse
   */
  addOval(oval: SkRect, isCCW?: boolean, startIndex?: number): void;

  /**
   * Returns the number of points in this path. Initially zero.
   */
  countPoints(): number;

  /**
   * Adds contour created from array of n points, adding (count - 1) line segments.
   * Contour added starts at pts[0], then adds a line for every additional point
   * in pts array. If close is true, appends kClose_Verb to Path, connecting
   * pts[count - 1] and pts[0].
   * Returns the modified path for easier chaining.
   * @param points
   * @param close - if true, will add a line connecting last point to the first point.
   */
  addPoly(points: SkPoint[], close: boolean): void;

  /** Adds beginning of contour at SkPoint (x, y).

        @param x  x-axis value of contour start
        @param y  y-axis value of contour start
        @return   reference to SkPath

        example: https://fiddle.skia.org/c/@Path_moveTo
    */
  moveTo(x: number, y: number): void;
  /** Adds line from last point to (x, y). If SkPath is empty, or last SkPath::Verb is
        kClose_Verb, last point is set to (0, 0) before adding line.

        lineTo() appends kMove_Verb to verb array and (0, 0) to SkPoint array, if needed.
        lineTo() then appends kLine_Verb to verb array and (x, y) to SkPoint array.

        @param x  end of added line on x-axis
        @param y  end of added line on y-axis
        @return   reference to SkPath

        example: https://fiddle.skia.org/c/@Path_lineTo
    */
  lineTo(x: number, y: number): void;

  /**
   * Returns a new path that covers the same area as the original path, but with the
   * Winding FillType. This may re-draw some contours in the path as counter-clockwise
   * instead of clockwise to achieve that effect. If such a transformation cannot
   * be done, null is returned.
   */
  makeAsWinding(): SkPath | null;

  /**
   * Translates all the points in the path by dx, dy.
   * @param dx
   * @param dy
   */
  offset(dx: number, dy: number): void;

  /**
   * Relative version of arcToRotated.
   * @param rx
   * @param ry
   * @param xAxisRotate
   * @param useSmallArc
   * @param isCCW
   * @param dx
   * @param dy
   */
  rArcTo(
    rx: number,
    ry: number,
    xAxisRotateInDegrees: number,
    useSmallArc: boolean,
    isCCW: boolean,
    dx: number,
    dy: number
  ): void;

  /**
   * Relative version of conicTo.
   * @param dx1
   * @param dy1
   * @param dx2
   * @param dy2
   * @param w
   */
  rConicTo(dx1: number, dy1: number, dx2: number, dy2: number, w: number): void;

  /**
   * Relative version of cubicTo.
   * @param cpx1
   * @param cpy1
   * @param cpx2
   * @param cpy2
   * @param x
   * @param y
   */
  rCubicTo(
    cpx1: number,
    cpy1: number,
    cpx2: number,
    cpy2: number,
    x: number,
    y: number
  ): void;

  /**
   * Relative version of moveTo.
   * @param x
   * @param y
   */
  rMoveTo(x: number, y: number): SkPath;

  /**
   * Relative version of lineTo.
   * @param x
   * @param y
   */
  rLineTo(x: number, y: number): SkPath;

  /**
   * Relative version of quadTo.
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   */
  rQuadTo(x1: number, y1: number, x2: number, y2: number): SkPath;

  /**
   * Sets FillType, the rule used to fill Path.
   * @param fill
   */
  setFillType(fill: FillType): void;

  /**
   * Specifies whether Path is volatile; whether it will be altered or discarded
   * by the caller after it is drawn. Path by default have volatile set false.
   *
   * Mark animating or temporary paths as volatile to improve performance.
   * Mark unchanging Path non-volatile to improve repeated rendering.
   * @param volatile
   */
  setIsVolatile(volatile: boolean): void;

  /**
   * Turns this path into the filled equivalent of the stroked path. Returns false if the operation
   * fails (e.g. the path is a hairline).
   * @param opts - describe how stroked path should look.
   */
  stroke(opts?: StrokeOpts): boolean;

  /**
   * Appends CLOSE_VERB to Path. A closed contour connects the first and last point
   * with a line, forming a continuous loop.
   */
  close(): void;

  /**
   * Sets Path to its initial state.
   * Removes verb array, point array, and weights, and sets FillType to Winding.
   * Internal storage associated with Path is released
   */
  reset(): void;

  /**
   * Sets Path to its initial state.
   * Removes verb array, point array, and weights, and sets FillType to Winding.
   * Internal storage associated with Path is *not* released.
   * Use rewind() instead of reset() if Path storage will be reused and performance
   * is critical.
   */
  rewind(): void;

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
   * @param outputArray - if provided, the bounding box will be copied into this array instead of
   *                      allocating a new one.
   */
  computeTightBounds(outputArray?: SkRect): SkRect;

  /**
   * Appends arc to Path. Arc added is part of ellipse
   * bounded by oval, from startAngle through sweepAngle. Both startAngle and
   * sweepAngle are measured in degrees, where zero degrees is aligned with the
   * positive x-axis, and positive sweeps extends arc clockwise.
   * Returns the modified path for easier chaining.
   * @param oval
   * @param startAngleInDegrees
   * @param sweepAngleInDegrees
   * @param forceMoveTo
   */
  arcToOval(
    oval: SkRect,
    startAngleInDegrees: number,
    sweepAngleInDegrees: number,
    forceMoveTo: boolean
  ): SkPath;

  /**
   * Appends arc to Path. Arc is implemented by one or more conics weighted to
   * describe part of oval with radii (rx, ry) rotated by xAxisRotate degrees. Arc
   * curves from last Path Point to (x, y), choosing one of four possible routes:
   * clockwise or counterclockwise, and smaller or larger. See SkPath.h for more details.
   * Returns the modified path for easier chaining.
   * @param rx
   * @param ry
   * @param xAxisRotate
   * @param useSmallArc
   * @param isCCW
   * @param x
   * @param y
   */
  arcToRotated(
    rx: number,
    ry: number,
    xAxisRotateInDegrees: number,
    useSmallArc: boolean,
    isCCW: boolean,
    x: number,
    y: number
  ): SkPath;

  /**
   * Appends arc to Path, after appending line if needed. Arc is implemented by conic
   * weighted to describe part of circle. Arc is contained by tangent from
   * last Path point to (x1, y1), and tangent from (x1, y1) to (x2, y2). Arc
   * is part of circle sized to radius, positioned so it touches both tangent lines.
   * Returns the modified path for easier chaining.
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param radius
   */
  arcToTangent(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number
  ): SkPath;

  /**
   * Adds conic from last point towards (x1, y1), to (x2, y2), weighted by w.
   * If Path is empty, or path is closed, the last point is set to (0, 0)
   * before adding conic.
   * Returns the modified path for easier chaining.
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param w
   */
  conicTo(x1: number, y1: number, x2: number, y2: number, w: number): SkPath;

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
   *  Adds cubic from last point towards (x1, y1), then towards (x2, y2), ending at
   * (x3, y3). If Path is empty, or path is closed, the last point is set to
   * (0, 0) before adding cubic.
   * @param cpx1
   * @param cpy1
   * @param cpx2
   * @param cpy2
   * @param x
   * @param y
   */
  cubicTo(
    cpx1: number,
    cpy1: number,
    cpx2: number,
    cpy2: number,
    x: number,
    y: number
  ): void;

  /**
   * Changes this path to be the dashed version of itself. This is the same effect as creating
   * a DashPathEffect and calling filterPath on this path.
   * @param on
   * @param off
   * @param phase
   */
  dash(on: number, off: number, phase: number): boolean;

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
   Adds quad from last point towards (x1, y1), to (x2, y2).

   If SkPath is empty, or last SkPath::Verb is kClose_Verb, last point is set to (0, 0) before adding quad.

   Appends kMove_Verb to verb array and (0, 0) to SkPoint array, if needed; then appends kQuad_Verb to verb array;
   and (x1, y1), (x2, y2) to SkPoint array.

   Parameters
   x1	control SkPoint of quad on x-axis
   y1	control SkPoint of quad on y-axis
   x2	end SkPoint of quad on x-axis
   y2	end SkPoint of quad on y-axis
   Returns
   reference to SkPath
   example: https://fiddle.skia.org/c/@Path_quadTo
  */
  quadTo(x1: number, y1: number, x2: number, y2: number): void;

  /**
   * Adds Rect to Path, appending kMove_Verb, three kLine_Verb, and kClose_Verb,
   * starting with top-left corner of Rect; followed by top-right, bottom-right,
   * and bottom-left if isCCW is false; or followed by bottom-left,
   * bottom-right, and top-right if isCCW is true.
   * Returns the modified path for easier chaining.
   * @param rect
   * @param isCCW
   */
  addRect(rect: SkRect, isCCW?: boolean): void;

  /**
   * Adds rrect to Path, creating a new closed contour.
   * Returns the modified path for easier chaining.
   * @param rrect
   * @param isCCW
   */
  addRRect(rrect: SkRRect, isCCW?: boolean): SkPath;

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

  addCircle(x: number, y: number, r: number): void;

  getLastPt(): { x: number; y: number };

  /** Set this path to the result of applying the Op to this path and the
    specified path: this = (this op operand).
    The resulting path will be constructed from non-overlapping contours.
    The curve order is reduced where possible so that cubics may be turned
    into quadratics, and quadratics maybe turned into lines.

    Returns true if operation was able to produce a result;
    otherwise, result is unmodified.

    @param path The second path (for difference, the subtrahend)
    @param op The operator to apply.
    @param result The product of the operands. The result may be one of the
                  inputs.
    @return True if the operation succeeded.
    */
  op(path: SkPath, op: PathOp): boolean;

  /** Set this path to a set of non-overlapping contours that describe the
    same area as the original path.
    The curve order is reduced where possible so that cubics may
    be turned into quadratics, and quadratics maybe turned into lines.

    Returns true if operation was able to produce a result;
    otherwise, result is unmodified.

    @param result The simplified path. The result may be the input.
    @return True if simplification succeeded.
  */
  simplify(): boolean;

  /**
   * Returns this path as an SVG string.
   */
  toSVGString(): string;

  /**
   * Take start and stop "t" values (values between 0...1), and modify this path such that
   * it is a subset of the original path.
   * The trim values apply to the entire path, so if it contains several contours, all of them
   * are including in the calculation.
   * Null is returned if either input value is NaN.
   * @param startT - a value in the range [0.0, 1.0]. 0.0 is the beginning of the path.
   * @param stopT  - a value in the range [0.0, 1.0]. 1.0 is the end of the path.
   * @param isComplement
   */
  trim(startT: number, stopT: number, isComplement: boolean): boolean;

  /**
   * Transforms the path by the specified matrix.
   */
  transform(m3: SkMatrix): void;

  /**
   * Converts the text to a path with the given font at location x / y.
   */
  fromText(text: string, x: number, y: number, font: SkFont): void;

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
   * @return        Path replaced by interpolated averages or undefined if 
   *                not interpolatable
   * */
  interpolate(end: SkPath, weight: number): SkPath;

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
