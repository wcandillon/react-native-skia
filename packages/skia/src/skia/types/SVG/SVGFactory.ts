import type { SkData } from "../Data";
import type { SkFontMgr } from "../Font/FontMgr";

import type { SkSVG } from "./SVG";

export interface SVGFactory {
  /**
   * Parses an SVG document from its bytes. Throws a `SkiaDecodeError` when
   * it is not an SVG Skia can read.
   */
  MakeFromData(
    data: SkData,
    fontMgr?: SkFontMgr | null,
    assets?: Record<string, SkData | null>
  ): SkSVG;
  /**
   * Parses an SVG document. Throws a `SkiaDecodeError` when it is not an
   * SVG Skia can read.
   */
  MakeFromString(
    str: string,
    fontMgr?: SkFontMgr | null,
    assets?: Record<string, SkData | null>
  ): SkSVG;
}
