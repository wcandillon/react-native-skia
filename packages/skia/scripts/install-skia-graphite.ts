/**
 * Install Skia Graphite prebuilt binaries
 *
 * This script downloads Graphite-enabled Skia binaries from GitHub releases,
 * verifies checksums, and sets up the Skia submodule to the matching version.
 */

// Set SK_GRAPHITE before importing skia-configuration so GRAPHITE flag is true
process.env.SK_GRAPHITE = "1";

import { execSync } from "child_process";
import { createHash } from "crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import https from "https";
import path from "path";

import { extract } from "tar";

import { copyHeaders } from "./skia-configuration";
import { fileOps } from "./utils";

// Graphite configuration
const GRAPHITE_CONFIG = {
  version: "m152",
  checksums: {
    "android-armeabi-v7a":
      "edc363fb63d3e629d7023d63d505c2d075030dfc40e04890d988eaff5c31c2fc",
    "android-arm64-v8a":
      "cefc18191d46deec3e164f3b717b06c6ae7845eeec21fe11cca53339063cf1e2",
    "android-x86":
      "78041f4d58fafda1821c96f83e4818cce492a7047b16f267527e3e140d0b4c0d",
    "android-x86_64":
      "8cfcd40b87b42aa0aaaba89852aa51f3316c90debcdf24dcc5a9b7b562a8aa6f",
    "apple-ios-xcframeworks":
      "9a64915dd95bf22ab3f38624ac2fc7e4a14cfd155f218170317ccef6ab9dfc69",
    "apple-macos-xcframeworks":
      "995cc77d575368d2df08a16ed0345395ba66308b00ba57ef190e70eb710d74f9",
  },
} as const;

// Dawn prebuilt binaries. These are the exact artifacts react-native-webgpu
// links; both packages must consume the same Dawn build so that only one Dawn
// copy exists in an app that installs both, which is why the release tag is
// pinned here rather than derived from GRAPHITE_CONFIG.version.
//
// STALE: this is still the m150 Dawn (63f25feec51e9351fb25222b6d5de1af791d7c4f)
// while m152's DEPS pins 1e897275172a23f27b0022fa6beae3084ed54a9b. Bump this to
// dawn-chrome-m152 (with new checksums) once react-native-webgpu publishes that
// release; until then Graphite installs pair m152 Skia with m150 Dawn.
const DAWN_CONFIG = {
  releaseTag: "dawn-chrome-m150",
  baseUrl:
    "https://github.com/wcandillon/react-native-webgpu/releases/download",
  checksums: {
    android: "dee507d4fe66b57f6d33c0dac8cfd1b1263fcd9a8997bfebf936b62341580e60",
    apple: "5bacd90c56aa3144d8ba74ac2d769d28b28ebf99c67a4959185c7181d8aeaf31",
  },
} as const;

const SCRIPT_DIR = __dirname;
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const SKIA_DIR = path.resolve(REPO_ROOT, "externals/skia");
const LIBS_DIR = path.resolve(PACKAGE_ROOT, "libs");

// Get the base Skia version (e.g., "m142b" -> "m142")
const getBaseVersion = (version: string): string => {
  const match = version.match(/^(m\d+)/);
  return match ? match[1] : version;
};

// Get the GitHub release tag
const getReleaseTag = (version: string): string => {
  return `skia-graphite-${version}`;
};

// Get the download URL for an asset
const getDownloadUrl = (assetName: string): string => {
  const releaseTag = getReleaseTag(GRAPHITE_CONFIG.version);
  return `https://github.com/Shopify/react-native-skia/releases/download/${releaseTag}/${assetName}`;
};

// Calculate file checksum
const calculateFileChecksum = (filePath: string): string => {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
};

