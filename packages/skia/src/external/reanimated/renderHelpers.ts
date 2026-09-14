export let HAS_REANIMATED_3 = false;

/**
 * True when the worklets-based Reanimated integration is available
 * (Reanimated 4 with react-native-worklets providing
 * registerCustomSerializable). Skia objects use the JSI NativeState pattern
 * and can only be transferred to worklet runtimes through a custom
 * serializer, so on native the Reanimated integration requires Reanimated 4 —
 * Reanimated 3 is not supported.
 */
export let HAS_REANIMATED_4 = false;

/**
 * Major version of the installed react-native-reanimated package, or null if
 * it is not installed. Used to give actionable diagnostics when the
 * integration cannot be enabled.
 */
export let REANIMATED_VERSION_MAJOR: number | null = null;

try {
  // This logic is convoluted but necessary
  // In most systems, `require("react-native-reanimated")` throws an error, all is well.
  // In webpack, in some configuration it will return an empty object.
  // So it will not throw an error and we need to check the version to know if it's there.
  const reanimatedVersion =
    require("react-native-reanimated/package.json").version;
  require("react-native-reanimated");
  if (
    reanimatedVersion &&
    (reanimatedVersion >= "3.0.0" || reanimatedVersion.includes("3.0.0-"))
  ) {
    HAS_REANIMATED_3 = true;
  }
  const majorVersion = parseInt(reanimatedVersion.split(".")[0], 10);
  if (!isNaN(majorVersion)) {
    REANIMATED_VERSION_MAJOR = majorVersion;
  }
  if (majorVersion >= 4) {
    try {
      const worklets = require("react-native-worklets");
      HAS_REANIMATED_4 =
        typeof worklets.registerCustomSerializable === "function";
    } catch (e) {
      // react-native-worklets not installed
    }
  }
} catch (e) {
  // do nothing
}
