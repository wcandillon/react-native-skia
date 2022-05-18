import type { RefObject } from "react";

import type { SkCanvas, SkMatrix, SkPaint } from "../../skia";
import { RenderNode } from "../nodes";
import { PaintNode } from "../nodes/Paint";
import type { RenderContext } from "../nodes/RenderContext";
import type { ClipDef, CustomPaintProps, TransformProps } from "../processors";

export interface GroupProps extends CustomPaintProps, TransformProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: RefObject<SkPaint> | SkPaint | boolean;
}

export class GroupNode extends RenderNode {
  matrix: SkMatrix | null = null;
  paint: PaintNode | null = null;

  constructor(props: GroupProps) {
    super();
    if (props.color || props.blendMode) {
      this.paint = new PaintNode(props);
    }
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    const shouldSave = this.matrix !== null;
    if (shouldSave) {
      canvas.save();
    }
    if (this.matrix !== null) {
      canvas.concat(this.matrix);
    }
    if (this.paint !== null) {
      ctx.save();
      ctx.concat(this.paint);
    }
    for (const child of this.children) {
      if (child instanceof RenderNode) {
        child.render(canvas, ctx);
      }
    }
    if (shouldSave) {
      canvas.restore();
    }
    if (this.paint !== null) {
      ctx.restore();
    }
  }
}
