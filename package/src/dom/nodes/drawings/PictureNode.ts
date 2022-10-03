import type { DrawingContext, PictureProps } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class PictureNode extends JsiDrawingNode<PictureProps, null> {
  constructor(ctx: NodeContext, props: PictureProps) {
    super(ctx, NodeType.Picture, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas }: DrawingContext) {
    const { picture } = this.props;
    canvas.drawPicture(picture);
  }
}
