import type { SkData } from "../Data";

import type { SkTypeface } from "./Typeface";

export interface TypefaceFactory {
  /**
   * Loads a font from its bytes. Throws a `SkiaDecodeError` when they are
   * not a font Skia can read.
   */
  MakeFromData(data: SkData): SkTypeface;
}
