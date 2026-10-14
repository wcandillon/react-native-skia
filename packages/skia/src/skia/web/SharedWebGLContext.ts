/* global OffscreenCanvas */
import type {
  CanvasKit,
  GrDirectContext,
  WebGLContextHandle,
} from "canvaskit-wasm";

import { JsiSkSurface } from "./JsiSkSurface";

// One WebGL context per CanvasKit instance, shared by every <Canvas> on the
// page (SkiaWebRenderer) and every offscreen surface (JsiSkSurfaceFactory).
//
// Browsers cap the number of live WebGL contexts per page (16 in Chrome,
// which then evicts the oldest one, visible or not), and a context per
// <canvas> element and per offscreen surface used to run into that cap. The
// shared context lives on a canvas of its own that is never shown: a view
// draws its frame on that canvas's drawing buffer and copies it onto its own
// element (present()), an offscreen surface is a texture. Sharing also lets
// the snapshot of any surface be drawn on any other, which a texture from
// another context can't be.
//
// The drawing buffer only ever grows, to the largest view so far, and a view
// draws in its bottom-left corner: resizing the buffer reallocates it, which
// costs about 0.7 ms, while copying a corner out of it costs about 0.01 ms
// (measured on Chrome; handing the buffer over with transferToImageBitmap
// is as cheap, but it has to be the view's size).
//
// What is left to lose the context is a GPU reset (or WEBGL_lose_context, in
// tests). The browser restores it once it can, provided the loss was
// acknowledged (preventDefault on webglcontextlost). Everything built on the
// context is gone by then and gets rebuilt: the views repaint through
// onRestored(), and an offscreen surface the app kept reports itself dead
// (see JsiSkSurface).

export type SharedCanvas = OffscreenCanvas | HTMLCanvasElement;
type GL = WebGLRenderingContext | WebGL2RenderingContext;

/**
 * Tells whether the context a surface was built on is still the live one.
 */
export interface ContextLease {
  isAlive(): boolean;
}

// Unregisters a context from CanvasKit's registry, which otherwise retains
// the canvas (and, for an element, its detached DOM tree) forever (#3924).
export const deleteContextHandle = (
  CanvasKit: CanvasKit,
  handle: WebGLContextHandle
) => {
  CanvasKit.deleteContext(handle);
  // Making the now-deleted handle current clears CanvasKit's current-context
  // globals (GLctx/Module.ctx), which would otherwise keep referencing the
  // context until another one becomes current. With a deleted handle this is
  // a no-op that returns null without creating anything.
  CanvasKit.MakeWebGLContext(handle);
};

// A render target is a texture of its own and a view's frame is handed over
// right after it is drawn: the canvas only has to exist, its size is set by
// whatever is being drawn.
const makeSharedCanvas = (): SharedCanvas | null => {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(1, 1);
  }
  if (typeof document !== "undefined") {
    return document.createElement("canvas");
  }
  return null;
};

// The WebGL context getters of the two canvas kinds are the same.
const getGL = (canvas: SharedCanvas): GL | null => {
  const element = canvas as HTMLCanvasElement;
  return element.getContext("webgl2") ?? element.getContext("webgl");
};

// Surfaces on the drawing buffer are kept per size: a page that animates a
// few views of different sizes reuses them every frame.
const MAX_SCREENS = 8;

export class SharedWebGLContext {
  readonly gl: GL;
  private handle: WebGLContextHandle = 0;
  private grContext: GrDirectContext | null = null;
  // Counts the GrDirectContexts built so far: a surface built on an earlier
  // one is dead.
  private generation = 0;
  // The surfaces wrapping the drawing buffer, by "width x height", oldest
  // first.
  private readonly screens = new Map<string, JsiSkSurface>();
  private readonly restoreListeners = new Set<() => void>();

  constructor(
    private readonly CanvasKit: CanvasKit,
    readonly canvas: SharedCanvas
  ) {
    const handle = this.createHandle();
    // CanvasKit just created the context (with the attributes it wants);
    // asking for it again hands back the same object.
    const gl = getGL(canvas);
    if (!gl) {
      deleteContextHandle(CanvasKit, handle);
      throw new Error("Could not create a WebGL context");
    }
    this.gl = gl;
    this.build(handle);
    const target = canvas as EventTarget;
    target.addEventListener("webglcontextlost", (event) => {
      // Browsers only restore a lost context if the page asked for it by
      // cancelling the event.
      event.preventDefault();
      this.release();
    });
    target.addEventListener("webglcontextrestored", () => {
      this.build(this.createHandle());
      this.restoreListeners.forEach((listener) => listener());
    });
  }

  // Registers the canvas's context with CanvasKit, creating the context the
  // first time. Emscripten enables the extensions and caches their objects
  // per registration, and a context loss invalidates both: a restored
  // context is registered anew.
  private createHandle() {
    const handle = this.CanvasKit.GetWebGLContext(this.canvas);
    if (!handle) {
      throw new Error("Could not create a WebGL context");
    }
    return handle;
  }

