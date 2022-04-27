import type { TileMode } from "../ImageFilter";
import type { SkPoint } from "../Point";
import type { SkMatrix } from "../Matrix";
import type { SkColor } from "../Color";
import type { BlendMode } from "../Paint/BlendMode";

import type { SkShader } from "./Shader";

export interface ShaderFactory {
  /**
   * Returns a shader that generates a linear gradient between the two specified points.
   * See SkGradientShader.h for more.
   * @param start
   * @param end
   * @param colors - colors to be distributed between start and end.
   * @param pos - May be null. The relative positions of colors. If supplied must be same length
   *              as colors.
   * @param mode
   * @param localMatrix
   * @param flags - By default gradients will interpolate their colors in unpremul space
   *                and then premultiply each of the results. By setting this to 1, the
   *                gradients will premultiply their colors first, and then interpolate
   *                between them.
   */
  MakeLinearGradient(
    start: SkPoint,
    end: SkPoint,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
    // colorSpace: ColorSpace
  ): SkShader;

  /**
   * Returns a shader that generates a radial gradient given the center and radius.
   * See SkGradientShader.h for more.
   * @param center
   * @param radius
   * @param colors - colors to be distributed between the center and edge.
   * @param pos - May be null. The relative positions of colors. If supplied must be same length
   *              as colors. Range [0.0, 1.0]
   * @param mode
   * @param localMatrix
   * @param flags - 0 to interpolate colors in unpremul, 1 to interpolate colors in premul.
   */
  MakeRadialGradient(
    center: SkPoint,
    radius: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
    // colorSpace?: ColorSpace
  ): SkShader;

  /**
   * Returns a shader that generates a conical gradient given two circles.
   * See SkGradientShader.h for more.
   * @param start
   * @param startRadius
   * @param end
   * @param endRadius
   * @param colors
   * @param pos
   * @param mode
   * @param localMatrix
   * @param flags
   */
  MakeTwoPointConicalGradient(
    start: SkPoint,
    startRadius: number,
    end: SkPoint,
    endRadius: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
    //  colorSpace?: ColorSpace
  ): SkShader;

  /**
   * Returns a shader that generates a sweep gradient given a center.
   * See SkGradientShader.h for more.
   * @param cx
   * @param cy
   * @param colors - colors to be distributed around the center, within the provided angles.
   * @param pos - May be null. The relative positions of colors. If supplied must be same length
   *              as colors. Range [0.0, 1.0]
   * @param mode
   * @param localMatrix
   * @param flags - 0 to interpolate colors in unpremul, 1 to interpolate colors in premul.
   * @param startAngle - angle corresponding to 0.0. Defaults to 0 degrees.
   * @param endAngle - angle corresponding to 1.0. Defaults to 360 degrees.
   */
  MakeSweepGradient(
    cx: number,
    cy: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix | null,
    flags?: number,
    startAngleInDegrees?: number,
    endAngleInDegrees?: number
    //  colorSpace?: ColorSpace
  ): SkShader;

  /**
   * Returns a shader with Perlin Turbulence.
   * See SkPerlinNoiseShader.h for more details
   * @param baseFreqX - base frequency in the X direction; range [0.0, 1.0]
   * @param baseFreqY - base frequency in the Y direction; range [0.0, 1.0]
   * @param octaves
   * @param seed
   * @param tileW - if this and tileH are non-zero, the frequencies will be modified so that the
   *                noise will be tileable for the given size.
   * @param tileH - if this and tileW are non-zero, the frequencies will be modified so that the
   *                noise will be tileable for the given size.
   */
  MakeTurbulence(
    baseFreqX: number,
    baseFreqY: number,
    octaves: number,
    seed: number,
    tileW: number,
    tileH: number
  ): SkShader;

  /**
   * Returns a shader with Perlin Fractal Noise.
   * See SkPerlinNoiseShader.h for more details
   * @param baseFreqX - base frequency in the X direction; range [0.0, 1.0]
   * @param baseFreqY - base frequency in the Y direction; range [0.0, 1.0]
   * @param octaves
   * @param seed
   * @param tileW - if this and tileH are non-zero, the frequencies will be modified so that the
   *                noise will be tileable for the given size.
   * @param tileH - if this and tileW are non-zero, the frequencies will be modified so that the
   *                noise will be tileable for the given size.
   */
  MakeFractalNoise(
    baseFreqX: number,
    baseFreqY: number,
    octaves: number,
    seed: number,
    tileW: number,
    tileH: number
  ): SkShader;

  /**
   * Returns a shader that combines the given shaders with a BlendMode.
   * @param mode
   * @param one
   * @param two
   */
  MakeBlend(mode: BlendMode, one: SkShader, two: SkShader): SkShader;

  /**
   * Returns a shader with a given color and colorspace.
   * @param color
   */
  MakeColor(
    color: SkColor //,space: ColorSpace
  ): SkShader;
}
