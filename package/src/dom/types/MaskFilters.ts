import type { BlurStyle } from "../../skia/types";

import type { SkEnum } from "./Common";

export interface BlurMaskFilterProps {
  style: SkEnum<typeof BlurStyle>;
  blur: number;
  respectCTM: boolean;
}
