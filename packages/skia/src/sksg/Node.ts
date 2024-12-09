import type { DeclarationContext, DrawingNodeProps } from "../dom/types";

import type { DrawingContext } from "./DrawingContext";

export enum NodeType {
  Drawing,
  Declaration,
}

export interface Node<Props> {
  type: NodeType;
  clone(): Node<Props>;
  children: Node<unknown>[];
}

export interface DrawingNode<Props> extends Node<Props> {
  type: NodeType.Drawing;
  draw(ctx: DrawingContext): void;
}

export interface DeclarationNode<Props> extends Node<Props> {
  type: NodeType.Declaration;
  declare(ctx: DeclarationContext): void;
}

export const isDrawingNode = <T>(node: Node<T>): node is DrawingNode<T> => {
  "worklet";
  return node.type === NodeType.Drawing;
};

export const isDeclarationNode = (
  node: Node<unknown>
): node is DeclarationNode<unknown> => {
  "worklet";
  return node.type === NodeType.Declaration;
};

export class FillNode implements DrawingNode<DrawingNodeProps> {
  type = NodeType.Drawing as const;
  children: Node<unknown>[] = [];

  constructor(private props: DrawingNodeProps) {}

  clone() {
    return new FillNode(this.props);
  }

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    const shouldRestorePaint = ctx.processPaint(this.props);
    canvas.drawPaint(ctx.paint);
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }
}
