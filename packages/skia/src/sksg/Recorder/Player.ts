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
import type { Command } from "./Core";
import type { DrawingContext } from "./DrawingContext";

function play(ctx: DrawingContext, _command: Command) {
  "worklet";
  if (isGroup(_command)) {
    _command.children.forEach((child) => play(ctx, child));
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
      ctx.paints.push(command.props.paint);
    } else {
      ctx.savePaint();
      setPaintProperties(ctx.Skia, ctx.paint, command.props);
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
    const paints = [ctx.paint, ...ctx.paintDeclarations];
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
      } else {
        console.warn(`Unknown command: ${command.type}`);
      }
      ctx.paints.pop();
    });
  }
}

export const replay = (ctx: DrawingContext, commands: Command[]) => {
  "worklet";
  commands.forEach((command) => {
    play(ctx, command);
  });
};
