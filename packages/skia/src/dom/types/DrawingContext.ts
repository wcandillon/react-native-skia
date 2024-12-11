import type {
  SkCanvas,
  SkColor,
  SkColorFilter,
  SkImageFilter,
  SkMaskFilter,
  SkPaint,
  SkPathEffect,
  SkShader,
  Skia,
} from "../../skia/types";
import { BlendMode, PaintStyle, StrokeCap, StrokeJoin } from "../../skia/types";
import { enumKey } from "../nodes/datatypes/Enum";
import { JsiDeclarationNode } from "../nodes/Node";

import type { PaintProps, SkEnum } from "./Common";
import { DeclarationContext } from "./DeclarationContext";
import type { Node } from "./Node";

export interface DrawingContext {
  canvas: SkCanvas;
  paint: SkPaint;
  saveAndConcat(node: Node<PaintProps>): boolean;
  restore(): void;
  declarationCtx: DeclarationContext;
}

export class JsiDrawingContext implements DrawingContext {
  paints: SkPaint[];

  declarationCtx: DeclarationContext;

  constructor(private readonly Skia: Skia, public readonly canvas: SkCanvas) {
    const paint = this.Skia.Paint();
    this.paints = [paint];
    this.declarationCtx = new DeclarationContext(Skia);
  }

  get paint() {
    return this.paints[this.paints.length - 1];
  }

  private save() {
    const childPaint = this.paint.copy();
    this.paints.push(childPaint);
  }

  restore(): void {
    this.paints.pop();
  }

  saveAndConcat(node: Node<PaintProps>) {
    const paint = new ConcatablePaint(this.Skia, this.declarationCtx, node);
    if (!paint.isPristine()) {
      this.save();
      paint.concatTo(this.paint);
      return true;
    }
    return false;
  }
}

class ConcatablePaint {
  private pristine = true;

  _color?: SkColor;
  _strokeWidth?: number;
  _blendMode?: BlendMode;
  _style?: PaintStyle;
  _strokeJoin?: StrokeJoin;
  _strokeCap?: StrokeCap;
  _strokeMiter?: number;
  _opacity = 1;
  _antiAlias?: boolean;
  _dither?: boolean;

  _imageFilter?: SkImageFilter;
  _shader?: SkShader;
  _pathEffect?: SkPathEffect;
  _colorFilter?: SkColorFilter;
  _maskFilter?: SkMaskFilter;

  constructor(Skia: Skia, declCtx: DeclarationContext, node: Node<PaintProps>) {
    const props = node.getProps();
    const children = node.children();
    this.setColor(
      props.color !== undefined ? Skia.Color(props.color) : props.color
    );
    this.setStrokeWidth(props.strokeWidth);
    this.setBlendMode(props.blendMode);
    this.setStyle(props.style);
    this.setStrokeJoin(props.strokeJoin);
    this.setStrokeCap(props.strokeCap);
    this.setStrokeMiter(props.strokeMiter);
    this.setOpacity(props.opacity);
    this.setAntiAlias(props.antiAlias);
    this.setDither(props.dither);
    declCtx.save();
    children.forEach((child) => {
      if (child instanceof JsiDeclarationNode) {
        child.decorate(declCtx);
      }
    });
    const colorFilter = declCtx.colorFilters.popAllAsOne();
    const imageFilter = declCtx.imageFilters.popAllAsOne();
    const shader = declCtx.shaders.pop();
    const maskFilter = declCtx.maskFilters.pop();
    const pathEffect = declCtx.pathEffects.popAllAsOne();
    declCtx.restore();
    if (imageFilter) {
      this.setImageFilter(imageFilter);
    }
    if (shader) {
      this.setShader(shader);
    }
    if (pathEffect) {
      this.setPathEffect(pathEffect);
    }
    if (colorFilter) {
      this.setColorFilter(colorFilter);
    }
    if (maskFilter) {
      this.setMaskFilter(maskFilter);
    }
  }

  private enum<T>(value: T, key?: Uncapitalize<string>) {
    if (key !== undefined) {
      return value[enumKey(key) as keyof T];
    }
    return undefined;
  }

  private setValue<T extends keyof typeof this>(
    key: T,
    value?: (typeof this)[T]
  ) {
    if (value !== undefined) {
      this[key] = value;
      this.pristine = false;
    }
  }

  setColor(color?: SkColor) {
    this.setValue("_color", color);
  }

