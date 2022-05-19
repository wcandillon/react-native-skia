import React from "react";
import type { RefObject } from "react";

import type { SkCanvas, SkMatrix, SkPaint } from "../../skia";
import { RenderNode } from "../nodes";
import { PaintNode } from "../nodes/Paint";
import type { RenderContext } from "../nodes/RenderContext";
import { processTransform2d } from "../processors";
import type { ClipDef, CustomPaintProps, TransformProps } from "../processors";
import type { AnimatedProps } from "../processors/Animations/Animations";
import { transformOrigin } from "../processors/Transform";

export interface GroupProps extends CustomPaintProps, TransformProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: RefObject<SkPaint> | SkPaint | boolean;
}

export class GroupNode extends RenderNode<GroupProps> {
  matrix: SkMatrix | null = null;
  paint: PaintNode | null = null;

  constructor(props: AnimatedProps<GroupProps>) {
    super(props);
    this.subscribeToPropertyChanges(["transform", "origin"], (p) => {
      if (p.transform) {
        this.matrix = processTransform2d(
          p.origin ? transformOrigin(p.origin, p.transform) : p.transform
        );
      } else {
        this.matrix = null;
      }
    });
    this.subscribeToPropertyChanges(["color", "blendMode"], (p) => {
      if (p.color !== undefined || p.blendMode !== undefined) {
        this.paint = new PaintNode(p);
      }
    });
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    // TODO: Move this logic to parent RenderNode class instead?
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

export const Group = (props: AnimatedProps<GroupProps>) => {
  return <skGroup {...props} />;
};