  private build(handle: WebGLContextHandle) {
    let grContext: GrDirectContext | null = null;
    try {
      grContext = this.CanvasKit.MakeWebGLContext(handle);
    } finally {
      if (!grContext) {
        // Whether it returned null or threw, don't leave the registry
        // holding on to the canvas.
        deleteContextHandle(this.CanvasKit, handle);
      }
    }
    if (!grContext) {
      throw new Error("Could not create a graphics context");
    }
    this.handle = handle;
    this.grContext = grContext;
    this.generation++;
    // Wide gamut where the display has it. Surfaces stay tagged sRGB, so
    // their colors land in the buffer as they are and the display shows its
    // own primaries for them.
    this.gl.drawingBufferColorSpace = "display-p3";
  }

  // Frees everything built on the context. The GL objects are already gone
  // when the browser took the context away; what is released here is what
  // CanvasKit and Skia hold.
  private release() {
    if (this.grContext) {
      this.grContext.releaseResourcesAndAbandonContext();
    }
    this.deleteScreens();
    if (this.grContext) {
      this.grContext.delete();
      this.grContext = null;
    }
    if (this.handle) {
      deleteContextHandle(this.CanvasKit, this.handle);
      this.handle = 0;
    }
  }

  /**
   * The graphics context to build surfaces on, or null while the WebGL
   * context is lost (the browser restores it, see onRestored()).
   */
  getGrContext(): GrDirectContext | null {
    // Between the loss and its event, the context is gone but not released
    // yet: nothing can be built on it either way.
    if (!this.grContext || this.gl.isContextLost()) {
      return null;
    }
    return this.grContext;
  }

  private deleteScreens() {
    this.screens.forEach((screen) => screen.ref.delete());
    this.screens.clear();
  }

  /**
   * A surface of the given size on the canvas's drawing buffer, in its
   * bottom-left corner. The buffer holds one frame at a time: draw, flush,
   * then present() it before the next draw.
   */
  acquireScreen(width: number, height: number): JsiSkSurface | null {
    const grContext = this.getGrContext();
    if (!grContext) {
      return null;
    }
    const { canvas, screens } = this;
    if (canvas.width < width || canvas.height < height) {
      // Sizing the canvas reallocates the buffer: the surfaces on it are
      // rebuilt.
      this.deleteScreens();
      canvas.width = Math.max(canvas.width, width);
      canvas.height = Math.max(canvas.height, height);
    }
    const key = `${width}x${height}`;
    const known = screens.get(key);
    if (known) {
      return known;
    }
    const surface = this.CanvasKit.MakeOnScreenGLSurface(
      grContext,
      width,
      height,
      this.CanvasKit.ColorSpace.SRGB
    );
    if (!surface) {
      throw new Error("Could not create surface");
    }
    if (screens.size === MAX_SCREENS) {
      const oldest = screens.keys().next().value!;
      screens.get(oldest)!.ref.delete();
      screens.delete(oldest);
    }
    const screen = new JsiSkSurface(this.CanvasKit, surface);
    screens.set(key, screen);
    return screen;
  }

  /**
   * Copies the frame just drawn on a surface of that size onto a view's
   * element.
   */
  present(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const { canvas } = this;
    ctx.drawImage(
      canvas,
      0,
      canvas.height - height,
      width,
      height,
      0,
      0,
      width,
      height
    );
  }

  /**
   * A lease on the current context, for a surface built on it now.
   */
  lease(): ContextLease {
    const { generation } = this;
    return {
      isAlive: () =>
        generation === this.generation && this.getGrContext() !== null,
    };
  }

  /**
   * Calls the listener each time the context was lost and is back, with
   * everything built on the old one gone. Returns the unsubscribe function.
   */
  onRestored(listener: () => void) {
    this.restoreListeners.add(listener);
    return () => {
      this.restoreListeners.delete(listener);
    };
  }
}

const contexts = new WeakMap<CanvasKit, SharedWebGLContext>();

/**
 * The context shared by the page, created on first use. Null where no canvas
 * can be made (Node), throws where WebGL is unavailable.
 */
export const getSharedWebGLContext = (CanvasKit: CanvasKit) => {
  let shared = contexts.get(CanvasKit);
  if (!shared) {
    const canvas = makeSharedCanvas();
    if (!canvas) {
      return null;
    }
    shared = new SharedWebGLContext(CanvasKit, canvas);
    contexts.set(CanvasKit, shared);
  }
  return shared;
};

/**
 * The shared context if the page has made one already (test hook).
 */
export const peekSharedWebGLContext = (CanvasKit: CanvasKit) =>
  contexts.get(CanvasKit) ?? null;
