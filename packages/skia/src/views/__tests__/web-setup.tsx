/* global HTMLCanvasElement */
// Shared test doubles for the web views and surfaces: a CanvasKit, an
// OffscreenCanvas whose WebGL context can be lost and restored (the page's
// shared context lives on one), the 2D contexts of the view elements, a
// ResizeObserver and the display density.
import { act } from "react";

type ResizeObserverCallback = (
  entries: Array<{
    target: Element;
    contentRect: { left: number; top: number; width: number; height: number };
  }>
) => void;

export const resizeObservers: ResizeObserverMock[] = [];

export class ResizeObserverMock {
  targets: Element[] = [];
  constructor(public callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve(target: Element) {
    this.targets = this.targets.filter((t) => t !== target);
  }
  disconnect() {
    this.targets = [];
  }
}

export const canvasSize = { width: 0, height: 0 };

// A canvas owns at most one WebGL context for its whole lifetime. The
// context gets lost either on purpose (WEBGL_lose_context.loseContext()) or
// by the browser (a GPU reset, or evicting the oldest one past its per-page
// limit); either way isContextLost() flips right away while the
// webglcontextlost event is dispatched asynchronously, and the context is
// only ever restored, spontaneously or through
// WEBGL_lose_context.restoreContext(), if that event was preventDefault()ed.
// getExtension() returns null while the context is lost. See
// https://registry.khronos.org/webgl/specs/latest/1.0/ (section 5.15) and
// https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/
export class MockWebGLContext {
  drawingBufferColorSpace = "srgb";
  lost = false;
  restoreAllowed = false;

  constructor(readonly canvas: EventTarget) {}

  isContextLost() {
    return this.lost;
  }

  getExtension(name: string) {
    if (this.lost || name !== "WEBGL_lose_context") {
      return null;
    }
    return {
      loseContext: () => this.lose(),
      restoreContext: () => this.restore(),
    };
  }

  lose() {
    if (this.lost) {
      return;
    }
    this.lost = true;
    queueMicrotask(() => {
      const event = new Event("webglcontextlost", { cancelable: true });
      this.canvas.dispatchEvent(event);
      this.restoreAllowed = event.defaultPrevented;
    });
  }

  restore() {
    if (!this.lost || !this.restoreAllowed) {
      // INVALID_OPERATION in a browser: a GL error, not an exception.
      return;
    }
    queueMicrotask(() => {
      this.lost = false;
      this.canvas.dispatchEvent(new Event("webglcontextrestored"));
    });
  }
}

// The canvases made since the environment was reset; the shared context's
// is the first one.
export const offscreenCanvases: MockOffscreenCanvas[] = [];

export class MockOffscreenCanvas extends EventTarget {
  gl: MockWebGLContext | null = null;

  constructor(
    public width: number,
    public height: number
  ) {
    super();
    offscreenCanvases.push(this);
  }

  getContext(kind: string) {
    if (kind !== "webgl2") {
      return null;
    }
    if (!this.gl) {
      this.gl = new MockWebGLContext(this);
    }
    return this.gl;
  }
}

// The shared context, once a view or a surface has made it.
export const sharedContext = () => {
  const canvas = offscreenCanvases[0];
  if (!canvas?.gl) {
    throw new Error("No shared WebGL context has been made");
  }
  return canvas.gl;
};

export class Mock2DContext {
  globalCompositeOperation = "source-over";
  // The composite operation in effect at each drawImage() call.
  compositeOperations: string[] = [];
  drawImage = jest.fn(() => {
    this.compositeOperations.push(this.globalCompositeOperation);
  });

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly colorSpace: string | undefined
  ) {}

  // Sizing the canvas resets the context's state to its defaults.
  reset() {
    this.globalCompositeOperation = "source-over";
  }
}

// A canvas element is bound to one context kind for life.
export const contexts2D = new WeakMap<HTMLCanvasElement, Mock2DContext>();
export const webglContexts = new WeakMap<HTMLCanvasElement, MockWebGLContext>();

export function getContextMock(
  this: HTMLCanvasElement,
  kind: string,
  options?: { colorSpace?: string }
) {
  if (kind === "2d") {
    if (webglContexts.has(this)) {
      return null;
    }
    let ctx = contexts2D.get(this);
    if (!ctx) {
      ctx = new Mock2DContext(this, options?.colorSpace);
      contexts2D.set(this, ctx);
    }
    return ctx;
  }
  if (kind === "webgl2") {
    if (contexts2D.has(this)) {
      return null;
    }
    let ctx = webglContexts.get(this);
    if (!ctx) {
      ctx = new MockWebGLContext(this);
      webglContexts.set(this, ctx);
    }
    return ctx;
  }
  return null;
}

// The 2D context a view presents its frames through.
export const contextOf = (canvas: HTMLCanvasElement) => {
  const ctx = contexts2D.get(canvas);
  if (!ctx) {
    throw new Error("The canvas has no 2D context");
  }
  return ctx;
};

export const makeRawCanvas = () => ({
  clear: jest.fn(),
  save: jest.fn(),
  scale: jest.fn(),
  drawPicture: jest.fn(),
  drawColor: jest.fn(),
  restore: jest.fn(),
});

interface RawSurface {
  getCanvas: () => ReturnType<typeof makeRawCanvas>;
  flush: jest.Mock;
  delete: jest.Mock;
  dispose: jest.Mock;
  makeImageSnapshot: jest.Mock;
  width: () => number;
  height: () => number;
}

