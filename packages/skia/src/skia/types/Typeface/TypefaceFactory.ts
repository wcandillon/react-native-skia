import type { SkData } from "../Data";

import type { SkTypeface } from "./Typeface";

export interface TypefaceFactory {
  MakeFromData(data: SkData): SkTypeface | null;
}
