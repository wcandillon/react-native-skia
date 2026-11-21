import { execSync } from "child_process";
import { exit } from "process";
import fs from "fs";
import path from "path";

import type { Platform, PlatformName } from "./skia-configuration";
import type { AppleArchitecture } from "./apple-configuration";
import { combineAppleLibraries } from "./apple-build";
import { validateAppleArchive } from "./apple-binaries-validation";
import { selectBuildTargets } from "./apple-configuration";
import { prepareDawnHeaders } from "./prepare-dawn-headers";
import {
  applySkiaPatches,
  commonArgs,
  configurations,
  copyHeaders,
  appleOutputNames,
  skiaBuildDir,
  skiaTargets,
  skiaTargetOutputDir,
  PackageRoot,
  ProjectRoot,
  SkiaSrc,
} from "./skia-configuration";
import { applyDawnPatches } from "./dawn-configuration";
import { $, runAsync } from "./utils";

/**
 * Locate GN intermediates, separately from distributable libraries under libs/.
 */
const getOutDir = (platform: PlatformName, targetName: string) => {
  return skiaBuildDir(platform, targetName);
};

/**
 * Generate one architecture's Ninja files with common, platform, and target GN args.
 * Runs from the Skia source directory; an unknown target terminates the script.
 */
const configurePlatform = async (
  platformName: PlatformName,
  configuration: Platform,
  targetName: string
) => {
  process.chdir(SkiaSrc);
  console.log(
    `Configuring platform "${platformName}" for target "${targetName}"`
  );
  console.log("Current directory", process.cwd());

  if (configuration) {
    const target = configuration.targets[targetName];
    if (!target) {
      console.log(
        `Target ${targetName} not found for platform ${platformName}`
      );
      exit(1);
    }

    const commandline = `PATH=../depot_tools/:$PATH gn gen ${getOutDir(
      platformName,
      targetName
    )}`;

    const args = configuration.args.reduce(
      (a, cur) => (a += `${cur[0]}=${cur[1]} \n`),
      ""
    );

    const common = commonArgs.reduce(
      (a, cur) => (a += `${cur[0]}=${cur[1]} \n`),
      ""
    );

    const targetArgs =
      target.args?.reduce((a, cur) => (a += `${cur[0]}=${cur[1]} \n`), "") ||
      "";

    const options =
      configuration.options?.reduce(
        (a, cur) => (a += `--${cur[0]}=${cur[1]} `),
        ""
      ) || "";

    const targetOptions =
      target.options?.reduce((a, cur) => (a += `--${cur[0]}=${cur[1]} `), "") ||
      "";

    const command = `${commandline} ${options} ${targetOptions} --script-executable=python3 --args='target_os="${target.platform}" target_cpu="${target.cpu}" ${common}${args}${targetArgs}'`;
    await runAsync(command, "⚙️");
    return true;
  } else {
    console.log(
      `Could not find platform "${platformName}" for target "${targetName}" `
    );
    return false;
  }
};

/**
 * Compile one configured target and verify its Apple archives before staging.
 * Every Mach-O object must match the requested SDK and single architecture.
 */
export const buildPlatform = async (
  platform: PlatformName,
  targetName: string
) => {
  process.chdir(SkiaSrc);
  console.log(`Building platform "${platform}" for target "${targetName}"`);
  // We need to include the path to our custom python2 -> python3 mapping script
  // to make sure we can run all scripts that uses #!/usr/bin/env python as shebang
  // https://groups.google.com/g/skia-discuss/c/BYyB-TwA8ow
  const command = `PATH=${process.cwd()}/../bin:$PATH ninja -C ${getOutDir(
    platform,
    targetName
  )}`;
  // Apple CPU names overlap across SDKs; identify both in compiler output.
  const label =
    platform === "android"
      ? `🤖 ${targetName}`
      : `🍏 ${platform}-${targetName}`;
  await runAsync(command, label);
  if (platform !== "android") {
    // Fail this target before staging or compiling the next architecture.
    for (const library of configurations[platform].outputNames) {
      validateAppleArchive(
        path.join(getOutDir(platform, targetName), library),
        platform,
        [targetName as AppleArchitecture]
      );
    }
    console.log(`${label} ✅ Mach-O verified`);
  }
};

/**
 * Reject Android archives defining typeinfo owned by the shared C++ runtime.
 * Such definitions make librnskia.so bind catch clauses to its own copies
 * instead of libc++_shared's, breaking exception matching across libraries.
 */
const assertNoRuntimeTypeinfo = (libPath: string) => {
  const copies = execSync(
    `$ANDROID_NDK/toolchains/llvm/prebuilt/*/bin/llvm-nm --defined-only --just-symbol-name ${libPath}`,
    { maxBuffer: Infinity }
  )
    .toString()
    .split("\n")
    .filter((symbol) => /^_ZT[IS]St/.test(symbol));
  if (copies.length > 0) {
    throw new Error(
      `${libPath} defines typeinfo the C++ runtime owns: ${copies.join(", ")}`
    );
  }
};

/**
 * Stage archives under libs/<os>/<platform>/, stripping Android debug symbols.
 * Sources remain in the GN output directory. Copy/strip failures stop the script.
 */
