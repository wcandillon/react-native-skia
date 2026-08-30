/* global HTMLCanvasElement, ResizeObserver, MediaQueryList */
import React, {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
} from "react";
import type { LayoutChangeEvent } from "react-native";
import type { GrDirectContext, WebGLContextHandle } from "canvaskit-wasm";

import type { SkRect, SkPicture, SkImage } from "../skia/types";
import { JsiSkSurface } from "../skia/web/JsiSkSurface";
import { Platform } from "../Platform";
import type { ISkiaViewApiWeb } from "../specs/NativeSkiaModule.web";

import type { SkiaPictureViewNativeProps } from "./types";
import { SkiaViewNativeId } from "./SkiaViewNativeId";

const dp2Pixel = (pd: number, rect?: SkRect) => {
  if (!rect) {
    return undefined;
  }
  return {
    x: rect.x * pd,
    y: rect.y * pd,
    width: rect.width * pd,
    height: rect.height * pd,
  };
};

interface Renderer {
  onResize(): void;
  draw(picture: SkPicture): void;
  makeImageSnapshot(picture: SkPicture, rect?: SkRect): SkImage | null;
  dispose(): void;
}

class WebGLRenderer implements Renderer {
  private surface: JsiSkSurface | null = null;
  private grContext: GrDirectContext | null = null;
  private contextHandle: WebGLContextHandle = 0;
  private pd = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.contextHandle = CanvasKit.GetWebGLContext(canvas);
    if (!this.contextHandle) {
      throw new Error("Could not create a WebGL context");
    }
    this.grContext = CanvasKit.MakeWebGLContext(this.contextHandle);
    if (!this.grContext) {
      CanvasKit.deleteContext(this.contextHandle);
      this.contextHandle = 0;
      throw new Error("Could not create a graphics context");
    }
    const ctx = canvas.getContext("webgl2");
    if (ctx) {
      ctx.drawingBufferColorSpace = "display-p3";
    }
    this.onResize();
  }

  makeImageSnapshot(picture: SkPicture, rect?: SkRect): SkImage | null {
    if (!this.surface) {
      return null;
    }
    const canvas = this.surface.getCanvas();
    canvas!.clear(CanvasKit.TRANSPARENT);
    this.draw(picture);
    this.surface.ref.flush();
    return this.surface.makeImageSnapshot(dp2Pixel(this.pd, rect));
  }

  onResize() {
    const { canvas } = this;
    if (!this.grContext) {
      return;
    }
    this.pd = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * this.pd;
    canvas.height = canvas.clientHeight * this.pd;
    this.surface?.ref.delete();
    this.surface = null;
    if (canvas.width === 0 || canvas.height === 0) {
      // The canvas hasn't been laid out yet (or is hidden). The view's
      // ResizeObserver calls us again as soon as it has a size.
      return;
    }
    // Reuse the existing WebGL context and GrDirectContext: only the surface
    // needs to be recreated when the canvas is resized.
    const surface = CanvasKit.MakeOnScreenGLSurface(
      this.grContext,
      canvas.width,
      canvas.height,
      CanvasKit.ColorSpace.SRGB
    );
    if (!surface) {
      throw new Error("Could not create surface");
    }
    this.surface = new JsiSkSurface(CanvasKit, surface);
  }

  draw(picture: SkPicture) {
    if (this.surface) {
      const canvas = this.surface.getCanvas();
      canvas.clear(Float32Array.of(0, 0, 0, 0));
      canvas.save();
      canvas.scale(this.pd, this.pd);
      canvas.drawPicture(picture);
      canvas.restore();
      this.surface.ref.flush();
    }
  }

  dispose(): void {
    this.surface?.ref.delete();
    this.surface = null;
    if (this.grContext) {
      this.grContext.releaseResourcesAndAbandonContext();
      this.grContext.delete();
      this.grContext = null;
    }
    this.canvas
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
    if (this.contextHandle) {
      // Unregister the context from CanvasKit's internal registry, otherwise
      // it retains the canvas element (and its detached DOM tree) forever.
      CanvasKit.deleteContext(this.contextHandle);
      // Making the now-deleted handle current clears CanvasKit's
      // current-context globals (GLctx/Module.ctx), which would otherwise
      // keep referencing the context (and the canvas) until another surface
      // becomes current. With a deleted handle this is a no-op that returns
      // null without creating anything.
      CanvasKit.MakeWebGLContext(this.contextHandle);
      this.contextHandle = 0;
    }
  }
}

interface TempRenderResult {
  surface: JsiSkSurface;
  tempCanvas: OffscreenCanvas;
  grContext: GrDirectContext;
  contextHandle: WebGLContextHandle;
}

class StaticWebGLRenderer implements Renderer {
  private cachedImage: SkImage | null = null;
  private pd = 1;

  constructor(private canvas: HTMLCanvasElement) {}

  onResize(): void {
    this.cachedImage = null;
  }

