import React, { useRef, useEffect } from "react";
import type { RefObject } from "react";
import { useDerivedValue } from "@shopify/react-native-skia";

import type { SkCanvas, SkMatrix, SkPaint } from "../../skia";
import { RenderNode } from "../nodes";
import { PaintNode } from "../nodes/Paint";
import type { RenderContext } from "../nodes/RenderContext";
import { processTransform2d } from "../processors";
import type { ClipDef, CustomPaintProps, TransformProps } from "../processors";
import type { AnimatedProps } from "../processors/Animations/Animations";
import { processTransform, transformOrigin } from "../processors/Transform";
import type { Transforms2d } from "../processors/math/Matrix3";
import type { Vector } from "../processors/math/Vector";
import { materialize, isValue } from "../processors/Animations/Animations";
import { useValueEffect } from "../../values/hooks/useValueEffect";

export interface GroupProps extends CustomPaintProps, TransformProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: RefObject<SkPaint> | SkPaint | boolean;
}

export class GroupNode extends RenderNode {
  matrix: SkMatrix | null = null;
  paint: PaintNode | null = null;

  constructor({ transform, origin, ...props }: GroupProps) {
    super();
    if (props.color || props.blendMode) {
      this.paint = new PaintNode(props);
    }
    if (transform) {
      this.setMatrix(transform, origin);
    }
  }

  setMatrix(transform: Transforms2d, origin?: Vector) {
    // processTransform2d was fun to experiment but we should use Skia Matrices directly now
    this.matrix = processTransform2d(
      origin ? transformOrigin(origin, transform) : transform
    );
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    const shouldSave = this.matrix !== null;
    if (shouldSave) {
      canvas.save();
    }
    if (this.matrix !== null) {
      canvas.concat(this.matrix);
    }
    if (this.paint !== null) {
      ctx.save();
      ctx.concat(this.paint);
    }
    for (const child of this.children) {
      if (child instanceof RenderNode) {
        child.render(canvas, ctx);
      }
    }
    if (shouldSave) {
      canvas.restore();
    }
    if (this.paint !== null) {
      ctx.restore();
    }
  }
}

const useProps = <P,>(props: P, cb: (name: string, value: any) => void) => {
  useEffect(() => {
    const subs: (() => void)[] = [];
    for (const key in props) {
      const value = props[key];
      if (key === "transform" && isValue(value)) {
        const sub = value.addListener((v) => {
          cb(key, v);
        });
        subs.push(sub);
      }
    }
    return () => {
      subs.forEach((sub) => sub());
    };
  }, [cb, props]);
};

export const Group = (props: AnimatedProps<GroupProps>) => {
  const ref = useRef<GroupNode>(null);
  const materialized = materialize(props);
  useProps(props, (name, value) => {
    if (name === "transform") {
      ref.current?.setMatrix(value, materialized.origin);
    }
  });
  return <skGroup ref={ref} {...materialized} />;
};
