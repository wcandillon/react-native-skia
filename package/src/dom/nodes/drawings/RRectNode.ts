import type { SkRRect } from "../../../skia/types";
import type { DrawingContext, RoundedRectProps } from "../../types";
import { NodeType } from "../../types";
import { processRRect } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class RRectNode extends JsiDrawingNode<RoundedRectProps, SkRRect> {
  rect?: SkRRect;

  constructor(ctx: NodeContext, props: RoundedRectProps) {
    super(ctx, NodeType.RRect, props);
  }

  protected deriveProps() {
    return processRRect(this.Skia, this.props);
  }

  draw({ canvas, paint }: DrawingContext) {
    if (this.derived === undefined) {
      throw new Error("RRectNode: rect is undefined");
    }
    canvas.drawRRect(this.derived, paint);
  }
}
