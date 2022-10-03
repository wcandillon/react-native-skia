import type { RefObject } from "react";

import type {
  SkMatrix,
  SkRect,
  SkRRect,
  SkPath,
  SkPaint,
} from "../../skia/types";
import {
  StrokeCap,
  StrokeJoin,
  PaintStyle,
  BlendMode,
  ClipOp,
  isRRect,
} from "../../skia/types";
import type {
  RenderNode,
  GroupProps,
  DrawingContext,
  NodeType,
  Node,
  DeclarationNode,
} from "../types";

import { isPathDef, processPath, processTransformProps } from "./datatypes";
import type { NodeContext } from "./Node";
import { JsiNode, JsiDeclarationNode } from "./Node";
import type { PaintContext } from "./PaintContext";
import { enumKey } from "./datatypes/Enum";

const paintProps = [
  "color",
  "strokeWidth",
  "blendMode",
  "strokeCap",
  "strokeJoin",
  "strokeMiter",
  "style",
  "antiAlias",
  "opacity",
];

interface PaintCache {
  parent: SkPaint;
  child: SkPaint;
}

export abstract class JsiRenderNode<P extends GroupProps>
  extends JsiNode<P>
  implements RenderNode<P>
{
  paintCache: PaintCache | null = null;
  matrix: SkMatrix;
  clipRect?: SkRect;
  clipRRect?: SkRRect;
  clipPath?: SkPath;

  constructor(ctx: NodeContext, type: NodeType, props: P) {
    super(ctx, type, props);
    this.matrix = this.Skia.Matrix();
    this.onPropChange();
  }

  setProps(props: P) {
    super.setProps(props);
    this.onPropChange();
    this.paintCache = null;
  }

  setProp<K extends keyof P>(key: K, value: P[K]) {
    const hasChanged = super.setProp(key, value);
    if (hasChanged) {
      this.onPropChange();
      if (paintProps.includes(key as string)) {
        this.paintCache = null;
      }
    }
    return hasChanged;
  }

  protected onPropChange() {
    this.matrix.identity();
    this.clipPath = undefined;
    this.clipRect = undefined;
    this.clipRRect = undefined;
    this.computeMatrix();
    this.computeClip();
  }

  addChild(child: Node<unknown>) {
    if (child instanceof JsiDeclarationNode) {
      child.setInvalidate(() => (this.paintCache = null));
    }
    super.addChild(child);
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>) {
    if (child instanceof JsiDeclarationNode) {
      child.setInvalidate(() => (this.paintCache = null));
    }
    super.insertChildBefore(child, before);
  }

  private computeClip() {
    const { clip } = this.props;
    if (clip) {
      if (isPathDef(clip)) {
        this.clipPath = processPath(this.Skia, clip);
      } else if (isRRect(clip)) {
        this.clipRRect = clip;
      } else {
        this.clipRect = clip;
      }
    }
  }

  private computeMatrix() {
    processTransformProps(this.matrix, this.props);
  }

  private getPaintCtx() {
    let ctx: PaintContext | undefined;
    const {
      color,
      strokeWidth,
      blendMode,
      style,
      strokeJoin,
      strokeCap,
      strokeMiter,
      opacity,
      antiAlias,
    } = this.props;
    if (
      color !== undefined ||
      strokeWidth !== undefined ||
      blendMode !== undefined ||
      style !== undefined ||
      strokeJoin !== undefined ||
      strokeCap !== undefined ||
      strokeMiter !== undefined ||
      opacity !== undefined ||
      antiAlias !== undefined
    ) {
      ctx = {};
      if (color !== undefined) {
        ctx.color = this.Skia.Color(color);
      }
      if (strokeWidth !== undefined) {
        ctx.strokeWidth = strokeWidth;
      }
      if (blendMode !== undefined) {
        ctx.blendMode = BlendMode[enumKey(blendMode)];
      }
      if (style !== undefined) {
        ctx.style = PaintStyle[enumKey(style)];
      }
      if (strokeJoin !== undefined) {
        ctx.strokeJoin = StrokeJoin[enumKey(strokeJoin)];
      }
      if (strokeCap !== undefined) {
        ctx.strokeCap = StrokeCap[enumKey(strokeCap)];
      }
      if (strokeMiter !== undefined) {
        ctx.strokeMiter = strokeMiter;
      }
      if (opacity !== undefined) {
        ctx.opacity = opacity;
      }
      if (antiAlias !== undefined) {
        ctx.antiAlias = antiAlias;
      }
    }
    this._children.forEach((child) => {
      if (child instanceof JsiDeclarationNode) {
        if (child.isColorFilter()) {
          ctx = ctx || {};
          const cf = child.materialize();
          ctx.colorFilter = ctx.colorFilter
            ? this.Skia.ColorFilter.MakeCompose(cf, ctx.colorFilter)
            : cf;
        } else if (child.isShader()) {
          ctx = ctx || {};
          const shader = child.materialize();
          ctx.shader = shader;
        } else if (child.isPathEffect()) {
          ctx = ctx || {};
          const pe = child.materialize();
          ctx.pathEffect = ctx.pathEffect
            ? this.Skia.PathEffect.MakeCompose(pe, ctx.pathEffect)
            : pe;
        } else if (child.isImageFilter()) {
          ctx = ctx || {};
          const filter = child.materialize();
          ctx.imageFilter = ctx.imageFilter
            ? this.Skia.ImageFilter.MakeCompose(filter, ctx.imageFilter)
            : filter;
        } else if (child.isMaskFilter()) {
          ctx = ctx || {};
          const filter = child.materialize();
          ctx.maskFilter = filter;
        }
      }
    });
    return ctx;
  }

  render(parentCtx: DrawingContext) {
    const { invertClip, layer, matrix, transform } = this.props;
    const { canvas } = parentCtx;

    const opacity = this.props.opacity
      ? parentCtx.opacity * this.props.opacity
      : parentCtx.opacity;

    if (
      this.paintCache === null ||
      this.paintCache.parent !== parentCtx.paint
    ) {
      const paintCtx = this.getPaintCtx();
      const child = paintCtx
        ? concatPaint(parentCtx.paint, paintCtx, parentCtx.opacity)
        : parentCtx.paint;
      this.paintCache = { parent: parentCtx.paint, child };
    }
    const paint = this.paintCache.child;
    // TODO: can we only recreate a new context here if needed?
    const ctx = { ...parentCtx, opacity, paint };
    const hasTransform = matrix !== undefined || transform !== undefined;
    const hasClip = this.clipRect !== undefined;
    const shouldSave = hasTransform || hasClip || !!layer;
    const op = invertClip ? ClipOp.Difference : ClipOp.Intersect;

    if (shouldSave) {
      if (layer) {
        if (typeof layer === "boolean") {
          canvas.saveLayer();
        } else if (isSkPaint(layer)) {
          canvas.saveLayer(layer);
        } else {
          canvas.saveLayer(
            layer.current ? layer.current.materialize() : undefined
          );
        }
      } else {
        canvas.save();
      }
    }

    if (this.matrix) {
      canvas.concat(this.matrix);
    }
    if (this.clipRect) {
      canvas.clipRect(this.clipRect, op, true);
    }
    if (this.clipRRect) {
      canvas.clipRRect(this.clipRRect, op, true);
    }
    if (this.clipPath) {
      canvas.clipPath(this.clipPath, op, true);
    }

    this.renderNode(ctx);

    if (shouldSave) {
      canvas.restore();
    }
  }

  abstract renderNode(ctx: DrawingContext): void;
}

