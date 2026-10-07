/**
 * Script to download Skia binaries from GitHub releases.
 *
 * Usage:
 *   npx tsx src/download-binaries.ts --skia-version=m144c
 *   npx tsx src/download-binaries.ts --skia-version=m144c --platform=android
 *   npx tsx src/download-binaries.ts --skia-version=m142b --graphite
 *
 * Options:
 *   --skia-version  Skia version (e.g., m144c)
 *   --platform      Specific platform to download (optional, downloads all if omitted)
 *   --graphite      Download Graphite binaries instead of Ganesh
 *   --output-dir    Output directory (default: ./libs)
 */

import path from "path";
import { fileURLToPath } from "url";

import {
  downloadAndExtractAsset,
  downloadXcframeworks,
} from "./release-assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

interface ArchConfig {
  artifact: string;
  destSubdir: string;
  srcSubdir: string;
}

interface PlatformConfig {
  artifacts: ArchConfig[];
}

// Platform configurations for merged Android package
const GANESH_PLATFORMS: Record<string, PlatformConfig> = {
  android: {
    artifacts: [
      { artifact: "skia-android-arm", destSubdir: "armeabi-v7a", srcSubdir: "armeabi-v7a" },
      { artifact: "skia-android-arm-64", destSubdir: "arm64-v8a", srcSubdir: "arm64-v8a" },
      { artifact: "skia-android-arm-x86", destSubdir: "x86", srcSubdir: "x86" },
      { artifact: "skia-android-arm-x64", destSubdir: "x86_64", srcSubdir: "x86_64" },
    ],
  },
  "apple-ios": {
    artifacts: [
      { artifact: "skia-apple-ios-xcframeworks", destSubdir: "", srcSubdir: "ios" },
    ],
  },
  "apple-tvos": {
    artifacts: [
      { artifact: "skia-apple-tvos-xcframeworks", destSubdir: "", srcSubdir: "tvos" },
    ],
  },
  "apple-macos": {
    artifacts: [
      { artifact: "skia-apple-macos-xcframeworks", destSubdir: "", srcSubdir: "macos" },
    ],
  },
};

const GRAPHITE_PLATFORMS: Record<string, PlatformConfig> = {
  android: {
    artifacts: [
      { artifact: "skia-graphite-android-arm", destSubdir: "armeabi-v7a", srcSubdir: "arm" },
      { artifact: "skia-graphite-android-arm-64", destSubdir: "arm64-v8a", srcSubdir: "arm64" },
      { artifact: "skia-graphite-android-arm-x86", destSubdir: "x86", srcSubdir: "x86" },
      { artifact: "skia-graphite-android-arm-x64", destSubdir: "x86_64", srcSubdir: "x64" },
    ],
  },
  "apple-ios": {
    artifacts: [
      { artifact: "skia-graphite-apple-ios-xcframeworks", destSubdir: "", srcSubdir: "ios" },
    ],
  },
  "apple-macos": {
    artifacts: [
      { artifact: "skia-graphite-apple-macos-xcframeworks", destSubdir: "", srcSubdir: "macos" },
    ],
  },
  headers: {
    artifacts: [
      { artifact: "skia-graphite-headers", destSubdir: "", srcSubdir: "" },
    ],
  },
};

interface Args {
  [key: string]: string | boolean;
}

const parseArgs = (): Args => {
  const args: Args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value ?? true;
    }
  }
  return args;
};

const downloadArtifact = async (
  archConfig: ArchConfig,
  skiaVersion: string,
  outputDir: string,
  graphite: boolean
): Promise<void> => {
  const releaseTag = graphite
    ? `skia-graphite-${skiaVersion}`
    : `skia-${skiaVersion}`;
  const destDir = archConfig.destSubdir
    ? path.join(outputDir, archConfig.destSubdir)
    : outputDir;

  console.log(`  Installing ${archConfig.artifact} to ${destDir}...`);
  if (archConfig.artifact.endsWith("-xcframeworks")) {
    await downloadXcframeworks(
      archConfig.artifact,
      releaseTag,
      destDir,
      archConfig.srcSubdir
    );
  } else {
    await downloadAndExtractAsset(
      archConfig.artifact,
      releaseTag,
      destDir,
      archConfig.srcSubdir
    );
  }
  console.log(`  Done!`);
};

const main = async (): Promise<void> => {
  const args = parseArgs();

  if (!args["skia-version"]) {
    console.error("Error: --skia-version is required");
    console.error("Usage: npx tsx src/download-binaries.ts --skia-version=m144c");
    process.exit(1);
  }

  const skiaVersion = args["skia-version"] as string;
  const graphite = args.graphite === true;
  const outputDir = (args["output-dir"] as string) || path.join(ROOT_DIR, "libs");
  const specificPlatform = args.platform as string | undefined;

  const platforms = graphite ? GRAPHITE_PLATFORMS : GANESH_PLATFORMS;

  if (specificPlatform && !platforms[specificPlatform]) {
    console.error(`Error: Unknown platform "${specificPlatform}"`);
    console.error(`Available platforms: ${Object.keys(platforms).join(", ")}`);
    process.exit(1);
  }

  const platformsToDownload = specificPlatform
    ? { [specificPlatform]: platforms[specificPlatform] }
    : platforms;

  console.log(`Downloading ${graphite ? "Graphite" : "Ganesh"} binaries...`);
  console.log(`  Skia version: ${skiaVersion}`);
  console.log(`  Output: ${outputDir}`);
  console.log("");

  for (const [name, config] of Object.entries(platformsToDownload)) {
    console.log(`Platform: ${name}`);
    const platformDir = path.join(outputDir, name);

    try {
      for (const archConfig of config.artifacts) {
        await downloadArtifact(archConfig, skiaVersion, platformDir, graphite);
      }
      console.log("");
    } catch (error) {
      console.error(`  Failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  console.log("All downloads complete!");
};

main();
