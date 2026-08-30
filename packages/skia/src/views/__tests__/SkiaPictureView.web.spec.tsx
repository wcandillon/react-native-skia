/**
 * @jest-environment jsdom
 */
/* global HTMLCanvasElement */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import type { SkPicture } from "../../skia/types";
import type { ISkiaViewApiWeb } from "../../specs/NativeSkiaModule.web";
// Installs global.SkiaViewApi
import "../../specs/NativeSkiaModule.web";
import { SkiaPictureView } from "../SkiaPictureView.web";

// The view must paint without ever receiving a layout event (#3829):
// these tests mount it with a mocked CanvasKit and never fire the
// ResizeObserver unless the test does so explicitly.

// Resolve the Platform module to its web implementation, as a web bundler
// would (the native one imports react-native, which jest cannot parse).
jest.mock("../../Platform", () => require("../../Platform/Platform.web"));

type ResizeObserverCallback = (
  entries: Array<{
    target: Element;
    contentRect: { left: number; top: number; width: number; height: number };
  }>
) => void;

const resizeObservers: ResizeObserverMock[] = [];

class ResizeObserverMock {
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

const canvasSize = { width: 0, height: 0 };

const makeRawCanvas = () => ({
  clear: jest.fn(),
  save: jest.fn(),
  scale: jest.fn(),
  drawPicture: jest.fn(),
  restore: jest.fn(),
});

const createCanvasKitMock = () => {
  const rawCanvas = makeRawCanvas();
  const rawSurface = {
    getCanvas: () => rawCanvas,
    flush: jest.fn(),
    delete: jest.fn(),
    dispose: jest.fn(),
  };
  const grContext = {
    releaseResourcesAndAbandonContext: jest.fn(),
    delete: jest.fn(),
  };
  const CanvasKitMock = {
    GetWebGLContext: jest.fn(() => 1),
    MakeWebGLContext: jest.fn(() => grContext),
    MakeOnScreenGLSurface: jest.fn((_ctx, width, height) =>
      width === 0 || height === 0 ? null : rawSurface
    ),
    deleteContext: jest.fn(),
    ColorSpace: { SRGB: "srgb" },
    TRANSPARENT: Float32Array.of(0, 0, 0, 0),
  };
  return { CanvasKitMock, rawCanvas, rawSurface };
};

const fakePicture = { ref: { __picture: true }, dispose: jest.fn() };

const display = { pixelDensity: 1 };
const mediaQueryListeners: Array<() => void> = [];

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
    configurable: true,
    get: () => canvasSize.width,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
    configurable: true,
    get: () => canvasSize.height,
  });
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
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
  (global as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  resizeObservers.length = 0;
  mediaQueryListeners.length = 0;
  canvasSize.width = 0;
  canvasSize.height = 0;
  display.pixelDensity = 1;
});

const mountView = (nativeID: string, onLayout?: () => void) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <SkiaPictureView
        nativeID={nativeID}
        onLayout={onLayout}
        style={{ width: 360, height: 520 }}
      />
    );
  });
  return {
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe("SkiaPictureView.web", () => {
  it("paints a picture without ever receiving a layout event", async () => {
    const { CanvasKitMock, rawCanvas } = createCanvasKitMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CanvasKit = CanvasKitMock;
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("1");
    // The renderer and its surface exist right after mount.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);

    // Dispatch a picture the way the reconciler does — note that no
    // ResizeObserver entry has been delivered at this point. The draw is
    // flushed from a microtask, hence the async act.
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    await act(async () => {
      api.setJsiProperty(1, "picture", fakePicture as unknown as SkPicture);
    });
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    view.unmount();
    expect(CanvasKitMock.deleteContext).toHaveBeenCalledWith(1);
  });

  it("holds a picture dispatched while unmeasured and paints it on first resize", async () => {
    const { CanvasKitMock, rawCanvas } = createCanvasKitMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CanvasKit = CanvasKitMock;

    const view = mountView("2");
    // No measurable size yet: the renderer exists but has no surface.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).not.toHaveBeenCalled();

    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    await act(async () => {
      api.setJsiProperty(2, "picture", fakePicture as unknown as SkPicture);
    });
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    // The canvas gets its size: the observer delivery must create the
    // surface and paint the held picture synchronously.
    canvasSize.width = 360;
    canvasSize.height = 520;
    const observer = resizeObservers[resizeObservers.length - 1];
    act(() => {
      observer.callback([
        {
          target: observer.targets[0],
          contentRect: { left: 0, top: 0, width: 360, height: 520 },
        },
      ]);
    });
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    view.unmount();
  });

  it("recreates the surface at the new density when the pixel density changes", async () => {
    const { CanvasKitMock, rawCanvas } = createCanvasKitMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CanvasKit = CanvasKitMock;
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("4");
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    await act(async () => {
      api.setJsiProperty(4, "picture", fakePicture as unknown as SkPicture);
    });
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenLastCalledWith(
      expect.anything(),
      360,
      520,
      "srgb"
    );

    // Browser zoom / moving to another display: the density changes while
    // the CSS size stays identical, so only the matchMedia watcher fires.
    display.pixelDensity = 2;
    rawCanvas.drawPicture.mockClear();
    act(() => {
      mediaQueryListeners.slice().forEach((cb) => cb());
    });
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenLastCalledWith(
      expect.anything(),
      720,
      1040,
      "srgb"
    );
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    view.unmount();
  });

  it("fires onLayout from the resize observer", async () => {
    const { CanvasKitMock } = createCanvasKitMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CanvasKit = CanvasKitMock;
    canvasSize.width = 360;
    canvasSize.height = 520;

    const onLayout = jest.fn();
    const view = mountView("3", onLayout);
    const observer = resizeObservers[resizeObservers.length - 1];
    act(() => {
      observer.callback([
        {
          target: observer.targets[0],
          contentRect: { left: 0, top: 0, width: 360, height: 520 },
        },
      ]);
    });
    // onLayout is delivered from a macrotask, like react-native-web.
    expect(onLayout).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout.mock.calls[0][0].nativeEvent.layout).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 520,
    });

    view.unmount();
  });
});