export const isSkPaint = (
  obj: RefObject<DeclarationNode<unknown, SkPaint>> | SkPaint
): obj is SkPaint => "__typename__" in obj && obj.__typename__ === "Paint";

const concatPaint = (
  parent: SkPaint,
  {
    color,
    strokeWidth,
    shader,
    antiAlias,
    blendMode,
    colorFilter,
    imageFilter,
    maskFilter,
    pathEffect,
    opacity: alpha,
    strokeCap,
    strokeJoin,
    strokeMiter,
    style,
  }: PaintContext,
  opacity: number
) => {
  const paint = parent.copy();
  if (color !== undefined) {
    paint.setShader(null);
    color[3] *= opacity;
    paint.setColor(color);
  } else {
    const cl = paint.getColor();
    cl[3] *= opacity;
    paint.setColor(cl);
  }
  if (strokeWidth !== undefined) {
    paint.setStrokeWidth(strokeWidth);
  }
  if (shader !== undefined) {
    paint.setShader(shader);
  }
  if (antiAlias !== undefined) {
    paint.setAntiAlias(antiAlias);
  }
  if (blendMode !== undefined) {
    paint.setBlendMode(blendMode);
  }
  if (colorFilter !== undefined) {
    paint.setColorFilter(colorFilter);
  }
  if (imageFilter !== undefined) {
    paint.setImageFilter(imageFilter);
  }
  if (maskFilter !== undefined) {
    paint.setMaskFilter(maskFilter);
  }
  if (pathEffect !== undefined) {
    paint.setPathEffect(pathEffect);
  }
  if (alpha !== undefined) {
    paint.setAlphaf(alpha * opacity);
  }
  if (strokeCap !== undefined) {
    paint.setStrokeCap(strokeCap);
  }
  if (strokeJoin !== undefined) {
    paint.setStrokeJoin(strokeJoin);
  }
  if (strokeMiter !== undefined) {
    paint.setStrokeMiter(strokeMiter);
  }
  if (style !== undefined) {
    paint.setStyle(style);
  }
  return paint;
};
