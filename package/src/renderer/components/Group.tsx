import React from "react";
import type { RefObject } from "react";

import type { SkPaint } from "../../skia/types";
import { ClipOp } from "../../skia/types";
import {
  processCanvasTransform,
  processPaint,
  processClip,
} from "../processors";
import type {
  CustomPaintProps,
  TransformProps,
  AnimatedProps,
  ClipDef,
} from "../processors";
import { createDrawing, DrawingNode } from "../nodes";
import { isDeclarationNode } from "../nodes/Declaration";

const isSkPaint = (obj: RefObject<SkPaint> | SkPaint): obj is SkPaint =>
  "__typename__" in obj && obj.__typename__ === "Paint";

export interface GroupProps extends CustomPaintProps, TransformProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: RefObject<SkPaint> | SkPaint | boolean;
}

const onDraw = createDrawing<GroupProps>(
  (ctx, { layer, clip, invertClip, ...groupProps }, node) => {
    const { canvas, opacity, Skia } = ctx;
    const declarations = node.children
      .filter(isDeclarationNode)
      .map((child) => child.draw(ctx));

    const drawings = node.children.filter(
      (child) => child instanceof DrawingNode
    );
    const paint = processPaint(
      ctx.Skia,
      ctx.paint.copy(),
      opacity,
      groupProps,
      declarations
    );
    const hasTransform = !!groupProps.transform || !!groupProps.matrix;
    const hasClip = !!clip;
    const shouldSave = hasTransform || hasClip || !!layer;
    if (shouldSave) {
      if (layer) {
        if (typeof layer === "boolean") {
          canvas.saveLayer();
        } else if (isSkPaint(layer)) {
          canvas.saveLayer(layer);
        } else {
          canvas.saveLayer(layer.current ?? undefined);
        }
      } else {
        canvas.save();
      }
      processCanvasTransform(canvas, groupProps);
      if (clip) {
        const op = invertClip ? ClipOp.Difference : ClipOp.Intersect;
        processClip(Skia, canvas, clip, op);
      }
    }
    node.visit(
      {
        ...ctx,
        paint,
        opacity: groupProps.opacity ? groupProps.opacity * opacity : opacity,
      },
      drawings
    );
    if (shouldSave) {
      canvas.restore();
    }
  }
);

export const Group = (props: AnimatedProps<GroupProps>) => {
  return <skDrawing onDraw={onDraw} {...props} skipProcessing />;
};
