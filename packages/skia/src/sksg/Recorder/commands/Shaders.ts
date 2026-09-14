import {
  enumKey,
  fitRects,
  getRect,
  processColor,
  processGradientProps,
  processTransformProps,
  rect2rect,
} from "../../../dom/nodes";
import { NodeType } from "../../../dom/types";
import type {
  BlendProps,
  ColorProps,
  FractalNoiseProps,
  ImageShaderProps,
  LinearGradientProps,
  RadialGradientProps,
  ShaderProps,
  SweepGradientProps,
  TurbulenceProps,
  TwoPointConicalGradientProps,
} from "../../../dom/types";
import type { SkShader } from "../../../skia/types";
import {
  BlendMode,
  FilterMode,
  isCubicSampling,
  MipmapMode,
  processUniforms,
  TileMode,
} from "../../../skia/types";
import { composeDeclarations } from "../../utils";
import type { Command } from "../Core";
import { CommandType } from "../Core";
import type { DrawingContext } from "../DrawingContext";

const declareShader = (
  ctx: DrawingContext,
  props: ShaderProps,
  children: number
) => {
  "worklet";
  const { source, uniforms, ...transform } = props;
  const m3 = ctx.Skia.Matrix();
  processTransformProps(m3, transform);
  const shader = ctx.track(
    source.makeShaderWithChildren(
      processUniforms(source, uniforms),
      ctx.shaders.splice(0, children),
      m3
    )
  );
  ctx.shaders.push(shader);
};

const declareColorShader = (ctx: DrawingContext, props: ColorProps) => {
  "worklet";
  const { color } = props;
  const shader = ctx.Skia.Shader.MakeColor(processColor(ctx.Skia, color));
  ctx.shaders.push(shader);
};

const declareFractalNoiseShader = (
  ctx: DrawingContext,
  props: FractalNoiseProps
) => {
  "worklet";
  const { freqX, freqY, octaves, seed, tileWidth, tileHeight } = props;
  const shader = ctx.Skia.Shader.MakeFractalNoise(
    freqX,
    freqY,
    octaves,
    seed,
    tileWidth,
    tileHeight
  );
  ctx.shaders.push(shader);
};

