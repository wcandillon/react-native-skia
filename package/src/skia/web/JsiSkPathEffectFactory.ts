import type { CanvasKit } from "canvaskit-wasm";

import type {
  Path1DEffectStyle,
  PathEffectFactory,
  SkMatrix,
  SkPath,
  SkPathEffect,
} from "../types";

import { ckEnum, Host, NotImplementedOnRNWeb } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkPath } from "./JsiSkPath";
import { JsiSkPathEffect } from "./JsiSkPathEffect";

export class JsiSkPathEffectFactory extends Host implements PathEffectFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeCorner(radius: number) {
    const pe = this.CanvasKit.PathEffect.MakeCorner(radius);
    if (pe === null) {
      return null;
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakeDash(intervals: number[], phase?: number) {
    const pe = this.CanvasKit.PathEffect.MakeDash(intervals, phase);
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakeDiscrete(segLength: number, dev: number, seedAssist: number) {
    const pe = this.CanvasKit.PathEffect.MakeDiscrete(
      segLength,
      dev,
      seedAssist
    );
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakeCompose(_outer: SkPathEffect, _inner: SkPathEffect): SkPathEffect {
    throw new NotImplementedOnRNWeb();
  }

  MakeSum(_outer: SkPathEffect, _inner: SkPathEffect): SkPathEffect {
    throw new NotImplementedOnRNWeb();
  }

  MakeLine2D(width: number, matrix: SkMatrix) {
    const pe = this.CanvasKit.PathEffect.MakeLine2D(
      width,
      JsiSkMatrix.fromValue(matrix)
    );
    if (pe === null) {
      return null;
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakePath1D(
    path: SkPath,
    advance: number,
    phase: number,
    style: Path1DEffectStyle
  ) {
    const pe = this.CanvasKit.PathEffect.MakePath1D(
      JsiSkPath.fromValue(path),
      advance,
      phase,
      ckEnum(style)
    );
    if (pe === null) {
      return null;
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakePath2D(matrix: SkMatrix, path: SkPath) {
    const pe = this.CanvasKit.PathEffect.MakePath2D(
      JsiSkMatrix.fromValue(matrix),
      JsiSkPath.fromValue(path)
    );
    if (pe === null) {
      return null;
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }
}
