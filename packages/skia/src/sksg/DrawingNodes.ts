import { processCircle } from "../dom/nodes";
import type { CircleProps, DrawingNodeProps, GroupProps } from "../dom/types";
import type { Vector } from "../skia/types";

import {
  postProcessContext,
  preProcessContext,
  type DrawingContext,
} from "./DrawingContext";
import { isDrawingNode, NodeType } from "./Node";
import type { DrawingNode, Node } from "./Node";

export class GroupNode implements DrawingNode<GroupProps> {
  type = NodeType.Drawing as const;
  constructor(private props: GroupProps) {}

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const result = preProcessContext(ctx, this.props, this.children);
    this.children.forEach((child) => {
      if (isDrawingNode(child)) {
        child.draw(ctx);
      }
    });
    postProcessContext(ctx, result);
  }

  clone() {
    return new GroupNode(this.props);
  }
}

export class CircleNode implements DrawingNode<CircleProps> {
  type = NodeType.Drawing as const;
  private c: Vector;

  constructor(private props: CircleProps) {
    this.c = processCircle(this.props).c;
  }

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const result = preProcessContext(ctx, this.props, this.children);
    canvas.drawCircle(this.c.x, this.c.y, this.props.r, ctx.paint);
    postProcessContext(ctx, result);
  }

  clone() {
    return new CircleNode(this.props);
  }
}

export class FillNode implements DrawingNode<DrawingNodeProps> {
  type = NodeType.Drawing as const;
  children: Node<unknown>[] = [];

  constructor(private props: DrawingNodeProps) {}

  clone() {
    return new FillNode(this.props);
  }

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const result = preProcessContext(ctx, this.props, this.children);
    canvas.drawPaint(ctx.paint);
    postProcessContext(ctx, result);
  }
}
