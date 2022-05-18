import type { DrawingContext } from "../DrawingContext";

import type { PaintNode } from "./Paint";

export class RenderContext {
  stack: DrawingContext[] = [];

  constructor(ctx: DrawingContext) {
    this.stack.push(ctx);
  }

  save() {
    this.stack.push({
      ...this.stack[this.stack.length - 1],
      paint: this.paint.copy(),
    });
  }

  get paint() {
    return this.stack[this.stack.length - 1].paint;
  }

  concat(paint: PaintNode) {
    if (paint.color) {
      this.paint.setColor(paint.color);
    }
    if (paint.blendMode) {
      this.paint.setBlendMode(paint.blendMode);
    }
  }

  restore() {
    this.stack.pop();
  }
}
