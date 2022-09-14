import {
  processUniforms,
  FilterMode,
  MipmapMode,
  TileMode,
} from "../../../skia/types";
import type { SkShader } from "../../../skia/types";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";
import type {
  ColorProps,
  FractalNoiseProps,
  ImageShaderProps,
  LinearGradientProps,
  RadialGradientProps,
  ShaderProps,
  SweepGradientProps,
  TurbulenceProps,
  TwoPointConicalGradientProps,
} from "../../types";
import { DeclarationType, NodeType } from "../../types";
import { processColor } from "../datatypes/Color";
import {
  enumKey,
  fitRects,
  getRect,
  processGradientProps,
  processTransformProps,
  rect2rect,
} from "../datatypes";

export abstract class ShaderDeclaration<P> extends JsiDeclarationNode<
  P,
  SkShader
> {
  constructor(ctx: NodeContext, type: NodeType, props: P) {
    super(ctx, DeclarationType.Shader, type, props);
  }
}

export class ShaderNode extends ShaderDeclaration<ShaderProps> {
  constructor(ctx: NodeContext, props: ShaderProps) {
    super(ctx, NodeType.Shader, props);
  }

  materialize() {
    const { source, uniforms, ...transform } = this.props;
    const m3 = this.Skia.Matrix();
    processTransformProps(m3, transform);
    return source.makeShaderWithChildren(
      processUniforms(source, uniforms),
      this.children()
        .filter(
          (child): child is JsiDeclarationNode<unknown, SkShader> =>
            child instanceof JsiDeclarationNode && child.isShader()
        )
        .map((child) => child.materialize()),
      m3
    );
  }
}

export class ImageShaderNode extends ShaderDeclaration<ImageShaderProps> {
  constructor(ctx: NodeContext, props: ImageShaderProps) {
    super(ctx, NodeType.ImageShader, props);
  }

  materialize() {
    const { fit, image, tx, ty, fm, mm, ...imageShaderProps } = this.props;
    const rct = getRect(this.Skia, imageShaderProps);
    if (rct) {
      const rects = fitRects(
        fit,
        { x: 0, y: 0, width: image.width(), height: image.height() },
        rct
      );
      const m3 = rect2rect(rects.src, rects.dst);
      imageShaderProps.transform = [
        ...(imageShaderProps.transform ?? []),
        ...m3,
      ];
    }
    const lm = this.Skia.Matrix();
    processTransformProps(lm, imageShaderProps);
    return image.makeShaderOptions(
      TileMode[enumKey(tx)],
      TileMode[enumKey(ty)],
      FilterMode[enumKey(fm)],
      MipmapMode[enumKey(mm)],
      lm
    );
  }
}

export class ColorNode extends ShaderDeclaration<ColorProps> {
  constructor(ctx: NodeContext, props: ColorProps) {
    super(ctx, NodeType.ColorShader, props);
  }

  materialize() {
    const { color } = this.props;
    return this.Skia.Shader.MakeColor(processColor(this.Skia, color, 1));
  }
}

export class TurbulenceNode extends ShaderDeclaration<TurbulenceProps> {
  constructor(ctx: NodeContext, props: TurbulenceProps) {
    super(ctx, NodeType.Turbulence, props);
  }

  materialize() {
    const { freqX, freqY, octaves, seed, tileWidth, tileHeight } = this.props;
    return this.Skia.Shader.MakeTurbulence(
      freqX,
      freqY,
      octaves,
      seed,
      tileWidth,
      tileHeight
    );
  }
}

export class FractalNoiseNode extends ShaderDeclaration<FractalNoiseProps> {
  constructor(ctx: NodeContext, props: FractalNoiseProps) {
    super(ctx, NodeType.FractalNoise, props);
  }

  materialize() {
    const { freqX, freqY, octaves, seed, tileWidth, tileHeight } = this.props;
    return this.Skia.Shader.MakeFractalNoise(
      freqX,
      freqY,
      octaves,
      seed,
      tileWidth,
      tileHeight
    );
  }
}

export class LinearGradientNode extends ShaderDeclaration<LinearGradientProps> {
  constructor(ctx: NodeContext, props: LinearGradientProps) {
    super(ctx, NodeType.LinearGradient, props);
  }

  materialize() {
    const { start, end } = this.props;
    const { colors, positions, mode, localMatrix, flags } =
      processGradientProps(this.Skia, this.props);
    return this.Skia.Shader.MakeLinearGradient(
      start,
      end,
      colors,
      positions ?? null,
      mode,
      localMatrix,
      flags
    );
  }
}

export class RadialGradientNode extends ShaderDeclaration<RadialGradientProps> {
  constructor(ctx: NodeContext, props: RadialGradientProps) {
    super(ctx, NodeType.RadialGradient, props);
  }

  materialize() {
    const { c, r } = this.props;
    const { colors, positions, mode, localMatrix, flags } =
      processGradientProps(this.Skia, this.props);
    return this.Skia.Shader.MakeRadialGradient(
      c,
      r,
      colors,
      positions,
      mode,
      localMatrix,
      flags
    );
  }
}

export class SweepGradientNode extends ShaderDeclaration<SweepGradientProps> {
  constructor(ctx: NodeContext, props: SweepGradientProps) {
    super(ctx, NodeType.SweepGradient, props);
  }

  materialize() {
    const { c, start, end } = this.props;
    const { colors, positions, mode, localMatrix, flags } =
      processGradientProps(this.Skia, this.props);
    return this.Skia.Shader.MakeSweepGradient(
      c.x,
      c.y,
      colors,
      positions,
      mode,
      localMatrix,
      flags,
      start,
      end
    );
  }
}

export class TwoPointConicalGradientNode extends ShaderDeclaration<TwoPointConicalGradientProps> {
  constructor(ctx: NodeContext, props: TwoPointConicalGradientProps) {
    super(ctx, NodeType.TwoPointConicalGradient, props);
  }

  materialize() {
    const { startR, endR, start, end } = this.props;
    const { colors, positions, mode, localMatrix, flags } =
      processGradientProps(this.Skia, this.props);
    return this.Skia.Shader.MakeTwoPointConicalGradient(
      start,
      startR,
      end,
      endR,
      colors,
      positions,
      mode,
      localMatrix,
      flags
    );
  }
}
