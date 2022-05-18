import type { SkColor } from "../../skia";
import { Skia, BlendMode } from "../../skia";
import type { CustomPaintProps } from "../processors";
import { enumKey } from "../processors/Paint";

export class PaintNode {
  color: SkColor | null = null;
  blendMode: BlendMode | null = null;

  constructor(props: CustomPaintProps) {
    if (props.color) {
      this.color = Skia.Color(props.color);
    }
    if (props.blendMode) {
      this.blendMode = BlendMode[enumKey(props.blendMode)];
    }
  }
}
