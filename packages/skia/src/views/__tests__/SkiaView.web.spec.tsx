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
  contexts,
  contextOf,
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
  isStatic?: boolean;
}

const mountView = (nativeID: string, options: MountOptions = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = ({
    onLayout,
    strict = false,
    isStatic = false,
  }: MountOptions) => {
    const view = (
      <SkiaView
        nativeID={nativeID}
        onLayout={onLayout}
        __destroyWebGLContextAfterRender={isStatic}
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
    // The renderer and its surface exist right after mount.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);

    // Note that no ResizeObserver entry has been delivered at this point.
    await setPicture(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    await view.unmount();
    expect(CanvasKitMock.deleteContext).toHaveBeenCalledWith(1);
  });

  it("holds a picture dispatched while unmeasured and paints it on first resize", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();

    const view = mountView("2");
    // No measurable size yet: the renderer exists but has no surface.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeOnScreenGLSurface).not.toHaveBeenCalled();

    await setPicture(2);
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    // The canvas gets its size: the observer delivery must create the
    // surface and paint the held picture synchronously.
    canvasSize.width = 360;
    canvasSize.height = 520;
    deliverResize();
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    await view.unmount();
  });

  it("recreates the surface at the new density when the pixel density changes", async () => {
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
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

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
  // subtree is revealed (reappearLayoutEffects). Losing the element's WebGL
  // context on dispose lost it permanently, so the second construction could
  // not build a GrDirectContext on it.
  it("survives its layout effect being re-run on the same canvas element", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("5", { strict: true });

    // The effect really was torn down and re-run, against the very same
    // element. Without this the test could pass without exercising the bug.
    const canvasArgs = CanvasKitMock.GetWebGLContext.mock.calls.map(
      ([canvas]) => canvas
    );
    expect(canvasArgs.length).toBeGreaterThan(1);
    expect(new Set(canvasArgs).size).toBe(1);

    // ...and the renderer that came out of it can still paint.
    await setPicture(5);
    expect(contextOf(view.canvas()).lost).toBe(false);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    await view.unmount();
  });

  // #3349: browsers cap the number of live WebGL contexts per page (Chrome
  // evicts the oldest past 16) and a detached canvas keeps its context alive
  // until garbage collection, so a canvas that really leaves the document must
  // lose its context eagerly — without breaking the re-run case above.
  it("loses the element's context once the element has left the document", async () => {
    const { registry } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("6", { strict: true });
    const canvas = view.canvas();
    const ctx = contextOf(canvas);
    await flushMicrotasks();
    // Re-run on a connected element: the context is kept, and exactly one
    // handle for it is registered.
    expect(ctx.lost).toBe(false);
    expect(registry.size).toBe(1);

    await view.unmount();
    expect(canvas.isConnected).toBe(false);
    expect(ctx.lost).toBe(true);
    expect(registry.size).toBe(0);
  });

  // A canvas whose renderer is disposed but which stays in the document
  // (hidden in an Activity) keeps its context, but must not keep a full-size
  // drawing buffer (which CanvasKit requests with depth and stencil).
  it("frees the drawing buffer when its renderer is disposed", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;
    display.pixelDensity = 2;

    const view = mountView("7");
    const canvas = view.canvas();
    await setPicture(7);
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(1040);

    await view.unmount();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("recovers from the browser losing and restoring the context", async () => {
    const { CanvasKitMock, rawCanvas, grContext, registry } =
      installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("8");
    await setPicture(8);
    expect(rawCanvas.drawPicture).toHaveBeenCalledTimes(1);
    const ctx = contextOf(view.canvas());

    // "Too many active WebGL contexts. Oldest context will be lost."
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
    await setPicture(8);
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    // A slot freed up: the browser brings the context back. The renderer
    // rebuilds on it, at the size the canvas has by now, and repaints.
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

  // The context of a canvas that has no renderer attached (hidden in an
  // Activity) can be evicted meanwhile; the renderer built on it when it is
  // revealed cannot use CanvasKit on it (MakeWebGLContext faults) and has to
  // ask for the context back first.
  it("waits for a context lost while no renderer was attached", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    // StrictMode's double-invoke is the one way to detach and re-attach a
    // renderer on a preserved element with React 19.0 (no Activity yet).
    // The eviction is made to happen at the exact moment the first renderer
    // lets go of the context, i.e. with no renderer attached.
    const deleteContext = CanvasKitMock.deleteContext.getMockImplementation();
    CanvasKitMock.deleteContext.mockImplementationOnce((handle: number) => {
      contextOf(CanvasKitMock.GetWebGLContext.mock.calls[0][0]).lose();
      deleteContext?.(handle);
    });
    const view = mountView("9", { strict: true });
    const ctx = contextOf(view.canvas());
    expect(ctx.lost).toBe(true);
    // Constructed on a lost context: no fault, and no attempt to build on it.
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);

    // The lost event goes through; a browser only records the permission to
    // restore once its dispatch is over, so the request has to come from a
    // later task. Whether that task has run yet is not asserted: act() ends
    // on a setImmediate, which Node may run before or after a setTimeout(0).
    const surfacesBefore =
      CanvasKitMock.MakeOnScreenGLSurface.mock.calls.length;
    await flushMicrotasks();
    expect(ctx.restoreAllowed).toBe(true);
    await flushTimers();
    expect(ctx.lost).toBe(false);
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(2);
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(
      surfacesBefore + 1
    );

    await setPicture(9);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(fakePicture.ref);

    await view.unmount();
  });

  // A canvas element is bound to one context kind for life: the static
  // renderer draws through a 2D context, so switching renderers on the same
  // element would fail in either direction.
  it("switches to a fresh canvas element when the renderer kind changes", async () => {
    const { registry } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView("10");
    const webglCanvas = view.canvas();
    const ctx = contextOf(webglCanvas);
    expect(registry.size).toBe(1);

    view.render({ isStatic: true });
    await flushMicrotasks();
    const staticCanvas = view.canvas();
    expect(staticCanvas).not.toBe(webglCanvas);
    // The old element really went away, context and all.
    expect(webglCanvas.isConnected).toBe(false);
    expect(ctx.lost).toBe(true);
    expect(registry.size).toBe(0);
    expect(contexts.has(staticCanvas)).toBe(false);

    await view.unmount();
  });
});
