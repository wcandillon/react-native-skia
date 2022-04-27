import React from "react";

import type {
  CustomPaintProps,
  AnimatedProps,
  PathDef,
  SkEnum,
} from "../../processors";
import { createDrawing } from "../../nodes";
import { processPath, enumKey } from "../../processors";
import { FillType } from "../../../skia";

interface StrokeOpts {
  width?: number;
  strokeMiterlimit?: number;
  precision?: number;
}

export interface PathProps extends CustomPaintProps {
  path: PathDef;
  start: number;
  end: number;
  stroke?: StrokeOpts;
  fillType?: SkEnum<typeof FillType>;
}

const onDraw = createDrawing<PathProps>(
  ({ canvas, paint }, { start, end, stroke, fillType, ...pathProps }) => {
    const hasStartOffset = start !== 0;
    const hasEndOffset = end !== 1;
    const hasStrokeOptions = stroke !== undefined;
    const hasFillType = !!fillType;
    const willMutatePath =
      hasStartOffset || hasEndOffset || hasStrokeOptions || hasFillType;
    const pristinePath = processPath(pathProps.path);
    const path = willMutatePath ? pristinePath.copy() : pristinePath;
    if (hasFillType) {
      path.setFillType(FillType[enumKey(fillType)]);
    }
    if (hasStrokeOptions) {
      path.stroke(stroke);
    }
    if (hasStartOffset || hasEndOffset) {
      path.trim(start, end, false);
    }
    canvas.drawPath(path, paint);
  }
);

export const Path = (props: AnimatedProps<PathProps>) => {
  return <skDrawing onDraw={onDraw} {...props} />;
};

Path.defaultProps = {
  start: 0,
  end: 1,
};
