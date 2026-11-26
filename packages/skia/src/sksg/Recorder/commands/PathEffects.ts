import { enumKey, processPath } from "../../../dom/nodes";
import { NodeType } from "../../../dom/types";
import type {
  CornerPathEffectProps,
  DashPathEffectProps,
  DiscretePathEffectProps,
  Line2DPathEffectProps,
  Path1DPathEffectProps,
  Path2DPathEffectProps,
} from "../../../dom/types";
import { Path1DEffectStyle } from "../../../skia/types";
import { composeDeclarations } from "../../utils";
import type { Command } from "../Core";
import { CommandType } from "../Core";
import type { DrawingContext } from "../DrawingContext";

const declareDiscretePathEffect = (
  ctx: DrawingContext,
  props: DiscretePathEffectProps
) => {
  "worklet";
  const { length, deviation, seed } = props;
  const pe = ctx.Skia.PathEffect.MakeDiscrete(length, deviation, seed);
  ctx.pathEffects.push(pe);
};

const declarePath2DPathEffect = (
  ctx: DrawingContext,
  props: Path2DPathEffectProps
) => {
  "worklet";
  const { matrix } = props;
  const path = processPath(ctx.Skia, props.path);
  const pe = ctx.Skia.PathEffect.MakePath2D(matrix, path);
  ctx.pathEffects.push(pe);
};

const declareDashPathEffect = (
  ctx: DrawingContext,
  props: DashPathEffectProps
) => {
  "worklet";
  const { intervals, phase } = props;
  const pe = ctx.Skia.PathEffect.MakeDash(intervals, phase);
  ctx.pathEffects.push(pe);
};

const declareCornerPathEffect = (
  ctx: DrawingContext,
  props: CornerPathEffectProps
) => {
  "worklet";
  const { r } = props;
  const pe = ctx.Skia.PathEffect.MakeCorner(r);
  // A radius of zero or less has no effect: nothing to push.
  if (pe !== null) {
    ctx.pathEffects.push(pe);
  }
};

const declareSumPathEffect = (ctx: DrawingContext) => {
  "worklet";
  // Note: decorateChildren functionality needs to be handled differently
  const pes = ctx.pathEffects.splice(0, ctx.pathEffects.length);
  const pe = composeDeclarations(
    pes,
    ctx.Skia.PathEffect.MakeSum.bind(ctx.Skia.PathEffect)
  );
  ctx.pathEffects.push(pe);
};

const declareLine2DPathEffect = (
  ctx: DrawingContext,
  props: Line2DPathEffectProps
) => {
  "worklet";
  const { width, matrix } = props;
  const pe = ctx.Skia.PathEffect.MakeLine2D(width, matrix);
  ctx.pathEffects.push(pe);
};

const declarePath1DPathEffect = (
  ctx: DrawingContext,
  props: Path1DPathEffectProps
) => {
  "worklet";
  const { advance, phase, style } = props;
  const path = processPath(ctx.Skia, props.path);
  const pe = ctx.Skia.PathEffect.MakePath1D(
    path,
    advance,
    phase,
    Path1DEffectStyle[enumKey(style)]
  );
  ctx.pathEffects.push(pe);
};

export const isPushPathEffect = (
  command: Command
): command is Command<CommandType.PushPathEffect> => {
  "worklet";
  return command.type === CommandType.PushPathEffect;
};

type Props = {
  [NodeType.DiscretePathEffect]: DiscretePathEffectProps;
  [NodeType.DashPathEffect]: DashPathEffectProps;
  [NodeType.Path1DPathEffect]: Path1DPathEffectProps;
  [NodeType.Path2DPathEffect]: Path2DPathEffectProps;
  [NodeType.CornerPathEffect]: CornerPathEffectProps;
  [NodeType.SumPathEffect]: Record<string, never>;
  [NodeType.Line2DPathEffect]: Line2DPathEffectProps;
};

interface PushPathEffect<
  T extends keyof Props,
> extends Command<CommandType.PushPathEffect> {
  pathEffectType: T;
  props: Props[T];
}

const isPathEffect = <T extends keyof Props>(
  command: Command<CommandType.PushPathEffect>,
  type: T
): command is PushPathEffect<T> => {
  "worklet";
  return command.pathEffectType === type;
};

export const composePathEffects = (ctx: DrawingContext) => {
  "worklet";
  if (ctx.pathEffects.length > 1) {
    const outer = ctx.pathEffects.pop()!;
    const inner = ctx.pathEffects.pop()!;
    ctx.pathEffects.push(ctx.Skia.PathEffect.MakeCompose(outer, inner));
  }
};

export const pushPathEffect = (
  ctx: DrawingContext,
  command: Command<CommandType.PushPathEffect>
) => {
  "worklet";
  if (isPathEffect(command, NodeType.DiscretePathEffect)) {
    declareDiscretePathEffect(ctx, command.props);
  } else if (isPathEffect(command, NodeType.DashPathEffect)) {
    declareDashPathEffect(ctx, command.props);
  } else if (isPathEffect(command, NodeType.Path1DPathEffect)) {
    declarePath1DPathEffect(ctx, command.props);
  } else if (isPathEffect(command, NodeType.Path2DPathEffect)) {
    declarePath2DPathEffect(ctx, command.props);
  } else if (isPathEffect(command, NodeType.CornerPathEffect)) {
    declareCornerPathEffect(ctx, command.props);
  } else if (isPathEffect(command, NodeType.SumPathEffect)) {
    declareSumPathEffect(ctx);
  } else if (isPathEffect(command, NodeType.Line2DPathEffect)) {
    declareLine2DPathEffect(ctx, command.props);
  } else {
    throw new Error("Invalid image filter type: " + command.imageFilterType);
  }
};
