import type { SkJSIInstance } from "../JsiInstance";
import type { SkPaint } from "../Paint";
import type { SkRect } from "../Rect";
import type { SkPoint } from "../Point";
import type { SkTypeface } from "../Typeface";

export interface FontMetrics {
  ascent: number; // suggested space above the baseline. < 0
  descent: number; // suggested space below the baseline. > 0
  leading: number; // suggested spacing between descent of previous line and ascent of next line.
  bounds?: SkRect; // smallest rect containing all glyphs (relative to 0,0)
}

export interface SkFont extends SkJSIInstance<"Font"> {
  /**
   * Retrieves the total width of the provided text
   * @param text
   * @param paint
   */
  getTextWidth(text: string, paint?: SkPaint): number;

  /**
   * Retrieves the advanceX measurements for each glyph.
   * If paint is not null, its stroking, PathEffect, and MaskFilter fields are respected.
   * One width per glyph is returned in the returned array.
   * @param glyphs
   * @param paint
   */
  getGlyphWidths(glyphs: number[], paint?: SkPaint): number[];

  /**
   * Returns the FontMetrics for this font.
   */
  getMetrics(): FontMetrics;

  /**
   * Retrieves the glyph ids for each code point in the provided string. This call is passed to
   * the typeface of this font. Note that glyph IDs are typeface-dependent; different faces
   * may have different ids for the same code point.
   * @param str
   * @param numCodePoints - the number of code points in the string. Defaults to str.length.
   */
  getGlyphIDs(str: string, numCodePoints?: number): number[];

  /**
   * Computes any intersections of a thick "line" and a run of positionsed glyphs.
   * The thick line is represented as a top and bottom coordinate (positive for
   * below the baseline, negative for above). If there are no intersections
   * (e.g. if this is intended as an underline, and there are no "collisions")
   * then the returned array will be empty. If there are intersections, the array
   * will contain pairs of X coordinates [start, end] for each segment that
   * intersected with a glyph.
   *
   * @param glyphs        the glyphs to intersect with
   * @param positions     x,y coordinates (2 per glyph) for each glyph
   * @param top           top of the thick "line" to use for intersection testing
   * @param bottom        bottom of the thick "line" to use for intersection testing
   * @return              array of [start, end] x-coordinate pairs. Maybe be empty.
   */
  getGlyphIntercepts(
    glyphs: number[],
    positions: SkPoint[],
    top: number,
    bottom: number
  ): number[];

  /**
   * Returns text scale on x-axis. Default value is 1.
   */
  getScaleX(): number;

  /**
   * Returns text size in points.
   */
  getSize(): number;

  /**
   * Returns text skew on x-axis. Default value is zero.
   */
  getSkewX(): number;

  /**
   * Returns embolden effect for this font. Default value is false.
   */
  isEmbolden(): boolean;

  /**
   * Returns the Typeface set for this font.
   */
  getTypeface(): SkTypeface | null;

  /**
   * Requests, but does not require, that edge pixels draw opaque or with partial transparency.
   * @param edging
   */
  setEdging(edging: FontEdging): void;

  /**
   * Requests, but does not require, to use bitmaps in fonts instead of outlines.
   * @param embeddedBitmaps
   */
  setEmbeddedBitmaps(embeddedBitmaps: boolean): void;

  /**
   * Sets level of glyph outline adjustment.
   * @param hinting
   */
  setHinting(hinting: FontHinting): void;

  /**
   * Requests, but does not require, linearly scalable font and glyph metrics.
   *
   * For outline fonts 'true' means font and glyph metrics should ignore hinting and rounding.
   * Note that some bitmap formats may not be able to scale linearly and will ignore this flag.
   * @param linearMetrics
   */
  setLinearMetrics(linearMetrics: boolean): void;

  /**
   * Sets the text scale on the x-axis.
   * @param sx
   */
  setScaleX(sx: number): void;

  /**
   * Sets the text size in points on this font.
   * @param points
   */
  setSize(points: number): void;

  /**
   * Sets the text-skew on the x axis for this font.
   * @param sx
   */
  setSkewX(sx: number): void;

  /**
   * Set embolden effect for this font.
   * @param embolden
   */
  setEmbolden(embolden: boolean): void;

  /**
   * Requests, but does not require, that glyphs respect sub-pixel positioning.
   * @param subpixel
   */
  setSubpixel(subpixel: boolean): void;

  /**
   * Sets the typeface to use with this font. null means to clear the typeface and use the
   * default one.
   * @param face
   */
  setTypeface(face: SkTypeface | null): void;
}

const fontStyle = (
  weight: FontWeight,
  width: FontWidth,
  slant: FontSlant
): FontStyle => ({ weight, width, slant });

export interface FontStyle {
  weight?: FontWeight;
  width?: FontWidth;
  slant?: FontSlant;
}

export enum FontWeight {
  Invisible = 0,
  Thin = 100,
  ExtraLight = 200,
  Light = 300,
  Normal = 400,
  Medium = 500,
  SemiBold = 600,
  Bold = 700,
  ExtraBold = 800,
  Black = 900,
  ExtraBlack = 1000,
}

export enum FontWidth {
  UltraCondensed = 1,
  ExtraCondensed = 2,
  Condensed = 3,
  SemiCondensed = 4,
  Normal = 5,
  SemiExpanded = 6,
  Expanded = 7,
  ExtraExpanded = 8,
  UltraExpanded = 9,
}

export enum FontSlant {
  Upright,
  Italic,
  Oblique,
}

export enum FontEdging {
  Alias,
  AntiAlias,
  SubpixelAntiAlias,
}

export enum FontHinting {
  None,
  Slight,
  Normal,
  Full,
}

export const FontStyle = {
  Normal: fontStyle(FontWeight.Normal, FontWidth.Normal, FontSlant.Upright),
  Bold: fontStyle(FontWeight.Bold, FontWidth.Normal, FontSlant.Upright),
  Italic: fontStyle(FontWeight.Normal, FontWidth.Normal, FontSlant.Italic),
  BoldItalic: fontStyle(FontWeight.Bold, FontWidth.Normal, FontSlant.Italic),
};
