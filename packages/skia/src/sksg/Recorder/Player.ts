import type { DrawingNodeProps } from "../../dom/types";

import {
  drawCircle,
  drawImage,
  drawOval,
  drawPath,
  drawPoints,
  drawRect,
  drawRRect,
  drawLine,
  drawAtlas,
  drawParagraph,
  drawImageSVG,
  drawPicture,
  drawGlyphs,
  drawTextBlob,
  drawTextPath,
  drawText,
  drawDiffRect,
  drawVertices,
  drawPatch,
  drawSkottie,
} from "./commands/Drawing";
import { drawBox, isBoxCommand } from "./commands/Box";
import {
  composeColorFilters,
  isPushColorFilter,
  pushColorFilter,
} from "./commands/ColorFilters";
import { saveCTM } from "./commands/CTM";
import {
  setBlurMaskFilter,
  isPushImageFilter,
  pushImageFilter,
  composeImageFilters,
} from "./commands/ImageFilters";
import { setPaintProperties } from "./commands/Paint";
import {
  composePathEffects,
  isPushPathEffect,
  pushPathEffect,
} from "./commands/PathEffects";
import { isPushShader, pushShader } from "./commands/Shaders";
import {
  CommandType,
  isCommand,
  isDrawCommand,
  isGroup,
  materializeCommand,
} from "./Core";
import type { Command, GroupCommand } from "./Core";
import type { DrawingContext } from "./DrawingContext";

type PendingGroup = {
  command: GroupCommand;
  zIndex: number;
  order: number;
};

const getZIndex = (command: GroupCommand) => {
  "worklet";
  const materialized = materializeCommand(command);
  const { zIndex } = (materialized.props ?? {}) as DrawingNodeProps;
  if (typeof zIndex !== "number" || Number.isNaN(zIndex)) {
    return 0;
  }
  return zIndex;
};

const flushPendingGroups = (
  ctx: DrawingContext,
  pendingGroups: PendingGroup[],
  playFn: (ctx: DrawingContext, cmd: Command) => void
) => {
  "worklet";
  if (pendingGroups.length === 0) {
    return;
  }
  pendingGroups
    .sort((a, b) =>
      a.zIndex === b.zIndex ? a.order - b.order : a.zIndex - b.zIndex
    )
    .forEach(({ command }) => {
      playFn(ctx, command);
    });
  pendingGroups.length = 0;
};

const playGroup = (
  ctx: DrawingContext,
  group: GroupCommand,
  playFn: (ctx: DrawingContext, cmd: Command) => void
) => {
  "worklet";
  const pending: PendingGroup[] = [];
  group.children.forEach((child) => {
    if (isGroup(child)) {
      pending.push({
        command: child,
        zIndex: getZIndex(child),
        order: pending.length,
      });
      return;
    }
    flushPendingGroups(ctx, pending, playFn);
    playFn(ctx, child);
  });
  flushPendingGroups(ctx, pending, playFn);
};

const play = (ctx: DrawingContext, _command: Command) => {
  if (isGroup(_command)) {
    playGroup(ctx, _command, play);
    return;
  }
  const command = materializeCommand(_command);
  if (isCommand(command, CommandType.SaveBackdropFilter)) {
    ctx.saveBackdropFilter();
  } else if (isCommand(command, CommandType.SaveLayer)) {
    ctx.materializePaint();
    const paint = ctx.paintDeclarations.pop();
    ctx.canvas.saveLayer(paint);
  } else if (isDrawCommand(command, CommandType.SavePaint)) {
    if (command.props.paint) {
      ctx.pushPaint(command.props.paint);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { standalone } = command as any;
      ctx.savePaint();
      if (standalone) {
        const freshPaint = ctx.Skia.Paint();
        ctx.paint.assign(freshPaint);
      }
      setPaintProperties(ctx.Skia, ctx, command.props, standalone);
    }
  } else if (isCommand(command, CommandType.RestorePaint)) {
    ctx.restorePaint();
  } else if (isCommand(command, CommandType.ComposeColorFilter)) {
    composeColorFilters(ctx);
  } else if (isCommand(command, CommandType.RestorePaintDeclaration)) {
    ctx.materializePaint();
    const paint = ctx.restorePaint();
    if (!paint) {
      throw new Error("No paint declaration to push");
    }
    ctx.paintDeclarations.push(paint);
  } else if (isCommand(command, CommandType.MaterializePaint)) {
    ctx.materializePaint();
  } else if (isPushColorFilter(command)) {
    pushColorFilter(ctx, command);
  } else if (isPushShader(command)) {
    pushShader(ctx, command);
  } else if (isPushImageFilter(command)) {
    pushImageFilter(ctx, command);
  } else if (isPushPathEffect(command)) {
    pushPathEffect(ctx, command);
  } else if (isCommand(command, CommandType.ComposePathEffect)) {
    composePathEffects(ctx);
  } else if (isCommand(command, CommandType.ComposeImageFilter)) {
    composeImageFilters(ctx);
  } else if (isDrawCommand(command, CommandType.PushBlurMaskFilter)) {
    setBlurMaskFilter(ctx, command.props);
  } else if (isDrawCommand(command, CommandType.SaveCTM)) {
    saveCTM(ctx, command.props);
  } else if (isCommand(command, CommandType.RestoreCTM)) {
    ctx.canvas.restore();
  } else {
    // apply opacity to the current paint.
    const paint = ctx.track(ctx.paint.copy());
    paint.setAlphaf(paint.getAlphaf() * ctx.getOpacity());
    const paints = [paint, ...ctx.paintDeclarations];
    ctx.paintDeclarations = [];
    paints.forEach((p) => {
      ctx.paints.push(p);
      if (isBoxCommand(command)) {
        drawBox(ctx, command);
      } else if (isCommand(command, CommandType.DrawPaint)) {
        ctx.canvas.drawPaint(ctx.paint);
      } else if (isDrawCommand(command, CommandType.DrawImage)) {
        drawImage(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawCircle)) {
        drawCircle(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawPoints)) {
        drawPoints(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawPath)) {
        drawPath(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawRect)) {
        drawRect(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawRRect)) {
        drawRRect(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawOval)) {
        drawOval(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawLine)) {
        drawLine(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawPatch)) {
        drawPatch(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawVertices)) {
        drawVertices(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawDiffRect)) {
        drawDiffRect(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawText)) {
        drawText(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawTextPath)) {
        drawTextPath(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawTextBlob)) {
        drawTextBlob(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawGlyphs)) {
        drawGlyphs(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawPicture)) {
        drawPicture(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawImageSVG)) {
        drawImageSVG(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawParagraph)) {
        drawParagraph(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawAtlas)) {
        drawAtlas(ctx, command.props);
      } else if (isDrawCommand(command, CommandType.DrawSkottie)) {
        drawSkottie(ctx, command.props);
      } else {
        console.warn(`Unknown command: ${command.type}`);
      }
      ctx.paints.pop();
    });
  }
};
export function replay(ctx: DrawingContext, commands: Command[]) {
  "worklet";
  //console.log(debugTree(commands));
  commands.forEach((command) => {
    play(ctx, command);
  });
}
