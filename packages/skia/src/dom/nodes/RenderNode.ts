import { ClipOp, isRect, isRRect } from "../../skia/types";
import {
  type RenderNode,
  type GroupProps,
  type NodeType,
  type DrawingContext,
  preProcessContext,
  postProcessContext,
} from "../types";

import { isPathDef, processPath, processTransformProps2 } from "./datatypes";
import type { NodeContext } from "./Node";
import { JsiNode } from "./Node";

export abstract class JsiRenderNode<P extends GroupProps>
  extends JsiNode<P>
  implements RenderNode<P>
{
  constructor(ctx: NodeContext, type: NodeType, props: P) {
    super(ctx, type, props);
  }

  private computeClip() {
    const { clip } = this.props;
    if (clip) {
      if (isPathDef(clip)) {
        return processPath(this.Skia, clip);
      } else if (isRRect(clip) || isRect(clip)) {
        return clip;
      }
    }
    return null;
  }

  render(ctx: DrawingContext) {
    const { invertClip, layer, matrix, transform } = this.props;
    const { canvas } = ctx;

    const result = preProcessContext(ctx, this.props, this.children());

    const hasTransform = matrix !== undefined || transform !== undefined;
    const clip = this.computeClip();
    const hasClip = clip !== null;
    const shouldSave = hasTransform || hasClip || !!layer;
    const op = invertClip ? ClipOp.Difference : ClipOp.Intersect;
    if (shouldSave) {
      if (layer) {
        if (typeof layer === "boolean") {
          canvas.saveLayer();
        } else {
          canvas.saveLayer(layer);
        }
      } else {
        canvas.save();
      }
    }

    const m = processTransformProps2(this.Skia, this.props);
    if (m) {
      canvas.concat(m);
    }
    if (clip) {
      if (isRect(clip)) {
        canvas.clipRect(clip, op, true);
      } else if (isRRect(clip)) {
        canvas.clipRRect(clip, op, true);
      } else {
        canvas.clipPath(clip, op, true);
      }
    }

    this.renderNode(ctx);

    if (shouldSave) {
      canvas.restore();
    }
    postProcessContext(ctx, result);
  }

  abstract renderNode(ctx: DrawingContext): void;
}
