import type { SkCanvas } from "../../skia";
import type { DrawingContext } from "../DrawingContext";

export enum NodeType {
  Circle = "skCircle",
}

export abstract class Node {
  children: Node[] = [];
}

export abstract class RenderNode extends Node {
  abstract render(canvas: SkCanvas, ctx: DrawingContext): void;
}
