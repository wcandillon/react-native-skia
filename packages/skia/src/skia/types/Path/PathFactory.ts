import type { SkFont } from "../Font";
import type { SkRect } from "../Rect";
import type { SkPoint } from "../Point";
import type { InputRRect } from "../RRect";

import type { SkPath, PathOp, PathCommand, StrokeOpts } from "./Path";

export interface PathFactory {
  Make(): SkPath;
  /**
   * Creates a new path from the provided SVG path string. Throws a
   * `SkiaDecodeError` when the string is not a valid SVG path.
   * @param str
   */
  MakeFromSVGString(str: string): SkPath;

  /**
   * Creates a new path by combining the given paths according to op, or
   * null when the operation has no result.
   * @param one
   * @param two
   * @param op
   */
  MakeFromOp(one: SkPath, two: SkPath, op: PathOp): SkPath | null;

  /**
   * Creates a new path from the given list of path commands. Throws a
   * `TypeError`, naming the command, when a command is malformed.
   * @param cmds
   */
  MakeFromCmds(cmds: PathCommand[]): SkPath;

  /**
   * Converts the text to a path with the given font at location x / y.
   */
  MakeFromText(text: string, x: number, y: number, font: SkFont): SkPath | null;

  // Static shape factories

  /**
   * Creates a path containing a rectangle.
   * @param rect - the rectangle
   * @param isCCW - if true, draws counter-clockwise
   */
  Rect(rect: SkRect, isCCW?: boolean): SkPath;

  /**
   * Creates a path containing an oval (ellipse).
   * @param rect - bounds of the oval
   * @param isCCW - if true, draws counter-clockwise
   * @param startIndex - index of initial point
   */
  Oval(rect: SkRect, isCCW?: boolean, startIndex?: number): SkPath;

  /**
   * Creates a path containing a circle.
   * @param x - center x
   * @param y - center y
   * @param r - radius
   */
  Circle(x: number, y: number, r: number): SkPath;

  /**
   * Creates a path containing a rounded rectangle.
   * @param rrect - the rounded rectangle
   * @param isCCW - if true, draws counter-clockwise
   */
  RRect(rrect: InputRRect, isCCW?: boolean): SkPath;

  /**
   * Creates a path containing a line segment.
   * @param p1 - start point
   * @param p2 - end point
   */
  Line(p1: SkPoint, p2: SkPoint): SkPath;

  /**
   * Creates a path containing a polygon from the given points.
   * @param points - array of points
   * @param close - if true, close the polygon
   */
  Polygon(points: SkPoint[], close: boolean): SkPath;

  // Static path operations

  /**
   * Creates a new stroked path from the input path.
   * @param path - source path to stroke
   * @param opts - stroke options (width, cap, join, miter_limit, precision)
   * @returns stroked path or null when the operation has no result
   */
  Stroke(path: SkPath, opts?: StrokeOpts): SkPath | null;

  /**
   * Creates a trimmed path from the input path.
   * @param path - source path
   * @param start - start of trim (0-1)
   * @param end - end of trim (0-1)
   * @param isComplement - if true, returns the complement
   * @returns trimmed path or null when the operation has no result
   */
  Trim(
    path: SkPath,
    start: number,
    end: number,
    isComplement: boolean
  ): SkPath | null;

  /**
   * Simplifies the path to non-overlapping contours.
   * @param path - source path
   * @returns simplified path or null when the operation has no result
   */
  Simplify(path: SkPath): SkPath | null;

  /**
   * Creates a dashed version of the path.
   * @param path - source path
   * @param on - length of dash
   * @param off - length of gap
   * @param phase - offset into dash pattern
   * @returns dashed path or null when the operation has no result
   */
  Dash(path: SkPath, on: number, off: number, phase: number): SkPath | null;

  /**
   * Creates a path with Winding fill type.
   * @param path - source path
   * @returns path with winding fill or null when the operation has no result
   */
  AsWinding(path: SkPath): SkPath | null;

  /**
   * Interpolates between two paths.
   * @param start - starting path
   * @param end - ending path
   * @param weight - interpolation weight (0 = start, 1 = end)
   * @returns interpolated path or null if paths are not interpolatable
   */
  Interpolate(start: SkPath, end: SkPath, weight: number): SkPath | null;
}
