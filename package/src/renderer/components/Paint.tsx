import type { ReactNode } from "react";
import React, { useRef, useMemo, forwardRef, useImperativeHandle } from "react";

import type { SkPaint } from "../../skia";
import { SkiaPaint } from "../../skia";
import type { CustomPaintProps, AnimatedProps } from "../processors";
import { processPaint } from "../processors";
import { createDeclaration } from "../nodes";

export const usePaintRef = () => useRef<SkPaint>(null);

export interface PaintProps extends Omit<CustomPaintProps, "paint"> {
  children?: ReactNode | ReactNode[];
}

export const Paint = forwardRef<SkPaint, AnimatedProps<PaintProps>>(
  (props, ref) => {
    const paint = useMemo(() => SkiaPaint(), []);
    useImperativeHandle(ref, () => paint, [paint]);
    const onDeclare = useMemo(
      () =>
        createDeclaration<PaintProps>((paintProps, children, ctx) =>
          processPaint(paint, ctx.opacity, paintProps, children)
        ),
      [paint]
    );
    return <skDeclaration onDeclare={onDeclare} {...props} />;
  }
);
