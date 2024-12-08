import { processCircle } from "../dom/nodes";
import type { CircleProps } from "../dom/types";
import type { SkCanvas, Skia, SkPaint, Vector } from "../skia/types";

export interface Node<Props> {
  draw: (ctx: DrawingContext) => void;
  clone(): Node<Props>;
}

export class DrawingContext {
  private paints: SkPaint[];

  constructor(public Skia: Skia, public canvas: SkCanvas) {
    this.paints = [Skia.Paint()];
  }

  get paint() {
    const paint = this.paints[this.paints.length - 1];
    if (!paint) {
      throw new Error("Paint is undefined");
    }
    return paint;
  }
}

export class CircleNode implements Node<CircleProps> {
  private c: Vector;

  constructor(private props: CircleProps) {
    this.c = processCircle(this.props).c;
  }

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas, paint } = ctx;
    canvas.drawCircle(this.c.x, this.c.y, this.props.r, paint);
  }

  protected deriveProps() {
    return processCircle(this.props).c;
  }

  clone() {
    return new CircleNode(this.props);
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
