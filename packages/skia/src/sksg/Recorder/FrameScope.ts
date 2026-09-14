import type { Skia } from "../../skia/types";

interface Disposable {
  dispose: () => void;
}

const isDisposable = (value: unknown): value is Disposable => {
  "worklet";
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Disposable).dispose === "function"
  );
};

export interface FrameScope {
  Skia: Skia;
  track: <T>(value: T) => T;
  dispose: () => void;
}

/**
 * Wraps a Skia instance so that every object created through its factories is
 * collected and deleted when the scope is disposed. The renderer only keeps
 * the objects it creates alive for the duration of a frame: once the frame
 * has been recorded they can be deleted. This is required on Web where
 * CanvasKit objects live in WASM memory that the JS garbage collector does
 * not perceive, so it (almost) never reclaims them on its own.
 *
 * Objects passed in via props are user-owned: they are not created through
 * this facade and are therefore never tracked nor disposed.
 */
export const createFrameScope = (Skia: Skia): FrameScope => {
  "worklet";
  const disposables: Disposable[] = [];
  const track = <T>(value: T): T => {
    if (isDisposable(value)) {
      disposables.push(value);
    }
    return value;
  };
  const wrap = <T extends object>(obj: T): T => {
    const cache = new Map<PropertyKey, unknown>();
    return new Proxy(obj, {
      get(target, prop) {
        if (cache.has(prop)) {
          return cache.get(prop);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (target as any)[prop];
        let wrapped: unknown = value;
        if (typeof value === "function") {
          wrapped = (...args: unknown[]) => track(value.apply(target, args));
        } else if (value !== null && typeof value === "object") {
          wrapped = wrap(value);
        }
        cache.set(prop, wrapped);
        return wrapped;
      },
    }) as T;
  };
  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    disposables.length = 0;
  };
  return { Skia: wrap(Skia), track, dispose };
};
