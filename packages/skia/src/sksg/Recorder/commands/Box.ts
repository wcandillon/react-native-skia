import { deflate, inflate, processColor } from "../../../dom/nodes";
import type { BoxProps, BoxShadowProps } from "../../../dom/types";
import { BlurStyle, ClipOp, isRRect } from "../../../skia/types";
import type { Command } from "../Core";
import { CommandType, materializeCommand } from "../Core";
import type { DrawingContext } from "../DrawingContext";

interface BoxCommand extends Command<CommandType.DrawBox> {
  props: BoxProps;
  shadows: { props: BoxShadowProps }[];
}

export const isBoxCommand = (command: Command): command is BoxCommand => {
  "worklet";
  return command.type === CommandType.DrawBox;
};

export const drawBox = (ctx: DrawingContext, command: BoxCommand) => {
  "worklet";
  const shadows = command.shadows.map((shadow) => {
    return materializeCommand(shadow).props;
  });
  const { paint, Skia, canvas } = ctx;
  const { box: defaultBox } = command.props;
  const opacity = paint.getAlphaf();
  const box = isRRect(defaultBox) ? defaultBox : Skia.RRectXY(defaultBox, 0, 0);
  shadows
    .filter((shadow) => !shadow.inner)
    .map((shadow) => {
      const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
      const lPaint = Skia.Paint();
      lPaint.setColor(processColor(Skia, color));
      lPaint.setAlphaf(lPaint.getAlphaf() * opacity);
      lPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
      );
      canvas.drawRRect(inflate(Skia, box, spread, spread, dx, dy), lPaint);
    });

  canvas.drawRRect(box, paint);

  shadows
    .filter((shadow) => shadow.inner)
    .map((shadow) => {
      const { color = "black", blur, spread = 0, dx = 0, dy = 0 } = shadow;
      const delta = Skia.Point(10 + Math.abs(dx), 10 + Math.abs(dy));
      canvas.save();
      canvas.clipRRect(box, ClipOp.Intersect, false);
      const lPaint = Skia.Paint();
      lPaint.setColor(Skia.Color(color));
      lPaint.setAlphaf(lPaint.getAlphaf() * opacity);

      lPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true)
      );
      const inner = deflate(Skia, box, spread, spread, dx, dy);
      const outer = inflate(Skia, box, delta.x, delta.y);
      canvas.drawDRRect(outer, inner, lPaint);
      canvas.restore();
    });
};
