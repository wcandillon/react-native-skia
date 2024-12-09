import { processCircle } from "../dom/nodes";
import type { CircleProps, GroupProps } from "../dom/types";
import type { Vector } from "../skia/types";

import type { DrawingContext } from "./DrawingContext";
import { isDeclarationNode, isDrawingNode, NodeType } from "./Node";
import type { DrawingNode, Node } from "./Node";

export class CircleNode implements DrawingNode<CircleProps> {
  type = NodeType.Drawing as const;
  private c: Vector;

  constructor(private props: CircleProps) {
    this.c = processCircle(this.props).c;
  }

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    const shouldRestorePaint = ctx.processPaint(this.props);
    canvas.drawCircle(this.c.x, this.c.y, this.props.r, ctx.paint);
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }

  protected deriveProps() {
    return processCircle(this.props).c;
  }

  clone() {
    return new CircleNode(this.props);
  }
}

export class GroupNode implements DrawingNode<GroupProps> {
  type = NodeType.Drawing as const;
  constructor(private props: GroupProps) {}

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    ctx.declCtx.save();
    this.children.forEach((child) => {
      if (isDeclarationNode(child)) {
        child.declare(ctx.declCtx);
      }
    });
    ctx.declCtx.restore();
    const shouldRestorePaint = ctx.processPaint(this.props);
    this.children.forEach((child) => {
      if (isDrawingNode(child)) {
        child.draw(ctx);
      }
    });
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }

  clone() {
    return new GroupNode(this.props);
  }
}
