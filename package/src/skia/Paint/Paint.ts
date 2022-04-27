import type { SkImageFilter } from "../ImageFilter";
import type { IMaskFilter } from "../MaskFilter";
import type { SkColorFilter } from "../ColorFilter";
import type { SkShader } from "../Shader";
import type { SkColor } from "../Color";
import type { IPathEffect } from "../PathEffect";
import type { SkJSIInstance } from "../JsiInstance";
import { Skia } from "../Skia";

import type { BlendMode } from "./BlendMode";

export enum PaintStyle {
  Fill,
  Stroke,
}

export enum StrokeCap {
  Butt,
  Round,
  Square,
}

export enum StrokeJoin {
  Bevel,
  Miter,
  Round,
}

export const SkiaPaint = () => {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  return paint;
};

export const isPaint = (obj: SkJSIInstance<string> | null): obj is SkPaint =>
  obj !== null && obj.__typename__ === "Paint";

export interface SkPaint extends SkJSIInstance<"Paint"> {
  /**
   * Returns a copy of this paint.
   */
  copy(): SkPaint;

  /**
   * Retrieves the alpha and RGB unpremultiplied. RGB are extended sRGB values
   * (sRGB gamut, and encoded with the sRGB transfer function).
   */
  getColor(): SkColor;

  /**
   * Returns the geometry drawn at the beginning and end of strokes.
   */
  getStrokeCap(): StrokeCap;

  /**
   * Returns the geometry drawn at the corners of strokes.
   */
  getStrokeJoin(): StrokeJoin;

  /**
   *  Returns the limit at which a sharp corner is drawn beveled.
   */
  getStrokeMiter(): number;

  /**
   * Returns the thickness of the pen used to outline the shape.
   */
  getStrokeWidth(): number;

  /**
   * Replaces alpha, leaving RGBA unchanged. 0 means fully transparent, 1.0 means opaque.
   * @param alpha
   */
  setAlphaf(alpha: number): void;

  /**
   * Requests, but does not require, that edge pixels draw opaque or with
   * partial transparency.
   * @param aa
   */
  setAntiAlias: (aa: boolean) => void;

  /**
   * Sets the blend mode that is, the mode used to combine source color
   * with destination color.
   * @param mode
   */
  setBlendMode: (blendMode: BlendMode) => void;

  /**
   *  Sets alpha and RGB used when stroking and filling. The color is a 32-bit
   *  value, unpremultiplied, packing 8-bit components for alpha, red, blue,
   *  and green.
   *
   *   @param color  unpremultiplied ARGB
   *
   *    example: https://fiddle.skia.org/c/@Paint_setColor
   */
  setColor(color: SkColor): void;

  /**
   * Sets the current color filter, replacing the existing one if there was one.
   * @param filter
   */
  setColorFilter(filter: SkColorFilter | null): void;

  /**
   * Sets the current image filter, replacing the existing one if there was one.
   * @param filter
   */
  setImageFilter(filter: SkImageFilter | null): void;

  /**
   * Sets the current mask filter, replacing the existing one if there was one.
   * @param filter
   */
  setMaskFilter(filter: IMaskFilter | null): void;

  /**
   * Sets the current path effect, replacing the existing one if there was one.
   * @param effect
   */
  setPathEffect(effect: IPathEffect | null): void;

  /**
   * Sets the current shader, replacing the existing one if there was one.
   * @param shader
   */
  setShader(shader: SkShader | null): void;

  /**
   * Sets the geometry drawn at the beginning and end of strokes.
   * @param cap
   */
  setStrokeCap(cap: StrokeCap): void;

  /**
   * Sets the geometry drawn at the corners of strokes.
   * @param join
   */
  setStrokeJoin(join: StrokeJoin): void;

  /**
   * Sets the limit at which a sharp corner is drawn beveled.
   * @param limit
   */
  setStrokeMiter(limit: number): void;

  /**
   * Sets the thickness of the pen used to outline the shape.
   * @param width
   */
  setStrokeWidth(width: number): void;

  /**
   * Sets whether the geometry is filled or stroked.
   * @param style
   */
  setStyle(style: PaintStyle): void;
}
