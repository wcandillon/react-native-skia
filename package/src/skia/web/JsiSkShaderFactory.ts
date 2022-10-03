import type { CanvasKit } from "canvaskit-wasm";

import type {
  BlendMode,
  SkColor,
  SkMatrix,
  SkPoint,
  SkShader,
  TileMode,
} from "../types";
import type { ShaderFactory } from "../types/Shader/ShaderFactory";

import { Host, ckEnum } from "./Host";
import { JsiSkMatrix } from "./JsiSkMatrix";
import { JsiSkPoint } from "./JsiSkPoint";
import { JsiSkShader } from "./JsiSkShader";

export class JsiSkShaderFactory extends Host implements ShaderFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeLinearGradient(
    start: SkPoint,
    end: SkPoint,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeLinearGradient(
        JsiSkPoint.fromValue(start),
        JsiSkPoint.fromValue(end),
        colors,
        pos,
        ckEnum(mode),
        localMatrix === undefined
          ? undefined
          : JsiSkMatrix.fromValue(localMatrix),
        flags
      )
    );
  }

  MakeRadialGradient(
    center: SkPoint,
    radius: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeRadialGradient(
        JsiSkPoint.fromValue(center),
        radius,
        colors,
        pos,
        ckEnum(mode),
        localMatrix === undefined
          ? undefined
          : JsiSkMatrix.fromValue(localMatrix),
        flags
      )
    );
  }

  MakeTwoPointConicalGradient(
    start: SkPoint,
    startRadius: number,
    end: SkPoint,
    endRadius: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix,
    flags?: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeTwoPointConicalGradient(
        JsiSkPoint.fromValue(start),
        startRadius,
        JsiSkPoint.fromValue(end),
        endRadius,
        colors,
        pos,
        ckEnum(mode),
        localMatrix === undefined
          ? undefined
          : JsiSkMatrix.fromValue(localMatrix),
        flags
      )
    );
  }

  MakeSweepGradient(
    cx: number,
    cy: number,
    colors: SkColor[],
    pos: number[] | null,
    mode: TileMode,
    localMatrix?: SkMatrix | null,
    flags?: number,
    startAngleInDegrees?: number,
    endAngleInDegrees?: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeSweepGradient(
        cx,
        cy,
        colors,
        pos,
        ckEnum(mode),
        localMatrix === undefined || localMatrix === null
          ? undefined
          : JsiSkMatrix.fromValue(localMatrix),
        flags,
        startAngleInDegrees,
        endAngleInDegrees
      )
    );
  }

  MakeTurbulence(
    baseFreqX: number,
    baseFreqY: number,
    octaves: number,
    seed: number,
    tileW: number,
    tileH: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeTurbulence(
        baseFreqX,
        baseFreqY,
        octaves,
        seed,
        tileW,
        tileH
      )
    );
  }

  MakeFractalNoise(
    baseFreqX: number,
    baseFreqY: number,
    octaves: number,
    seed: number,
    tileW: number,
    tileH: number
  ) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeFractalNoise(
        baseFreqX,
        baseFreqY,
        octaves,
        seed,
        tileW,
        tileH
      )
    );
  }

  MakeBlend(mode: BlendMode, one: SkShader, two: SkShader) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeBlend(
        ckEnum(mode),
        JsiSkShader.fromValue(one),
        JsiSkShader.fromValue(two)
      )
    );
  }

  MakeColor(color: SkColor) {
    return new JsiSkShader(
      this.CanvasKit,
      this.CanvasKit.Shader.MakeColor(color, this.CanvasKit.ColorSpace.SRGB)
    );
  }
}
