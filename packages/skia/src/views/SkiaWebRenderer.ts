/* global HTMLCanvasElement, ResizeObserver, MediaQueryList */
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import type { GrDirectContext, WebGLContextHandle } from "canvaskit-wasm";

import type { SkRect, SkPicture, SkImage } from "../skia/types";
import { JsiSkSurface } from "../skia/web/JsiSkSurface";

// The WebGL renderers behind the web view (SkiaView.web):
// a <canvas> element, its WebGL context and the CanvasKit surface built on
// it, with the context-loss handling and the "destroy the context after each
// draw" mode that keeps a page under the browser's live-context limit.

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

/**
 * What a view paints: pictures in points, replayed in order onto a cleared
 * surface.
 */
export type WebFrame = SkPicture[];

export interface Renderer {
  onResize(): void;
  /**
   * Paints the frame. Returns false when there is nothing to paint on yet
   * (the canvas is unmeasured, the context is lost): the caller keeps the
   * frame for the next opportunity.
   */
  draw(frame: WebFrame): boolean;
  makeImageSnapshot(frame: WebFrame, rect?: SkRect): SkImage | null;
  dispose(): void;
}

// A <canvas> element owns at most one WebGL context for its whole lifetime.
// A renderer, on the other hand, lives as long as the layout effect that
// creates it, which is shorter: React re-runs layout effects on a *preserved*
// host node under StrictMode's DEV double-invoke and when an Activity/offscreen
// subtree is hidden and revealed (#3976). What belongs to the element rather
// than to a renderer is tracked here, per element:
// - the context, so that a new renderer can tell whether the element already
//   has one (and whether it is lost) without calling getContext() itself,
//   which on a fresh element would create a context with the wrong attributes
//   (CanvasKit.GetWebGLContext requests its own);
// - the WEBGL_lose_context extension, captured while the context is healthy:
//   getExtension() returns null on a lost context, and this object is the only
//   way to lose a context on purpose or to ask the browser to restore one;
// - whether the browser has announced the loss of the context yet: a lost
//   context can only be restored once its webglcontextlost event has been
//   dispatched, and that event is asynchronous;
// - the renderer currently attached to the element, if any.
interface CanvasWebGL {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  // The WEBGL_lose_context extension.
  loseContext: { loseContext(): void; restoreContext(): void } | null;
  lossAnnounced: boolean;
  owner: WebGLRenderer | null;
}
const canvasWebGL = new WeakMap<HTMLCanvasElement, CanvasWebGL>();

// Unregisters a context from CanvasKit's registry, which otherwise retains the
// canvas element (and its detached DOM tree) forever (#3924).
const deleteContextHandle = (handle: WebGLContextHandle) => {
  CanvasKit.deleteContext(handle);
  // Making the now-deleted handle current clears CanvasKit's current-context
  // globals (GLctx/Module.ctx), which would otherwise keep referencing the
  // context (and the canvas) until another surface becomes current. With a
  // deleted handle this is a no-op that returns null without creating
  // anything.
  CanvasKit.MakeWebGLContext(handle);
};

