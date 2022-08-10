import React from "react";

import type { CustomPaintProps, AnimatedProps } from "../../processors";
import { createDrawing } from "../../nodes";
import type { SkPath, SkRSXform } from "../../../skia/types";
import type { FontDef } from "../../processors/Font";

export type TextPathProps = CustomPaintProps &
  FontDef & {
    text: string;
    path: SkPath | string;
    initialOffset: number;
  };

const onDraw = createDrawing<TextPathProps>(
  (
    { canvas, paint, Skia },
    { text, initialOffset, path: pathDef, ...fontDef }
  ) => {
    const path =
      typeof pathDef === "string"
        ? Skia.Path.MakeFromSVGString(pathDef)
        : pathDef;
    if (path === null) {
      throw new Error("Invalid path: " + pathDef);
    }
    const { font } = fontDef;
    const ids = font.getGlyphIDs(text);
    const widths = font.getGlyphWidths(ids, paint);
    const rsx: SkRSXform[] = [];
    const meas = Skia.ContourMeasureIter(path, false, 1);
    let cont = meas.next();
    let dist = initialOffset;
    for (let i = 0; i < text.length && cont; i++) {
      const width = widths[i];
      dist += width / 2;
      if (dist > cont.length()) {
        // jump to next contour
        cont = meas.next();
        if (!cont) {
          // We have come to the end of the path - terminate the string
          // right here.
          text = text.substring(0, i);
          break;
        }
        dist = width / 2;
      }
      // Gives us the (x, y) coordinates as well as the cos/sin of the tangent
      // line at that position.
      const { px, py, tx, ty } = cont.getPosTan(dist);
      const adjustedX = px - (width / 2) * tx;
      const adjustedY = py - (width / 2) * ty;
      rsx.push(Skia.RSXform(tx, ty, adjustedX, adjustedY));
      dist += width / 2;
    }
    const blob = Skia.TextBlob.MakeFromRSXform(text, rsx, font);
    canvas.drawTextBlob(blob, 0, 0, paint);
  }
);

export const TextPath = (props: AnimatedProps<TextPathProps>) => {
  return <skDrawing onDraw={onDraw} {...props} />;
};

TextPath.defaultProps = {
  initialOffset: 0,
};
