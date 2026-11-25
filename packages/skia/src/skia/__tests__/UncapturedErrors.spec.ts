import type { SkUncapturedErrorEvent } from "../types";
import { SkiaInternalError } from "../types/Errors";
import {
  dispatchUncapturedError,
  installGpuEvents,
  resetUncapturedErrorListeners,
  withGpuEvents,
} from "../UncapturedErrors";

// A native Skia.gpu: a getter on the prototype of the API object, which
// describes the device anew at each read.
class NativeApi {
  reads = 0;
  get gpu() {
    this.reads++;
    return { isAvailable: true, backend: "Metal" };
  }
}

describe("Uncaptured errors", () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    resetUncapturedErrorListeners();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it("dispatches to the handler, then the listeners, of any read of Skia.gpu", () => {
    const api = new NativeApi();
    installGpuEvents(api);
    const gpu = api.gpu as unknown as ReturnType<typeof withGpuEvents>;
    const order: string[] = [];
    const events: SkUncapturedErrorEvent[] = [];
    gpu.addEventListener("uncapturederror", (event) => {
      order.push("listener");
      events.push(event);
    });
    // Another read of Skia.gpu: the same registry.
    (api.gpu as unknown as typeof gpu).onuncapturederror = () =>
      order.push("handler");
    const error = new SkiaInternalError("Graphite rejected a recording");
    dispatchUncapturedError(error, "submit", 3);
    expect(order).toEqual(["handler", "listener"]);
    expect(events[0]).toMatchObject({
      type: "uncapturederror",
      error,
      source: "submit",
      viewId: 3,
      defaultPrevented: false,
    });
    // Nobody prevented it: logged.
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining(
        "Uncaptured error (submit, canvas 3): SkiaInternalError: Graphite rejected a recording"
      )
    );
    // The native getter still describes the device at each read.
    expect(api.reads).toBe(2);
    expect(api.gpu.backend).toBe("Metal");
  });

  it("does not log an error a listener prevented", () => {
    const gpu = withGpuEvents({ isAvailable: true });
    const listener = (event: SkUncapturedErrorEvent) => event.preventDefault();
    gpu.addEventListener("uncapturederror", listener);
    dispatchUncapturedError(new TypeError("bad value"), "recorder", null);
    expect(consoleError).not.toHaveBeenCalled();
    gpu.removeEventListener("uncapturederror", listener);
    dispatchUncapturedError(new TypeError("bad value"), "recorder", null);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("runs every listener when one throws", () => {
    const gpu = withGpuEvents({ isAvailable: true });
    const second = jest.fn();
    gpu.addEventListener("uncapturederror", () => {
      throw new Error("listener failed");
    });
    gpu.addEventListener("uncapturederror", second);
    dispatchUncapturedError(new SkiaInternalError("x"), "render", null);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("keeps the event members out of the enumerable fields", () => {
    const gpu = withGpuEvents({ isAvailable: true, backend: "WebGL" });
    expect(Object.keys(gpu)).toEqual(["isAvailable", "backend"]);
  });
});
