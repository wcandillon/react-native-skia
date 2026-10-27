import type { SkColor } from "../Color";
import type { BlendMode } from "../Paint";

import type { SkColorFilter } from "./ColorFilter";

export type InputColorMatrix = number[];

export interface ColorFilterFactory {
  /**
   * Creates a color filter using the provided color matrix.
   * @param cMatrix
   */
  MakeMatrix(cMatrix: InputColorMatrix): SkColorFilter;

  /**
   * Makes a color filter with the given color and blend mode.
   * @param color
   * @param mode
   */
  MakeBlend(color: SkColor, mode: BlendMode): SkColorFilter;

  /**
   * Makes a color filter composing two color filters.
   * @param outer
   * @param inner
   */
  MakeCompose(outer: SkColorFilter, inner: SkColorFilter): SkColorFilter;

  /**
   * Makes a color filter that is linearly interpolated between two other color filters.
   * @param t - a float in the range of 0.0 to 1.0.
   * @param dst
   * @param src
   */
  MakeLerp(t: number, dst: SkColorFilter, src: SkColorFilter): SkColorFilter;

  /**
   * Makes a color filter that converts between linear colors and sRGB colors.
   */
  MakeLinearToSRGBGamma(): SkColorFilter;

  /**
   * Makes a color filter that converts between sRGB colors and linear colors.
   */
  MakeSRGBToLinearGamma(): SkColorFilter;

  /**
   * Makes a color filter that multiplies the luma of its input into the alpha channel,
   * and sets the red, green, and blue channels to zero.
   */
  MakeLuma(): SkColorFilter;
}
