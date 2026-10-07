import { execSync } from "child_process";
import { exit } from "process";
import fs from "fs";

import type {
  ApplePlatformName,
  Platform,
  PlatformName,
} from "./skia-configuration";
import {
  commonArgs,
  configurations,
  copyHeaders,
  GRAPHITE,
  isApplePlatform,
  MACCATALYST,
  OutFolder,
  PackageRoot,
  ProjectRoot,
  SkiaSrc,
} from "./skia-configuration";
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
    });
};

/**
 * Builds an XCFramework for a specific Apple platform.
 * Each platform produces its own XCFramework:
 * - apple-ios: arm64-iphoneos + lipo'd iphonesimulator (arm64 + x64)
 * - apple-tvos: arm64-tvos + lipo'd tvsimulator (arm64 + x64)
 * - apple-macos: lipo'd macosx (arm64 + x64)
 * - apple-maccatalyst: lipo'd maccatalyst (arm64 + x64)
 */
const buildXCFramework = (platformName: ApplePlatformName) => {
  const config = configurations[platformName];

  // Skip if no targets configured (e.g., tvos when GRAPHITE)
  if (Object.keys(config.targets).length === 0) {
    console.log(`⏭️  Skipping ${platformName} - no targets configured`);
    return;
  }

  const { outputNames } = config;
  if (outputNames.length === 0) {
    console.log(`⏭️  Skipping ${platformName} - no outputs configured`);
    return;
  }

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

    if (shortPlatform === "ios") {
      // iOS: device + lipo'd simulator (arm64 + x64)
      $(`mkdir -p ${prefix}/iphonesimulator`);
      $(`rm -rf ${prefix}/iphonesimulator/${name}`);
      $(
        `lipo -create ${prefix}/x64-iphonesimulator/${name} ${prefix}/arm64-iphonesimulator/${name} -output ${prefix}/iphonesimulator/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/arm64-iphoneos/${name} `;
      xcframeworkCmd += `-library ${prefix}/iphonesimulator/${name} `;
    } else if (shortPlatform === "tvos") {
      // tvOS: device + lipo'd simulator (arm64 + x64)
      $(`mkdir -p ${prefix}/tvsimulator`);
      $(`rm -rf ${prefix}/tvsimulator/${name}`);
      $(
        `lipo -create ${prefix}/x64-tvsimulator/${name} ${prefix}/arm64-tvsimulator/${name} -output ${prefix}/tvsimulator/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/arm64-tvos/${name} `;
      xcframeworkCmd += `-library ${prefix}/tvsimulator/${name} `;
    } else if (shortPlatform === "macos") {
      // macOS: lipo arm64 + x64
      $(`mkdir -p ${prefix}/macosx`);
      $(`rm -rf ${prefix}/macosx/${name}`);
      $(
        `lipo -create ${prefix}/x64-macosx/${name} ${prefix}/arm64-macosx/${name} -output ${prefix}/macosx/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/macosx/${name} `;
    } else if (shortPlatform === "maccatalyst") {
      // Mac Catalyst: lipo arm64 + x64
      $(`mkdir -p ${prefix}/maccatalyst`);
      $(`rm -rf ${prefix}/maccatalyst/${name}`);
      $(
        `lipo -create ${prefix}/x64-maccatalyst/${name} ${prefix}/arm64-maccatalyst/${name} -output ${prefix}/maccatalyst/${name}`
      );
      xcframeworkCmd += `-library ${prefix}/maccatalyst/${name} `;
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

  if (GRAPHITE) {
    console.log("🪨 Skia Graphite");
    console.log(
      "⚠️  Apple TV (tvOS) and MacCatalyst builds are skipped when GRAPHITE is enabled"
    );
  } else {
    console.log("🐘 Skia Ganesh");
  }

  if (MACCATALYST) {
    console.log("✅ macCatalyst builds are enabled");
  } else {
    console.log(
      "⚠️  macCatalyst builds are disabled (set SK_MACCATALYST=1 to enable)"
    );
  }

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
  if (GRAPHITE) {
    console.log("Applying Graphite patches...");
    $(`git reset --hard HEAD`);

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
    if (is_mac) {
      frameworks += [ "Cocoa.framework" ]
    }
  }
}`
      );
      // The app links published libwebgpu_dawn; Skia only needs Dawn headers.
      const dawnBuild =
        /sanitizer_args = \[\][\s\S]*?(?=config\("dawn_defines"\))/;
      if (!dawnBuild.test(content)) {
        throw new Error(`Patch target not found in ${filePath}`);
      }
      content = content
        .replace(/  _dawn_lib_name = "[^"]+"\n/g, "")
        .replace('    ldflags = [ "/WHOLEARCHIVE:dawn_combined.lib" ]\n', "")
        .replace('  libs += [ "$root_out_dir/$_dawn_lib_name" ]\n', "")
        .replace(
          'public_deps = [ ":dawn_cmake" ]',
          'public_deps = [ ":dawn_headers" ]'
        )
        .replace(
          dawnBuild,
          `action("dawn_headers") {
  _dawn_root = "../externals/dawn"
  script = "$_dawn_root/generator/dawn_json_generator.py"
  sources = [ "$_dawn_root/src/dawn/dawn.json" ]
  outputs = [
    "$target_gen_dir/dawn_headers.json",
    "$target_gen_dir/include/dawn/dawn_proc_table.h",
    "$target_gen_dir/include/dawn/webgpu.h",
    "$target_gen_dir/include/dawn/webgpu_cpp.h",
    "$target_gen_dir/include/dawn/webgpu_cpp_print.h",
    "$target_gen_dir/include/dawn/wire/client/webgpu.h",
    "$target_gen_dir/include/dawn/wire/client/webgpu_cpp.h",
    "$target_gen_dir/include/dawn/wire/client/webgpu_cpp_print.h",
    "$target_gen_dir/include/webgpu/webgpu_cpp_chained_struct.h",
  ]
  depfile = "$target_gen_dir/dawn_headers.d"
  args = [
    "--dawn-json",
    rebase_path(sources[0], root_build_dir),
    "--targets=headers,cpp_headers",
    "--template-dir",
    rebase_path("$_dawn_root/generator/templates", root_build_dir),
    "--jinja2-path",
    rebase_path("../externals/jinja2", root_build_dir),
    "--markupsafe-path",
    rebase_path("../externals/markupsafe", root_build_dir),
    "--root-dir",
    rebase_path("../externals", root_build_dir),
    "--output-dir",
    rebase_path(target_gen_dir, root_build_dir),
    "--output-json-tarball",
    rebase_path(outputs[0], root_build_dir),
    "--depfile",
    rebase_path(depfile, root_build_dir),
  ]
}

`
        );
      fs.writeFileSync(filePath, content);
    }
    console.log("Patches applied successfully");
  }
  $(`rm -rf ${PackageRoot}/libs`);

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
