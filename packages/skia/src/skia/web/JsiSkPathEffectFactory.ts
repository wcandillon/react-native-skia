import type { CanvasKit } from "canvaskit-wasm";

import type {
  Path1DEffectStyle,
  PathEffectFactory,
  SkMatrix,
  SkPath,
  SkPathEffect,
} from "../types";
import { SkiaValidationError } from "../types/Errors";

import { getEnum, Host, throwNotImplementedOnRNWeb } from "./Host";
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
    if (pe === null) {
      throw new SkiaValidationError(
        "MakeDash: the intervals must be an even count of non-negative numbers whose sum is positive"
      );
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakeDiscrete(segLength: number, dev: number, seedAssist: number) {
    const pe = this.CanvasKit.PathEffect.MakeDiscrete(
      segLength,
      dev,
      seedAssist
    );
    if (pe === null) {
      throw new SkiaValidationError("MakeDiscrete: segLength must be positive");
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakeCompose(_outer: SkPathEffect, _inner: SkPathEffect) {
    return throwNotImplementedOnRNWeb<SkPathEffect>();
  }

  MakeSum(_outer: SkPathEffect, _inner: SkPathEffect) {
    return throwNotImplementedOnRNWeb<SkPathEffect>();
  }

  MakeLine2D(width: number, matrix: SkMatrix) {
    const pe = this.CanvasKit.PathEffect.MakeLine2D(
      width,
      JsiSkMatrix.fromValue(matrix)
    );
    if (pe === null) {
      throw new SkiaValidationError(
        "MakeLine2D: the width must be 0 or more and the matrix invertible"
      );
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakePath1D(
    path: SkPath,
    advance: number,
    phase: number,
    style: Path1DEffectStyle
  ) {
    const p = JsiSkPath.pathFromValue(path);
    const pe = this.CanvasKit.PathEffect.MakePath1D(
      p,
      advance,
      phase,
      getEnum(this.CanvasKit, "Path1DEffect", style)
    );
    p.delete();
    if (pe === null) {
      throw new SkiaValidationError(
        "MakePath1D: the advance must be positive and the path not empty"
      );
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }

  MakePath2D(matrix: SkMatrix, path: SkPath) {
    const p = JsiSkPath.pathFromValue(path);
    const pe = this.CanvasKit.PathEffect.MakePath2D(
      JsiSkMatrix.fromValue(matrix),
      p
    );
    p.delete();
    if (pe === null) {
      throw new SkiaValidationError(
        "MakePath2D: the matrix must be invertible"
      );
    }
    return new JsiSkPathEffect(this.CanvasKit, pe);
  }
}
