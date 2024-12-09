import type { DrawingContext } from "./DrawingContext";
import type { Node } from "./Node";
import { isDrawingNode } from "./Node";

export class Container {
  root: Node<unknown>[] = [];
  public unmounted = false;

  constructor() {}

  clear() {
    console.log("clear container");
  }
  redraw() {
    console.log("redraw container");
  }

  render(ctx: DrawingContext) {
    this.root.forEach((node) => {
      if (isDrawingNode(node)) {
        node.draw(ctx);
      }
    });
  }
}
