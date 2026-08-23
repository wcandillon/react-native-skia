import { enumKey, processColor, processRadius } from "../../../dom/nodes";
import type {
  BlendImageFilterProps,
  BlurImageFilterProps,
  BlurMaskFilterProps,
  DisplacementMapImageFilterProps,
  DropShadowImageFilterProps,
  ImageFilterProps,
  MorphologyImageFilterProps,
  OffsetImageFilterProps,
  RuntimeShaderImageFilterProps,
} from "../../../dom/types";
import { NodeType } from "../../../dom/types";
import type { SkColor, SkImageFilter, Skia } from "../../../skia/types";
import {
  BlendMode,
  BlurStyle,
  ColorChannel,
  processUniforms,
  TileMode,
} from "../../../skia/types";
import { composeDeclarations } from "../../utils";
import type { Command } from "../Core";
import { CommandType } from "../Core";
import type { DrawingContext } from "../DrawingContext";

export enum MorphologyOperator {
  Erode,
  Dilate,
}

const Black = Float32Array.of(0, 0, 0, 1);

// Turns the source graphic into a hard silhouette: alpha is multiplied by 255
// and clamped, so any pixel the shape covers at all becomes fully opaque, and
// the colour channels are dropped. 255 is the saturation point of an 8-bit
// alpha channel, so one unit of coverage is enough to reach 1.
const AlphaSaturate = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0,
];

const MakeInnerShadow = (
  Skia: Skia,
  shadowOnly: boolean | undefined,
  dx: number,
  dy: number,
  sigmaX: number,
  sigmaY: number,
  color: SkColor,
  input: SkImageFilter | null
) => {
  "worklet";
  const sourceGraphic = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(Black, BlendMode.Dst),
    null
  );
  const sourceAlpha = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(Black, BlendMode.SrcIn),
    null
  );
  // The shadow is generated outside the shape and then clipped back into it, so
  // "outside" has to be the complement of the shape's silhouette. Taking SrcOut
  // against the source graphic itself makes it the complement of the source's
  // *alpha*: inside a translucent shape 1 - alpha is non-zero, so the shadow is
  // generated across the whole interior and tints it, no matter how small the
  // blur and the offset are (issue #2990). Saturating alpha first keeps the
  // shadow tied to the shape's outline instead of to its opacity.
  const coverage = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeMatrix(AlphaSaturate),
    null
  );
  const f1 = Skia.ImageFilter.MakeColorFilter(
    Skia.ColorFilter.MakeBlend(color, BlendMode.SrcOut),
    coverage
  );
  const f2 = Skia.ImageFilter.MakeOffset(dx, dy, f1);
  const f3 = Skia.ImageFilter.MakeBlur(sigmaX, sigmaY, TileMode.Decal, f2);
  const f4 = Skia.ImageFilter.MakeBlend(BlendMode.SrcIn, sourceAlpha, f3);
  if (shadowOnly) {
    return f4;
  }
  return Skia.ImageFilter.MakeCompose(
    input,
    Skia.ImageFilter.MakeBlend(BlendMode.SrcOver, sourceGraphic, f4)
  );
};

const declareBlurImageFilter = (
  ctx: DrawingContext,
  props: BlurImageFilterProps
) => {
  "worklet";
  const { mode, blur } = props;
  const sigma = processRadius(ctx.Skia, blur);
  const imgf = ctx.Skia.ImageFilter.MakeBlur(
    sigma.x,
    sigma.y,
    TileMode[enumKey(mode)],
    null
  );
  ctx.imageFilters.push(imgf);
};

const declareMorphologyImageFilter = (
  ctx: DrawingContext,
  props: MorphologyImageFilterProps
) => {
  "worklet";
  const { operator } = props;
  const r = processRadius(ctx.Skia, props.radius);
  let imgf;
  if (MorphologyOperator[enumKey(operator)] === MorphologyOperator.Erode) {
    imgf = ctx.Skia.ImageFilter.MakeErode(r.x, r.y, null);
  } else {
    imgf = ctx.Skia.ImageFilter.MakeDilate(r.x, r.y, null);
  }
  ctx.imageFilters.push(imgf);
};

const declareOffsetImageFilter = (
  ctx: DrawingContext,
  props: OffsetImageFilterProps
) => {
  "worklet";
  const { x, y } = props;
  const imgf = ctx.Skia.ImageFilter.MakeOffset(x, y, null);
  ctx.imageFilters.push(imgf);
};

const declareDropShadowImageFilter = (
  ctx: DrawingContext,
  props: DropShadowImageFilterProps
) => {
  "worklet";
  const { dx, dy, blur, shadowOnly, color: cl, inner } = props;
  const color = processColor(ctx.Skia, cl);
  let factory;
  if (inner) {
    factory = MakeInnerShadow.bind(null, ctx.Skia, shadowOnly);
  } else {
    factory = shadowOnly
      ? ctx.Skia.ImageFilter.MakeDropShadowOnly.bind(ctx.Skia.ImageFilter)
      : ctx.Skia.ImageFilter.MakeDropShadow.bind(ctx.Skia.ImageFilter);
  }
  const imgf = factory(dx, dy, blur, blur, color, null);
  ctx.imageFilters.push(imgf);
};

