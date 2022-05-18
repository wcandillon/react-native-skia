import type { SkCanvas } from "../../skia";

import type { RenderContext } from "./RenderContext";

export enum NodeType {
  Circle = "skCircle",
  Group = "skGroup",
  Fill = "skFill",
}

export abstract class Node {
  children: Node[] = [];
}

export abstract class RenderNode extends Node {
  abstract render(canvas: SkCanvas, ctx: RenderContext): void;
}
