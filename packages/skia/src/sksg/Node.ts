import type { DeclarationContext } from "../dom/types";

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
