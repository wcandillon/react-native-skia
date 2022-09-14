import type { DrawingContext, ImageSVGProps } from "../../types";
import { NodeType } from "../../types";
import { processRect } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class ImageSVGNode extends JsiDrawingNode<ImageSVGProps, null> {
  constructor(ctx: NodeContext, props: ImageSVGProps) {
    super(ctx, NodeType.ImageSVG, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas }: DrawingContext) {
    const { svg } = this.props;
    const { x, y, width, height } = processRect(this.Skia, this.props);
    canvas.save();
    canvas.translate(x, y);
    canvas.drawSvg(svg, width, height);
    canvas.restore();
  }
}
