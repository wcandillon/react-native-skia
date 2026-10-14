/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SkRect } from "react-native-skia";
import type { WorkletRuntime } from "react-native-worklets";
import {
  createSerializable,
  createWorkletRuntime,
  runOnRuntime,
  scheduleOnRN,
} from "react-native-worklets";

// Test-harness helpers for the worklet serializer (see packages/skia
// WorkletSerialization.spec.tsx). They live in app code, not in an eval'd test
// body: the "worklet" directive only works when the babel worklets plugin
// compiles it into the app bundle.

let runtime: WorkletRuntime | null = null;
const getRuntime = () => {
  if (runtime === null) {
    runtime = createWorkletRuntime({ name: "SkiaSerializerRuntime" });
  }
  return runtime;
};

export interface RoundTripResult {
  x: number;
  y: number;
  width: number;
  height: number;
  typename: string;
  sameObjectBack: boolean;
}

export interface CaptureResult {
  threw: boolean;
  message: string;
  typeOnWorklet: string;
}

export const workletSerialization = {
  // An object carrying jsi::NativeState that is not a Skia object: the
  // serializable ref worklets wraps around a plain object.
  foreignNativeStateObject: (): object => createSerializable({ foreign: true }),

  // Sends `rect` to a worklet runtime and back. Both hops go through the
  // serializer; the second one runs determine/pack on a runtime nothing was
  // ever installed on, which is the Vision Camera frame processor case.
  roundTripRect: (rect: SkRect): Promise<RoundTripResult> =>
    new Promise((resolve) => {
      const done = (
        onWorklet: {
          x: number;
          y: number;
          width: number;
          height: number;
          typename: string;
        },
        back: SkRect
      ) => {
        resolve({ ...onWorklet, sameObjectBack: back === rect });
      };
      runOnRuntime(getRuntime(), (r: SkRect) => {
        "worklet";
        scheduleOnRN(
          done,
          {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            typename: (r as any).__typename__,
          },
          r
        );
      })(rect);
    }),

  // Captures `value` in a worklet and reports whether serializing it threw and
  // what arrived on the worklet runtime. Meant for values the serializer must
  // leave alone, such as Object.create(rect): it inherits from a Skia
  // prototype but is not a Skia object.
  captureForeign: (value: object): Promise<CaptureResult> =>
    new Promise((resolve) => {
      const done = (typeOnWorklet: string) =>
        resolve({ threw: false, message: "", typeOnWorklet });
      try {
        runOnRuntime(getRuntime(), (v: unknown) => {
          "worklet";
          scheduleOnRN(done, typeof v);
        })(value);
      } catch (e) {
        resolve({
          threw: true,
          message: e instanceof Error ? e.message : String(e),
          typeOnWorklet: "",
        });
      }
    }),
};
