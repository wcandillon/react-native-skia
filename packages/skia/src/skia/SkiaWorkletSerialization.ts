/**
 * Skia API objects are implemented with the JSI NativeState pattern: plain JS
 * objects with a shared per-runtime prototype and native state attached.
 * Worklets cannot serialize such objects by default (the prototype would be
 * lost when moving them to another runtime), so we register a Custom
 * Serializable that:
 *
 * - determine: asks the native helper whether the value is a Skia native
 *   object. The check looks at the native state only, so objects of other
 *   libraries (WebGPU), worklets' own serializable refs and objects that
 *   merely inherit from a Skia prototype are rejected, and no JS property of
 *   the value is ever read.
 * - pack: boxes the object into a HostObject wrapper that carries the native
 *   state and the class brand. HostObjects are transferred by reference.
 * - unpack: unboxes on the target runtime, re-installing the class prototype
 *   there and re-attaching the same native state.
 *
 * The helper is itself a HostObject (globalThis.__skiaWorkletHelpers,
 * installed on the main runtime by RNSkManager). determine and pack capture
 * it by closure, and worklets hands a HostObject to every runtime by
 * reference, so the serializer works wherever a Skia object is captured
 * (Reanimated UI runtime, createWorkletRuntime, Vision Camera frame
 * processors) without installing anything on those runtimes.
 *
 * See cpp/jsi/BoxedNativeObject.h for the native side.
 *
 * `react-native-worklets` (Reanimated 4) is required for this to work:
 * without it, Skia objects cannot be captured in worklets or stored in shared
 * values.
 */

interface BoxedNativeObject {
  unbox: () => object;
  __boxedNativeObject: true;
}

interface NativeObjectWorkletHelpers {
  isNativeObject: (value: unknown) => boolean;
  box: (value: object) => BoxedNativeObject;
}

declare global {
  var __skiaWorkletHelpers: NativeObjectWorkletHelpers | undefined;
}

export const registerSkiaWorkletSerialization = () => {
  const helpers = globalThis.__skiaWorkletHelpers;
  if (helpers === undefined) {
    console.error(
      "React Native Skia: the native module did not install the worklet " +
        "serializer helper. Rebuild the app so the native code matches the " +
        "JavaScript."
    );
    return;
  }

  const determine = (value: object): value is object => {
    "worklet";
    return helpers.isNativeObject(value);
  };

  const pack = (value: object): BoxedNativeObject => {
    "worklet";
    return helpers.box(value);
  };

  const unpack = (packed: BoxedNativeObject): object => {
    "worklet";
    return packed.unbox();
  };

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
