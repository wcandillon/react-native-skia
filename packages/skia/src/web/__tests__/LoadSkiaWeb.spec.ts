import type { CanvasKit } from "canvaskit-wasm";

// Stands in for canvaskit-wasm's default export (CanvasKitInit). Typed
// loosely on purpose: the tests hand back deliberately malformed modules.
const canvasKitInit = jest.fn<Promise<unknown>, [unknown]>();
jest.mock("canvaskit-wasm/bin/full/canvaskit", () => ({
  __esModule: true,
  default: (opts: unknown) => canvasKitInit(opts),
}));

const usableCanvasKit = {
  PictureRecorder: function PictureRecorder() {},
  Paint: function Paint() {},
} as unknown as CanvasKit;

const loadSkiaWeb = async () => {
  // A fresh module instance per test, so the shared init promise starts
  // empty each time.
  jest.resetModules();
  const { LoadSkiaWeb } = await import("../LoadSkiaWeb");
  return LoadSkiaWeb;
};

describe("LoadSkiaWeb", () => {
  beforeEach(() => {
    canvasKitInit.mockReset();
    // @ts-expect-error the global is only defined after a successful load
    delete global.CanvasKit;
  });

  it("publishes a CanvasKit that has its bindings", async () => {
    canvasKitInit.mockResolvedValue(usableCanvasKit);
    const LoadSkiaWeb = await loadSkiaWeb();
    await LoadSkiaWeb();
    expect(global.CanvasKit).toBe(usableCanvasKit);
  });

  it("shares one init across concurrent calls", async () => {
    canvasKitInit.mockResolvedValue(usableCanvasKit);
    const LoadSkiaWeb = await loadSkiaWeb();
    await Promise.all([LoadSkiaWeb(), LoadSkiaWeb()]);
    expect(canvasKitInit).toHaveBeenCalledTimes(1);
  });

  it("rejects a CanvasKit that initialized without its bindings", async () => {
    // What CanvasKitInit resolves with when canvaskit.js and canvaskit.wasm
    // come from different releases: the glue finds none of its classes.
    canvasKitInit.mockResolvedValue({});
    const LoadSkiaWeb = await loadSkiaWeb();
    await expect(LoadSkiaWeb()).rejects.toThrow(/different versions/);
    expect(global.CanvasKit).toBeUndefined();
  });

  it("retries after a failed init instead of caching the failure", async () => {
    canvasKitInit
      .mockRejectedValueOnce(new Error("both async and sync fetching failed"))
      .mockResolvedValueOnce(usableCanvasKit);
    const LoadSkiaWeb = await loadSkiaWeb();
    await expect(LoadSkiaWeb()).rejects.toThrow("fetching failed");
    await LoadSkiaWeb();
    expect(canvasKitInit).toHaveBeenCalledTimes(2);
    expect(global.CanvasKit).toBe(usableCanvasKit);
  });

  it("retries after an unusable init instead of caching it", async () => {
    canvasKitInit
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(usableCanvasKit);
    const LoadSkiaWeb = await loadSkiaWeb();
    await expect(LoadSkiaWeb()).rejects.toThrow(/different versions/);
    await LoadSkiaWeb();
    expect(canvasKitInit).toHaveBeenCalledTimes(2);
    expect(global.CanvasKit).toBe(usableCanvasKit);
  });
});
