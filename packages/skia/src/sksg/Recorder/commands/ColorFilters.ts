import { enumKey, processColor } from "../../../dom/nodes";
import type {
  BlendColorFilterProps,
  LerpColorFilterProps,
  MatrixColorFilterProps,
} from "../../../dom/types";
import { NodeType } from "../../../dom/types";
import type { SkColorFilter } from "../../../skia/types";
import { BlendMode } from "../../../skia/types";
import { CommandType } from "../Core";
import type { Command } from "../Core";
import type { DrawingContext } from "../DrawingContext";

export const isPushColorFilter = (
  command: Command
): command is Command<CommandType.PushColorFilter> => {
  "worklet";
  return command.type === CommandType.PushColorFilter;
};

type Props = {
  [NodeType.BlendColorFilter]: BlendColorFilterProps;
  [NodeType.MatrixColorFilter]: MatrixColorFilterProps;
  [NodeType.LerpColorFilter]: LerpColorFilterProps;
  [NodeType.LumaColorFilter]: Record<string, never>;
  [NodeType.LinearToSRGBGammaColorFilter]: Record<string, never>;
  [NodeType.SRGBToLinearGammaColorFilter]: Record<string, never>;
};

interface PushColorFilter<
  T extends keyof Props,
> extends Command<CommandType.PushColorFilter> {
  colorFilterType: T;
  props: Props[T];
}

const isColorFilter = <T extends keyof Props>(
  command: Command<CommandType.PushColorFilter>,
  type: T
): command is PushColorFilter<T> => {
  "worklet";
  return command.colorFilterType === type;
};

export const composeColorFilters = (ctx: DrawingContext) => {
  "worklet";
  if (ctx.colorFilters.length > 1) {
    const outer = ctx.colorFilters.pop()!;
    const inner = ctx.colorFilters.pop()!;
    ctx.colorFilters.push(ctx.Skia.ColorFilter.MakeCompose(outer, inner));
  }
};

export const pushColorFilter = (
  ctx: DrawingContext,
  command: Command<CommandType.PushColorFilter>
) => {
  "worklet";
  let cf: SkColorFilter | undefined;
  if (isColorFilter(command, NodeType.BlendColorFilter)) {
    const { props } = command;
    const { mode } = props;
    const color = processColor(ctx.Skia, props.color);
    cf = ctx.Skia.ColorFilter.MakeBlend(color, BlendMode[enumKey(mode)]);
  } else if (isColorFilter(command, NodeType.MatrixColorFilter)) {
    const { matrix } = command.props;
    cf = ctx.Skia.ColorFilter.MakeMatrix(matrix);
  } else if (isColorFilter(command, NodeType.LerpColorFilter)) {
    const { props } = command;
    const { t } = props;
    const second = ctx.colorFilters.pop();
    const first = ctx.colorFilters.pop();
    if (!first || !second) {
      throw new Error("LerpColorFilter requires two color filters");
    }
    cf = ctx.Skia.ColorFilter.MakeLerp(t, first, second);
  } else if (isColorFilter(command, NodeType.LumaColorFilter)) {
    cf = ctx.Skia.ColorFilter.MakeLuma();
  } else if (isColorFilter(command, NodeType.LinearToSRGBGammaColorFilter)) {
    cf = ctx.Skia.ColorFilter.MakeLinearToSRGBGamma();
  } else if (isColorFilter(command, NodeType.SRGBToLinearGammaColorFilter)) {
    cf = ctx.Skia.ColorFilter.MakeSRGBToLinearGamma();
  }
  if (!cf) {
    throw new Error(`Unknown color filter type: ${command.colorFilterType}`);
  }
  ctx.colorFilters.push(cf);
};
