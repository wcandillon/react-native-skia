import type { SkRect } from "../../../skia/types";
import type { DrawingContext, ImageProps } from "../../types";
import { NodeType } from "../../types";
import { fitRects, processRect } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class ImageNode extends JsiDrawingNode<
  ImageProps,
  { src: SkRect; dst: SkRect }
> {
  constructor(ctx: NodeContext, props: ImageProps) {
    super(ctx, NodeType.Image, props);
  }

  deriveProps() {
    const { image, fit } = this.props;
    const rect = processRect(this.Skia, this.props);
    const { src, dst } = fitRects(
      fit,
      {
        x: 0,
        y: 0,
        width: image.width(),
        height: image.height(),
      },
      rect
    );
    return { src, dst };
  }

  draw({ canvas, paint }: DrawingContext) {
    const { image } = this.props;
    if (!this.derived) {
      throw new Error("ImageNode: src and dst are undefined");
    }
    const { src, dst } = this.derived;
    canvas.drawImageRect(image, src, dst, paint);
  }
}
