import type { TransformProps } from "../../types";
import type { SkMatrix } from "../../../skia/types";
import { processTransform } from "../../../skia/types";

export const processTransformProps = (m3: SkMatrix, props: TransformProps) => {
  const { transform, origin, matrix } = props;
  if (matrix) {
    if (origin) {
      m3.translate(origin.x, origin.y);
      m3.concat(matrix);
      m3.translate(-origin.x, -origin.y);
    } else {
      m3.identity();
      m3.concat(matrix);
    }
  } else if (transform) {
    m3.identity();
    if (origin) {
      m3.translate(origin.x, origin.y);
    }
    processTransform(m3, transform);
    if (origin) {
      m3.translate(-origin.x, -origin.y);
    }
  }
};
