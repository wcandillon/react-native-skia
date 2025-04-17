import { exit } from "process";

import type { Platform, PlatformName } from "./skia-configuration";
import {
  commonArgs,
  configurations,
  copyHeaders,
  GRAPHITE,
  OutFolder,
  PackageRoot,
  ProjectRoot,
  SHOULD_BUILD_TVOS,
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

    // eslint-disable-next-line max-len
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

const buildXCFrameworks = () => {
  const os: PlatformName = "apple";
  const { outputNames } = configurations.apple;
  process.chdir(SkiaSrc);
  outputNames.forEach((name) => {
    console.log("Building XCFramework for " + name);
    const prefix = `${OutFolder}/${os}`;
    if (SHOULD_BUILD_TVOS) {
      $(`mkdir -p ${OutFolder}/${os}/tvsimulator`);
      $(`rm -rf ${OutFolder}/${os}/tvsimulator/${name}`);
      $(
        // eslint-disable-next-line max-len
        `lipo -create ${OutFolder}/${os}/x64-tvsimulator/${name} ${OutFolder}/${os}/arm64-tvsimulator/${name} -output ${OutFolder}/${os}/tvsimulator/${name}`
      );
    }
    $(`mkdir -p ${OutFolder}/${os}/iphonesimulator`);
    $(`rm -rf ${OutFolder}/${os}/iphonesimulator/${name}`);
    $(
      // eslint-disable-next-line max-len
      `lipo -create ${OutFolder}/${os}/x64-iphonesimulator/${name} ${OutFolder}/${os}/arm64-iphonesimulator/${name} -output ${OutFolder}/${os}/iphonesimulator/${name}`
    );
    $(`mkdir -p ${OutFolder}/${os}/macosx`);
    $(`rm -rf ${OutFolder}/${os}/macosx/${name}`);
    $(
      // eslint-disable-next-line max-len
      `lipo -create ${OutFolder}/${os}/x64-macosx/${name} ${OutFolder}/${os}/arm64-macosx/${name} -output ${OutFolder}/${os}/macosx/${name}`
    );
    const [lib] = name.split(".");
    const dstPath = `${PackageRoot}/libs/${os}/${lib}.xcframework`;
    const libs = [
      `${prefix}/arm64-iphoneos/${name}`,
      `${prefix}/iphonesimulator/${name}`,
      `${prefix}/arm64-tvos/${name}`,
      `${prefix}/macosx/${name}`,
    ];
    if (SHOULD_BUILD_TVOS) {
      libs.push(`${prefix}/tvsimulator/${name}`);
    }
    $(
      "xcodebuild -create-xcframework " +
        libs.join(" -library ") +
        ` -output ${dstPath}`
    );
  });
};

(async () => {
  if (GRAPHITE) {
    console.log("🪨 Skia Graphite");
  } else {
    console.log("🐘 Skia Ganesh");
  }
  ["ANDROID_NDK", "ANDROID_HOME"].forEach((name) => {
    // Test for existence of Android SDK
    if (!process.env[name]) {
      console.log(`${name} not set.`);
      exit(1);
    } else {
      console.log(`✅ ${name}`);
    }
  });

  // Run glient sync
  console.log("Running gclient sync...");
  // Start by running sync
  process.chdir(SkiaSrc);
  $("PATH=../depot_tools/:$PATH python3 tools/git-sync-deps");
  console.log("gclient sync done");
  $(`rm -rf ${PackageRoot}/libs`);
  for (const key of mapKeys(configurations)) {
    const configuration = configurations[key];
    for (const target of mapKeys(configuration.targets)) {
      if (!SHOULD_BUILD_TVOS) {
        if (
          target === "arm64-tvos" ||
          target === "x64-tvsimulator" ||
          target === "arm64-tvsimulator"
        ) {
          continue;
        }
      }
      await configurePlatform(key as PlatformName, configuration, target);
      await buildPlatform(key as PlatformName, target);
      process.chdir(ProjectRoot);
      if (key === "android") {
        copyLib(
          key,
          target,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          configuration.targets[target].output,
          configuration.outputNames
        );
      }
    }
  }
  buildXCFrameworks();
  copyHeaders();
})();
