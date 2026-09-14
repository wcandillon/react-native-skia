import type { SkCanvas } from "../Canvas";
import type { SkFont } from "../Font";
import type { SkJSIInstance } from "../JsiInstance";
import type { SkPath } from "../Path";
import type { SkPoint } from "../Point";
import type { SkRect } from "../Rect";
import type { SkSize } from "../Size";

import type { TextDirection } from "./ParagraphStyle";

export interface LineMetrics {
  /** The index in the text buffer the line begins. */
  startIndex: number;
  /** The index in the text buffer the line ends. */
  endIndex: number;
  endExcludingWhitespaces: number;
  endIncludingNewline: number;
  /** True if the line ends in a hard break (e.g. newline) */
  isHardBreak: boolean;
  /**
   * The final computed ascent for the line. This can be impacted by
   * the strut, height, scaling, as well as outlying runs that are very tall.
   */
  ascent: number;
  /**
   * The final computed descent for the line. This can be impacted by
   * the strut, height, scaling, as well as outlying runs that are very tall.
   */
  descent: number;
  /** round(ascent + descent) */
  height: number;
  /** width of the line */
  width: number;
  /** The left edge of the line. The right edge can be obtained with `left + width` */
  left: number;
  /** The y position of the baseline for this line from the top of the paragraph. */
  baseline: number;
  /** Zero indexed line number. */
  lineNumber: number;
}

export interface SkRectWithDirection {
  rect: SkRect;
  direction: TextDirection;
}

/**
 * Information about a run of glyphs passed to the visitor of
 * `SkParagraph.extendedVisit`. All glyphs in a run share the same font: for
 * text shaped through font fallback, each fallback font produces its own
 * run(s).
 */
export interface ParagraphVisitorInfo {
  /** The font used to shape this run (the resolved fallback font, if any). */
  font: SkFont;
  /** Origin of the run within the paragraph (baseline corrected). */
  origin: SkPoint;
  /** Advance of the run. */
  advance: SkSize;
  /** The glyph ids of the run. */
  glyphs: number[];
  /**
   * The position of each glyph, relative to the run `origin`. Add `origin`
   * to obtain paragraph coordinates: for a run shaped through font fallback,
   * the run placement is carried by `origin`, not by the positions.
   */
  positions: SkPoint[];
  /**
   * The tight ink bounds of each glyph, relative to the glyph's origin.
   * Combine with `positions` to compute the exact painted bounds of the run.
   */
  bounds: SkRect[];
  /** The UTF-8 text index of the cluster each glyph belongs to. */
  utf8Starts: number[];
  /** Reserved flags (currently always 0). */
  flags: number;
}

/**
 * Visitor for `SkParagraph.extendedVisit`. Called once per run of glyphs;
 * `info` is null to signal the end of a line.
 */
export type ParagraphExtendedVisitor = (
  lineNumber: number,
  info: ParagraphVisitorInfo | null
) => void;

export interface SkParagraph extends SkJSIInstance<"Paragraph"> {
  /**
   * Calculates the position of the the glyphs in the paragraph
   * @param width Max width of the paragraph
   */
  layout(width: number): void;
  /**
   * Paints the paragraph to the provded canvas
   * @param canvas Canvas to paint into
   * @param x X coordinate to paint at
   * @param y Y coordinate to paint at
   */
  paint(canvas: SkCanvas, x: number, y: number): void;
  /**
   * Returns the height of the paragraph. This method requires the layout
   * method to have been called first.
   */
  getHeight(): number;
  /**
   * Returns the max width of the paragraph. This method requires the layout
   * method to have been called first.
   */
  getMaxWidth(): number;
  /**
   * Returns the minimum intrinsic width of the paragraph.
   * The minimum intrinsic width is the width beyond which increasing the width of the paragraph
   * does not decrease the height. This is effectively the width at which the paragraph
   * can no longer wrap lines and is forced to overflow.
   * This method requires the layout method to have been called first.
   * @returns {number} The minimum intrinsic width of the paragraph.
   */
  getMinIntrinsicWidth(): number;
  /**
   * Returns the maximum intrinsic width of the paragraph.
   * The maximum intrinsic width is the width at which the paragraph can layout its content without line breaks,
   * meaning it's the width of the widest line or the widest word if the widest line is shorter than that.
   * This width represents the ideal width for the paragraph to display all content in a single line without overflow.
   * This method requires the layout method to have been called first.
   * @returns {number} The maximum intrinsic width of the paragraph.
   */
  getMaxIntrinsicWidth(): number;

  /**
   * Returns the width of the longest line in the paragraph.
   * This method requires the layout method to have been called first.
   */
  getLongestLine(): number;

  /**
   * Returns the index of the glyph at the given position. This method requires
   * the layout method to have been called first.
   * @param x X coordinate of the position
   * @param y Y coordinate of the position
   */
  getGlyphPositionAtCoordinate(x: number, y: number): number;
  /**
   * Returns the bounding boxes of the glyphs in the given range. This method
   * requires the layout method to have been called first.
   * @param start Start index of the range
   * @param end End index of the range
   */
  getRectsForRange(start: number, end: number): SkRect[];
  /**
   * Returns the bounding boxes for all lines in the paragraph. This method
   * requires the layout method to have been called first.
   */
  getLineMetrics(): LineMetrics[];
  /**
   * Returns a list of rects with direction info for the placeholders added
   * to the paragraph.
   */
  getRectsForPlaceholders(): SkRectWithDirection[];
  /**
   * Converts the glyphs of the given line into an SkPath, with all font
   * fallbacks already applied. Use `computeTightBounds()` on the resulting
   * path to measure the exact ink bounds of the rendered text (as opposed to
   * the font-metrics based bounds returned by `getRectsForRange`).
   * Note that color glyphs (e.g. emojis) cannot be converted to a path and
   * are skipped. Returns null if the line number is out of bounds.
   * This method requires the layout method to have been called first.
   * Not implemented on React Native Web.
   * @param lineNumber The line number (zero indexed, see `getLineMetrics`)
   */
  getPath(lineNumber: number): SkPath | null;
  /**
   * Visits the laid out paragraph, calling the visitor once for every run of
   * glyphs with the resolved font, glyph ids, positions and per-glyph tight
   * ink bounds. The visitor is called with a null info to signal the end of
   * each line. This exposes the exact layout that would be painted.
   * This method requires the layout method to have been called first.
   * Not implemented on React Native Web.
   * @param visitor Called once per glyph run, and once per line end
   */
  extendedVisit(visitor: ParagraphExtendedVisitor): void;
}
