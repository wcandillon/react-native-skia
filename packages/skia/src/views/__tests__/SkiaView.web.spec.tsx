/**
 * @jest-environment jsdom
 */
/* global HTMLCanvasElement */
import React, { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { SkPicture } from "../../skia/types";
import type { ISkiaViewApiWeb } from "../../specs/NativeSkiaModule.web";
// Installs global.SkiaViewApi
import "../../specs/NativeSkiaModule.web";
import { SkiaView } from "../SkiaView.web";

import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
  contextOf,
  webglContexts,
  offscreenCanvases,
  sharedContext,
  fakePicture,
  display,
  mediaQueryListeners,
  deliverResize,
  flushMicrotasks,
  flushTimers,
  canvasSize,
} from "./web-setup";

// The picture path of the web view, driven the way <Canvas> and
// <SkiaPictureView> drive it: through SkiaViewApi.setJsiProperty. The view
// must paint without ever receiving a layout event (#3829): these tests mount
// it with a mocked CanvasKit and never fire the ResizeObserver unless the
// test does so explicitly.

// Resolve the Platform module to its web implementation, as a web bundler
// would (the native one imports react-native, which jest cannot parse).
jest.mock("../../Platform", () => require("../../Platform/Platform.web"));

beforeAll(installWebEnvironment);

beforeEach(resetWebEnvironment);

// Dispatches a picture the way the reconciler does. The draw is flushed from
// a microtask, hence the async act.
const setPicture = (nativeID: number) =>
  act(async () => {
    (global.SkiaViewApi as ISkiaViewApiWeb).setJsiProperty(
      nativeID,
      "picture",
      fakePicture as unknown as SkPicture
    );
  });

interface MountOptions {
  onLayout?: () => void;
  strict?: boolean;
  destroyContextAfterRender?: boolean;
}

