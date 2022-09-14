import React, { useRef, forwardRef } from "react";

import type { SkiaProps } from "../processors";
import type { DrawingNodeProps } from "../../dom/types";
import type { PaintNode } from "../../dom/nodes/PaintNode";

export const usePaintRef = () => useRef<PaintNode>(null);

export const Paint = forwardRef<PaintNode, SkiaProps<DrawingNodeProps>>(
  (props, ref) => {
    return <skPaint ref={ref} {...props} />;
  }
);
