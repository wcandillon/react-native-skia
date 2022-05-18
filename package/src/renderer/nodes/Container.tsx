import type { DrawingContext } from "../DrawingContext";
import type { SkCanvas } from "../../skia/Canvas";

import { Node } from "./Node";
import type { RenderContext } from "./RenderContext";

export class Container extends Node {
  redraw: () => void;

  constructor(redraw: () => void) {
    super();
    this.redraw = redraw;
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    for (const child of this.children) {
      child.render(canvas, ctx);
    }
  }
}
