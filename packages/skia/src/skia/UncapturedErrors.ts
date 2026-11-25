import type {
  SkGpuEvents,
  SkUncapturedErrorEvent,
  SkUncapturedErrorListener,
  SkUncapturedErrorSource,
} from "./types/Skia";

/**
 * The listeners of the uncapturederror event of `Skia.gpu`: one set for the
 * runtime, whichever `Skia.gpu` object they were added through (each read
 * of `Skia.gpu` describes the device in use at that moment).
 */
const listeners = new Set<SkUncapturedErrorListener>();
let handler: SkUncapturedErrorListener | null = null;

/**
 * Dispatches a failure that had no caller to throw to: a frame that could
 * not be replayed, a recording Graphite rejected, an image that could not
 * be uploaded (see cpp/rnskia/RNSkUncapturedErrors.h). `onuncapturederror`
 * runs first, then the listeners in the order they were added; the error is
 * logged with console.error unless one of them calls preventDefault().
 */
export const dispatchUncapturedError = (
  error: Error,
  source: SkUncapturedErrorSource,
  viewId: number | null
) => {
  let defaultPrevented = false;
  const event: SkUncapturedErrorEvent = {
    type: "uncapturederror",
    error,
    source,
    viewId,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
  };
  const run = (listener: SkUncapturedErrorListener) => {
    try {
      listener(event);
    } catch (e) {
      // A listener that throws does not keep the others from running.
      console.error(e);
    }
  };
  if (handler) {
    run(handler);
  }
  Array.from(listeners).forEach(run);
  if (!defaultPrevented) {
    console.error(
      `[react-native-skia] Uncaptured error (${source}${
        viewId !== null ? `, canvas ${viewId}` : ""
      }): ${error.name}: ${error.message}`
    );
  }
};

/** The event members of `Skia.gpu`, shared by every read of it. */
export const gpuEvents: SkGpuEvents = {
  addEventListener(type, listener) {
    if (type === "uncapturederror") {
      listeners.add(listener);
    }
  },
  removeEventListener(type, listener) {
    if (type === "uncapturederror") {
      listeners.delete(listener);
    }
  },
  get onuncapturederror() {
    return handler;
  },
  set onuncapturederror(value) {
    handler = value;
  },
};

/** `info` with the event members of `Skia.gpu`. */
export const withGpuEvents = <T extends object>(info: T): T & SkGpuEvents => {
  Object.defineProperties(info, {
    addEventListener: {
      value: gpuEvents.addEventListener,
      enumerable: false,
      configurable: true,
    },
    removeEventListener: {
      value: gpuEvents.removeEventListener,
      enumerable: false,
      configurable: true,
    },
    onuncapturederror: {
      get: () => gpuEvents.onuncapturederror,
      set: (value: SkUncapturedErrorListener | null) => {
        gpuEvents.onuncapturederror = value;
      },
      enumerable: false,
      configurable: true,
    },
  });
  return info as T & SkGpuEvents;
};

/**
 * Makes every read of `api.gpu` carry the event members: `gpu` is a getter
 * of the native module, which describes the device anew at each read.
 */
export const installGpuEvents = (api: object) => {
  let owner: object | null = api;
  let descriptor: PropertyDescriptor | undefined;
  while (owner !== null && descriptor === undefined) {
    descriptor = Object.getOwnPropertyDescriptor(owner, "gpu");
    owner = Object.getPrototypeOf(owner);
  }
  const get = descriptor?.get;
  if (!get) {
    return;
  }
  Object.defineProperty(api, "gpu", {
    get() {
      return withGpuEvents(get.call(this));
    },
    enumerable: true,
    configurable: true,
  });
};

/** Removes every listener; for tests. */
export const resetUncapturedErrorListeners = () => {
  listeners.clear();
  handler = null;
};
