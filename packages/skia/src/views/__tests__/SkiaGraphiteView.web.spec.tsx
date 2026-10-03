/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import type { SkGraphiteContext } from "../../skia/types";
import type { ISkiaViewApiWeb } from "../../specs/NativeSkiaModule.web";
// Installs global.SkiaViewApi
import "../../specs/NativeSkiaModule.web";
import { SkiaGraphiteView } from "../SkiaGraphiteView";
import type { SkiaGraphiteViewRef } from "../SkiaGraphiteView";

import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
  display,
  mediaQueryListeners,
  deliverResize,
  flushMicrotasks,
  canvasSize,
} from "./web-setup";

// Resolve the Platform module and the native component to their web
// implementations, as a web bundler would (the native ones import
// react-native, which jest cannot parse).
jest.mock("../../Platform", () => require("../../Platform/Platform.web"));
jest.mock("../../specs/SkiaViewNativeComponent", () =>
  require("../../specs/SkiaViewNativeComponent.web")
);

beforeAll(installWebEnvironment);

beforeEach(resetWebEnvironment);

const mountView = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<SkiaGraphiteViewRef>();
  act(() => {
    root.render(
      <SkiaGraphiteView ref={ref} style={{ width: 360, height: 520 }} />
    );
  });
  return {
    ref,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

// Records an empty frame and submits it; returns the raw picture the
// renderer is expected to replay.
const submitFrame = (ctx: SkGraphiteContext) => {
  const canvas = ctx.beginRecording();
  canvas.clear(Float32Array.of(0, 0, 0, 1));
  const recording = ctx.finishRecording();
  ctx.submit(recording);
  return (recording as unknown as { picture: { ref: unknown } }).picture.ref;
};

describe("SkiaGraphiteView on the web", () => {
  it("presents a submitted recording before the next frame", async () => {
    const { CanvasKitMock, rawCanvas, rawSurface } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView();
    const ctx = view.ref.current!.getContext();
    expect(ctx.width).toBe(360);
    expect(ctx.height).toBe(520);

    const picture = submitFrame(ctx);
    // Nothing is painted synchronously: frames are flushed from a microtask.
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(picture);
    expect(rawSurface.flush).toHaveBeenCalledTimes(1);

    await view.unmount();
  });

  it("presents queued recordings in submission order in one frame", async () => {
    const { rawCanvas, rawSurface } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView();
    const ctx = view.ref.current!.getContext();
    const first = submitFrame(ctx);
    const second = submitFrame(ctx);
    await flushMicrotasks();
    expect(rawCanvas.drawPicture.mock.calls).toEqual([[first], [second]]);
    expect(rawSurface.flush).toHaveBeenCalledTimes(1);

    await view.unmount();
  });

  it("keeps a recording submitted while unmeasured and presents it on first resize", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();

    const view = mountView();
    const ctx = view.ref.current!.getContext();
    expect(() => ctx.beginRecording()).toThrow("no size yet");

    // Measured now, but the renderer has not been told yet.
    canvasSize.width = 360;
    canvasSize.height = 520;
    const picture = submitFrame(ctx);
    await flushMicrotasks();
    expect(CanvasKitMock.MakeOnScreenGLSurface).not.toHaveBeenCalled();
    expect(rawCanvas.drawPicture).not.toHaveBeenCalled();

    deliverResize();
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenCalledTimes(1);
    expect(rawCanvas.drawPicture).toHaveBeenCalledWith(picture);

    await view.unmount();
  });

  it("replays the frame on screen when the pixel density changes", async () => {
    const { CanvasKitMock, rawCanvas } = installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView();
    const picture = submitFrame(view.ref.current!.getContext());
    await flushMicrotasks();
    expect(rawCanvas.drawPicture).toHaveBeenCalledTimes(1);

    display.pixelDensity = 2;
    act(() => {
      mediaQueryListeners.slice().forEach((cb) => cb());
    });
    expect(CanvasKitMock.MakeOnScreenGLSurface).toHaveBeenLastCalledWith(
      expect.anything(),
      720,
      1040,
      "srgb"
    );
    expect(rawCanvas.drawPicture).toHaveBeenCalledTimes(2);
    expect(rawCanvas.drawPicture).toHaveBeenLastCalledWith(picture);

    await view.unmount();
  });

  it("allows one open recording at a time", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView();
    const ctx = view.ref.current!.getContext();
    expect(() => ctx.finishRecording()).toThrow("no recording is open");
    ctx.beginRecording();
    expect(() => ctx.beginRecording()).toThrow("already open");
    ctx.finishRecording();
    expect(() => ctx.beginRecording()).not.toThrow();

    await view.unmount();
  });

  it("is reachable through SkiaViewApi by native id", async () => {
    installCanvasKit();
    canvasSize.width = 360;
    canvasSize.height = 520;

    const view = mountView();
    const id = view.ref.current!.getNativeId();
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    const ctx = api.makeGraphiteContext(id, 0, 0, false, false);
    expect(ctx.width).toBe(360);
    expect(api.size(id)).toEqual({ width: 360, height: 520 });

    await view.unmount();
    expect(() => api.makeGraphiteContext(id, 0, 0, false, false)).toThrow(
      "is mounted"
    );
  });
});
