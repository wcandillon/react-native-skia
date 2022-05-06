import type { SkCanvas, SkPaint, SkRect } from "@shopify/react-native-skia";
import { SkiaPaint } from "@shopify/react-native-skia";

abstract class RenderNode {
  abstract render(canvas: SkCanvas): void;
}

export class Scene {
  root: RenderNode;

  constructor(root: RenderNode) {
    this.root = root;
  }

  render(canvas: SkCanvas) {
    this.root.render(canvas);
  }
}

export class GroupNode extends RenderNode {
  children: RenderNode[] = [];

  constructor() {
    super();
  }

  addChild(child: RenderNode) {
    this.children.push(child);
  }

  render(canvas: SkCanvas) {
    for (const child of this.children) {
      child.render(canvas);
    }
  }
}

export class DrawNode extends RenderNode {
  geometry: GeometryNode;
  paint: PaintNode;

  constructor(geometry: GeometryNode, paint: PaintNode) {
    super();
    this.geometry = geometry;
    this.paint = paint;
  }

  render(canvas: SkCanvas) {
    this.geometry.onDraw(canvas, this.paint.paint);
  }
}

export class PaintNode {
  paint = SkiaPaint();

  setColor(color: number) {
    this.paint.setColor(color);
  }
}

export abstract class GeometryNode {
  abstract onDraw(canvas: SkCanvas, paint: SkPaint): void;
}

export class RectNode extends GeometryNode {
  rect: SkRect;

  constructor(rect: SkRect) {
    super();
    this.rect = rect;
  }

  onDraw(canvas: SkCanvas, paint: SkPaint): void {
    canvas.drawRect(this.rect, paint);
  }
}
