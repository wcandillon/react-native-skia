import { execSync } from "child_process";
import { exit } from "process";
import path from "path";

import type {
  ApplePlatformName,
  Platform,
  PlatformName,
} from "./skia-configuration";
import {
  applySkiaPatches,
  commonArgs,
  configurations,
  copyHeaders,
  isApplePlatform,
  OutFolder,
  PackageRoot,
  ProjectRoot,
  SkiaSrc,
} from "./skia-configuration";
import { applyDawnPatches } from "./dawn-configuration";
import { $, mapKeys, runAsync } from "./utils";

const getOutDir = (platform: PlatformName, targetName: string) => {
  return `${OutFolder}/${platform}/${targetName}`;
};

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
  await runAsync(
    command,
    `${platform === "android" ? "🤖" : "🍏"} ${targetName}`
  );
};

// A Skia archive that defines a typeinfo of the C++ runtime makes librnskia.so
// export that copy and bind its catch clauses to it instead of libc++_shared's.
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

export const copyLib = (
  os: PlatformName,
  cpu: string,
  platform: string,
  outputNames: string[]
) => {
  const dstPath = `${PackageRoot}/libs/${os}/${platform}/`;
  $(`mkdir -p ${dstPath}`);

  outputNames
    .map((name) => `${OutFolder}/${os}/${cpu}/${name}`)
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
 * Builds an XCFramework for a specific Apple platform.
 * Each platform produces its own XCFramework:
 * - apple-ios: arm64-iphoneos + lipo'd iphonesimulator (arm64 + x64) + lipo'd maccatalyst (arm64 + x64)
 * - apple-tvos: arm64-tvos + lipo'd tvsimulator (arm64 + x64)
 * - apple-macos: lipo'd macosx (arm64 + x64)
 * A slice whose targets were not built (e.g. `yarn build-skia
 * apple-ios-arm64-iphoneos` to test on a device) is left out, and a lipo'd
 * slice keeps the architectures that were built.
 */
const xcframeworkSlices: Record<
  ApplePlatformName,
  { name: string; targets: string[] }[]
> = {
  "apple-ios": [
    { name: "arm64-iphoneos", targets: ["arm64-iphoneos"] },
    {
      name: "iphonesimulator",
      targets: ["x64-iphonesimulator", "arm64-iphonesimulator"],
    },
    {
      name: "maccatalyst",
      targets: ["x64-maccatalyst", "arm64-maccatalyst"],
    },
  ],
  "apple-tvos": [
    { name: "arm64-tvos", targets: ["arm64-tvos"] },
    {
      name: "tvsimulator",
      targets: ["x64-tvsimulator", "arm64-tvsimulator"],
    },
  ],
  "apple-macos": [{ name: "macosx", targets: ["x64-macosx", "arm64-macosx"] }],
};

const buildXCFramework = (
  platformName: ApplePlatformName,
  builtTargets: string[]
) => {
  const config = configurations[platformName];
  const { outputNames } = config;

  process.chdir(SkiaSrc);
  const prefix = `${OutFolder}/${platformName}`;

  // Get the short platform name (ios, tvos, macos)
  const shortPlatform = platformName.replace("apple-", "");

  // Create output directory
  const outputDir = `${PackageRoot}/libs/${shortPlatform}`;
  $(`mkdir -p ${outputDir}`);

  outputNames.forEach((name) => {
    console.log(`🍏 Building XCFramework for ${name} (${platformName})`);

    let xcframeworkCmd = "xcodebuild -create-xcframework ";
    for (const slice of xcframeworkSlices[platformName]) {
      const inputs = slice.targets
        .filter((target) => builtTargets.includes(target))
        .map((target) => `${prefix}/${target}/${name}`);
      if (inputs.length === 0) {
        continue;
      }
      if (slice.targets.length === 1) {
        xcframeworkCmd += `-library ${inputs[0]} `;
      } else {
        $(`mkdir -p ${prefix}/${slice.name}`);
        $(`rm -rf ${prefix}/${slice.name}/${name}`);
        $(
          `lipo -create ${inputs.join(" ")} -output ${prefix}/${slice.name}/${name}`
        );
        xcframeworkCmd += `-library ${prefix}/${slice.name}/${name} `;
      }
    }

    const [lib] = name.split(".");
    const dstPath = `${outputDir}/${lib}.xcframework`;
    xcframeworkCmd += `-output ${dstPath}`;

    $(xcframeworkCmd);
  });

  console.log(`✅ XCFramework built for ${platformName}`);
};

(async () => {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const defaultTargets = Object.keys(configurations);
  const targetSpecs = args.length > 0 ? args : defaultTargets;

  // Parse target specifications (platform or platform-target format)
  const buildTargets: { platform: PlatformName; targets?: string[] }[] = [];
  const validPlatforms = Object.keys(configurations);

  for (const spec of targetSpecs) {
    // First check if the entire spec is a valid platform name (e.g., "android", "apple-ios")
    if (validPlatforms.includes(spec)) {
      buildTargets.push({ platform: spec as PlatformName });
    } else if (spec.includes("-")) {
      // Handle platform-target format (android-arm64,
      // apple-ios-arm64-iphonesimulator): the platform is the longest
      // platform name the spec starts with, the rest is the target.
      const [platform] = validPlatforms
        .filter((name) => spec.startsWith(`${name}-`))
        .sort((a, b) => b.length - a.length);
      if (!platform) {
        console.error(`❌ Invalid platform or target: ${spec}`);
        console.error(`Valid platforms are: ${validPlatforms.join(", ")}`);
        exit(1);
      }
      const target = spec.slice(platform.length + 1);

      const platformConfig = configurations[platform as PlatformName];
      if (!(target in platformConfig.targets)) {
        console.error(
          `❌ Invalid target '${target}' for platform '${platform}'`
        );
        console.error(
          `Valid targets for ${platform}: ${Object.keys(
            platformConfig.targets
          ).join(", ")}`
        );
        exit(1);
      }

      // Find existing platform entry or create new one
      let existingPlatform = buildTargets.find(
        (bt) => bt.platform === platform
      );
      if (!existingPlatform) {
        existingPlatform = { platform: platform as PlatformName, targets: [] };
        buildTargets.push(existingPlatform);
      }
      if (!existingPlatform.targets) {
        existingPlatform.targets = [];
      }
      existingPlatform.targets.push(target);
    } else {
      // Invalid spec
      console.error(`❌ Invalid platform: ${spec}`);
      console.error(`Valid platforms are: ${validPlatforms.join(", ")}`);
      exit(1);
    }
  }

  console.log(`🎯 Building targets: ${targetSpecs.join(", ")}`);
  console.log("🪨 Skia Graphite");

  // Check Android environment variables if android is in target platforms
  const hasAndroid = buildTargets.some((bt) => bt.platform === "android");
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

  // Run glient sync
  console.log("Running gclient sync...");
  // Start by running sync
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

  // Keep the separately built Dawn library and headers in libs/dawn.
  for (const { platform } of buildTargets) {
    $(`rm -rf ${PackageRoot}/${configurations[platform].outputRoot}`);
  }

  // Build specified platforms and targets
  for (const buildTarget of buildTargets) {
    const { platform, targets } = buildTarget;
    const configuration = configurations[platform];
    console.log(`\n🔨 Building platform: ${platform}`);

    const targetsToProcess =
      targets || (mapKeys(configuration.targets) as string[]);

    for (const target of targetsToProcess) {
      await configurePlatform(platform, configuration, target);
      await buildPlatform(platform, target);
      process.chdir(ProjectRoot);
      if (platform === "android") {
        configuration.outputNames.forEach((name) =>
          assertNoRuntimeTypeinfo(`${getOutDir(platform, target)}/${name}`)
        );
        copyLib(
          platform,
          target,
          configurations.android.targets[target].output,
          configuration.outputNames
        );
      }
    }
  }

  // Build XCFrameworks for each Apple platform that was built
  for (const { platform, targets } of buildTargets) {
    if (isApplePlatform(platform)) {
      buildXCFramework(
        platform as ApplePlatformName,
        targets || mapKeys(configurations[platform].targets).map(String)
      );
    }
  }

  copyHeaders();
})();
