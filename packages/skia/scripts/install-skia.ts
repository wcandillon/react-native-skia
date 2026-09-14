/**
 * Set up the standard (Ganesh) Skia build for development.
 *
 * Unlike `install-skia-graphite`, this script does NOT download or copy any
 * prebuilt binaries. The standard binaries ship in the `react-native-skia-android`
 * and `react-native-skia-apple-*` npm packages and are resolved straight from
 * node_modules by build.gradle (Android, read in place) and the podspec (Apple,
 * copied in at `pod install`). This replaces the work the old npm `postinstall`
 * script used to do.
 *
 * It only needs to:
 *   1. Undo a previous Graphite install by removing the `libs/.graphite` marker
 *      and the Graphite-only `cpp/dawn` headers, so the native build systems
 *      switch back to the standard binaries.
 *   2. Copy the Skia headers required to compile against the prebuilt libraries.
 *
 * It deliberately leaves the contents of `libs/` in place, since `yarn build-skia`
 * writes locally-built binaries there.
 */
import { existsSync, rmSync } from "fs";
import path from "path";

import { copyHeaders } from "./skia-configuration";

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

// Headers are copied from the Skia submodule. If it isn't checked out, copyHeaders
// would silently copy nothing (copyRecursiveSync no-ops on a missing source) and
// the failure would only surface later as missing Skia headers during compilation.
// Fail loudly here instead, with an actionable message.
const skiaInclude = path.join(repoRoot, "externals", "skia", "include");
if (!existsSync(skiaInclude)) {
  console.error(
    `\n❌ Skia submodule not found at ${skiaInclude}\n` +
      "   Headers are copied from the Skia submodule. Check it out first:\n" +
      "     git submodule update --init --recursive\n"
  );
  process.exit(1);
}

const graphiteMarker = path.join(packageRoot, "libs", ".graphite");
if (existsSync(graphiteMarker)) {
  console.log("-- Removing Graphite marker (switching to the standard build)");
  rmSync(graphiteMarker, { force: true });
  // Drop the Graphite-only Dawn headers so they don't linger in a standard build.
  rmSync(path.join(packageRoot, "cpp", "dawn"), {
    recursive: true,
    force: true,
  });
}

console.log("-- Copying Skia headers");
copyHeaders();

console.log(
  "✅ Standard Skia build ready. Prebuilt binaries are resolved from node_modules."
);
