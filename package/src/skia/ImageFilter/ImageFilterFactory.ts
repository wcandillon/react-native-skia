import type { SkColor } from "../Color";
import type { SkColorFilter } from "../ColorFilter/ColorFilter";
import type { SkShader } from "../Shader/Shader";
import type { SkRect } from "../Rect";
import type { BlendMode } from "../Paint/BlendMode";

import type { SkImageFilter, TileMode } from "./ImageFilter";

export enum ColorChannel {
  R,
  G,
  B,
  A,
}

export interface ImageFilterFactory {
  /**
   * Offsets the input image
   *
   * @param dx - Offset along the X axis
   * @param dy - Offset along the X axis
   * @param input - if null, it will use the dynamic source image
   */
  MakeOffset(
    dx: number,
    dy: number,
    input: SkImageFilter | null
  ): SkImageFilter;
  /**
   * Spatially displace pixel values of the filtered image
   *
   * @param channelX - Color channel to be used along the X axis
   * @param channelY - Color channel to be used along the Y axis
   * @param scale - Scale factor to be used in the displacement
   * @param in1 - Source image filter to use for the displacement
   * @param input - if null, it will use the dynamic source image
   */
  MakeDisplacementMap(
    channelX: ColorChannel,
    channelY: ColorChannel,
    scale: number,
    in1: SkImageFilter,
    input: SkImageFilter | null
  ): SkImageFilter;
  /**
   * Transforms a shader into an impage filter
   *
   * @param shader - The Shader to be transformed
   * @param input - if null, it will use the dynamic source image
   */
  MakeShader(shader: SkShader, input: SkImageFilter | null): SkImageFilter;
  /**
   * Create a filter that blurs its input by the separate X and Y sigmas. The provided tile mode
   * is used when the blur kernel goes outside the input image.
   *
   * @param sigmaX - The Gaussian sigma value for blurring along the X axis.
   * @param sigmaY - The Gaussian sigma value for blurring along the Y axis.
   * @param mode
   * @param input - if null, it will use the dynamic source image (e.g. a saved layer)
   */
  MakeBlur(
    sigmaX: number,
    sigmaY: number,
    mode: TileMode,
    input: SkImageFilter | null
  ): SkImageFilter;

  /**
   * Create a filter that applies the color filter to the input filter results.
   * @param cf
   * @param input - if null, it will use the dynamic source image (e.g. a saved layer)
   */
  MakeColorFilter(
    cf: SkColorFilter,
    input: SkImageFilter | null
  ): SkImageFilter;

  /**
   * Create a filter that composes 'inner' with 'outer', such that the results of 'inner' are
   * treated as the source bitmap passed to 'outer'.
   * If either param is null, the other param will be returned.
   * @param outer
   * @param inner - if null, it will use the dynamic source image (e.g. a saved layer)
   */
  MakeCompose(
    outer: SkImageFilter | null,
    inner: SkImageFilter | null
  ): SkImageFilter;

  /**
   * Create a filter that draws a drop shadow under the input content.
   * This filter produces an image that includes the inputs' content.
   * @param dx The X offset of the shadow.
   * @param dy	The Y offset of the shadow.
   * @param sigmaX	The blur radius for the shadow, along the X axis.
   * @param sigmaY	The blur radius for the shadow, along the Y axis.
   * @param color	The color of the drop shadow.
   * @param input	The input filter, or will use the source bitmap if this is null.
   * @param cropRect	Optional rectangle that crops the input and output.
   */
  MakeDropShadow: (
    dx: number,
    dy: number,
    sigmaX: number,
    sigmaY: number,
    color: SkColor,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ) => SkImageFilter;
  /**
   * Create a filter that renders a drop shadow, in exactly the same manner as ::DropShadow, except
   * that the resulting image does not include the input content.
   * This allows the shadow and input to be composed by a filter DAG in a more flexible manner.
   * @param dx The X offset of the shadow.
   * @param dy	The Y offset of the shadow.
   * @param sigmaX	The blur radius for the shadow, along the X axis.
   * @param sigmaY	The blur radius for the shadow, along the Y axis.
   * @param color	The color of the drop shadow.
   * @param input	The input filter, or will use the source bitmap if this is null.
   * @param cropRect	Optional rectangle that crops the input and output.
   */
  MakeDropShadowOnly: (
    dx: number,
    dy: number,
    sigmaX: number,
    sigmaY: number,
    color: SkColor,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ) => SkImageFilter;
  /**
   *  Create a filter that erodes each input pixel's channel values to the minimum channel value
   *  within the given radii along the x and y axes.
   *  @param radiusX  The distance to erode along the x axis to either side of each pixel.
   *  @param radiusY  The distance to erode along the y axis to either side of each pixel.
   *  @param input    The image filter that is eroded, using source bitmap if this is null.
   *  @param cropRect Optional rectangle that crops the input and output.
   */
  MakeErode: (
    rx: number,
    ry: number,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ) => SkImageFilter;
  /**
   *  Create a filter that dilates each input pixel's channel values to the max value within the
   *  given radii along the x and y axes.
   *  @param radiusX  The distance to dilate along the x axis to either side of each pixel.
   *  @param radiusY  The distance to dilate along the y axis to either side of each pixel.
   *  @param input    The image filter that is dilated, using source bitmap if this is null.
   *  @param cropRect Optional rectangle that crops the input and output.
   */
  MakeDilate: (
    rx: number,
    ry: number,
    input: SkImageFilter | null,
    cropRect?: SkRect
  ) => SkImageFilter;
  /**
   *  This filter takes an SkBlendMode and uses it to composite the two filters together.
   *  @param mode       The blend mode that defines the compositing operation
   *  @param background The Dst pixels used in blending, if null the source bitmap is used.
   *  @param foreground The Src pixels used in blending, if null the source bitmap is used.
   *  @cropRect         Optional rectangle to crop input and output.
   */
  MakeBlend: (
    mode: BlendMode,
    background: SkImageFilter,
    foreground: SkImageFilter | null,
    cropRect?: SkRect
  ) => SkImageFilter;
}