export const copyLib = (
  os: PlatformName,
  cpu: string,
  platform: string,
  outputNames: string[]
) => {
  const dstPath = `${PackageRoot}/libs/${os}/${platform}/`;
  $(`mkdir -p ${dstPath}`);

  outputNames
    .map((name) => `${getOutDir(os, cpu)}/${name}`)
    .forEach((lib) => {
      const libPath = lib;
      console.log(`Copying ${libPath} to ${dstPath}`);
      console.log(`cp ${libPath} ${dstPath}`);
      $(`cp ${libPath} ${dstPath}`);
      if (os === "android") {
        // The archives ship as they are: drop the debug info, which is most
        // of their size.
        $(
          `$ANDROID_NDK/toolchains/llvm/prebuilt/*/bin/llvm-strip --strip-debug ${dstPath}/${path.basename(libPath)}`
        );
      }
    });
};

/**
 * Build SDK groups (e.g. iphonesimulator) as lipo'd universal libraries, or one
 * architecture (e.g. iphonesimulator-arm64). Single-architecture SDKs need no lipo.
 * Sync dependencies and apply patches, then configure/build/validate/stage each
 * selected target sequentially before combining Apple SDK outputs and copying headers.
 *
 * Usage (from packages/skia):
 *   yarn build-skia                              # every target
 *   yarn build-skia android                      # all Android ABIs
 *   yarn build-skia android-arm64                # one Android architecture
 *   yarn build-skia iphonesimulator              # lipo'd universal simulator libraries
 *   yarn build-skia iphonesimulator-arm64        # one simulator architecture
 *   yarn build-skia iphoneos iphonesimulator     # multiple SDK groups
 *
 * Apple static libraries are staged under libs/apple/<sdk>-<arch>/
 * (e.g. libs/apple/iphonesimulator-arm64/), then assembled under libs/apple/<sdk>/
 * (e.g. libs/apple/iphonesimulator/). Staging directories are removed on successful
 * SDK assembly; GN intermediates remain. Android uses libs/android/<abi>/
 * (e.g. libs/android/arm64-v8a/). package-binaries assembles npm XCFrameworks.
 *
 * See apple-configuration.ts for SDK groups/architectures and
 * skia-configuration.ts (skiaTargets) for the full target list.
 */
(async () => {
  const targetSpecs = process.argv.slice(2);
  const selectedTargets = selectBuildTargets(
    targetSpecs,
    Object.keys(skiaTargets)
  );

  // Resolve local or published headers before syncing or deleting build outputs.
  await prepareDawnHeaders();

  console.log(`🎯 Building targets: ${selectedTargets.join(", ")}`);
  console.log("🪨 Skia Graphite");

  // Check Android environment variables if android is in target platforms
  const hasAndroid = selectedTargets.some(
    (name) => skiaTargets[name].platform === "android"
  );
  if (hasAndroid) {
    ["ANDROID_NDK", "ANDROID_HOME"].forEach((name) => {
      // Test for existence of Android SDK
      if (!process.env[name]) {
        console.log(`${name} not set.`);
        exit(1);
      } else {
        console.log(`✅ ${name}`);
      }
    });
  }

  // Sync dependencies before applying the pinned source patches.
  console.log("Running gclient sync...");
  process.chdir(SkiaSrc);
  $("PATH=../depot_tools/:$PATH python3 tools/git-sync-deps");
  console.log("gclient sync done");
  // Start the Skia tree from its pinned commit so leftovers from an earlier
  // build (old patches, string edits, local tweaks) can't make a current
  // patch look stale. This only resets Skia's tracked files: the Dawn
  // checkout under third_party/externals is a separate repository, so its
  // patches are still applied idempotently by applyDawnPatches().
  $("git reset --hard HEAD");
  // Skia's GN build and the standalone Dawn build share the Dawn checkout.
  applySkiaPatches();
  applyDawnPatches();

  // Clear Android's ABI outputs before staging the selected architectures.
  if (hasAndroid) {
    $(`rm -rf ${PackageRoot}/${configurations.android.outputRoot}`);
  }

  for (const name of selectedTargets) {
    const { platform, architecture } = skiaTargets[name];
    const configuration = configurations[platform];
    await configurePlatform(platform, configuration, architecture);
    await buildPlatform(platform, architecture);
    process.chdir(ProjectRoot);
    if (platform === "android") {
      configuration.outputNames.forEach((library) =>
        assertNoRuntimeTypeinfo(
          `${getOutDir(platform, architecture)}/${library}`
        )
      );
      copyLib(
        platform,
        architecture,
        configurations.android.targets[architecture].output,
        configuration.outputNames
      );
    } else {
      // Stage each SDK/architecture separately before combining its libraries.
      const destination = skiaTargetOutputDir(name);
      fs.rmSync(destination, { recursive: true, force: true });
      fs.mkdirSync(destination, { recursive: true });
      for (const library of configuration.outputNames) {
        fs.copyFileSync(
          path.join(getOutDir(platform, architecture), library),
          path.join(destination, library)
        );
      }
    }
  }

  combineAppleLibraries(
    path.join(PackageRoot, "libs", "apple"),
    appleOutputNames,
    undefined,
    selectedTargets
  );
  await copyHeaders();
})().catch((error) => {
  console.error(`❌ ${error.message}`);
  exit(1);
});