const declareTwoPointConicalGradientShader = (
  ctx: DrawingContext,
  props: TwoPointConicalGradientProps
) => {
  "worklet";
  const { startR, endR, start, end } = props;
  const { colors, positions, mode, localMatrix, flags } = processGradientProps(
    ctx.Skia,
    props
  );
  const shader = ctx.Skia.Shader.MakeTwoPointConicalGradient(
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
  ctx.shaders.push(shader);
};

const declareRadialGradientShader = (
  ctx: DrawingContext,
  props: RadialGradientProps
) => {
  "worklet";
  const { c, r } = props;
  const { colors, positions, mode, localMatrix, flags } = processGradientProps(
    ctx.Skia,
    props
  );
  const shader = ctx.Skia.Shader.MakeRadialGradient(
    c,
    r,
    colors,
    positions,
    mode,
    localMatrix,
    flags
  );
  ctx.shaders.push(shader);
};

const declareSweepGradientShader = (
  ctx: DrawingContext,
  props: SweepGradientProps
) => {
  "worklet";
  const { c, start, end } = props;
  const { colors, positions, mode, localMatrix, flags } = processGradientProps(
    ctx.Skia,
    props
  );
  const shader = ctx.Skia.Shader.MakeSweepGradient(
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
  ctx.shaders.push(shader);
};

const declareLinearGradientShader = (
  ctx: DrawingContext,
  props: LinearGradientProps
) => {
  "worklet";
  const { start, end } = props;
  const { colors, positions, mode, localMatrix, flags } = processGradientProps(
    ctx.Skia,
    props
  );
  const shader = ctx.Skia.Shader.MakeLinearGradient(
    start,
    end,
    colors,
    positions ?? null,
    mode,
    localMatrix,
    flags
  );
  ctx.shaders.push(shader);
};

const declareTurbulenceShader = (
  ctx: DrawingContext,
  props: TurbulenceProps
) => {
  "worklet";
  const { freqX, freqY, octaves, seed, tileWidth, tileHeight } = props;
  const shader = ctx.Skia.Shader.MakeTurbulence(
    freqX,
    freqY,
    octaves,
    seed,
    tileWidth,
    tileHeight
  );
  ctx.shaders.push(shader);
};

const declareImageShader = (ctx: DrawingContext, props: ImageShaderProps) => {
  "worklet";
  const { fit, image, tx, ty, sampling, ...imageShaderProps } = props;
  if (!image) {
    return;
  }

  const rct = getRect(ctx.Skia, imageShaderProps);
  const m3 = ctx.Skia.Matrix();
  if (rct) {
    const rects = fitRects(
      fit,
      { x: 0, y: 0, width: image.width(), height: image.height() },
      rct
    );
    const [x, y, sx, sy] = rect2rect(rects.src, rects.dst);
    m3.translate(x.translateX, y.translateY);
    m3.scale(sx.scaleX, sy.scaleY);
  }
  const lm = ctx.Skia.Matrix();
  lm.concat(m3);
  processTransformProps(lm, imageShaderProps);
  let shader: SkShader;
  if (sampling && isCubicSampling(sampling)) {
    shader = ctx.track(
      image.makeShaderCubic(
        TileMode[enumKey(tx)],
        TileMode[enumKey(ty)],
        sampling.B,
        sampling.C,
        lm
      )
    );
  } else {
    shader = ctx.track(
      image.makeShaderOptions(
        TileMode[enumKey(tx)],
        TileMode[enumKey(ty)],
        sampling?.filter ?? FilterMode.Linear,
        sampling?.mipmap ?? MipmapMode.None,
        lm
      )
    );
  }
  ctx.shaders.push(shader);
};

const declareBlend = (ctx: DrawingContext, props: BlendProps) => {
  "worklet";
  const blend = BlendMode[enumKey(props.mode as BlendProps["mode"])];
  const shaders = ctx.shaders.splice(0, ctx.shaders.length);
  if (shaders.length > 0) {
    const composer = ctx.Skia.Shader.MakeBlend.bind(ctx.Skia.Shader, blend);
    ctx.shaders.push(composeDeclarations(shaders, composer));
  }
};

export const isPushShader = (
  command: Command
): command is Command<CommandType.PushShader> => {
  "worklet";
  return command.type === CommandType.PushShader;
};

type Props = {
  [NodeType.Shader]: ShaderProps;
  [NodeType.ImageShader]: ImageShaderProps;
  [NodeType.ColorShader]: ColorProps;
  [NodeType.Turbulence]: TurbulenceProps;
  [NodeType.FractalNoise]: FractalNoiseProps;
  [NodeType.LinearGradient]: LinearGradientProps;
  [NodeType.RadialGradient]: RadialGradientProps;
  [NodeType.SweepGradient]: SweepGradientProps;
  [NodeType.TwoPointConicalGradient]: TwoPointConicalGradientProps;
  [NodeType.Blend]: BlendProps;
};

interface PushShader<
  T extends keyof Props,
> extends Command<CommandType.PushShader> {
  shaderType: T;
  props: Props[T];
  children: number;
}

const isShader = <T extends keyof Props>(
  command: Command<CommandType.PushShader>,
  type: T
): command is PushShader<T> => {
  "worklet";
  return command.shaderType === type;
};

export const pushShader = (
  ctx: DrawingContext,
  command: Command<CommandType.PushShader>
) => {
  "worklet";
  if (isShader(command, NodeType.Shader)) {
    declareShader(ctx, command.props, command.children);
  } else if (isShader(command, NodeType.ImageShader)) {
    declareImageShader(ctx, command.props);
  } else if (isShader(command, NodeType.ColorShader)) {
    declareColorShader(ctx, command.props);
  } else if (isShader(command, NodeType.Turbulence)) {
    declareTurbulenceShader(ctx, command.props);
  } else if (isShader(command, NodeType.FractalNoise)) {
    declareFractalNoiseShader(ctx, command.props);
  } else if (isShader(command, NodeType.LinearGradient)) {
    declareLinearGradientShader(ctx, command.props);
  } else if (isShader(command, NodeType.RadialGradient)) {
    declareRadialGradientShader(ctx, command.props);
  } else if (isShader(command, NodeType.SweepGradient)) {
    declareSweepGradientShader(ctx, command.props);
  } else if (isShader(command, NodeType.TwoPointConicalGradient)) {
    declareTwoPointConicalGradientShader(ctx, command.props);
  } else if (isShader(command, NodeType.Blend)) {
    declareBlend(ctx, command.props);
  } else {
    throw new Error(`Unknown shader type: ${command.shaderType}`);
  }
};
