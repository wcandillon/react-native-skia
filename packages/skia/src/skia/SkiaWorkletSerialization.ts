/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Skia and WebGPU API objects are implemented with the JSI NativeState
 * pattern: plain JS objects with a shared prototype and native state
 * attached. Worklets cannot serialize such objects by default (the prototype
 * would be lost when moving them to another runtime), so we register a
 * Custom Serializable that:
 *
 * - determine: detects native objects via the `__box` method installed on
 *   every Skia and WebGPU prototype (plain objects never reach the
 *   custom-serializable path, so this cannot misfire on user data).
 * - pack: boxes the object into a HostObject wrapper that carries the native
 *   state and the class brand. HostObjects are transferred by reference.
 * - unpack: unboxes on the target runtime, re-installing the class prototype
 *   there and re-attaching the same native state.
 *
 * See cpp/jsi/BoxedNativeObject.h for the native side.
 *
 * `react-native-worklets` (Reanimated 4) is required for this to work —
 * without it, Skia and WebGPU objects cannot be captured in worklets or
 * stored in shared values.
 */

interface BoxedNativeObject {
  unbox: () => object;
  __boxedNativeObject: true;
}

const determine = (value: object): value is object => {
  "worklet";
  return typeof (value as any).__box === "function";
};

const pack = (value: object): BoxedNativeObject => {
  "worklet";
  return (value as any).__box();
};

const unpack = (packed: BoxedNativeObject): object => {
  "worklet";
  return packed.unbox();
};

export const registerSkiaWorkletSerialization = () => {
  try {
    const worklets = require("react-native-worklets");
    if (typeof worklets.registerCustomSerializable === "function") {
      worklets.registerCustomSerializable({
        name: "ReactNativeSkia",
        determine,
        pack,
        unpack,
      });
    } else {
      console.error(
        "React Native Skia requires react-native-worklets >= 0.7.0 " +
          "(registerCustomSerializable) to use Skia objects inside worklets. " +
          "Please upgrade react-native-worklets and react-native-reanimated."
      );
    }
  } catch (e) {
    // react-native-worklets is not installed. This is fine for apps that do
    // not use Reanimated: Skia objects simply cannot be used inside worklets
    // or shared values in this configuration.
  }
};
