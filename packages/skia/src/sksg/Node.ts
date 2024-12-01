import type { SkCanvas, Skia } from "../skia/types";

export interface Node<Props> {
  draw: (ctx: DrawingContext) => void;
  clone(): Node<Props>;
}

export interface DrawingContext {
  canvas: SkCanvas;
  Skia: Skia;
}

interface TestNodeProps {
  r: number;
}

export class TestNode implements Node<TestNodeProps> {
  constructor(private props: TestNodeProps) {}
  children: Node<unknown>[] = [];
  draw(ctx: DrawingContext) {
    const { Skia, canvas } = ctx;
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("cyan"));
    canvas.drawCircle(0, 0, this.props.r, paint);
  }
  clone() {
    return new TestNode(this.props);
  }
}

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
      node.draw(ctx);
    });
  }
}