  private renderPictureToSurface(picture: SkPicture): TempRenderResult | null {
    this.pd = window.devicePixelRatio;
    if (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) {
      return null;
    }
    const tempCanvas = new OffscreenCanvas(
      this.canvas.clientWidth * this.pd,
      this.canvas.clientHeight * this.pd
    );

    let surface: JsiSkSurface | null = null;
    let grContext: GrDirectContext | null = null;
    let contextHandle: WebGLContextHandle = 0;

    try {
      contextHandle = CanvasKit.GetWebGLContext(tempCanvas);
      if (!contextHandle) {
        throw new Error("Could not create a WebGL context");
      }
      grContext = CanvasKit.MakeWebGLContext(contextHandle);
      if (!grContext) {
        throw new Error("Could not create a graphics context");
      }
      const ctx = tempCanvas.getContext("webgl2");
      if (ctx) {
        ctx.drawingBufferColorSpace = "display-p3";
      }
      const webglSurface = CanvasKit.MakeOnScreenGLSurface(
        grContext,
        tempCanvas.width,
        tempCanvas.height,
        CanvasKit.ColorSpace.SRGB
      );

      if (!webglSurface) {
        throw new Error("Could not create WebGL surface");
      }

      surface = new JsiSkSurface(CanvasKit, webglSurface);

      const skiaCanvas = surface.getCanvas();
      skiaCanvas.clear(Float32Array.of(0, 0, 0, 0));
      skiaCanvas.save();
      skiaCanvas.scale(this.pd, this.pd);
      skiaCanvas.drawPicture(picture);
      skiaCanvas.restore();
      surface.ref.flush();

      return { surface, tempCanvas, grContext, contextHandle };
    } catch (error) {
      this.cleanupRenderResult({
        surface,
        tempCanvas,
        grContext,
        contextHandle,
      });
      return null;
    }
  }

  private cleanupRenderResult(result: {
    surface: JsiSkSurface | null;
    tempCanvas: OffscreenCanvas;
    grContext: GrDirectContext | null;
    contextHandle: WebGLContextHandle;
  }): void {
    result.surface?.ref.delete();
    if (result.grContext) {
      result.grContext.releaseResourcesAndAbandonContext();
      result.grContext.delete();
    }
    result.tempCanvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
    if (result.contextHandle) {
      // Unregister the context from CanvasKit's internal registry, otherwise
      // it retains the OffscreenCanvas forever.
      CanvasKit.deleteContext(result.contextHandle);
      // Clear CanvasKit's current-context globals (see WebGLRenderer.dispose).
      CanvasKit.MakeWebGLContext(result.contextHandle);
    }
  }

  draw(picture: SkPicture): void {
    const renderResult = this.renderPictureToSurface(picture);
    if (!renderResult) {
      return;
    }
    const { tempCanvas } = renderResult;
    const ctx2d = this.canvas.getContext("2d");
    if (!ctx2d) {
      this.cleanupRenderResult(renderResult);
      throw new Error("Could not get 2D context");
    }

    // Set canvas dimensions to match pixel density
    this.canvas.width = this.canvas.clientWidth * this.pd;
    this.canvas.height = this.canvas.clientHeight * this.pd;

    // Draw the tempCanvas scaled down to the display size
    ctx2d.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      0,
      0,
      this.canvas.clientWidth * this.pd,
      this.canvas.clientHeight * this.pd
    );

    this.cleanupRenderResult(renderResult);
  }

  makeImageSnapshot(picture: SkPicture, rect?: SkRect): SkImage | null {
    if (!this.cachedImage) {
      const renderResult = this.renderPictureToSurface(picture);
      if (!renderResult) {
        return null;
      }

      try {
        this.cachedImage = renderResult.surface.makeImageSnapshot(
          dp2Pixel(this.pd, rect)
        );
      } catch (error) {
        console.error("Error creating image snapshot:", error);
      } finally {
        this.cleanupRenderResult(renderResult);
      }
    }

    return this.cachedImage;
  }

  dispose(): void {
    this.cachedImage?.dispose();
    this.cachedImage = null;
  }
}

// Mirrors the event react-native-web synthesizes for onLayout.
const makeLayoutEvent = (
  x: number,
  y: number,
  width: number,
  height: number
): LayoutChangeEvent => ({
  timeStamp: Date.now(),
  nativeEvent: { layout: { x, y, width, height } },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  currentTarget: 0,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  target: 0,
  bubbles: false,
  cancelable: false,
  defaultPrevented: false,
  eventPhase: 0,
  isDefaultPrevented() {
    throw new Error("Method not supported on web.");
  },
  isPropagationStopped() {
    throw new Error("Method not supported on web.");
  },
  persist() {
    throw new Error("Method not supported on web.");
  },
  preventDefault() {
    throw new Error("Method not supported on web.");
  },
  stopPropagation() {
    throw new Error("Method not supported on web.");
  },
  isTrusted: true,
  type: "",
});

export interface SkiaPictureViewHandle {
  setPicture(picture: SkPicture): void;
  getSize(): { width: number; height: number };
  redraw(): void;
  makeImageSnapshot(rect?: SkRect): SkImage | null;
  measure(
    callback: (
      x: number,
      y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number
    ) => void
  ): void;
  measureInWindow(
    callback: (x: number, y: number, width: number, height: number) => void
  ): void;
}