const declareBlendImageFilter = (
  ctx: DrawingContext,
  props: BlendImageFilterProps
) => {
  "worklet";
  const blend = BlendMode[enumKey(props.mode)];
  // Blend ImageFilters
  const imageFilters = ctx.imageFilters.splice(0, ctx.imageFilters.length);
  const composer = ctx.Skia.ImageFilter.MakeBlend.bind(
    ctx.Skia.ImageFilter,
    blend
  );
  ctx.imageFilters.push(composeDeclarations(imageFilters, composer));
};

const declareDisplacementMapImageFilter = (
  ctx: DrawingContext,
  props: DisplacementMapImageFilterProps
) => {
  "worklet";
  const { channelX, channelY, scale } = props;
  const shader = ctx.shaders.pop();
  if (!shader) {
    throw new Error("DisplacementMap expects a shader as child");
  }
  const map = ctx.Skia.ImageFilter.MakeShader(shader);
  const imgf = ctx.Skia.ImageFilter.MakeDisplacementMap(
    ColorChannel[enumKey(channelX)],
    ColorChannel[enumKey(channelY)],
    scale,
    map,
    null
  );
  ctx.imageFilters.push(imgf);
};

const declareRuntimeShaderImageFilter = (
  ctx: DrawingContext,
  props: RuntimeShaderImageFilterProps
) => {
  "worklet";
  const { source, uniforms } = props;
  const rtb = ctx.Skia.RuntimeShaderBuilder(source);
  if (uniforms) {
    processUniforms(source, uniforms, rtb);
  }
  const imgf = ctx.Skia.ImageFilter.MakeRuntimeShader(rtb, null, null);
  ctx.imageFilters.push(imgf);
};

const declareImageFilter = (ctx: DrawingContext, props: ImageFilterProps) => {
  "worklet";
  const { filter } = props;
  ctx.imageFilters.push(filter);
};

export const composeImageFilters = (ctx: DrawingContext) => {
  "worklet";
  if (ctx.imageFilters.length > 1) {
    const outer = ctx.imageFilters.pop()!;
    const inner = ctx.imageFilters.pop()!;
    ctx.imageFilters.push(ctx.Skia.ImageFilter.MakeCompose(outer, inner));
  }
};

export const setBlurMaskFilter = (
  ctx: DrawingContext,
  props: BlurMaskFilterProps
) => {
  "worklet";
  const { blur, style, respectCTM } = props;
  const mf = ctx.Skia.MaskFilter.MakeBlur(
    BlurStyle[enumKey(style)],
    blur,
    respectCTM
  );
  ctx.paint.setMaskFilter(mf);
};

export const isPushImageFilter = (
  command: Command
): command is Command<CommandType.PushImageFilter> => {
  "worklet";
  return command.type === CommandType.PushImageFilter;
};

type Props = {
  [NodeType.ImageFilter]: ImageFilterProps;
  [NodeType.OffsetImageFilter]: OffsetImageFilterProps;
  [NodeType.DisplacementMapImageFilter]: DisplacementMapImageFilterProps;
  [NodeType.BlurImageFilter]: BlurImageFilterProps;
  [NodeType.DropShadowImageFilter]: DropShadowImageFilterProps;
  [NodeType.MorphologyImageFilter]: MorphologyImageFilterProps;
  [NodeType.BlendImageFilter]: BlendImageFilterProps;
  [NodeType.RuntimeShaderImageFilter]: RuntimeShaderImageFilterProps;
};

interface PushImageFilter<
  T extends keyof Props,
> extends Command<CommandType.PushImageFilter> {
  imageFilterType: T;
  props: Props[T];
}

const isImageFilter = <T extends keyof Props>(
  command: Command<CommandType.PushImageFilter>,
  type: T
): command is PushImageFilter<T> => {
  "worklet";
  return command.imageFilterType === type;
};

export const pushImageFilter = (
  ctx: DrawingContext,
  command: Command<CommandType.PushImageFilter>
) => {
  "worklet";
  if (isImageFilter(command, NodeType.ImageFilter)) {
    declareImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.BlurImageFilter)) {
    declareBlurImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.MorphologyImageFilter)) {
    declareMorphologyImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.BlendImageFilter)) {
    declareBlendImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.DisplacementMapImageFilter)) {
    declareDisplacementMapImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.DropShadowImageFilter)) {
    declareDropShadowImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.OffsetImageFilter)) {
    declareOffsetImageFilter(ctx, command.props);
  } else if (isImageFilter(command, NodeType.RuntimeShaderImageFilter)) {
    declareRuntimeShaderImageFilter(ctx, command.props);
  } else {
    throw new Error("Invalid image filter type: " + command.imageFilterType);
  }
};