const mountView = (nativeID: string, options: MountOptions = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = ({
    onLayout,
    strict = false,
    destroyContextAfterRender = false,
  }: MountOptions) => {
    const view = (
      <SkiaView
        nativeID={nativeID}
        onLayout={onLayout}
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        __destroyWebGLContextAfterRender={destroyContextAfterRender}
        style={{ width: 360, height: 520 }}
      />
    );
    act(() => {
      root.render(strict ? <StrictMode>{view}</StrictMode> : view);
    });
  };
  render(options);
  return {
    render,
    canvas: () => {
      const canvas = container.querySelector("canvas");
      if (!canvas) {
        throw new Error("The view has no canvas element");
      }
      return canvas;
    },
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

describe("SkiaView.web", () => {
  it("paints a picture without ever receiving a layout event", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("1");
    // The shared context exists right after mount; a surface is made on it
    // for the view's size when the view first paints.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).not.toHaveBeenCalled();

    // Note that no ResizeObserver entry has been delivered at this point.
    await setPicture(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledWith(
      expect.anything(),
      360,
      520,
      "srgb"
    );
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);
    // The frame is copied from the shared canvas onto the element.
    const shared = offscreenCanvases[0];
    expect(shared.width).toBe(360);
    expect(shared.height).toBe(520);
    expect(contextOf(view.canvas()).drawImage).toHaveBeenCalledWith(
      shared,
      0,
      0,
      360,
      520,
      0,
      0,
      360,
      520
    );

    // The context outlives the view.
    await view.unmount();
    expect(CanvasKitMock.deleteContext).not.toHaveBeenCalled();
  });

  // The element owns no WebGL context: a context per element is what used
  // to run into the browser's limit on live contexts (#3349).
  it("presents through a 2D context and never gives the element a WebGL context", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("11");
    await setPicture(11);
    const canvas = view.canvas();
    expect(webglContexts.has(canvas)).toBe(false);
    const ctx = contextOf(canvas);
    // Each frame replaces the previous one, transparent pixels included
    // (sizing the element resets the context's state, so the operation has
    // to hold at the time of the copy), and keeps the wide gamut of the
    // shared drawing buffer.
    expect(ctx.compositeOperations).toEqual(["copy"]);
    expect(ctx.colorSpace).toBe("display-p3");
    expect(sharedContext().drawingBufferColorSpace).toBe("display-p3");

    // A resize in between doesn't lose it.
    canvasSize.width = 400;
    deliverResize();
    expect(ctx.compositeOperations).toEqual(["copy", "copy"]);

    await view.unmount();
  });

  it("holds a picture dispatched while unmeasured and paints it on first resize", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();

    const view = mountView("2");
    // No measurable size yet: the renderer exists but has nothing to draw on.
    expect(CanvasKitMock.MakeOnScreenGLSurface).not.toHaveBeenCalled();

    await setPicture(2);
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    // The canvas gets its size: the observer delivery must paint the held
    // picture synchronously.
    canvasSize.width = 360;
    canvasSize.height = 520;
    deliverResize();
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);
    expect(contextOf(view.canvas()).drawImage).toHaveBeenCalledTimes(1);

    await view.unmount();
  });

  it("repaints at the new density when the pixel density changes", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("4");
    await setPicture(4);
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
    expect(rawCanvas.scale).toHaveBeenLastCalledWith(2, 2);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);
    expect(view.canvas().width).toBe(720);
    expect(view.canvas().height).toBe(1040);

    await view.unmount();
  });

  it("fires onLayout from the resize observer", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const onLayout = jest.fn();
    const view = mountView("3", { onLayout });
    deliverResize();
    // onLayout is delivered from a macrotask, like react-native-web.
    expect(onLayout).not.toHaveBeenCalled();
    await flushTimers();
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout.mock.calls[0][0].nativeEvent.layout).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 520,
    });

    await view.unmount();
  });

  // #3976: the renderer is built and disposed in a layout effect, but effect
  // cleanup does not imply the host node is gone. React re-runs layout
  // effects on a *preserved* <canvas> element under StrictMode's DEV
  // double-invoke (doubleInvokeEffectsOnFiber) and when an Activity/offscreen
  // subtree is revealed (reappearLayoutEffects). The element holds nothing a
  // renderer has to take over, so the second construction just paints.
  it("survives its layout effect being re-run on the same canvas element", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("5", { strict: true });
    // Neither construction touched the shared context.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.deleteContext).not.toHaveBeenCalled();

    await setPicture(5);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);
    expect(contextOf(view.canvas()).drawImage).toHaveBeenCalled();

    await view.unmount();
  });

  // #3349: with a context per element, a page that mounted and unmounted
  // canvases past the browser's limit had its oldest live context evicted.
  it("shares one context between every view, mounted or gone", async () => {
    const { CanvasKitMock, registry } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const first = mountView("6");
    await setPicture(6);
    for (let i = 0; i < 20; i++) {
      const churn = mountView(`${100 + i}`);
      await setPicture(100 + i);
      await churn.unmount();
    }
    const second = mountView("7");
    await setPicture(7);

    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.deleteContext).not.toHaveBeenCalled();
    expect(registry.size).toBe(1);
    // Views of one size share a surface on the drawing buffer.
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(sharedContext().lost).toBe(false);
    expect(contextOf(first.canvas()).drawImage).toHaveBeenCalledTimes(1);
    expect(contextOf(second.canvas()).drawImage).toHaveBeenCalledTimes(1);

    await first.unmount();
    await second.unmount();
  });

  // Resizing the shared drawing buffer reallocates it, so it only grows,
  // and a smaller view draws in its bottom-left corner.
  it("grows the shared drawing buffer to the largest view and presents the corner a view drew in", async () => {
    const { CanvasKitMock, rawSurfaces } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;
    const large = mountView("8");
    await setPicture(8);
    const shared = offscreenCanvases[0];
    expect(shared.width).toBe(360);
    expect(shared.height).toBe(520);

    canvasSize.width = 200;
    canvasSize.height = 100;
    const small = mountView("9");
    await setPicture(9);
    expect(shared.width).toBe(360);
    expect(shared.height).toBe(520);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenLastCalledWith(
      expect.anything(),
      200,
      100,
      "srgb"
    );
    expect(contextOf(small.canvas()).drawImage).toHaveBeenLastCalledWith(
      shared,
      0,
      420,
      200,
      100,
      0,
      0,
      200,
      100
    );
    // The surfaces on the buffer survive a draw of another size...
    expect(rawSurfaces.map((s) => s.delete.mock.calls.length)).toEqual([0, 0]);

    // ...and are rebuilt when the buffer grows.
    canvasSize.width = 800;
    canvasSize.height = 100;
    deliverResize();
    expect(shared.width).toBe(800);
    expect(shared.height).toBe(520);
    expect(rawSurfaces.map((s) => s.delete.mock.calls.length)).toEqual([
      1, 1, 0,
    ]);
    expect(contextOf(small.canvas()).drawImage).toHaveBeenLastCalledWith(
      shared,
      0,
      420,
      800,
      100,
      0,
      0,
      800,
      100
    );

    await small.unmount();
    await large.unmount();
  });

  // A canvas whose renderer is disposed but which stays in the document
  // (hidden in an Activity) must not keep a full-size bitmap.
  it("frees the element's bitmap when its renderer is disposed", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;
    display.pixelDensity = 2;

    const view = mountView("10");
    const canvas = view.canvas();
    await setPicture(10);
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(1040);

    await view.unmount();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("recovers from the browser losing and restoring the shared context", async () => {
    const { CanvasKitMock, rawCanvas, grContext, registry } =
      installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("12");
    await setPicture(12);
    expect(rawCanvas.drawPicture).toHaveBeenCalledTimes(1);
    const ctx = sharedContext();

    // A GPU reset.
    ctx.lose();
    // The event hasn't been delivered yet, but the context is already gone:
    // a resize in that window must neither throw nor build a surface.
    canvasSize.width = 400;
    deliverResize();
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);

    await flushMicrotasks();
    // The loss was acknowledged so that the browser is allowed to restore
    // the context, and every GL object built on it was released.
    expect(ctx.restoreAllowed).toBe(true);
    expect(grContext.releaseResourcesAndAbandonContext).toHaveBeenCalledTimes(
      1
    );
    expect(registry.size).toBe(0);

    // Redraw requests while lost are dropped, not crashes.
    rawCanvas.drawPicture.mockClear();
    await setPicture(12);
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    // The browser brings the context back: it is registered anew, and the
    // view repaints at the size it has by now.
    ctx.restore();
    await flushMicrotasks();
    expect(ctx.lost).toBe(false);
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(2);
    expect(registry.size).toBe(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenLastCalledWith(
      expect.anything(),
      400,
      520,
      "srgb"
    );
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    await view.unmount();
  });

  it("ignores the deprecated destroy-context-after-render prop", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("13", { destroyContextAfterRender: true });
    const canvas = view.canvas();
    await setPicture(13);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);
    expect(CanvasKitMock.deleteContext).not.toHaveBeenCalled();
    expect(canvas.hasAttribute("__destroyWebGLContextAfterRender")).toBe(false);

    // Toggling it keeps the element.
    view.render({ destroyContextAfterRender: false });
    await flushMicrotasks();
    expect(view.canvas()).toBe(canvas);

    await view.unmount();
  });
});
