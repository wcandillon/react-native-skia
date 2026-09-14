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
  rmSync,
  writeFileSync,
} from "fs";
import https from "https";
import path from "path";

import extractZip from "extract-zip";
import { extract } from "tar";

import { copyHeaders } from "./skia-configuration";
import { fileOps } from "./utils";

// The xcframeworks bundled for each Apple platform. Each one is published as
// its own .zip (SPM's binaryTarget requires one .xcframework per archive), so
// this list drives both the download loop below and, eventually, the
// per-framework binaryTargets in Package.swift.
const APPLE_FRAMEWORKS = [
  "libskia",
  "libskottie",
  "libskparagraph",
  "libsksg",
  "libskshaper",
  "libskunicode_core",
  "libskunicode_libgrapheme",
  "libsvg",
] as const;

// Graphite configuration
const GRAPHITE_CONFIG = {
  version: "m154",
  checksums: {
    android: {
      "armeabi-v7a":
        "2035f570a696da94ee73c1ac9fcdc3e86e128e0c022ea54b3d15a91aa6310382",
      "arm64-v8a":
        "adbb7179c8e4d743c6b5459902937b29568fe11c5926f04d7710b70c55587d42",
      "x86": "cb0f02edbb469f3f0e26edb8f61d41c0a3b9878346df2908a192f1de18892a52",
      "x86_64":
        "51892783c32c23fb67e1db2eb74700cbb21f66ed9710d5dbc3c603cbf7f1174a",
    },
    apple: {
      ios: {
        libskia:
          "03c11d6891d9710f644f6a2108c494a1fe1a7b1105748686176fd7d9ae6cfa7e",
        libskottie:
          "f2bf18b9a3221661534764e5585ca8e2b82afeaeb9f88f1cd5177ffe7029550e",
        libskparagraph:
          "0f938255ab9f174af83f3cff56aa73235990154ea8d493c4bfc74ac94bffeb42",
        libsksg:
          "2ecb0c45a6822e5bfca0c78520273ac173a795c83a857fed775cd26d34b06950",
        libskshaper:
          "3c2553852cc94ba66537e3f5b923ecc4e77d3ec299ea875360bbfd72a0e375bf",
        // eslint-disable-next-line camelcase
        libskunicode_core:
          "a6c42ec4cabf1e51c51d58490bc86904237fb37f5f2455119185882db05f62d2",
        // eslint-disable-next-line camelcase
        libskunicode_libgrapheme:
          "2eac399778103b8b0ae653483bbd25d5cf4df6890bc5bf9db87d64b9e7e12215",
        libsvg:
          "3ce34cab4f82fa14da97a10eb497027af1bf59e210cde66e5f78af4a4c009cb7",
      },
      macos: {
        libskia:
          "4077f56da97cec4462c0819201dda6c8fe5f375f1e3fcad2b1ddb44101ec857f",
        libskottie:
          "4d6bbf98f008993b28d327c16477ca4d0f6f9f60f7d6186814070ea4613b08e1",
        libskparagraph:
          "9b50c4fc121355564f5985b511a969f445e9e894c1d8594778c805355e674391",
        libsksg:
          "8303505887aaf3646933180953562a401935d5f2a2384819930b077fa56da801",
        libskshaper:
          "15339f4a5f4cab50e39d457ffb0d0a3c23ad552f0447a0d4404718600baeb260",
        // eslint-disable-next-line camelcase
        libskunicode_core:
          "de677cdc80b76191dcbd199f1866d6b5b258cd9bf422ac8a8574492cf0a4a9cb",
        // eslint-disable-next-line camelcase
        libskunicode_libgrapheme:
          "562daca2f2c26fbc35cbb3772429d61a4c40005768cc754f0bff4c2fc39f559a",
        libsvg:
          "0e4fb622a1ce003372a3a005ca3a5166659766046a13e9ab978e9a989d617845",
      },
    } as Record<
      "ios" | "macos",
      Record<(typeof APPLE_FRAMEWORKS)[number], string>
    >,
  },
} as const;

