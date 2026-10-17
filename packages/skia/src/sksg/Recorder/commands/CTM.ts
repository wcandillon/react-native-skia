import {
  isPathDef,
  processPath,
  processTransformProps2,
} from "../../../dom/nodes";
import type { ClipDef, CTMProps } from "../../../dom/types";
import type { Skia, SkPath, SkRect, SkRRect } from "../../../skia/types";
import { ClipOp, isRRect } from "../../../skia/types";
import type { DrawingContext } from "../DrawingContext";

const computeClip = (
  Skia: Skia,
  clip: ClipDef | undefined
):
  | undefined
  | { clipPath: SkPath }
  | { clipRect: SkRect }
  | { clipRRect: SkRRect } => {
  "worklet";
  if (clip) {
    if (isPathDef(clip)) {
      return { clipPath: processPath(Skia, clip) };
    } else if (isRRect(clip)) {
      return { clipRRect: clip };
    } else {
      return { clipRect: clip };
    }
  }
  return undefined;
};

export const saveCTM = (ctx: DrawingContext, props: CTMProps) => {
  "worklet";
  const { canvas, Skia } = ctx;
  const {
    clip: rawClip,
    invertClip,
    matrix,
    transform,
    origin,
    layer,
    backdropFilter,
    saveLayerFlags,
  } = props;
  const hasTransform = matrix !== undefined || transform !== undefined;
  const clip = computeClip(Skia, rawClip);
  const hasClip = clip !== undefined;
  const op = invertClip ? ClipOp.Difference : ClipOp.Intersect;
  const m3 = processTransformProps2(Skia, { matrix, transform, origin });
  const shouldSave = hasTransform || hasClip || !!layer;
  if (shouldSave) {
    if (layer) {
      const paint = typeof layer === "boolean" ? undefined : layer;
      canvas.saveLayer(paint, null, backdropFilter, saveLayerFlags);
    } else {
      canvas.save();
    }
  }
  if (m3) {
    canvas.concat(m3);
  }
  if (clip) {
    if ("clipRect" in clip) {
      canvas.clipRect(clip.clipRect, op, true);
    } else if ("clipRRect" in clip) {
      canvas.clipRRect(clip.clipRRect, op, true);
    } else {
      canvas.clipPath(clip.clipPath, op, true);
    }
  }
};
