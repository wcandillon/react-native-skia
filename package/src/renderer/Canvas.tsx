import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useRef,
} from "react";
import type {
  RefObject,
  ReactNode,
  ComponentProps,
  MutableRefObject,
  ForwardedRef,
} from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import { SkiaView, useDrawCallback } from "../views";
import type { TouchHandler } from "../views";
import { useValue } from "../values/hooks/useValue";
import { Skia } from "../skia/Skia";
import type { SkiaValue } from "../values";

import { debug as hostDebug, skHostConfig } from "./HostConfig";
// import { debugTree } from "./nodes";
import { Container } from "./Container";
import { DependencyManager } from "./DependencyManager";
import { CanvasProvider } from "./useCanvas";

export const skiaReconciler = ReactReconciler(skHostConfig);

skiaReconciler.injectIntoDevTools({
  bundleType: 1,
  version: "0.0.1",
  rendererPackageName: "react-native-skia",
});

const render = (element: ReactNode, root: OpaqueRoot, container: Container) => {
  skiaReconciler.updateContainer(element, root, null, () => {
    hostDebug("updateContainer");
    container.depMgr.update();
  });
};

export const useCanvasRef = () => useRef<SkiaView>(null);

export interface CanvasProps extends ComponentProps<typeof SkiaView> {
  ref?: RefObject<SkiaView>;
  children: ReactNode;
  onTouch?: TouchHandler;
}

export const Canvas = forwardRef<SkiaView, CanvasProps>(
  ({ children, style, debug, mode, onTouch }, forwardedRef) => {
    const size = useValue({ width: 0, height: 0 });
    const canvasCtx = useMemo(() => ({ Skia, size }), [size]);
    const innerRef = useCanvasRef();
    const ref = useCombinedRefs(forwardedRef, innerRef);
    const [tick, setTick] = useState(0);
    const redraw = useCallback(() => {
      setTick((t) => t + 1);
    }, []);

    const registerValues = useCallback(
      (values: Array<SkiaValue<unknown>>) => {
        if (ref.current === null) {
          throw new Error("Canvas ref is not set");
        }
        return ref.current.registerValues(values);
      },
      [ref]
    );

    const container = useMemo(() => {
      return new Container(Skia, new DependencyManager(registerValues), redraw);
    }, [redraw, registerValues]);

    const root = useMemo(
      () => skiaReconciler.createContainer(container, 0, false, null),
      [container]
    );
    // Render effect
    useEffect(() => {
      render(
        <CanvasProvider value={canvasCtx}>{children}</CanvasProvider>,
        root,
        container
      );
    }, [children, root, redraw, container, canvasCtx]);

    const paint = useMemo(() => Skia.Paint(), []);

    // Draw callback
    const onDraw = useDrawCallback(
      (canvas, info) => {
        // TODO: if tree is empty (count === 1) maybe we should not render?
        const { width, height, timestamp } = info;
        if (onTouch) {
          onTouch(info.touches);
        }
        if (
          width !== canvasCtx.size.current.width ||
          height !== canvasCtx.size.current.height
        ) {
          canvasCtx.size.current = { width, height };
        }
        paint.reset();
        const ctx = {
          width,
          height,
          timestamp,
          canvas,
          paint,
          opacity: 1,
          ref,
          center: { x: width / 2, y: height / 2 },
          Skia,
        };
        container.draw(ctx);
      },
      [tick, onTouch]
    );

    useEffect(() => {
      return () => {
        skiaReconciler.updateContainer(null, root, null, () => {
          container.depMgr.remove();
        });
      };
    }, [container, root]);

    return (
      <SkiaView
        ref={ref}
        style={style}
        onDraw={onDraw}
        mode={mode}
        debug={debug}
      />
    );
  }
);

/**
 * Combines a list of refs into a single ref. This can be used to provide
 * both a forwarded ref and an internal ref keeping the same functionality
 * on both of the refs.
 * @param refs Array of refs to combine
 * @returns A single ref that can be used in a ref prop.
 */
const useCombinedRefs = <T,>(
  ...refs: Array<MutableRefObject<T> | ForwardedRef<T>>
) => {
  const targetRef = React.useRef<T>(null);
  React.useEffect(() => {
    refs.forEach((ref) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(targetRef.current);
        } else {
          ref.current = targetRef.current;
        }
      }
    });
  }, [refs]);
  return targetRef;
};