export const createCanvasKitMock = () => {
  const rawCanvas = makeRawCanvas();
  // Every surface made, in order.
  const rawSurfaces: RawSurface[] = [];
  const makeRawSurface = () => {
    const surface: RawSurface = {
      getCanvas: () => rawCanvas,
      flush: jest.fn(),
      delete: jest.fn(),
      dispose: jest.fn(),
      makeImageSnapshot: jest.fn(() => ({ __image: true, delete: jest.fn() })),
      width: () => 0,
      height: () => 0,
    };
    rawSurfaces.push(surface);
    return surface;
  };
  const grContext = {
    releaseResourcesAndAbandonContext: jest.fn(),
    delete: jest.fn(),
  };
  // Emscripten hands out an integer handle per GL context and keeps the
  // canvas it came from in its registry.
  const registry = new Map<number, MockOffscreenCanvas | HTMLCanvasElement>();
  let nextHandle = 1;
  const CanvasKitMock = {
    // Registers whatever context the canvas already has under a fresh
    // handle, lost or not (#3976), so the "Could not create a WebGL context"
    // guard never fires for a lost context.
    GetWebGLContext: jest.fn((canvas: MockOffscreenCanvas) => {
      canvas.getContext("webgl2");
      const handle = nextHandle++;
      registry.set(handle, canvas);
      return handle;
    }),
    MakeWebGLContext: jest.fn((handle: number) => {
      const canvas = registry.get(handle);
      // MakeWebGLContext starts by making the handle current, and returns
      // null if it is not in the registry (never created, or deleted).
      if (!canvas) {
        return null;
      }
      const gl = canvas.getContext("webgl2") as MockWebGLContext;
      if (gl.lost) {
        // Building a GrDirectContext reads the GL version string, which is
        // null on a lost context: a null-pointer fault inside wasm (the
        // "rangeMin" RuntimeError in #3976).
        throw new Error("RuntimeError: null function or function signature");
      }
      return grContext;
    }),
    MakeOnScreenGLSurface: jest.fn((_ctx, width, height) =>
      width === 0 || height === 0 ? null : makeRawSurface()
    ),
    MakeRenderTarget: jest.fn((_ctx, width, height) =>
      width === 0 || height === 0 ? null : makeRawSurface()
    ),
    MakeSurface: jest.fn(() => makeRawSurface()),
    // Unregistering the context is what releases the canvas that
    // CanvasKit's GL registry retained in #3924.
    deleteContext: jest.fn((handle: number) => {
      registry.delete(handle);
    }),
    ColorSpace: { SRGB: "srgb" },
    TRANSPARENT: Float32Array.of(0, 0, 0, 0),
    XYWHRect: (x: number, y: number, w: number, h: number) =>
      Float32Array.of(x, y, x + w, y + h),
    // Records nothing; finishing hands out a fresh raw picture each time.
    PictureRecorder: class {
      recordingCanvas = makeRawCanvas();
      beginRecording = jest.fn(() => this.recordingCanvas);
      finishRecordingAsPicture = jest.fn(() => ({
        __recorded: true,
        delete: jest.fn(),
        isDeleted: () => false,
      }));
      delete = jest.fn();
    },
  };
  return { CanvasKitMock, rawCanvas, rawSurfaces, grContext, registry };
};

export const installCanvasKit = () => {
  const mock = createCanvasKitMock();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).CanvasKit = mock.CanvasKitMock;
  return mock;
};

export const fakePicture = { ref: { __picture: true }, dispose: jest.fn() };

export const display = { pixelDensity: 1 };
export const mediaQueryListeners: Array<() => void> = [];

export const installWebEnvironment = () => {
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
    configurable: true,
    get: () => canvasSize.width,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
    configurable: true,
    get: () => canvasSize.height,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = getContextMock as any;
  // Setting a canvas's size (even to the same value) clears its bitmap and
  // resets its 2D context's state.
  for (const dimension of ["width", "height"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      dimension
    )!;
    Object.defineProperty(HTMLCanvasElement.prototype, dimension, {
      configurable: true,
      get: descriptor.get,
      set(this: HTMLCanvasElement, value: number) {
        descriptor.set!.call(this, value);
        contexts2D.get(this)?.reset();
      },
    });
  }
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    get: () => display.pixelDensity,
  });
  window.matchMedia = ((query: string) => ({
    query,
    addEventListener: (_type: string, cb: () => void) => {
      mediaQueryListeners.push(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      const index = mediaQueryListeners.indexOf(cb);
      if (index !== -1) {
        mediaQueryListeners.splice(index, 1);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ResizeObserver = ResizeObserverMock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).OffscreenCanvas = MockOffscreenCanvas;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).IS_REACT_ACT_ENVIRONMENT = true;
};

export const resetWebEnvironment = () => {
  resizeObservers.length = 0;
  mediaQueryListeners.length = 0;
  offscreenCanvases.length = 0;
  canvasSize.width = 0;
  canvasSize.height = 0;
  display.pixelDensity = 1;
};

// Delivers a ResizeObserver entry for the current canvas size.
export const deliverResize = () => {
  const observer = resizeObservers[resizeObservers.length - 1];
  act(() => {
    observer.callback([
      {
        target: observer.targets[0],
        contentRect: {
          left: 0,
          top: 0,
          width: canvasSize.width,
          height: canvasSize.height,
        },
      },
    ]);
  });
};

// Lets pending microtasks (draw flushes, WebGL context events) run.
export const flushMicrotasks = () => act(async () => {});

// Lets pending zero-delay timers run too.
export const flushTimers = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 0)));
