import { Platform } from "../Platform";
import NativeSkiaModule from "../specs/NativeSkiaModule";

import { registerSkiaWorkletSerialization } from "./SkiaWorkletSerialization";

declare global {
  var __skiaScheduleOnUI: ((settle: () => void) => void) | undefined;
}

// A promise created on the Reanimated UI runtime (image.makeRasterImage()
// in a worklet, for instance) settles there through a timer the runtime
// arms on itself; this hook settles it sooner, and delivers a lost GPU
// device right away: native hands a function that drains the runtime's
// mailbox, a host function, to this hook on the React Native runtime, and
// worklets runs it on the UI runtime (see cpp/rnskia/RNSkRuntimeScheduler.h).
// Without react-native-worklets there is no UI runtime to settle on.
const registerUIRuntimeScheduler = () => {
  try {
    const worklets = require("react-native-worklets");
    if (typeof worklets.scheduleOnUI !== "function") {
      return;
    }
    globalThis.__skiaScheduleOnUI = (settle: () => void) => {
      worklets.scheduleOnUI(() => {
        "worklet";
        settle();
      });
    };
  } catch (e) {
    // react-native-worklets is not installed: Skia runs on the React Native
    // runtime only.
  }
};

if (Platform.OS !== "web" && global.SkiaApi == null) {
  // Initialize RN Skia
  const SkiaModule = NativeSkiaModule;
  if (SkiaModule == null || typeof SkiaModule.install !== "function") {
    throw new Error(
      "Native RNSkia Module cannot be found! Make sure you correctly " +
        "installed native dependencies and rebuilt your app."
    );
  }
  const result = SkiaModule.install();
  if (result !== true) {
    throw new Error(
      `Native Skia Module failed to correctly install JSI Bindings! Result: ${result}`
    );
  }
  // Skia objects use the JSI NativeState pattern and need a custom
  // serializer to be transferable to worklet runtimes (Reanimated).
  registerSkiaWorkletSerialization();
  registerUIRuntimeScheduler();
  // No GPU (no Vulkan 1.1 on Android, for instance): the module is installed
  // and the app runs, but every canvas stays blank and the GPU APIs throw.
  // Said once, with the reason, rather than left to the first blank screen.
  // Once the JS thread is idle, after startup: reading Skia.gpu probes the
  // GPU if nothing did yet, which startup should not wait for. (globalThis:
  // `global.SkiaApi` is narrowed to null by the check above, install() having
  // set it behind the compiler's back; optional, for a test stubbing
  // install().)
  const whenIdle =
    typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : (callback: () => void) => setTimeout(callback, 0);
  whenIdle(() => {
    const gpu = globalThis.SkiaApi?.gpu;
    if (gpu && !gpu.isAvailable) {
      console.error(`[react-native-skia] ${gpu.error}`);
    }
  });
}
