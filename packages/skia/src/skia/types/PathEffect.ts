import type { SkJSIInstance } from "./JsiInstance";
import type { SkPath } from "./Path/Path";
import type { SkMatrix } from "./Matrix";

export type SkPathEffect = SkJSIInstance<"PathEffect">;

export const isPathEffect = (
  obj: SkJSIInstance<string> | null
): obj is SkPathEffect => obj !== null && obj.__typename__ === "PathEffect";

export enum Path1DEffectStyle {
  Translate,
  Rotate,
  Morph,
}

export interface PathEffectFactory {
  /**
   * Returns a PathEffect that can turn sharp corners into rounded corners.
   * @param radius - if <= 0, returns null: no effect, which `setPathEffect()` takes
   */
  MakeCorner(radius: number): SkPathEffect | null;

  /**
   * Returns a PathEffect that add dashes to the path.
   *
   * See SkDashPathEffect.h for more details.
   *
   * @param intervals - even number of entries with even indicies specifying the length of
   *                    the "on" intervals, and the odd indices specifying the length of "off".
   * @param phase - offset length into the intervals array. Defaults to 0.
   */
  MakeDash(intervals: number[], phase?: number): SkPathEffect;

  /**
   * Returns a PathEffect that breaks path into segments of segLength length, and randomly move
   * the endpoints away from the original path by a maximum of deviation.
   * @param segLength - length of the subsegments.
   * @param dev - limit of the movement of the endpoints.
   * @param seedAssist - modifies the randomness. See SkDiscretePathEffect.h for more.
   */
  MakeDiscrete(
    segLength: number,
    dev: number,
    seedAssist: number
  ): SkPathEffect;

  /**
   *
   * A pathEffect whose effect is to apply first the inner pathEffect and the the
   * outer pathEffect (i.e. outer(inner(path))).
   *
   */
  MakeCompose(outer: SkPathEffect, inner: SkPathEffect): SkPathEffect;

  /**
   *
   * A pathEffect pathEffect whose effect is to apply two effects,
   * in sequence (i.e. first(path) + second(path)).
   *
   */
  MakeSum(outer: SkPathEffect, inner: SkPathEffect): SkPathEffect;

  /**
   * Returns a PathEffect that will fill the drawing path with a pattern made by applying
   * the given matrix to a repeating set of infinitely long lines of the given width.
   * For example, the scale of the provided matrix will determine how far apart the lines
   * should be drawn its rotation affects the lines' orientation.
   * @param width - must be >= 0
   * @param matrix
   */
  MakeLine2D(width: number, matrix: SkMatrix): SkPathEffect;

  /**
   * Returns a PathEffect which implements dashing by replicating the specified path.
   *   @param path The path to replicate (dash)
   *   @param advance The space between instances of path
   *   @param phase distance (mod advance) along path for its initial position
   *   @param style how to transform path at each point (based on the current
   *                position and tangent)
   */
  MakePath1D(
    path: SkPath,
    advance: number,
    phase: number,
    style: Path1DEffectStyle
  ): SkPathEffect;

  /**
   * Returns a PathEffect that will fill the drawing path with a pattern by repeating the
   * given path according to the provided matrix. For example, the scale of the matrix
   * determines how far apart the path instances should be drawn.
   * @param matrix
   * @param path
   */
  MakePath2D(matrix: SkMatrix, path: SkPath): SkPathEffect;
}
