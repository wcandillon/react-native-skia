import { enumKey, processCircle, processTransformProps2 } from "../dom/nodes";
import { DeclarationContext } from "../dom/types";
import type {
  BlurMaskFilterProps,
  CircleProps,
  DrawingNodeProps,
  GroupProps,
  PaintProps,
  TransformProps,
} from "../dom/types";
import {
  BlendMode,
  BlurStyle,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type Skia,
  type SkPaint,
  type Vector,
} from "../skia/types";

enum NodeType {
  Drawing,
  Declaration,
}

export interface Node<Props> {
  type: NodeType;
  clone(): Node<Props>;
  children: Node<unknown>[];
}

export interface DrawingNode<Props> extends Node<Props> {
  type: NodeType.Drawing;
  draw(ctx: DrawingContext): void;
}

export interface DeclarationNode<Props> extends Node<Props> {
  type: NodeType.Declaration;
  declare(ctx: DeclarationContext): void;
}

const isDrawingNode = (node: Node<unknown>): node is DrawingNode<unknown> => {
  "worklet";
  return node.type === NodeType.Drawing;
};

const isDeclarationNode = (
  node: Node<unknown>
): node is DeclarationNode<unknown> => {
  "worklet";
  return node.type === NodeType.Declaration;
};

export class DrawingContext {
  private paints: SkPaint[];
  public declCtx: DeclarationContext;

  constructor(public Skia: Skia, public canvas: SkCanvas) {
    this.paints = [Skia.Paint()];
    this.declCtx = new DeclarationContext(this.Skia);
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
    const colorFilter = this.declCtx.colorFilters.popAllAsOne();
    const imageFilter = this.declCtx.imageFilters.popAllAsOne();
    const shader = this.declCtx.shaders.pop();
    const maskFilter = this.declCtx.maskFilters.pop();
    const pathEffect = this.declCtx.pathEffects.popAllAsOne();
    if (colorFilter) {
      paint.setColorFilter(colorFilter);
    }
    if (imageFilter) {
      paint.setImageFilter(imageFilter);
    }
    if (shader) {
      paint.setShader(shader);
    }
    if (maskFilter) {
      paint.setMaskFilter(maskFilter);
    }
    if (pathEffect) {
      paint.setPathEffect(pathEffect);
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

export class BlurMaskFilterNode
  implements DeclarationNode<BlurMaskFilterProps>
{
  type = NodeType.Declaration as const;
  children: Node<unknown>[] = [];
  constructor(private props: BlurMaskFilterProps) {}
  clone() {
    return new BlurMaskFilterNode(this.props);
  }
  declare(ctx: DeclarationContext) {
    const { style, blur, respectCTM } = this.props;
    const mf = ctx.Skia.MaskFilter.MakeBlur(
      BlurStyle[enumKey(style)],
      blur,
      respectCTM
    );
    ctx.maskFilters.push(mf);
  }
}

export class FillNode implements DrawingNode<DrawingNodeProps> {
  type = NodeType.Drawing as const;
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

export class CircleNode implements DrawingNode<CircleProps> {
  type = NodeType.Drawing as const;
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

export class GroupNode implements DrawingNode<GroupProps> {
  type = NodeType.Drawing as const;
  constructor(private props: GroupProps) {}

  children: Node<unknown>[] = [];

  draw(ctx: DrawingContext) {
    const { canvas } = ctx;
    const shouldRestoreMatrix = ctx.processMatrix(this.props);
    ctx.declCtx.save();
    this.children.forEach((child) => {
      if (isDeclarationNode(child)) {
        child.declare(ctx.declCtx);
      }
    });
    ctx.declCtx.restore();
    const shouldRestorePaint = ctx.processPaint(this.props);
    this.children.forEach((child) => {
      if (isDrawingNode(child)) {
        child.draw(ctx);
      }
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
      if (isDrawingNode(node)) {
        node.draw(ctx);
      }
    });
  }
}