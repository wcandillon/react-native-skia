/**
 * Builds the monolithic Dawn (libwebgpu_dawn) from the Dawn checkout Skia
 * pins, into packages/skia/libs/dawn. It is the Dawn the Skia Graphite
 * binaries were compiled against, shipped as the react-native-webgpu-dawn npm
 * package that react-native-skia and react-native-webgpu both link.
 *
 * Usage:
 *   yarn build-dawn                             every target, then the xcframework
 *   yarn build-dawn android-arm64-v8a ios-arm64 the given targets
 *   yarn build-dawn xcframework                 assemble libs/dawn/apple/libwebgpu_dawn.xcframework
 *                                               from the Apple slices already built
 *
 * Targets: android-armeabi-v7a, android-arm64-v8a, android-x86, android-x86_64
 * (ANDROID_NDK must be set), ios-arm64, ios-simulator-arm64,
 * ios-simulator-x86_64, macos-universal.
 *
 * Every run first syncs Dawn and its dependencies to the commits in Skia's
 * DEPS and applies scripts/dawn-patches. The headers are collected into
 * libs/dawn/include from the first target built.
 */

import { exit } from "process";

import {
  applyDawnPatches,
  buildDawnTarget,
  collectDawnHeaders,
  createDawnXcframework,
  dawnTargetNames,
  dawnTargets,
  syncDawnDeps,
} from "./dawn-configuration";

const XCFRAMEWORK = "xcframework";

(async () => {
  const args = process.argv.slice(2);
  const invalid = args.filter((a) => a !== XCFRAMEWORK && !dawnTargets[a]);
  if (invalid.length > 0) {
    console.error(`❌ Unknown target(s): ${invalid.join(", ")}`);
    console.error(
      `Valid targets: ${[...dawnTargetNames, XCFRAMEWORK].join(", ")}`
    );
    exit(1);
  }

  const buildAll = args.length === 0;
  const targets = buildAll
    ? dawnTargetNames
    : args.filter((a) => a !== XCFRAMEWORK);
  const assemble = buildAll || args.includes(XCFRAMEWORK);

  if (targets.length > 0) {
    console.log(`🎯 Building Dawn for: ${targets.join(", ")}`);
    await syncDawnDeps();
    applyDawnPatches();
    let headersCollected = false;
    for (const target of targets) {
      const buildDir = await buildDawnTarget(target);
      if (!headersCollected) {
        collectDawnHeaders(buildDir);
        headersCollected = true;
      }
    }
  }

  if (assemble) {
    createDawnXcframework();
  }
})().catch((error) => {
  console.error(`❌ ${error.message}`);
  exit(1);
});
