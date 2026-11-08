/* global HTMLCanvasElement */
import React, {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";

import type { SkRect, SkPicture, SkImage } from "../skia/types";
import { Platform } from "../Platform";
import type {
  ISkiaViewApiWeb,
  SkiaWebViewHandle,
} from "../specs/NativeSkiaModule.web";

import type { SkiaPictureViewNativeProps } from "./types";
import { useSkiaWebRenderer } from "./SkiaWebRenderer";
import type { Renderer } from "./SkiaWebRenderer";

export interface SkiaPictureViewHandle extends SkiaWebViewHandle {
  setPicture(picture: SkPicture): void;
}

export interface SkiaPictureViewProps extends SkiaPictureViewNativeProps {
  ref?: React.Ref<SkiaPictureViewHandle>;
}

export const SkiaPictureView = (props: SkiaPictureViewProps) => {
  const { ref, picture, onLayout } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pictureRef = useRef<SkPicture | null>(null);
  // Redraw requests coalesce into a single microtask. A microtask (not an
  // animation frame) so that a picture produced inside a rAF callback (the
  // Reanimated mapper) is drawn before the current frame paints: deferring
  // to the next rAF alternates between "flush pending in this frame" and
  // "flush scheduled for the next frame", drawing on every other frame
  // only and halving the effective frame rate. A picture dispatched before
  // the canvas has a size stays in pictureRef (drawing while unmeasured is
  // a no-op) and is painted by the resize path once the canvas becomes
  // measurable, so it is never lost.
  const redrawPendingRef = useRef(false);
  const flushScheduledRef = useRef(false);

  const paint = useCallback((renderer: Renderer) => {
    if (pictureRef.current) {
      redrawPendingRef.current = false;
      renderer.draw([pictureRef.current]);
    }
  }, []);
  const rendererRef = useSkiaWebRenderer(canvasRef, {
    paint,
    onLayout,
  });

  const flushRedraw = useCallback(() => {
    flushScheduledRef.current = false;
    if (redrawPendingRef.current && rendererRef.current && pictureRef.current) {
      redrawPendingRef.current = false;
      rendererRef.current.draw([pictureRef.current]);
    }
    // If the renderer or picture isn't available yet, the request stays
    // pending and is flushed by whichever arrives last.
  }, [rendererRef]);

  const redraw = useCallback(() => {
    redrawPendingRef.current = true;
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true;
      queueMicrotask(flushRedraw);
    }
  }, [flushRedraw]);

  const getSize = useCallback(() => {
    return {
      width: canvasRef.current?.clientWidth || 0,
      height: canvasRef.current?.clientHeight || 0,
    };
  }, []);

  const setPicture = useCallback(
    (newPicture: SkPicture) => {
      pictureRef.current = newPicture;
      redraw();
    },
    [redraw]
  );

  const makeImageSnapshot = useCallback(
    (rect?: SkRect): SkImage | null => {
      if (rendererRef.current && pictureRef.current) {
        return rendererRef.current.makeImageSnapshot(
          [pictureRef.current],
          rect
        );
      }
      return null;
    },
    [rendererRef]
  );

  const measure = useCallback(
    (
      callback: (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => void
    ) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const parentElement = canvasRef.current.offsetParent as HTMLElement;
        const parentRect = parentElement?.getBoundingClientRect() || {
          left: 0,
          top: 0,
        };

        // x, y are relative to the parent
        const x = rect.left - parentRect.left;
        const y = rect.top - parentRect.top;

        // pageX, pageY are absolute screen coordinates
        const pageX = rect.left + window.scrollX;
        const pageY = rect.top + window.scrollY;

        callback(x, y, rect.width, rect.height, pageX, pageY);
      }
    },
    []
  );

  const measureInWindow = useCallback(
    (
      callback: (x: number, y: number, width: number, height: number) => void
    ) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();

        // x, y are the absolute coordinates in the window
        const x = rect.left;
        const y = rect.top;

        callback(x, y, rect.width, rect.height);
      }
    },
    []
  );

  // No flush cancellation is needed on unmount: a microtask queued before
  // unmount runs within the same task, and flushRedraw no-ops once the
  // layout-effect cleanup has nulled rendererRef.

  useImperativeHandle(
    ref,
    () => ({
      setPicture,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
      get canvasRef() {
        return () => canvasRef.current;
      },
    }),
    [setPicture, getSize, redraw, makeImageSnapshot, measure, measureInWindow]
  );

  useEffect(() => {
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    const nativeID = props.nativeID ?? `${api.allocateNativeId()}`;
    api.registerView(nativeID, {
      setPicture,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
    } as SkiaPictureViewHandle);
    return () => {
      api.unregisterView(nativeID);
    };
  }, [
    setPicture,
    getSize,
    redraw,
    makeImageSnapshot,
    measure,
    measureInWindow,
    props.nativeID,
  ]);

  useEffect(() => {
    if (picture) {
      setPicture(picture);
    }
  }, [setPicture, picture]);

  const {
    debug: _debug,
    ref: _ref,
    onLayout: _onLayout,
    picture: _picture,
    // Deprecated, kept out of the DOM.
    __destroyWebGLContextAfterRender: _destroyWebGLContextAfterRender,
    ...viewProps
  } = props;
  return (
    <Platform.View {...viewProps}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Platform.View>
  );
};
