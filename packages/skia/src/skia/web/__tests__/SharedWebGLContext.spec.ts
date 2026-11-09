/**
 * @jest-environment jsdom
 */
import type { CanvasKit } from "canvaskit-wasm";

import type { SkSurface } from "../../types";
import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
  offscreenCanvases,
  sharedContext,
  webglContexts,
  flushMicrotasks,
} from "../../../views/__tests__/web-setup";
import { JsiSkSurfaceFactory } from "../JsiSkSurfaceFactory";
import { getSharedWebGLContext } from "../SharedWebGLContext";

// Offscreen surfaces on the shared WebGL context: one context for all of
// them (a context per surface, never released, used to run into the
// browser's per-page limit), and what happens to them when the browser takes
// the context away.

beforeAll(installWebEnvironment);

beforeEach(resetWebEnvironment);

const factory = () => {
  const mock = installCanvasKit();
  return {
    ...mock,
    Surface: new JsiSkSurfaceFactory(
      mock.CanvasKitMock as unknown as CanvasKit
    ),
  };
};

describe("SharedWebGLContext", () => {
  it("builds every offscreen surface on one context, which outlives them", () => {
    const { Surface, CanvasKitMock, registry } = factory();
    const surfaces: SkSurface[] = [];
    for (let i = 0; i < 20; i++) {
      const surface = Surface.MakeOffscreen(256, 256)!;
      surface.getCanvas().drawColor(Float32Array.of(1, 0, 0, 1));
      surface.flush();
      surfaces.push(surface);
    }
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
    expect(CanvasKitMock.MakeRenderTarget).toHaveBeenCalledTimes(20);
    expect(offscreenCanvases).toHaveLength(1);
    surfaces.forEach((surface) => surface.dispose());
    expect(CanvasKitMock.deleteContext).not.toHaveBeenCalled();
    expect(registry.size).toBe(1);
    expect(sharedContext().lost).toBe(false);
  });

  it("uses the same context as the views", () => {
    const { Surface, CanvasKitMock } = factory();
    const shared = getSharedWebGLContext(
      CanvasKitMock as unknown as CanvasKit
    )!;
    const grContext = shared.getGrContext();
    Surface.MakeOffscreen(8, 8);
    expect(CanvasKitMock.MakeRenderTarget).toHaveBeenCalledWith(
      grContext,
      8,
      8
    );
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(1);
  });

  it("reports a surface dead once the context was lost, and builds new ones after the restore", async () => {
    const { Surface, CanvasKitMock, grContext, registry } = factory();
    const kept = Surface.MakeOffscreen(64, 64)!;
    kept.flush();

    const ctx = sharedContext();
    ctx.lose();
    // Gone already, even before the loss is announced.
    expect(() => kept.getCanvas()).toThrow(/context .* was lost/);
    expect(Surface.MakeOffscreen(64, 64)).toBeNull();
    await flushMicrotasks();
    expect(ctx.restoreAllowed).toBe(true);
    expect(grContext.releaseResourcesAndAbandonContext).toHaveBeenCalledTimes(
      1
    );
    expect(registry.size).toBe(0);
    expect(() => kept.flush()).toThrow(/context .* was lost/);
    expect(() => kept.makeImageSnapshot()).toThrow(/context .* was lost/);
    // Sizes don't need the context.
    expect(() => kept.width()).not.toThrow();

    ctx.restore();
    await flushMicrotasks();
    expect(CanvasKitMock.GetWebGLContext).toHaveBeenCalledTimes(2);
    expect(registry.size).toBe(1);
    const fresh = Surface.MakeOffscreen(64, 64)!;
    expect(() => fresh.getCanvas()).not.toThrow();
    // The kept surface was built on the previous context.
    expect(() => kept.getCanvas()).toThrow(/context .* was lost/);
    // Disposing it is still fine.
    expect(() => kept.dispose()).not.toThrow();
  });

  it("lives on a detached canvas element where OffscreenCanvas is unavailable", () => {
    const { Surface, CanvasKitMock } = factory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OffscreenCanvasMock = (global as any).OffscreenCanvas;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).OffscreenCanvas;
    try {
      const surface = Surface.MakeOffscreen(32, 32)!;
      expect(CanvasKitMock.MakeRenderTarget).toHaveBeenCalledTimes(1);
      const canvas = CanvasKitMock.GetWebGLContext.mock
        .calls[0][0] as unknown as HTMLCanvasElement;
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.isConnected).toBe(false);
      expect(webglContexts.has(canvas)).toBe(true);
      expect(offscreenCanvases).toHaveLength(0);
      surface.dispose();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).OffscreenCanvas = OffscreenCanvasMock;
    }
  });

  it("leaves no context registered when the graphics context cannot be built", () => {
    const { Surface, CanvasKitMock, registry } = factory();
    CanvasKitMock.MakeWebGLContext.mockImplementationOnce(() => {
      throw new Error("RuntimeError: null function or function signature");
    });
    expect(() => Surface.MakeOffscreen(8, 8)).toThrow();
    expect(registry.size).toBe(0);
    // Trying again gets a context.
    expect(Surface.MakeOffscreen(8, 8)).not.toBeNull();
    expect(registry.size).toBe(1);
  });
});
