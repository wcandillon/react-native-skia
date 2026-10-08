import { execSync } from "child_process";
import { exit } from "process";
import fs from "fs";
import path from "path";

import type {
  ApplePlatformName,
  Platform,
  PlatformName,
} from "./skia-configuration";
import {
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
 * - apple-macos: lipo'd macosx (arm64 + x64)
 */
const buildXCFramework = (platformName: ApplePlatformName) => {
  const config = configurations[platformName];
  const { outputNames } = config;

  process.chdir(SkiaSrc);
  const prefix = `${OutFolder}/${platformName}`;

  // Get the short platform name (ios, macos)
  const shortPlatform = platformName.replace("apple-", "");

  // Create output directory
  const outputDir = `${PackageRoot}/libs/${shortPlatform}`;
  $(`mkdir -p ${outputDir}`);

  outputNames.forEach((name) => {
    console.log(`🍏 Building XCFramework for ${name} (${platformName})`);

    let xcframeworkCmd = "xcodebuild -create-xcframework ";

    if (shortPlatform === "ios") {
      // iOS: device + lipo'd simulator (arm64 + x64) + lipo'd Mac Catalyst (arm64 + x64)
      $(`mkdir -p ${prefix}/iphonesimulator`);
      $(`rm -rf ${prefix}/iphonesimulator/${name}`);
      $(
        `lipo -create ${prefix}/x64-iphonesimulator/${name} ${prefix}/arm64-iphonesimulator/${name} -output ${prefix}/iphonesimulator/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/arm64-iphoneos/${name} `;
      xcframeworkCmd += `-library ${prefix}/iphonesimulator/${name} `;
      $(`mkdir -p ${prefix}/maccatalyst`);
      $(`rm -rf ${prefix}/maccatalyst/${name}`);
      $(
        `lipo -create ${prefix}/x64-maccatalyst/${name} ${prefix}/arm64-maccatalyst/${name} -output ${prefix}/maccatalyst/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/maccatalyst/${name} `;
    } else if (shortPlatform === "macos") {
      // macOS: lipo arm64 + x64
      $(`mkdir -p ${prefix}/macosx`);
      $(`rm -rf ${prefix}/macosx/${name}`);
      $(
        `lipo -create ${prefix}/x64-macosx/${name} ${prefix}/arm64-macosx/${name} -output ${prefix}/macosx/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/macosx/${name} `;
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
      // Handle platform-target format (e.g., android-arm, android-arm64)
      const [platform, target] = spec.split("-", 2);
      if (!validPlatforms.includes(platform)) {
        console.error(`❌ Invalid platform or target: ${spec}`);
        console.error(`Valid platforms are: ${validPlatforms.join(", ")}`);
        exit(1);
      }

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
  {
    console.log("Applying Graphite patches...");
    $(`git reset --hard HEAD`);

    // PartitionAlloc is a Chromium dependency Dawn's GN rules can pull in;
    // the Skia tree does not have it and skia_use_partition_alloc is off.
    {
      const filePath = `${SkiaSrc}/build_overrides/dawn.gni`;
      const marker = "# PartitionAlloc is an optional dependency:";
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const index = content.indexOf(marker);
        if (index !== -1) {
          fs.writeFileSync(filePath, content.slice(0, index));
        }
      }
    }

    // Remove arm64e arch flags (not available on simulator)
    {
      const filePath = `${SkiaSrc}/gn/skia/BUILD.gn`;
      const search = [
        `        "-arch",`,
        `        "arm64e",`,
        `      ]`,
        `    } else if (current_cpu == "x86") {`,
      ].join("\n");
      const replace = [
        `      ]`,
        `    } else if (current_cpu == "x86") {`,
      ].join("\n");
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes(search)) {
        throw new Error(`Patch target not found in ${filePath}`);
      }
      fs.writeFileSync(filePath, content.replace(search, replace));
    }
    // C++20 is required for Dawn (uses concepts/requires)
    {
      const filePath = `${SkiaSrc}/gn/skia/BUILD.gn`;
      const content = fs.readFileSync(filePath, "utf-8");
      fs.writeFileSync(
        filePath,
        content.replace(
          `cflags_cc += [ "-std=c++17" ]`,
          `cflags_cc += [ "-std=c++20" ]`
        )
      );
    }
    // Fix Dawn ShaderModuleMTL.mm uint32 typo (should be uint32_t)
    {
      const filePath = `${SkiaSrc}/third_party/externals/dawn/src/dawn/native/metal/ShaderModuleMTL.mm`;
      const content = fs.readFileSync(filePath, "utf-8");
      fs.writeFileSync(
        filePath,
        content.replace(
          /uint32\(bindingInfo\.binding\)/g,
          "uint32_t(bindingInfo.binding)"
        )
      );
    }
    // Add iOS support to Dawn cmake_utils.py
    {
      const filePath = `${SkiaSrc}/third_party/dawn/cmake_utils.py`;
      let content = fs.readFileSync(filePath, "utf-8");
      // Add --ios_use_simulator argument
      content = content.replace(
        `parser.add_argument(
      "--enable_rtti", action=argparse.BooleanOptionalAction, help="Enable RTTI.")`,
        `parser.add_argument(
      "--enable_rtti", action=argparse.BooleanOptionalAction, help="Enable RTTI.")
  parser.add_argument(
      "--ios_use_simulator", action=argparse.BooleanOptionalAction, help="Build for iOS simulator.")`
      );
      // Add iOS OS/CPU mapping
      content = content.replace(
        `if os == "mac":
    target_cpu_map = {
      "arm64": "arm64",
      "x64": "x86_64",
    }
    return "Darwin", target_cpu_map[cpu]

  if os == "win":`,
        `if os == "mac":
    target_cpu_map = {
      "arm64": "arm64",
      "x64": "x86_64",
    }
    return "Darwin", target_cpu_map[cpu]

  if os == "ios":
    target_cpu_map = {
      "arm64": "arm64",
      "x64": "x86_64",
    }
    return "iOS", target_cpu_map[cpu]

  if os == "win":`
      );
      fs.writeFileSync(filePath, content);
    }
    // Add iOS support to Dawn build_dawn.py
    {
      const filePath = `${SkiaSrc}/third_party/dawn/build_dawn.py`;
      let content = fs.readFileSync(filePath, "utf-8");
      content = content.replace(
        `if target_os == "Darwin" or target_os == "iOS":
    configure_cmd.append(f"-DCMAKE_OSX_ARCHITECTURES={target_cpu}")

  env = os.environ.copy()`,
        `if target_os == "Darwin" or target_os == "iOS":
    configure_cmd.append(f"-DCMAKE_OSX_ARCHITECTURES={target_cpu}")

  if target_os == "iOS":
    configure_cmd.append("-DTINT_BUILD_CMD_TOOLS=OFF")
    if args.ios_use_simulator:
      configure_cmd.append("-DCMAKE_OSX_SYSROOT=iphonesimulator")

  env = os.environ.copy()`
      );
      fs.writeFileSync(filePath, content);
    }
    // Fix Dawn BUILD.gn for iOS (Cocoa.framework is macOS only)
    {
      const filePath = `${SkiaSrc}/third_party/dawn/BUILD.gn`;
      let content = fs.readFileSync(filePath, "utf-8");
      content = content.replace(
        `"Metal.framework",
      "QuartzCore.framework",
      "Cocoa.framework",
    ]
  }
}`,
        `"Metal.framework",
      "QuartzCore.framework",
    ]
    if (is_mac && !is_catalyst) {
      frameworks += [ "Cocoa.framework" ]
    }
  }
}`
      );
      // Add ios_use_simulator argument passing
      content = content.replace(
        `if (is_android) {
    args += [
      "--android_ndk_path=" + ndk,
      "--android_platform=android-" + ndk_api,
    ]
  }

  if (dawn_enable_d3d11) {`,
        `if (is_android) {
    args += [
      "--android_ndk_path=" + ndk,
      "--android_platform=android-" + ndk_api,
    ]
  }
  if (is_ios && ios_use_simulator) {
    args += [ "--ios_use_simulator" ]
  }

  if (dawn_enable_d3d11) {`
      );
      fs.writeFileSync(filePath, content);
    }
    // Catalyst uses the macOS SDK with an iOS ABI and deployment target.
    const catalystPatch = path.join(__dirname, "skia-catalyst.patch");
    $(`git apply ${catalystPatch}`);
    // The GN build compiles the same Dawn checkout as build-dawn.ts.
    // Without this, Mac Catalyst compilation will be failed.
    applyDawnPatches();
    console.log("Patches applied successfully");
  }
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
  const applePlatforms = buildTargets
    .filter((bt) => isApplePlatform(bt.platform))
    .map((bt) => bt.platform as ApplePlatformName);

  for (const applePlatform of applePlatforms) {
    buildXCFramework(applePlatform);
  }

  copyHeaders();
})();
