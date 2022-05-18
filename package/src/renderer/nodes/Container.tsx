import type { DrawingContext } from "../DrawingContext";

import { Node } from "./Node";

export class Container extends Node {
  redraw: () => void;

  constructor(redraw: () => void) {
    super();
    this.redraw = redraw;
  }

  draw(ctx: DrawingContext) {}
}
