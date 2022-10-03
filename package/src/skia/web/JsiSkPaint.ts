import type { CanvasKit, Paint } from "canvaskit-wasm";

import type {
  StrokeJoin,
  BlendMode,
  SkColor,
  SkColorFilter,
  SkImageFilter,
  SkPaint,
  SkShader,
  StrokeCap,
  PaintStyle,
  SkMaskFilter,
  SkPathEffect,
} from "../types";

import { HostObject, ckEnum } from "./Host";
import { JsiSkColorFilter } from "./JsiSkColorFilter";
import { JsiSkImageFilter } from "./JsiSkImageFilter";
import { JsiSkMaskFilter } from "./JsiSkMaskFilter";
import { JsiSkPathEffect } from "./JsiSkPathEffect";
import { JsiSkShader } from "./JsiSkShader";

export class JsiSkPaint extends HostObject<Paint, "Paint"> implements SkPaint {
  constructor(CanvasKit: CanvasKit, ref: Paint) {
    super(CanvasKit, ref, "Paint");
  }

  copy() {
    return new JsiSkPaint(this.CanvasKit, this.ref.copy());
  }

  reset() {
    this.ref = new this.CanvasKit.Paint();
  }

  getColor() {
    return this.ref.getColor();
  }

  getStrokeCap() {
    return this.ref.getStrokeCap().value;
  }

  getStrokeJoin() {
    return this.ref.getStrokeJoin().value;
  }

  getStrokeMiter() {
    return this.ref.getStrokeMiter();
  }

  getStrokeWidth() {
    return this.ref.getStrokeWidth();
  }

  setAlphaf(alpha: number) {
    this.ref.setAlphaf(alpha);
  }

  setAntiAlias(aa: boolean) {
    this.ref.setAntiAlias(aa);
  }

  setBlendMode(blendMode: BlendMode) {
    this.ref.setBlendMode(ckEnum(blendMode));
  }

  setColor(color: SkColor) {
    this.ref.setColor(color);
  }

  setColorFilter(filter: SkColorFilter | null) {
    this.ref.setColorFilter(filter ? JsiSkColorFilter.fromValue(filter) : null);
  }

  setImageFilter(filter: SkImageFilter | null) {
    this.ref.setImageFilter(filter ? JsiSkImageFilter.fromValue(filter) : null);
  }

  setMaskFilter(filter: SkMaskFilter | null) {
    this.ref.setMaskFilter(filter ? JsiSkMaskFilter.fromValue(filter) : null);
  }

  setPathEffect(effect: SkPathEffect | null) {
    this.ref.setPathEffect(effect ? JsiSkPathEffect.fromValue(effect) : null);
  }

  setShader(shader: SkShader | null) {
    this.ref.setShader(shader ? JsiSkShader.fromValue(shader) : null);
  }

  setStrokeCap(cap: StrokeCap) {
    this.ref.setStrokeCap(ckEnum(cap));
  }

  setStrokeJoin(join: StrokeJoin) {
    this.ref.setStrokeJoin(ckEnum(join));
  }

  setStrokeMiter(limit: number) {
    this.ref.setStrokeMiter(limit);
  }

  setStrokeWidth(width: number) {
    this.ref.setStrokeWidth(width);
  }

  setStyle(style: PaintStyle) {
    this.ref.setStyle({ value: style });
  }
}