// Download a file with redirect support
const downloadFile = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const request = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error("Too many redirects"));
        return;
      }

      https
        .get(currentUrl, (response) => {
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            request(response.headers.location, redirectCount + 1);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${currentUrl}`));
            return;
          }

          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          rmSync(destPath, { force: true });
          reject(err);
        });
    };
    request(url);
  });
};

// Extract a tar.gz file
const extractTarGz = async (
  tarPath: string,
  destDir: string
): Promise<void> => {
  mkdirSync(destDir, { recursive: true });
  await extract({
    file: tarPath,
    cwd: destDir,
  });
};

// Download and extract an asset
const downloadAndExtract = async (
  assetName: string,
  destDir: string,
  expectedChecksum?: string,
  urlOverride?: string
): Promise<void> => {
  const url = urlOverride ?? getDownloadUrl(assetName);
  const tempFile = path.join(LIBS_DIR, `${assetName}.tmp`);

  console.log(`  Downloading ${assetName}...`);

  await downloadFile(url, tempFile);

  // Verify checksum if provided (before extraction)
  if (expectedChecksum) {
    console.log(`  Verifying checksum...`);
    const actualChecksum = calculateFileChecksum(tempFile);
    if (actualChecksum !== expectedChecksum) {
      rmSync(tempFile, { force: true });
      throw new Error(
        `Checksum mismatch for ${assetName}:\n` +
          `  Expected: ${expectedChecksum}\n` +
          `  Actual:   ${actualChecksum}`
      );
    }
    console.log(`  ✓ Checksum verified`);
  }

  // Extract
  console.log(`  Extracting to ${destDir}...`);
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  await extractTarGz(tempFile, destDir);

  // Cleanup temp file
  rmSync(tempFile, { force: true });
};

// Checkout the Skia submodule to the correct branch
const checkoutSkiaSubmodule = (): void => {
  const baseVersion = getBaseVersion(GRAPHITE_CONFIG.version);
  const branchName = `chrome/${baseVersion}`;

  console.log(`\n📦 Checking out Skia submodule to ${branchName}...`);

  try {
    // Fetch the branch (this puts it in FETCH_HEAD)
    execSync(`git -C "${SKIA_DIR}" fetch origin ${branchName}`, {
      stdio: "inherit",
    });

    // Checkout FETCH_HEAD (the fetched branch)
    execSync(`git -C "${SKIA_DIR}" checkout FETCH_HEAD --`, {
      stdio: "inherit",
    });

    console.log(`  ✓ Skia submodule checked out to ${branchName}`);
  } catch (error) {
    console.error(`  ✗ Failed to checkout Skia submodule`);
    throw error;
  }
};

// Download Dawn/WebGPU headers from the release tarball into cpp/dawn/include
const copyDawnHeaders = async (): Promise<void> => {
  console.log(`\n📋 Downloading Dawn/WebGPU headers...`);

  const releaseTag = getReleaseTag(GRAPHITE_CONFIG.version);
  const assetName = `skia-graphite-headers-${releaseTag}.tar.gz`;
  const headersDir = path.join(LIBS_DIR, "headers-temp");

  await downloadAndExtract(assetName, headersDir);

  // Copy headers to cpp/dawn/include
  const dawnDest = path.join(PACKAGE_ROOT, "cpp/dawn/include");
  fileOps.rm(path.join(PACKAGE_ROOT, "cpp/dawn"));
  fileOps.mkdir(dawnDest);

  // Find the extracted headers - tarball may have nested structure
  const candidates = [
    headersDir,
    path.join(headersDir, "dawn/include"),
    path.join(headersDir, "include"),
    path.join(headersDir, "packages/skia/cpp/dawn/include"),
  ];
  const srcDir = candidates.find(
    (dir) =>
      existsSync(path.join(dir, "webgpu")) && existsSync(path.join(dir, "dawn"))
  );
  if (!srcDir) {
    throw new Error("Could not find Dawn headers in extracted tarball");
  }
  fileOps.cp(srcDir, dawnDest);

  // Copy Graphite source headers from the tarball
  const graphiteSrc = path.join(
    headersDir,
    "packages/skia/cpp/skia/src/gpu/graphite"
  );
  if (existsSync(graphiteSrc)) {
    const graphiteDest = path.join(PACKAGE_ROOT, "cpp/skia/src/gpu/graphite");
    fileOps.mkdir(graphiteDest);
    fileOps.cp(graphiteSrc, graphiteDest);
  }

  // Cleanup temp directory
  rmSync(headersDir, { recursive: true, force: true });

  console.log(`  ✓ Dawn/WebGPU and Graphite headers copied`);
};

// Download Android libraries
const downloadAndroidLibs = async (): Promise<void> => {
  console.log(`\n📱 Downloading Android Graphite libraries...`);

  const androidAbis = [
    { name: "armeabi-v7a", asset: "android-arm", nested: "arm" },
    { name: "arm64-v8a", asset: "android-arm-64", nested: "arm64" },
    { name: "x86", asset: "android-arm-x86", nested: "x86" },
    { name: "x86_64", asset: "android-arm-x64", nested: "x64" },
  ];

  const releaseTag = getReleaseTag(GRAPHITE_CONFIG.version);

  for (const abi of androidAbis) {
    const checksumKey =
      `android-${abi.name}` as keyof typeof GRAPHITE_CONFIG.checksums;
    const expectedChecksum = GRAPHITE_CONFIG.checksums[checksumKey];
    const assetName = `skia-graphite-${abi.asset}-${releaseTag}.tar.gz`;
    const destDir = path.join(LIBS_DIR, "android", abi.name);

    await downloadAndExtract(assetName, destDir, expectedChecksum);

    // Flatten: tarballs extract with a nested build dir (e.g. arm/, arm64/)
    // CMake expects libs directly in libs/android/{abi}/
    const nestedDir = path.join(destDir, abi.nested);
    if (existsSync(nestedDir)) {
      execSync(`mv "${nestedDir}"/* "${destDir}"/`);
      rmSync(nestedDir, { recursive: true, force: true });
    }

    // Dawn comes from the shared dawn-chrome release instead (see
    // downloadDawnLibs); drop the bundled copy so it cannot be linked by
    // mistake.
    rmSync(path.join(destDir, "libdawn_combined.a"), { force: true });
  }

  console.log(`  ✓ Android libraries downloaded`);
};

// Download the shared Dawn binaries (same artifacts react-native-webgpu links)
const downloadDawnLibs = async (): Promise<void> => {
  console.log(`\n🌅 Downloading Dawn libraries (${DAWN_CONFIG.releaseTag})...`);

  const dawnUrl = (asset: string) =>
    `${DAWN_CONFIG.baseUrl}/${DAWN_CONFIG.releaseTag}/${asset}`;

  // Android: shared libwebgpu_dawn.so per ABI, next to the Skia static libs
  const androidAsset = `dawn-android-${DAWN_CONFIG.releaseTag}.tar.gz`;
  const androidTempDir = path.join(LIBS_DIR, "dawn-android-temp");
  await downloadAndExtract(
    androidAsset,
    androidTempDir,
    DAWN_CONFIG.checksums.android,
    dawnUrl(androidAsset)
  );
  for (const abi of ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"]) {
    const src = path.join(
      androidTempDir,
      "dawn-android",
      abi,
      "libwebgpu_dawn.so"
    );
    if (!existsSync(src)) {
      throw new Error(
        `Missing libwebgpu_dawn.so for ${abi} in ${androidAsset}`
      );
    }
    fileOps.cp(src, path.join(LIBS_DIR, "android", abi, "libwebgpu_dawn.so"));
  }
  rmSync(androidTempDir, { recursive: true, force: true });

  // Apple: one xcframework carrying ios-device, ios-simulator and macos
  // slices; the podspec vendors it from both platform dirs
  const appleAsset = `dawn-apple-${DAWN_CONFIG.releaseTag}.xcframework.tar.gz`;
  const appleTempDir = path.join(LIBS_DIR, "dawn-apple-temp");
  await downloadAndExtract(
    appleAsset,
    appleTempDir,
    DAWN_CONFIG.checksums.apple,
    dawnUrl(appleAsset)
  );
  const xcframework = path.join(appleTempDir, "dawn-apple.xcframework");
  if (!existsSync(xcframework)) {
    throw new Error(`Missing dawn-apple.xcframework in ${appleAsset}`);
  }
  for (const platform of ["ios", "macos"]) {
    const dest = path.join(LIBS_DIR, platform, "libwebgpu_dawn.xcframework");
    fileOps.rm(dest);
    fileOps.cp(xcframework, dest);
  }
  rmSync(appleTempDir, { recursive: true, force: true });

  console.log(`  ✓ Dawn libraries downloaded`);
};

// Download Apple libraries
const downloadAppleLibs = async (): Promise<void> => {
  console.log(`\n🍎 Downloading Apple Graphite libraries...`);

  const releaseTag = getReleaseTag(GRAPHITE_CONFIG.version);
  const iosDir = path.join(LIBS_DIR, "ios");
  const macosDir = path.join(LIBS_DIR, "macos");

  // Clean and create destination directories
  fileOps.rm(iosDir);
  fileOps.rm(macosDir);
  fileOps.mkdir(iosDir);
  fileOps.mkdir(macosDir);

  // Download iOS xcframeworks
  const iosAsset = `skia-graphite-apple-ios-xcframeworks-${releaseTag}.tar.gz`;
  const iosTempDir = path.join(LIBS_DIR, "apple-ios-temp");
  await downloadAndExtract(
    iosAsset,
    iosTempDir,
    GRAPHITE_CONFIG.checksums["apple-ios-xcframeworks"]
  );

  const extractedIosDir = path.join(iosTempDir, "ios");
  if (existsSync(extractedIosDir)) {
    const xcframeworks = readdirSync(extractedIosDir).filter(
      (f) => f.endsWith(".xcframework") && f !== "libdawn_combined.xcframework"
    );
    for (const xcf of xcframeworks) {
      fileOps.cp(path.join(extractedIosDir, xcf), path.join(iosDir, xcf));
    }
  }
  rmSync(iosTempDir, { recursive: true, force: true });

  // Download macOS xcframeworks
  const macosAsset = `skia-graphite-apple-macos-xcframeworks-${releaseTag}.tar.gz`;
  const macosTempDir = path.join(LIBS_DIR, "apple-macos-temp");
  await downloadAndExtract(
    macosAsset,
    macosTempDir,
    GRAPHITE_CONFIG.checksums["apple-macos-xcframeworks"]
  );

  const extractedMacosDir = path.join(macosTempDir, "macos");
  if (existsSync(extractedMacosDir)) {
    const xcframeworks = readdirSync(extractedMacosDir).filter(
      (f) => f.endsWith(".xcframework") && f !== "libdawn_combined.xcframework"
    );
    for (const xcf of xcframeworks) {
      fileOps.cp(path.join(extractedMacosDir, xcf), path.join(macosDir, xcf));
    }
  }
  rmSync(macosTempDir, { recursive: true, force: true });

  console.log(`  ✓ Apple libraries downloaded`);
};

// Main installation function
const install = async (): Promise<void> => {
  console.log(`\n🚀 Installing Skia Graphite ${GRAPHITE_CONFIG.version}\n`);
  console.log(`   Release tag: ${getReleaseTag(GRAPHITE_CONFIG.version)}`);
  console.log(
    `   Skia branch: chrome/${getBaseVersion(GRAPHITE_CONFIG.version)}`
  );

  // Ensure libs directory exists
  mkdirSync(LIBS_DIR, { recursive: true });

  // Checkout Skia submodule to matching version
  checkoutSkiaSubmodule();

  // Copy Skia headers
  copyHeaders();

  // Download platform libraries
  await downloadAndroidLibs();
  await downloadAppleLibs();

  // Download the shared Dawn binaries (must run after the platform libs, which
  // clean the destination directories)
  await downloadDawnLibs();

  // Download and copy Dawn/WebGPU headers from release tarball
  await copyDawnHeaders();

  // Write marker file so podspec and build.gradle can detect Graphite
  const markerFile = path.join(LIBS_DIR, ".graphite");
  writeFileSync(markerFile, GRAPHITE_CONFIG.version, "utf-8");
  console.log(`  ✓ Wrote Graphite marker file: ${markerFile}`);

  // Record the Dawn release tag so the podspec and build.gradle can verify it
  // matches the tag react-native-webgpu was built against (both packages must
  // link the exact same Dawn artifact).
  const dawnMarkerFile = path.join(LIBS_DIR, ".dawn-version");
  writeFileSync(dawnMarkerFile, DAWN_CONFIG.releaseTag, "utf-8");
  console.log(`  ✓ Wrote Dawn version marker: ${dawnMarkerFile}`);

  console.log(
    `\n✅ Skia Graphite ${GRAPHITE_CONFIG.version} installed successfully!\n`
  );
};

// Run installation
install().catch((error) => {
  console.error(`\n❌ Installation failed: ${error.message}\n`);
  process.exit(1);
});
