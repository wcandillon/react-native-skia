import { executeCmd, executeCmdSync } from "./utils";
import { exit } from "process";
import { commonArgs, configurations, PlatformName } from "./skia-configuration";
import { existsSync, mkdirSync } from "fs";

const typedKeys = <T extends object>(obj: T) => Object.keys(obj) as (keyof T)[];

/**
 * This build script builds the Skia Binaries from the Skia repositories
 * that are added as submodules to this repo. Both the Skia repo and
 * the depottools (build tools) for building is included.
 *
 * The build script does not have any other requirements than that the
 * Android NDK should be installed.
 *
 * This build script is run by the build-skia.yml github workflow
 *
 * Arguments:
 * @param platform the current platform as defined in the file skia-configuration.ts
 * @param cpu the cpu platform as defined in the file skia-configuration.ts
 *
 */

console.log("Starting SKIA Build.");
console.log("");

// Test for existence of Android SDK
if (!process.env.ANDROID_NDK) {
  console.log("ANDROID_NDK not set.");
  exit(1);
} else {
  console.log("☑ ANDROID_NDK");
}

console.log("");
console.log("Requirements met. Starting build.");
console.log("");

if (process.argv.length !== 4) {
  console.log("Missing platform/target arguments");
  console.log("Available platforms/targets:");
  console.log("");
  typedKeys(configurations).forEach((platform) => {
    console.log(platform);
    const config = configurations[platform];
    Object.keys(config.targets).forEach((target) => console.log("  " + target));
  });
  exit(1);
}

const currentDir = process.cwd();
const SkiaDir = "./externals/skia";
const SelectedPlatform = (process.argv[2] as PlatformName) ?? "";
const SelectedTarget = process.argv[3] ?? "";

if (SkiaDir === undefined) {
  throw new Error("No Skia root directory specified.");
}

const getOutDir = (platform: PlatformName, targetName: string) => {
  return `out/${platform}/${targetName}`;
};

const configurePlatform = (platform: PlatformName, targetName: string) => {
  console.log(`Configuring platform "${platform}" for target "${targetName}"`);
  console.log("Current directory", process.cwd());

  const configuration = configurations[platform];
  if (configuration) {
    const target = configuration.targets[targetName];
    if (!target) {
      console.log(`Target ${targetName} not found for platform ${platform}`);
      exit(1);
    }

    const commandline = `PATH=../depot_tools/:$PATH gn gen ${getOutDir(
      platform,
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

    const command = `${commandline} ${options} ${targetOptions} --script-executable=python3 --args='target_os="${platform}" target_cpu="${target.cpu}" ${common}${args}${targetArgs}'`;
    console.log("Command:");
    console.log(command);
    console.log("===============================");
    executeCmdSync(command);
    return true;
  } else {
    console.log(
      `Could not find platform "${platform}" for target "${targetName}" `
    );
    return false;
  }
};

const buildPlatform = (
  platform: PlatformName,
  targetName: string,
  callback: () => void
) => {
  console.log(`Building platform "${platform}" for target "${targetName}"`);
  // We need to include the path to our custom python2 -> python3 mapping script
  // to make sure we can run all scripts that uses #!/usr/bin/env python as shebang
  // https://groups.google.com/g/skia-discuss/c/BYyB-TwA8ow
  const command = `PATH=${process.cwd()}/../bin:$PATH ninja -C ${getOutDir(
    platform,
    targetName
  )}`;
  console.log(command);
  executeCmd(command, `${platform}/${targetName}`, callback);
};

const processOutput = (platformName: PlatformName, targetName: string) => {
  console.log(
    `Copying output for platform "${platformName}" and cpu "${targetName}"`
  );
  const source = getOutDir(platformName, targetName);
  const configuration = configurations[platformName];
  if (configuration) {
    const libNames = configuration.outputNames;
    let targetDir = `${currentDir}/${configurations[platformName].outputRoot}/${targetName}`;
    // Check if we have any output mappings here
    const target = configuration.targets[targetName];
    if (target.output) {
      targetDir = `${currentDir}/${configurations[platformName].outputRoot}/${target.output}`;
    }

    if (!existsSync(targetDir)) {
      console.log(`Creating directory '${targetDir}'...`);
      mkdirSync(targetDir + "/", { recursive: true });
    }

    libNames.forEach((libName) => {
      console.log(`Copying ${source}/${libName} to ${targetDir}/`);
      console.log(`cp ${source}/${libName} ${targetDir}/.`);
      executeCmdSync(`cp ${source}/${libName} ${targetDir}/.`);
    });
  } else {
    throw new Error(
      `Could not find platform "${platformName}" for tagetCpu "${targetName}" `
    );
  }
};

try {
  console.log(`Entering directory ${SkiaDir}`);
  process.chdir(SkiaDir);

  // Find platform/target
  const platform = configurations[SelectedPlatform];
  if (!platform) {
    console.log(`Could not find platform ${SelectedPlatform}`);
    exit(1);
  }
  const target = platform.targets[SelectedTarget];
  if (!target) {
    console.log(
      `Could not find target ${SelectedTarget} for platform ${SelectedPlatform}`
    );
    exit(1);
  }

  // Run glient sync
  console.log("Running gclient sync...");

  // Start by running sync
  executeCmdSync("PATH=../depot_tools/:$PATH python3 tools/git-sync-deps");
  console.log("gclient sync done");

  try {
    // Configure the platform
    if (!configurePlatform(SelectedPlatform, SelectedTarget)) {
      throw Error(
        `Error configuring platform "${SelectedPlatform}" for cpu "${SelectedTarget}"`
      );
    }
    // Spawn build
    buildPlatform(SelectedPlatform, SelectedTarget, () => {
      process.chdir(SkiaDir);
      // Copy the output
      processOutput(SelectedPlatform, SelectedTarget);
      // Revert back to original directory
      process.chdir(currentDir);
    });
  } catch (err) {
    console.log(`ERROR ${SelectedPlatform}/${SelectedTarget}: ${err}`);
  }

  process.chdir(currentDir);
} catch (err) {
  console.log(err);
}
