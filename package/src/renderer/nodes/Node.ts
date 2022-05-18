import type { SkCanvas } from "../../skia";
import type { DrawingContext } from "../DrawingContext";

import type { RenderContext } from "./RenderContext";

export enum NodeType {
  Circle = "skCircle",
  Group = "skGroup",
}

export abstract class Node {
  children: Node[] = [];
}

export abstract class RenderNode extends Node {
  abstract render(canvas: SkCanvas, ctx: RenderContext): void;
}
