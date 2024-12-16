import type { TransformProps } from "../../types";
import type { Skia, SkMatrix } from "../../../skia/types";
import { processTransform } from "../../../skia/types";

// TODO: consolidate
export const processTransformProps2 = (Skia: Skia, props: TransformProps) => {
  "worklet";
  const { transform, origin, matrix } = props;
  if (matrix) {
    const m3 = Skia.Matrix();
    if (origin) {
      m3.translate(origin.x, origin.y);
      m3.concat(matrix);
      m3.translate(-origin.x, -origin.y);
    } else {
      m3.concat(matrix);
    }
    return m3;
  } else if (transform) {
    const m3 = Skia.Matrix();
    if (origin) {
      m3.translate(origin.x, origin.y);
    }
    processTransform(m3, transform);
    if (origin) {
      m3.translate(-origin.x, -origin.y);
    }
    return m3;
  }
  return null;
};

export const processTransformProps = (m3: SkMatrix, props: TransformProps) => {
  "worklet";
  const { transform, origin, matrix } = props;
  if (matrix) {
    if (origin) {
      m3.translate(origin.x, origin.y);
      m3.concat(matrix);
      m3.translate(-origin.x, -origin.y);
    } else {
      m3.concat(matrix);
    }
  } else if (transform) {
    if (origin) {
      m3.translate(origin.x, origin.y);
    }
    processTransform(m3, transform);
    if (origin) {
      m3.translate(-origin.x, -origin.y);
    }
  }
};
