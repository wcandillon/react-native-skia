import { enumKey, processCircle, processTransformProps2 } from "../dom/nodes";
import type {
  CircleProps,
  DrawingNodeProps,
  GroupProps,
  PaintProps,
  TransformProps,
} from "../dom/types";
import {
  BlendMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type Skia,
  type SkPaint,
  type Vector,
} from "../skia/types";

export interface Node<Props> {
  draw: (ctx: DrawingContext) => void;
  clone(): Node<Props>;
  children: Node<unknown>[];
}

export class DrawingContext {
  private paints: SkPaint[];

  constructor(public Skia: Skia, public canvas: SkCanvas) {
    this.paints = [Skia.Paint()];
  }

  save() {
    this.paints.push(this.paint.copy());
  }

  restore() {
    this.paints.pop();
  }

  get paint() {
    const paint = this.paints[this.paints.length - 1];
    if (!paint) {
      throw new Error("Paint is undefined");
    }
    return paint;
  }

  processPaint({
    opacity,
    color,
    strokeWidth,
    blendMode,
    style,
    strokeJoin,
    strokeCap,
    strokeMiter,
    antiAlias,
    dither,
  }: PaintProps) {
    let shouldRestore = false;
    if (
      opacity !== undefined ||
      color !== undefined ||
      strokeWidth !== undefined ||
      blendMode !== undefined ||
      style !== undefined ||
      strokeJoin !== undefined ||
      strokeCap !== undefined ||
      strokeMiter !== undefined ||
      antiAlias !== undefined ||
      dither !== undefined
    ) {
      if (!shouldRestore) {
        this.save();
        shouldRestore = true;
      }
    }
    const { paint } = this;
    if (opacity !== undefined) {
      paint.setAlphaf(paint.getAlphaf() * opacity);
    }
    if (color !== undefined) {
      const currentOpacity = paint.getAlphaf();
      paint.setShader(null);
      paint.setColor(this.Skia.Color(color));
      paint.setAlphaf(currentOpacity * paint.getAlphaf());
    }
    if (strokeWidth !== undefined) {
      paint.setStrokeWidth(strokeWidth);
    }
    if (blendMode !== undefined) {
      paint.setBlendMode(BlendMode[enumKey(blendMode)]);
    }
    if (style !== undefined) {
      paint.setStyle(PaintStyle[enumKey(style)]);
    }
    if (strokeJoin !== undefined) {
      paint.setStrokeJoin(StrokeJoin[enumKey(strokeJoin)]);
    }
    if (strokeCap !== undefined) {
      paint.setStrokeCap(StrokeCap[enumKey(strokeCap)]);
    }
    if (strokeMiter !== undefined) {
      paint.setStrokeMiter(strokeMiter);
    }
    if (antiAlias !== undefined) {
      paint.setAntiAlias(antiAlias);
    }
    if (dither !== undefined) {
      paint.setDither(dither);
    }
    return shouldRestore;
  }

  processMatrix(props: TransformProps) {
    const m3 = processTransformProps2(this.Skia, props);
    if (m3) {
      this.canvas.save();
      this.canvas.concat(m3);
      return true;
    }
    return false;
  }
}

export class FillNode implements Node<DrawingNodeProps> {
  children: Node<unknown>[] = [];

  constructor(private props: DrawingNodeProps) {}

  clone() {
    return new FillNode(this.props);
  }

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    const shouldRestorePaint = ctx.processPaint(this.props);
    canvas.drawPaint(ctx.paint);
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }
}

export class CircleNode implements Node<CircleProps> {
  private c: Vector;

  constructor(private props: CircleProps) {
    this.c = processCircle(this.props).c;
  }

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    const shouldRestorePaint = ctx.processPaint(this.props);
    canvas.drawCircle(this.c.x, this.c.y, this.props.r, ctx.paint);
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }

  protected deriveProps() {
    return processCircle(this.props).c;
  }

  clone() {
    return new CircleNode(this.props);
  }
}

export class GroupNode implements Node<GroupProps> {
  constructor(private props: GroupProps) {}

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    const shouldRestorePaint = ctx.processPaint(this.props);
    this.children.forEach((child) => {
      child.draw(ctx);
    });
    if (shouldRestoreMatrix) {
      canvas.restore();
    }
    if (shouldRestorePaint) {
      ctx.restore();
    }
  }

  clone() {
    return new GroupNode(this.props);
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
