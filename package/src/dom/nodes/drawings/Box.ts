import type { SkRRect, Skia } from "../../../skia/types";
import { BlurStyle, ClipOp, isRRect } from "../../../skia/types";
import type { DrawingContext } from "../../types";
import { DeclarationType, NodeType } from "../../types";
import type { BoxShadowProps, BoxProps } from "../../types/Drawings";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import { processColor } from "../datatypes";
import { JsiRenderNode } from "../RenderNode";

const inflate = (
  Skia: Skia,
  box: SkRRect,
  dx: number,
  dy: number,
  tx = 0,
  ty = 0
) =>
  Skia.RRectXY(
    Skia.XYWHRect(
      box.rect.x - dx + tx,
      box.rect.y - dy + ty,
      box.rect.width + 2 * dx,
      box.rect.height + 2 * dy
    ),
    box.rx + dx,
    box.ry + dy
  );

const deflate = (
  Skia: Skia,
  box: SkRRect,
  dx: number,
  dy: number,
  tx = 0,
  ty = 0
) => inflate(Skia, box, -dx, -dy, tx, ty);

export class BoxShadowNode extends JsiDeclarationNode<
  BoxShadowProps,
  BoxShadowProps
> {
  constructor(ctx: NodeContext, props: BoxShadowProps) {
    super(ctx, DeclarationType.Unknown, NodeType.Box, props);
  }

  materialize() {
    return this.props;
  }
}

export class BoxNode extends JsiRenderNode<BoxProps> {
  constructor(ctx: NodeContext, props: BoxProps) {
    super(ctx, NodeType.Box, props);
  }

  renderNode({ canvas, paint, opacity }: DrawingContext) {
    const { box: defaultBox } = this.props;
    const box = isRRect(defaultBox)
      ? defaultBox
      : this.Skia.RRectXY(defaultBox, 0, 0);
    const shadows = this._children
      .map((node) => {
        if (node instanceof BoxShadowNode) {
          return node.materialize();
        }
        return null;
      })
      .filter((n): n is BoxShadowProps => n !== null);
    shadows
      .filter((shadow) => !shadow.inner)
      .map((shadow) => {
        const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
        const lPaint = this.Skia.Paint();
        lPaint.setColor(processColor(this.Skia, color, opacity));
        lPaint.setMaskFilter(
          this.Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
        );
        canvas.drawRRect(
          inflate(this.Skia, box, spread, spread, dx, dy),
          lPaint
        );
      });

    canvas.drawRRect(box, paint);

    shadows
      .filter((shadow) => shadow.inner)
      .map((shadow) => {
        const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
        const delta = this.Skia.Point(10 + Math.abs(dx), 10 + Math.abs(dy));
        canvas.save();
        canvas.clipRRect(box, ClipOp.Intersect, false);
        const lPaint = this.Skia.Paint();
        lPaint.setColor(processColor(this.Skia, color, opacity));
        lPaint.setMaskFilter(
          this.Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
        );
        const inner = deflate(this.Skia, box, spread, spread, dx, dy);
        const outer = inflate(this.Skia, box, delta.x, delta.y);
        canvas.drawDRRect(outer, inner, lPaint);
        canvas.restore();
      });
  }
}