// Dawn prebuilt binaries. These are the exact artifacts react-native-webgpu
// links; both packages must consume the same Dawn build so that only one Dawn
// copy exists in an app that installs both, which is why the release tag is
// pinned here rather than derived from GRAPHITE_CONFIG.version. Skia's DEPS at
// chrome/m154 pins Dawn @ 3d786993a7ded64c4ebb4884b9b079db9ad0e580 - keep this
// tag aligned with whatever milestone react-native-webgpu's Package.swift
// pins (its dawnReleaseTag fatalError check enforces the match at build time).
const DAWN_CONFIG = {
  releaseTag: "dawn-chrome-m154",
  baseUrl:
    "https://github.com/wcandillon/react-native-webgpu/releases/download",
  checksums: {
    android: "6fe8766dc3711e1e41e8b9d919fadd83f0e364945e66c01f49f316f4a3d96b1f",
    apple: "896575ffbc99610198a83d061f8c5a2789139b7f16c669fbf3a9f7a7ac9be123",
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

// Download and extract a single-xcframework .zip asset (SPM-compatible
// packaging - see APPLE_FRAMEWORKS above) into destDir.
const downloadAndExtractZip = async (
  assetName: string,
  destDir: string,
  expectedChecksum: string,
  urlOverride?: string
): Promise<void> => {
  const url = urlOverride ?? getDownloadUrl(assetName);
  const tempFile = path.join(LIBS_DIR, `${assetName}.tmp`);

  console.log(`  Downloading ${assetName}...`);
  await downloadFile(url, tempFile);

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

  console.log(`  Extracting to ${destDir}...`);
  mkdirSync(destDir, { recursive: true });
  await extractZip(tempFile, { dir: destDir });

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
    const expectedChecksum =
      GRAPHITE_CONFIG.checksums.android[
        abi.name as keyof typeof GRAPHITE_CONFIG.checksums.android
      ];
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
  // slices; the podspec vendors it from both platform dirs. Published as a
  // .zip (not .tar.gz) since it's the same SPM-compatible artifact
  // react-native-webgpu's Package.swift binaryTarget links.
  const appleAsset = `dawn-apple-${DAWN_CONFIG.releaseTag}.xcframework.zip`;
  const appleTempDir = path.join(LIBS_DIR, "dawn-apple-temp");
  await downloadAndExtractZip(
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

// Download Apple libraries. Each xcframework is published as its own zip
// (see APPLE_FRAMEWORKS), named
// `skia-graphite-apple-<platform>-xcframeworks-<name>-<releaseTag>.zip`.
const downloadApplePlatformLibs = async (
  platform: "ios" | "macos",
  artifactPrefix: string
): Promise<void> => {
  const releaseTag = getReleaseTag(GRAPHITE_CONFIG.version);
  const destDir = path.join(LIBS_DIR, platform);
  fileOps.rm(destDir);
  fileOps.mkdir(destDir);

  const checksums = GRAPHITE_CONFIG.checksums.apple[platform];
  for (const framework of APPLE_FRAMEWORKS) {
    const assetName = `${artifactPrefix}-${framework}-${releaseTag}.zip`;
    const tempDir = path.join(LIBS_DIR, `apple-${platform}-${framework}-temp`);

    await downloadAndExtractZip(assetName, tempDir, checksums[framework]);

    const xcfName = `${framework}.xcframework`;
    const extracted = path.join(tempDir, xcfName);
    if (!existsSync(extracted)) {
      throw new Error(`Missing ${xcfName} in ${assetName}`);
    }
    fileOps.cp(extracted, path.join(destDir, xcfName));
    rmSync(tempDir, { recursive: true, force: true });
  }
};

const downloadAppleLibs = async (): Promise<void> => {
  console.log(`\n🍎 Downloading Apple Graphite libraries...`);

  await downloadApplePlatformLibs(
    "ios",
    "skia-graphite-apple-ios-xcframeworks"
  );
  await downloadApplePlatformLibs(
    "macos",
    "skia-graphite-apple-macos-xcframeworks"
  );

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