  getColor() {
    return this._color;
  }

  setStrokeWidth(strokeWidth?: number) {
    this.setValue("_strokeWidth", strokeWidth);
  }

  getStrokeWidth() {
    return this._strokeWidth;
  }

  setBlendMode(blendMode?: SkEnum<typeof BlendMode>) {
    this.setValue("_blendMode", this.enum(BlendMode, blendMode));
  }

  getBlendMode() {
    return this._blendMode;
  }

  setStyle(style?: SkEnum<typeof PaintStyle>) {
    this.setValue("_style", this.enum(PaintStyle, style));
  }

  getStyle() {
    return this._style;
  }

  setStrokeJoin(strokeJoin?: SkEnum<typeof StrokeJoin>) {
    this.setValue("_strokeJoin", this.enum(StrokeJoin, strokeJoin));
  }

  getStrokeJoin() {
    return this._strokeJoin;
  }

  setStrokeCap(strokeCap?: SkEnum<typeof StrokeCap>) {
    this.setValue("_strokeCap", this.enum(StrokeCap, strokeCap));
  }

  getStrokeCap() {
    return this._strokeCap;
  }

  setStrokeMiter(strokeMiter?: number) {
    this.setValue("_strokeMiter", strokeMiter);
  }

  getStrokeMiter() {
    return this._strokeMiter;
  }

  setOpacity(opacity?: number) {
    this.setValue("_opacity", opacity);
  }

  getOpacity() {
    return this._opacity;
  }

  setAntiAlias(antiAlias?: boolean) {
    this.setValue("_antiAlias", antiAlias);
  }

  getAntiAlias() {
    return this._antiAlias;
  }

  setDither(dither?: boolean) {
    this.setValue("_dither", dither);
  }

  getDither() {
    return this._dither;
  }

  setImageFilter(imageFilter?: SkImageFilter) {
    this.setValue("_imageFilter", imageFilter);
  }

  getImageFilter() {
    return this._imageFilter;
  }

  setShader(shader?: SkShader) {
    this.setValue("_shader", shader);
  }

  getShader() {
    return this._shader;
  }

  setPathEffect(pathEffect?: SkPathEffect) {
    this.setValue("_pathEffect", pathEffect);
  }

  getPathEffect() {
    return this._pathEffect;
  }

  setColorFilter(colorFilter?: SkColorFilter) {
    this.setValue("_colorFilter", colorFilter);
  }

  getColorFilter() {
    return this._colorFilter;
  }

  setMaskFilter(maskFilter?: SkMaskFilter) {
    this.setValue("_maskFilter", maskFilter);
  }

  getMaskFilter() {
    return this._maskFilter;
  }

  isPristine() {
    return this.pristine;
  }

  concatTo(paint: SkPaint) {
    if (this._opacity !== undefined) {
      paint.setAlphaf(paint.getAlphaf() * this._opacity);
    }
    if (this._color !== undefined) {
      const currentOpacity = paint.getAlphaf();
      paint.setShader(null);
      paint.setColor(this._color);
      paint.setAlphaf(currentOpacity * paint.getAlphaf());
    }
    if (this._strokeWidth !== undefined) {
      paint.setStrokeWidth(this._strokeWidth);
    }
    if (this._blendMode !== undefined) {
      paint.setBlendMode(this._blendMode);
    }
    if (this._style !== undefined) {
      paint.setStyle(this._style);
    }
    if (this._strokeJoin !== undefined) {
      paint.setStrokeJoin(this._strokeJoin);
    }
    if (this._strokeCap !== undefined) {
      paint.setStrokeCap(this._strokeCap);
    }
    if (this._strokeMiter !== undefined) {
      paint.setStrokeMiter(this._strokeMiter);
    }
    if (this._antiAlias !== undefined) {
      paint.setAntiAlias(this._antiAlias);
    }
    if (this._dither !== undefined) {
      paint.setDither(this._dither);
    }
    if (this._imageFilter !== undefined) {
      paint.setImageFilter(this._imageFilter);
    }
    if (this._shader !== undefined) {
      paint.setShader(this._shader);
    }
    if (this._pathEffect !== undefined) {
      paint.setPathEffect(this._pathEffect);
    }
    if (this._colorFilter !== undefined) {
      paint.setColorFilter(this._colorFilter);
    }
    if (this._maskFilter !== undefined) {
      paint.setMaskFilter(this._maskFilter);
    }
  }
}