export interface SkiaPictureViewProps extends SkiaPictureViewNativeProps {
  ref?: React.Ref<SkiaPictureViewHandle>;
}

export const SkiaPictureView = (props: SkiaPictureViewProps) => {
  const { ref, picture, onLayout } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const pictureRef = useRef<SkPicture | null>(null);
  // The rendering lifecycle deliberately does not depend on layout events:
  // - The renderer is created synchronously on mount (the canvas element is
  //   guaranteed to exist in useLayoutEffect; a zero size at that point is
  //   fine, the surface is created once the canvas is measurable).
  // - Redraw requests coalesce into a single microtask. A microtask (not an
  //   animation frame) so that a picture produced inside a rAF callback (the
  //   Reanimated mapper) is drawn before the current frame paints: deferring
  //   to the next rAF alternates between "flush pending in this frame" and
  //   "flush scheduled for the next frame", drawing on every other frame
  //   only and halving the effective frame rate. A picture dispatched before
  //   the canvas has a size stays in pictureRef (drawing while unmeasured is
  //   a no-op) and is painted by the resize path below once the canvas
  //   becomes measurable, so it is never lost.
  // - A ResizeObserver on the canvas itself recreates the surface and repaints
  //   synchronously (its callbacks run after layout, before paint), and is
  //   also the source of the user-facing onLayout event.
  const redrawPendingRef = useRef(false);
  const flushScheduledRef = useRef(false);
  const onLayoutRef = useRef(onLayout);
  useLayoutEffect(() => {
    onLayoutRef.current = onLayout;
  }, [onLayout]);

  const flushRedraw = useCallback(() => {
    flushScheduledRef.current = false;
    if (redrawPendingRef.current && rendererRef.current && pictureRef.current) {
      redrawPendingRef.current = false;
      rendererRef.current.draw(pictureRef.current);
    }
    // If the renderer or picture isn't available yet, the request stays
    // pending and is flushed by whichever arrives last.
  }, []);

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

  const makeImageSnapshot = useCallback((rect?: SkRect) => {
    if (rendererRef.current && pictureRef.current) {
      return rendererRef.current.makeImageSnapshot(pictureRef.current, rect);
    }
    return null;
  }, []);

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

  const isStatic = props.__destroyWebGLContextAfterRender === true;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const renderer = isStatic
      ? new StaticWebGLRenderer(canvas)
      : new WebGLRenderer(canvas);
    rendererRef.current = renderer;

    const drawPicture = () => {
      if (pictureRef.current) {
        redrawPendingRef.current = false;
        renderer.draw(pictureRef.current);
      }
    };

    // The renderer constructor already sized the surface from the current
    // layout, so the observer's initial delivery only repaints if the size
    // changed in between.
    let lastWidth = canvas.clientWidth;
    let lastHeight = canvas.clientHeight;
    let lastPixelDensity = window.devicePixelRatio;
    const resizeIfNeeded = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelDensity = window.devicePixelRatio;
      if (
        width === lastWidth &&
        height === lastHeight &&
        pixelDensity === lastPixelDensity
      ) {
        return;
      }
      lastWidth = width;
      lastHeight = height;
      lastPixelDensity = pixelDensity;
      renderer.onResize();
      drawPicture();
    };

    const observer = new ResizeObserver((entries) => {
      resizeIfNeeded();
      const layoutHandler = onLayoutRef.current;
      if (layoutHandler) {
        const { left, top, width, height } = entries[0].contentRect;
        // setTimeout 0 is taken from react-native-web (UIManager)
        setTimeout(
          () => layoutHandler(makeLayoutEvent(left, top, width, height)),
          0
        );
      }
    });
    observer.observe(canvas);

    // A pixel-density change with no CSS size change (browser zoom, moving
    // the window to another display) doesn't trigger the ResizeObserver:
    // watch it via matchMedia, re-arming the query for each new density.
    // This degrades gracefully where unsupported: without matchMedia or
    // MediaQueryList.addEventListener (older Safari), or where the query
    // never matches because the resolution feature is unknown (Safari < 16),
    // density-only changes simply don't repaint — everything else still does.
    let media: MediaQueryList | null = null;
    const onPixelDensityChange = () => {
      resizeIfNeeded();
      watchPixelDensity();
    };
    const watchPixelDensity = () => {
      media?.removeEventListener("change", onPixelDensityChange);
      media = null;
      if (typeof window.matchMedia === "function") {
        const query = window.matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`
        );
        if (typeof query.addEventListener === "function") {
          media = query;
          media.addEventListener("change", onPixelDensityChange);
        }
      }
    };
    watchPixelDensity();

    // Paint any picture that was dispatched before the renderer existed.
    drawPicture();

    return () => {
      observer.disconnect();
      media?.removeEventListener("change", onPixelDensityChange);
      rendererRef.current = null;
      renderer.dispose();
    };
  }, [isStatic]);

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
    const nativeID = props.nativeID ?? `${SkiaViewNativeId.current++}`;
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
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
    __destroyWebGLContextAfterRender: _isStatic,
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
