/* global HTMLCanvasElement, ResizeObserver, MediaQueryList */
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";

import type { SkRect, SkPicture, SkImage } from "../skia/types";
import { getSharedWebGLContext } from "../skia/web/SharedWebGLContext";
import type { SharedWebGLContext } from "../skia/web/SharedWebGLContext";

// The renderer behind the web view (SkiaView.web). A view's <canvas> element
// owns no WebGL context: its frame is drawn on the context the page shares
// (SharedWebGLContext) and copied onto the element through a 2D context.
// That keeps the page at one WebGL context however many views it has, and
// makes a snapshot of any view or surface drawable by any other.

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

export class WebGLRenderer implements Renderer {
  private readonly shared: SharedWebGLContext;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly unsubscribe: () => void;
  private pd = 1;
  // The element's size in pixels.
  private width = 0;
  private height = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    // Called when the renderer becomes able to paint again and the current
    // frame should be drawn.
    requestRedraw: () => void
  ) {
    const shared = getSharedWebGLContext(CanvasKit);
    if (!shared) {
      throw new Error("Could not create a WebGL context");
    }
    this.shared = shared;
    // Wide gamut, like the shared drawing buffer the frame comes from (see
    // SharedWebGLContext); ignored where unsupported, which then converts
    // the frame to sRGB.
    const ctx = canvas.getContext("2d", { colorSpace: "display-p3" });
    if (!ctx) {
      throw new Error("Could not create a 2D context");
    }
    this.ctx = ctx;
    // A GPU reset lost the frame on screen: paint it again.
    this.unsubscribe = shared.onRestored(requestRedraw);
    this.onResize();
  }

  onResize() {
    const { canvas } = this;
    this.pd = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * this.pd);
    const height = Math.floor(canvas.clientHeight * this.pd);
    if (width === this.width && height === this.height) {
      return;
    }
    this.width = width;
    this.height = height;
    // Sizing the element clears it; the view repaints after a resize.
    canvas.width = width;
    canvas.height = height;
  }

  // Draws the frame on the shared drawing buffer, at the element's size.
  // Returns null when there is nothing to draw on: the canvas hasn't been
  // laid out yet (or is hidden; the view's ResizeObserver calls us again as
  // soon as it has a size), or the context is lost (the view repaints once
  // it is restored).
  private render(frame: WebFrame) {
    const { width, height, pd } = this;
    if (width === 0 || height === 0) {
      return null;
    }
    const surface = this.shared.acquireScreen(width, height);
    if (!surface) {
      return null;
    }
    const canvas = surface.getCanvas();
    canvas.clear(CanvasKit.TRANSPARENT);
    canvas.save();
    canvas.scale(pd, pd);
    for (const picture of frame) {
      canvas.drawPicture(picture);
    }
    canvas.restore();
    surface.flush();
    return surface;
  }

  draw(frame: WebFrame) {
    const surface = this.render(frame);
    if (!surface) {
      return false;
    }
    // Each frame replaces the previous one, transparent pixels included.
    // Set on every frame: sizing the element resets the context's state.
    this.ctx.globalCompositeOperation = "copy";
    this.shared.present(this.ctx, this.width, this.height);
    return true;
  }

  makeImageSnapshot(frame: WebFrame, rect?: SkRect): SkImage | null {
    const surface = this.render(frame);
    if (!surface) {
      return null;
    }
    return surface.makeImageSnapshot(dp2Pixel(this.pd, rect));
  }

  dispose(): void {
    this.unsubscribe();
    // Free the element's bitmap (4 bytes per pixel): a canvas that stays in
    // the document without a renderer, hidden in an Activity say, would
    // otherwise keep a full-size one. The next renderer's onResize() sizes
    // it again.
    this.width = 0;
    this.height = 0;
    this.canvas.width = 0;
    this.canvas.height = 0;
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
 * mounted, and keeps its size in step with the element's and the display's
 * pixel density.
 *
 * The rendering lifecycle deliberately does not depend on layout events:
 * - The renderer is created synchronously on mount (the canvas element is
 *   guaranteed to exist in useLayoutEffect; a zero size at that point is
 *   fine, the view paints once the canvas is measurable).
 * - A ResizeObserver on the canvas itself resizes and repaints
 *   synchronously (its callbacks run after layout, before paint), and is
 *   also the source of the user-facing onLayout event.
 * - The renderer belongs to the layout effect, which React re-runs on a
 *   preserved element under StrictMode's DEV double-invoke and when an
 *   Activity/offscreen subtree is hidden and revealed (#3976). The element
 *   holds nothing a renderer has to take over: a new renderer just sizes it
 *   and paints.
 */
export const useSkiaWebRenderer = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
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
    const renderer: Renderer = new WebGLRenderer(canvas, () =>
      hostRef.current.paint(renderer)
    );
    rendererRef.current = renderer;

    const paint = () => hostRef.current.paint(renderer);

    // The renderer constructor already sized the element from the current
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
    // density-only changes simply don't repaint, everything else still does.
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
  }, [canvasRef]);

  return rendererRef;
};