export class WebGLRenderer implements Renderer {
  private surface: JsiSkSurface | null = null;
  private grContext: GrDirectContext | null = null;
  private contextHandle: WebGLContextHandle = 0;
  private pd = 1;
  // Set while the renderer is waiting for a lost context to be restored.
  private restoreWanted = false;
  private restoreRequest: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    // Called when the renderer becomes able to paint again and the current
    // frame should be drawn.
    private requestRedraw: () => void
  ) {
    const entry = canvasWebGL.get(canvas);
    if (entry) {
      entry.owner = this;
    }
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.acquire();
  }

  // Builds the GrDirectContext and the surface on the element's WebGL
  // context, creating the context first if the element has none.
  private acquire() {
    const { canvas } = this;
    const known = canvasWebGL.get(canvas);
    if (known?.gl.isContextLost()) {
      // Nothing can be built on a lost context: CanvasKit.GetWebGLContext
      // happily registers it, and MakeWebGLContext then faults inside wasm
      // (#3976). Ask the browser for it back and finish in onContextRestored;
      // if the loss hasn't been announced yet, onContextLost asks.
      this.restoreWanted = true;
      if (known.lossAnnounced) {
        known.loseContext?.restoreContext();
      }
      return;
    }
    const handle = CanvasKit.GetWebGLContext(canvas);
    if (!handle) {
      throw new Error("Could not create a WebGL context");
    }
    const entry = known ?? this.trackContext();
    let grContext: GrDirectContext | null = null;
    try {
      grContext = CanvasKit.MakeWebGLContext(handle);
    } finally {
      if (!grContext) {
        // Whether it returned null or threw, don't leave the registry
        // holding on to the canvas.
        deleteContextHandle(handle);
      }
    }
    if (!grContext) {
      throw new Error("Could not create a graphics context");
    }
    this.restoreWanted = false;
    this.contextHandle = handle;
    this.grContext = grContext;
    if (entry) {
      entry.gl.drawingBufferColorSpace = "display-p3";
    }
    this.onResize();
  }

  // CanvasKit just created the element's context; asking for it again hands
  // back the same object (the attributes are only honored the first time).
  private trackContext(): CanvasWebGL | null {
    const { canvas } = this;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return null;
    }
    const entry: CanvasWebGL = {
      gl,
      loseContext: gl.getExtension("WEBGL_lose_context"),
      lossAnnounced: false,
      owner: this,
    };
    canvasWebGL.set(canvas, entry);
    // Browsers restore a lost context (evicted as the oldest one when the
    // page exceeds the active-context limit, or lost to a GPU reset) only if
    // the page called preventDefault() on the webglcontextlost event. A
    // renderer isn't necessarily attached when that happens (the canvas may
    // be in a hidden Activity), so these listeners live as long as the
    // element does. They are registered ahead of any renderer's, and the
    // loss can't be announced before they exist since the event is
    // asynchronous.
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      entry.lossAnnounced = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      entry.lossAnnounced = false;
    });
    return entry;
  }

  // Frees everything built on the context. The context itself belongs to the
  // element, see dispose().
  private release() {
    this.surface?.ref.delete();
    this.surface = null;
    if (this.grContext) {
      this.grContext.releaseResourcesAndAbandonContext();
      this.grContext.delete();
      this.grContext = null;
    }
    if (this.contextHandle) {
      deleteContextHandle(this.contextHandle);
      this.contextHandle = 0;
    }
  }

  private isContextLost() {
    return canvasWebGL.get(this.canvas)?.gl.isContextLost() ?? false;
  }

  private onContextLost = () => {
    // The browser already dropped every GL object; drop our references to
    // them. Restoration is left to the browser (it restores an evicted
    // context as soon as a slot frees up), except when this renderer was
    // built on an already-lost context and is waiting to paint for the first
    // time: chasing an eviction from here would evict the next-oldest context
    // in turn, and with more live canvases than the browser allows the
    // canvases would endlessly evict each other.
    this.release();
    if (this.restoreWanted) {
      // The permission granted by preventDefault() is only recorded by the
      // browser once the event dispatch is over: a restoreContext() call
      // from inside the handler is refused, so ask from a later task.
      this.restoreRequest = setTimeout(() => {
        this.restoreRequest = null;
        canvasWebGL.get(this.canvas)?.loseContext?.restoreContext();
      }, 0);
    }
  };

  private onContextRestored = () => {
    this.acquire();
    this.requestRedraw();
  };

  makeImageSnapshot(frame: WebFrame, rect?: SkRect): SkImage | null {
    if (!this.surface || this.isContextLost()) {
      return null;
    }
    const canvas = this.surface.getCanvas();
    canvas!.clear(CanvasKit.TRANSPARENT);
    this.draw(frame);
    this.surface.ref.flush();
    return this.surface.makeImageSnapshot(dp2Pixel(this.pd, rect));
  }

  onResize() {
    const { canvas } = this;
    if (!this.grContext || this.isContextLost()) {
      // Waiting for the context to be restored (the restore path resizes),
      // or the loss hasn't been announced yet and onContextLost is about to
      // release everything: either way there is nothing to build on.
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

  draw(frame: WebFrame) {
    if (!this.surface || this.isContextLost()) {
      return false;
    }
    const canvas = this.surface.getCanvas();
    canvas.clear(Float32Array.of(0, 0, 0, 0));
    canvas.save();
    canvas.scale(this.pd, this.pd);
    for (const picture of frame) {
      canvas.drawPicture(picture);
    }
    canvas.restore();
    this.surface.ref.flush();
    return true;
  }

  dispose(): void {
    const { canvas } = this;
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    if (this.restoreRequest !== null) {
      clearTimeout(this.restoreRequest);
      this.restoreRequest = null;
    }
    this.restoreWanted = false;
    this.release();
    // Free the drawing buffer, which CanvasKit requests with depth and stencil
    // attachments (about 8 bytes per pixel): a canvas that stays in the
    // document without a renderer, hidden in an Activity say, would otherwise
    // keep a full-size buffer around. The next renderer's onResize() sizes it
    // again.
    canvas.width = 0;
    canvas.height = 0;
    const entry = canvasWebGL.get(canvas);
    if (!entry) {
      return;
    }
    entry.owner = null;
    // Whether the element is going away is only known once the commit is
    // over: on a real unmount React runs this cleanup *before* removing the
    // node from the document, while StrictMode's double-invoke and an
    // Activity hide keep the node in place (and the former builds the next
    // renderer on it right away). Losing the context of a detached element
    // matters: it would otherwise stay alive until the element is garbage
    // collected, and browsers cap the number of live contexts per page
    // (16 in Chrome, which then evicts the oldest one, visible or not).
    queueMicrotask(() => {
      if (
        entry.owner === null &&
        !canvas.isConnected &&
        !entry.gl.isContextLost()
      ) {
        entry.loseContext?.loseContext();
      }
    });
  }
}

interface TempRenderResult {
  surface: JsiSkSurface;
  tempCanvas: OffscreenCanvas;
  grContext: GrDirectContext;
  contextHandle: WebGLContextHandle;
}

export class StaticWebGLRenderer implements Renderer {
  private cachedImage: SkImage | null = null;
  private pd = 1;

  constructor(private canvas: HTMLCanvasElement) {}

  onResize(): void {
    this.cachedImage = null;
  }

  private renderFrameToSurface(frame: WebFrame): TempRenderResult | null {
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
      for (const picture of frame) {
        skiaCanvas.drawPicture(picture);
      }
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

  draw(frame: WebFrame) {
    const renderResult = this.renderFrameToSurface(frame);
    if (!renderResult) {
      return false;
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
    return true;
  }

  makeImageSnapshot(frame: WebFrame, rect?: SkRect): SkImage | null {
    if (!this.cachedImage) {
      const renderResult = this.renderFrameToSurface(frame);
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
export const makeLayoutEvent = (
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

export interface WebRendererHost {
  /**
   * Paints the view's current content, if any, on a renderer that just got
   * (or got back) a surface: after a resize, a density change or a restored
   * context.
   */
  paint: (renderer: Renderer) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Owns a renderer for the given <canvas> element for as long as the view is
 * mounted, and keeps its surface in step with the element's size and the
 * display's pixel density.
 *
 * The rendering lifecycle deliberately does not depend on layout events:
 * - The renderer is created synchronously on mount (the canvas element is
 *   guaranteed to exist in useLayoutEffect; a zero size at that point is
 *   fine, the surface is created once the canvas is measurable).
 * - A ResizeObserver on the canvas itself recreates the surface and repaints
 *   synchronously (its callbacks run after layout, before paint), and is
 *   also the source of the user-facing onLayout event.
 * - The renderer belongs to the layout effect, the WebGL context to the
 *   <canvas> element, whose lifetime is longer; see WebGLRenderer for how
 *   the two are reconciled.
 */
export const useSkiaWebRenderer = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  isStatic: boolean,
  host: WebRendererHost
): RefObject<Renderer | null> => {
  const rendererRef = useRef<Renderer | null>(null);
  const hostRef = useRef(host);
  useLayoutEffect(() => {
    hostRef.current = host;
  }, [host]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const renderer: Renderer = isStatic
      ? new StaticWebGLRenderer(canvas)
      : new WebGLRenderer(canvas, () => hostRef.current.paint(renderer));
    rendererRef.current = renderer;

    const paint = () => hostRef.current.paint(renderer);

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
      paint();
    };

    const observer = new ResizeObserver((entries) => {
      resizeIfNeeded();
      const layoutHandler = hostRef.current.onLayout;
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

    // Paint any content that was dispatched before the renderer existed.
    paint();

    return () => {
      observer.disconnect();
      media?.removeEventListener("change", onPixelDensityChange);
      rendererRef.current = null;
      renderer.dispose();
    };
  }, [canvasRef, isStatic]);

  return rendererRef;
};
