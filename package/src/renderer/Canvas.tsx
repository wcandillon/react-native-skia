import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useContext,
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
import { Skia } from "../skia";
import type { FontMgr } from "../skia/FontMgr/FontMgr";
import { useValue } from "../values/hooks/useValue";
import type { SkiaReadonlyValue } from "../values/types";
import { SkiaPaint } from "../skia/Paint/Paint";

import { debug as hostDebug, skHostConfig } from "./HostConfig";
// import { debugTree } from "./nodes";
import { vec } from "./processors";
import { Container } from "./nodes";
import { DependencyManager } from "./DependencyManager";

const CanvasContext = React.createContext<SkiaReadonlyValue<{
  width: number;
  height: number;
}> | null>(null);

export const useCanvasSize = () => {
  const canvas = useContext(CanvasContext);
  if (!canvas) {
    throw new Error("Canvas context is not available");
  }
  return canvas;
};

export const skiaReconciler = ReactReconciler(skHostConfig);

skiaReconciler.injectIntoDevTools({
  bundleType: 1,
  version: "0.0.1",
  rendererPackageName: "react-native-skia",
});

const render = (element: ReactNode, root: OpaqueRoot, container: Container) => {
  skiaReconciler.updateContainer(element, root, null, () => {
    hostDebug("updateContainer");

    container.depMgr.subscribe();
  });
};

export const useCanvasRef = () => useRef<SkiaView>(null);

export interface CanvasProps extends ComponentProps<typeof SkiaView> {
  ref?: RefObject<SkiaView>;
  children: ReactNode;
  onTouch?: TouchHandler;
  fontMgr?: FontMgr;
}

const defaultFontMgr = Skia.FontMgr.RefDefault();

export const Canvas = forwardRef<SkiaView, CanvasProps>(
  ({ children, style, debug, mode, onTouch, fontMgr }, forwardedRef) => {
    const canvasCtx = useValue({ width: 0, height: 0 });
    const innerRef = useCanvasRef();
    const ref = useCombinedRefs(forwardedRef, innerRef);
    const [tick, setTick] = useState(0);
    const redraw = useCallback(() => setTick((t) => t + 1), []);

    const container = useMemo(
      () => new Container(new DependencyManager(ref), redraw),
      [redraw, ref]
    );

    const root = useMemo(
      () => skiaReconciler.createContainer(container, 0, false, null),
      [container]
    );
    // Render effect
    useEffect(() => {
      render(
        <CanvasContext.Provider value={canvasCtx}>
          {children}
        </CanvasContext.Provider>,
        root,
        container
      );
    }, [children, root, redraw, container, canvasCtx]);

    // Draw callback
    const onDraw = useDrawCallback(
      (canvas, info) => {
        // TODO: if tree is empty (count === 1) maybe we should not render?
        const { width, height, timestamp } = info;
        if (onTouch) {
          onTouch(info.touches);
        }
        if (
          width !== canvasCtx.current.width ||
          height !== canvasCtx.current.height
        ) {
          canvasCtx.current = { width, height };
        }
        const paint = SkiaPaint();
        const ctx = {
          width,
          height,
          timestamp,
          canvas,
          paint,
          opacity: 1,
          ref,
          center: vec(width / 2, height / 2),
          fontMgr: fontMgr ?? defaultFontMgr,
        };
        container.draw(ctx);
      },
      [tick, onTouch]
    );

    useEffect(() => {
      return () => {
        container.depMgr.unsubscribe();
      };
    }, [container]);

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
