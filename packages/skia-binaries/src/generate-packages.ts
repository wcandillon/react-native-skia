/**
 * Script to generate individual Skia binary npm packages.
 * Downloads binaries from GitHub releases and bundles them directly in the package.
 *
 * Usage:
 *   npx tsx src/generate-packages.ts --config=skia-config.json
 *   npx tsx src/generate-packages.ts --config=skia-config.json --patch=1
 *   npx tsx src/generate-packages.ts --skia-version=m144c
 *   npx tsx src/generate-packages.ts --skia-version=m144c --package=android
 *   npx tsx src/generate-packages.ts --skia-version=m142b --graphite
 *
 * Options:
 *   --config        Config file path (generates all packages for both backends)
 *   --variant       Which packages to generate: all, ganesh, or graphite (default: all)
 *   --patch         Patch version number (default: 0). e.g., m147a + --patch=1 → 147.1.1
 *   --skia-version  Build SKIA release tag without its skia-/skia-graphite- prefix:
 *                   a milestone (m144), a milestone with a re-spin suffix (m144c), or
 *                   a Chromium release branch with an optional suffix (m154_8037_58a)
 *   --npm-version   NPM package version (optional, derived from skia-version)
 *                   m144 → 144.0.0, m144a → 144.1.0, m144b → 144.2.0, m144c → 144.3.0,
 *                   m154_8037_58a → 154.1.0 (the branch digits do not affect it)
 *   --package       Generate only a specific package (optional, generates all if omitted)
 *   --graphite      Generate Graphite packages instead of Ganesh
 *   --output-dir    Output directory (default: ./dist)
 *   --repo          owner/name of the GitHub repository whose swiftpm-<version>
 *                   release hosts the SwiftPM binary targets (default:
 *                   wcandillon/react-native-skia, the repository the publish
 *                   workflow runs in, so its own token can create the release)
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";

import { fileURLToPath } from "url";

import {
  copyDir,
  downloadAndExtractAsset,
  downloadToFile,
  downloadXcframeworks,
  extractTarGz,
  extractZip,
  runCommand,
  DEFAULT_RELEASES_REPO,
  setReleasesRepo,
} from "./release-assets.js";
import { DEFAULT_SPM_REPO, spmReleaseTag } from "./spm-release.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

interface AndroidArch {
  arch: string;
  artifact: string;
  srcSubdir: string;
}

interface PackageConfig {
  name: string;
  platform: "android" | "apple" | "common";
  description: string;
  // For Android: list of architectures to include
  androidArchs?: AndroidArch[];
  // For Apple: single artifact
  artifact?: string;
  libSubdir?: string;
}

// Package configurations for Ganesh (standard Metal/OpenGL backend)
const GANESH_PACKAGES: PackageConfig[] = [
  {
    name: "android",
    platform: "android",
    description: "Skia prebuilt binaries for Android (all architectures)",
    androidArchs: [
      { arch: "armeabi-v7a", artifact: "skia-android-arm", srcSubdir: "armeabi-v7a" },
      { arch: "arm64-v8a", artifact: "skia-android-arm-64", srcSubdir: "arm64-v8a" },
      { arch: "x86", artifact: "skia-android-arm-x86", srcSubdir: "x86" },
      { arch: "x86_64", artifact: "skia-android-arm-x64", srcSubdir: "x86_64" },
    ],
  },
  {
    name: "apple-ios",
    platform: "apple",
    description: "Skia prebuilt binaries for iOS (device + simulator)",
    artifact: "skia-apple-ios-xcframeworks",
    libSubdir: "ios",
  },
  {
    name: "apple-tvos",
    platform: "apple",
    description: "Skia prebuilt binaries for tvOS (device + simulator)",
    artifact: "skia-apple-tvos-xcframeworks",
    libSubdir: "tvos",
  },
  {
    name: "apple-macos",
    platform: "apple",
    description: "Skia prebuilt binaries for macOS (arm64 + x64)",
    artifact: "skia-apple-macos-xcframeworks",
    libSubdir: "macos",
  },
];

// Package configurations for Graphite (Dawn/WebGPU backend)
const GRAPHITE_PACKAGES: PackageConfig[] = [
  {
    name: "android",
    platform: "android",
    description: "Skia Graphite prebuilt binaries for Android (all architectures)",
    androidArchs: [
      { arch: "armeabi-v7a", artifact: "skia-graphite-android-arm", srcSubdir: "arm" },
      { arch: "arm64-v8a", artifact: "skia-graphite-android-arm-64", srcSubdir: "arm64" },
      { arch: "x86", artifact: "skia-graphite-android-arm-x86", srcSubdir: "x86" },
      { arch: "x86_64", artifact: "skia-graphite-android-arm-x64", srcSubdir: "x64" },
    ],
  },
  {
    name: "apple-ios",
    platform: "apple",
    description: "Skia Graphite prebuilt binaries for iOS (device + simulator)",
    artifact: "skia-graphite-apple-ios-xcframeworks",
    libSubdir: "ios",
  },
  {
    name: "apple-macos",
    platform: "apple",
    description: "Skia Graphite prebuilt binaries for macOS (arm64 + x64)",
    artifact: "skia-graphite-apple-macos-xcframeworks",
    libSubdir: "macos",
  },
  {
    name: "headers",
    platform: "common",
    description: "Skia Graphite headers for Dawn/WebGPU",
    artifact: "skia-graphite-headers",
    libSubdir: "headers",
  },
];

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

/**
 * Derives npm version from Skia version.
 * m144 → 144.0.0
 * m144a → 144.1.0
 * m144b → 144.2.0
 * m144c → 144.3.0
 *
 * Build SKIA names its release after the Skia branch the submodule commit is
 * on. When chrome/m154 has moved past that commit, that is a Chromium release
 * branch such as chrome/m154_8037_58, so the version carries the branch digits.
 * They identify the build but do not change the npm version:
 * m154_8037_58 → 154.0.0
 * m154_8037_58a → 154.1.0
 *
 * With patch version:
 * m147a + patch=1 → 147.1.1
 */
const deriveNpmVersion = (skiaVersion: string, patch = 0): string => {
  const match = skiaVersion.match(/^m(\d+)(?:_\d+)*([a-z])?$/);
  if (!match) {
    throw new Error(
      `Invalid skia version format: ${skiaVersion}. Expected format: m144, m144a or m154_8037_58a`
    );
  }

  const major = match[1];
  const suffix = match[2];

  // Convert suffix letter to minor version: a=1, b=2, c=3, etc.
  const minor = suffix ? suffix.charCodeAt(0) - "a".charCodeAt(0) + 1 : 0;

  return `${major}.${minor}.${patch}`;
};

// Required .a files for Android based on CMakeLists.txt
const ANDROID_REQUIRED_LIBS = new Set([
  "libskia.a",
  "libsvg.a",
  "libskshaper.a",
  "libskottie.a",
  "libsksg.a",
  "libskparagraph.a",
  "libskunicode_core.a",
  "libskunicode_icu.a",
  "libpathops.a",
  "libjsonreader.a",
  // libdawn_combined.a is intentionally dropped: Graphite packages ship the
  // shared libwebgpu_dawn.so instead (see addSharedDawn).
]);

const cleanupAndroidLibs = (libsDir: string): void => {
  const entries = fs.readdirSync(libsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const archDir = path.join(libsDir, entry.name);
    const files = fs.readdirSync(archDir);
    let removed = 0;
    for (const file of files) {
      if (!ANDROID_REQUIRED_LIBS.has(file)) {
        fs.rmSync(path.join(archDir, file), { recursive: true, force: true });
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`    Cleaned ${entry.name}: removed ${removed} unnecessary file(s)`);
    }
  }
};

const findNdkStripTool = (): string | null => {
  const ndkPaths: string[] = [];

  if (process.env.ANDROID_NDK_HOME) {
    ndkPaths.push(process.env.ANDROID_NDK_HOME);
  }

  const androidHome = process.env.ANDROID_HOME;
  if (androidHome) {
    const ndkDir = path.join(androidHome, "ndk");
    if (fs.existsSync(ndkDir)) {
      const versions = fs.readdirSync(ndkDir).sort().reverse();
      for (const version of versions) {
        ndkPaths.push(path.join(ndkDir, version));
      }
    }
  }

  for (const ndkPath of ndkPaths) {
    const prebuiltDir = path.join(ndkPath, "toolchains", "llvm", "prebuilt");
    if (!fs.existsSync(prebuiltDir)) continue;
    const platforms = fs.readdirSync(prebuiltDir);
    for (const platform of platforms) {
      const stripPath = path.join(prebuiltDir, platform, "bin", "llvm-strip");
      if (fs.existsSync(stripPath)) return stripPath;
    }
  }

  return null;
};

const stripDebugSymbols = async (libsDir: string): Promise<void> => {
  const stripTool = findNdkStripTool();
  if (!stripTool) {
    throw new Error(
      "Could not find llvm-strip in Android NDK. Set ANDROID_NDK_HOME or ANDROID_HOME."
    );
  }
  console.log(`    Using strip tool: ${stripTool}`);

  const entries = fs.readdirSync(libsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const archDir = path.join(libsDir, entry.name);
    const files = fs.readdirSync(archDir).filter((f) => f.endsWith(".a"));
    for (const file of files) {
      await runCommand(stripTool, ["--strip-debug", path.join(archDir, file)]);
    }
    console.log(`    Stripped debug symbols from ${entry.name} (${files.length} libs)`);
  }
};

// --- Package generation ---

interface GeneratedPackageJson {
  name: string;
  version: string;
  description: string;
  license: string;
  repository: {
    type: string;
    url: string;
    directory: string;
  };
  publishConfig: {
    access: string;
  };
  files: string[];
  skia: {
    version: string;
    platform: string;
    graphite: boolean;
  };
}

// Minimum deployment target per Apple package, used in the generated Package.swift.
// These are metadata for SwiftPM resolution; the binaries themselves are built
// with their own deployment targets inside each xcframework.
const APPLE_SPM_PLATFORM: Record<string, string> = {
  "apple-ios": ".iOS(.v13)",
  "apple-tvos": ".tvOS(.v13)",
  "apple-macos": ".macOS(.v10_15)",
};

const getPackageName = (pkg: PackageConfig, graphite: boolean): string => {
  const prefix = graphite ? "skia-graphite" : "skia";
  return `react-native-${prefix}-${pkg.name}`;
};

const generatePackageJson = (
  pkg: PackageConfig,
  skiaVersion: string,
  npmVersion: string,
  graphite: boolean,
  hasPackageSwift: boolean
): GeneratedPackageJson => {
  const packageName = getPackageName(pkg, graphite);

  return {
    name: packageName,
    version: npmVersion,
    description: pkg.description,
    license: "MIT",
    repository: {
      type: "git",
      // Must match the repository the publish workflow runs in, or npm
      // rejects the provenance attestation.
      url: "https://github.com/wcandillon/react-native-skia.git",
      directory: `packages/skia-binaries/dist/${packageName}`,
    },
    publishConfig: {
      access: "public",
    },
    files: hasPackageSwift ? ["libs/**", "Package.swift"] : ["libs/**"],
    skia: {
      version: skiaVersion,
      platform: pkg.platform,
      graphite,
    },
  };
};

/**
 * Generates a SwiftPM manifest for an Apple package by scanning the libs/
 * directory for the xcframeworks that were actually extracted. Each xcframework
 * becomes a binaryTarget, and all of them are aggregated into a single library
 * product named after the package.
 *
 * This is purely additive: CocoaPods consumers ignore Package.swift entirely,
 * while a SwiftPM consumer can reference the package by local path (e.g. from
 * node_modules) and depend on its product. Returns null when there are no
 * xcframeworks (non-Apple packages).
 */
const generatePackageSwift = (
  pkg: PackageConfig,
  graphite: boolean,
  libsDir: string
): string | null => {
  if (pkg.platform !== "apple") {
    return null;
  }

  const platform = APPLE_SPM_PLATFORM[pkg.name];
  if (!platform) {
    return null;
  }

  const xcframeworks = fs
    .readdirSync(libsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.endsWith(".xcframework"))
    .map((e) => e.name)
    .sort();

  if (xcframeworks.length === 0) {
    return null;
  }

  const packageName = getPackageName(pkg, graphite);
  // Strip the .xcframework suffix to get the SwiftPM target name. The Skia
  // artifact names (libskia, libskunicode_libgrapheme, ...) are already valid
  // Swift identifiers.
  const targetNames = xcframeworks.map((name) =>
    name.replace(/\.xcframework$/, "")
  );

  const productTargets = targetNames
    .map((name) => `                "${name}",`)
    .join("\n");

  const binaryTargets = xcframeworks
    .map((name) => {
      const target = name.replace(/\.xcframework$/, "");
      return `        .binaryTarget(\n            name: "${target}",\n            path: "libs/${name}"\n        ),`;
    })
    .join("\n");

  return `// swift-tools-version:5.9
// This file is auto-generated by react-native-skia-binaries. Do not edit.
import PackageDescription

let package = Package(
    name: "${packageName}",
    platforms: [
        ${platform}
    ],
    products: [
        .library(
            name: "${packageName}",
            targets: [
${productTargets}
            ]
        )
    ],
    targets: [
${binaryTargets}
    ]
)
`;
};

// --- Remote SwiftPM package ---

const REMOTE_SPM_DIR = "spm";
const REMOTE_SPM_PACKAGE_NAME = "react-native-skia-binaries";
const REMOTE_SPM_PRODUCT_NAME = "SkiaBinaries";

// A git repository hosts exactly one Swift package, so every platform shipped
// remotely shares a single manifest, and target names must be unique within it.
// The per-platform xcframeworks reuse the same names (libskia for iOS and for
// macOS), so adding macOS needs either suffixed target names or xcframeworks
// merged across platforms, and Graphite ships no tvOS binaries at all. Until
// then this is Graphite iOS only.
const REMOTE_SPM_SOURCE_PACKAGE = "apple-ios";

interface RemoteSpmTarget {
  name: string;
  archiveName: string;
  checksum: string;
}

/**
 * SHA-256 of a file, hex encoded. This is the same value
 * `swift package compute-checksum` produces, computed here with Node so the
 * publish workflow does not need a Swift toolchain.
 */
const sha256File = (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

/**
 * Zips an xcframework so that it unpacks as `<name>.xcframework/...` at the
 * archive root, which is what SwiftPM expects from a binaryTarget url.
 */
const zipXcframework = async (
  libsDir: string,
  framework: string,
  destDir: string
): Promise<string> => {
  const archivePath = path.join(destDir, `${framework}.zip`);
  // zip updates an existing archive in place instead of replacing it.
  fs.rmSync(archivePath, { force: true });
  await runCommand("zip", ["-qry", archivePath, framework], { cwd: libsDir });
  return archivePath;
};

const generateRemoteSpmManifest = (
  targets: RemoteSpmTarget[],
  platforms: string[],
  repo: string,
  npmVersion: string
): string => {
  const platformList = platforms.map((p) => `        ${p}`).join(",\n");

  const productTargets = targets
    .map((t) => `                "${t.name}",`)
    .join("\n");

  const binaryTargets = targets
    .map(
      (t) =>
        `        .binaryTarget(\n` +
        `            name: "${t.name}",\n` +
        `            url: "https://github.com/${repo}/releases/download/${spmReleaseTag(npmVersion)}/${t.archiveName}",\n` +
        `            checksum: "${t.checksum}"\n` +
        `        ),`
    )
    .join("\n");

  return `// swift-tools-version:5.9
// This file is auto-generated by react-native-skia-binaries. Do not edit.
import PackageDescription

let package = Package(
    name: "${REMOTE_SPM_PACKAGE_NAME}",
    platforms: [
${platformList}
    ],
    products: [
        .library(
            name: "${REMOTE_SPM_PRODUCT_NAME}",
            targets: [
${productTargets}
            ]
        )
    ],
    targets: [
${binaryTargets}
    ]
)
`;
};

/**
 * Generates the remote SwiftPM bundle in <outputDir>/spm: one zip per
 * xcframework plus a root Package.swift whose binaryTargets point at the
 * release assets for this version. Consumers depend on it with
 * .package(url:from:) instead of needing the npm package on disk.
 *
 * The publish workflow attaches the zips to the swiftpm-<npmVersion> release
 * of `repo`. The manifest is copied to the root of
 * wcandillon/react-native-skia-binaries (the repository SwiftPM resolves the
 * package from) and tagged <npmVersion> there by hand; validate-spm.ts checks
 * that the committed root manifest still matches skia-config.json.
 */
const generateRemoteSpmPackage = async (
  outputDir: string,
  npmVersion: string,
  repo: string
): Promise<void> => {
  const spmDir = path.join(outputDir, REMOTE_SPM_DIR);
  fs.mkdirSync(spmDir, { recursive: true });

  console.log("Generating remote SwiftPM package...");
  console.log(`  Repository: ${repo}`);
  console.log(`  Release tag: ${spmReleaseTag(npmVersion)}`);

  const pkg = GRAPHITE_PACKAGES.find((p) => p.name === REMOTE_SPM_SOURCE_PACKAGE);
  if (!pkg) {
    throw new Error(`Unknown remote SwiftPM source package: ${REMOTE_SPM_SOURCE_PACKAGE}`);
  }

  const libsDir = path.join(outputDir, getPackageName(pkg, true), "libs");
  const xcframeworks = fs
    .readdirSync(libsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.endsWith(".xcframework"))
    .map((e) => e.name)
    .sort();

  const targets: RemoteSpmTarget[] = [];
  for (const framework of xcframeworks) {
    const archivePath = await zipXcframework(libsDir, framework, spmDir);
    targets.push({
      name: framework.replace(/\.xcframework$/, ""),
      archiveName: path.basename(archivePath),
      checksum: await sha256File(archivePath),
    });
    console.log(`  Archived ${framework}`);
  }

  const manifest = generateRemoteSpmManifest(
    targets,
    [APPLE_SPM_PLATFORM[REMOTE_SPM_SOURCE_PACKAGE]],
    repo,
    npmVersion
  );
  fs.writeFileSync(path.join(spmDir, "Package.swift"), manifest);

  console.log(`  Generated Package.swift (${targets.length} binary targets)`);
};

// --- Shared Dawn ---

// Graphite links Dawn as a shared artifact, the exact one react-native-webgpu
// links, so an app installing both packages contains a single Dawn copy.
// react-native-skia's podspec and build.gradle expect libwebgpu_dawn (an
// xcframework on Apple, a .so per ABI on Android) next to the Skia libs, plus
// libs/.dawn-version holding the release tag for the react-native-webgpu
// version check. The libdawn_combined artifact from the Skia release is dropped.
const DAWN_REPO = "wcandillon/react-native-webgpu";

interface DawnConfig {
  releaseTag: string;
  checksums: { android: string; apple: string };
}

const loadDawnConfig = (): DawnConfig => {
  const configPath = path.join(ROOT_DIR, "skia-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const dawn = config.dawn as DawnConfig | undefined;
  if (!dawn?.releaseTag || !dawn.checksums?.android || !dawn.checksums?.apple) {
    throw new Error(`${configPath} has no usable "dawn" entry (releaseTag + checksums)`);
  }
  return dawn;
};

const downloadDawnAsset = async (
  dawn: DawnConfig,
  assetName: string,
  expectedChecksum: string,
  extractDir: string
): Promise<void> => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dawn-download-"));
  try {
    const archivePath = path.join(tempDir, assetName);
    const url = `https://github.com/${DAWN_REPO}/releases/download/${dawn.releaseTag}/${assetName}`;
    console.log(`      Downloading ${assetName}...`);
    await downloadToFile(url, archivePath);
    const actual = await sha256File(archivePath);
    if (actual !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch for ${assetName}: expected ${expectedChecksum}, got ${actual}`
      );
    }
    if (assetName.endsWith(".zip")) {
      await extractZip(archivePath, extractDir);
    } else {
      await extractTarGz(archivePath, extractDir);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const addSharedDawn = async (pkg: PackageConfig, libsDir: string): Promise<void> => {
  if (pkg.platform !== "android" && pkg.platform !== "apple") {
    return;
  }
  const dawn = loadDawnConfig();
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "dawn-extract-"));
  try {
    if (pkg.platform === "android" && pkg.androidArchs) {
      await downloadDawnAsset(
        dawn,
        `dawn-android-${dawn.releaseTag}.tar.gz`,
        dawn.checksums.android,
        extractDir
      );
      for (const { arch } of pkg.androidArchs) {
        const src = path.join(extractDir, "dawn-android", arch, "libwebgpu_dawn.so");
        if (!fs.existsSync(src)) {
          throw new Error(`Missing libwebgpu_dawn.so for ${arch} in ${dawn.releaseTag}`);
        }
        fs.rmSync(path.join(libsDir, arch, "libdawn_combined.a"), { force: true });
        fs.copyFileSync(src, path.join(libsDir, arch, "libwebgpu_dawn.so"));
      }
    } else if (pkg.platform === "apple") {
      await downloadDawnAsset(
        dawn,
        `dawn-apple-${dawn.releaseTag}.xcframework.zip`,
        dawn.checksums.apple,
        extractDir
      );
      const src = path.join(extractDir, "dawn-apple.xcframework");
      if (!fs.existsSync(src)) {
        throw new Error(`Missing dawn-apple.xcframework in ${dawn.releaseTag}`);
      }
      fs.rmSync(path.join(libsDir, "libdawn_combined.xcframework"), {
        recursive: true,
        force: true,
      });
      const dest = path.join(libsDir, "libwebgpu_dawn.xcframework");
      fs.rmSync(dest, { recursive: true, force: true });
      copyDir(src, dest);
    }
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(libsDir, ".dawn-version"), `${dawn.releaseTag}\n`);
  console.log(`    Added shared Dawn (${dawn.releaseTag})`);
};

const generateReadme = (
  pkg: PackageConfig,
  skiaVersion: string,
  npmVersion: string,
  graphite: boolean
): string => {
  const packageName = getPackageName(pkg, graphite);

  let architectureInfo = "";
  if (pkg.platform === "android" && pkg.androidArchs) {
    architectureInfo = `
## Included Architectures

| Architecture | Description |
|--------------|-------------|
${pkg.androidArchs.map((a) => `| \`${a.arch}\` | ${a.arch} |`).join("\n")}
`;
  }

  return `# ${packageName}

${pkg.description}

## About

This package contains prebuilt Skia libraries for [react-native-skia](https://github.com/wcandillon/react-native-skia).

- **Skia Version**: ${skiaVersion}
- **Package Version**: ${npmVersion}
- **Platform**: ${pkg.platform}
${graphite ? "- **Backend**: Graphite (Dawn/WebGPU)\n" : ""}
${architectureInfo}
## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

The binaries are included directly in this package - no postinstall download required.

## License

MIT
`;
};

const generatePackage = async (
  pkg: PackageConfig,
  outputDir: string,
  skiaVersion: string,
  npmVersion: string,
  graphite: boolean
): Promise<string> => {
  const packageName = getPackageName(pkg, graphite);
  const pkgDir = path.join(outputDir, packageName);
  const libsDir = path.join(pkgDir, "libs");

  // Create package directory
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.mkdirSync(libsDir, { recursive: true });

  const prefix = graphite ? "skia-graphite" : "skia";
  const releaseTag = `${prefix}-${skiaVersion}`;

  console.log(`  Generating: ${packageName}@${npmVersion}`);

  // Download binaries
  if (pkg.platform === "android" && pkg.androidArchs) {
    for (const arch of pkg.androidArchs) {
      const archDir = path.join(libsDir, arch.arch);
      console.log(`    Downloading ${arch.arch}...`);
      await downloadAndExtractAsset(arch.artifact, releaseTag, archDir, arch.srcSubdir);
    }
  } else if (pkg.platform === "apple" && pkg.artifact) {
    console.log(`    Downloading ${pkg.artifact}...`);
    await downloadXcframeworks(pkg.artifact, releaseTag, libsDir, pkg.libSubdir);
  } else if (pkg.artifact) {
    console.log(`    Downloading ${pkg.artifact}...`);
    await downloadAndExtractAsset(pkg.artifact, releaseTag, libsDir, pkg.libSubdir);
  }

  // Clean up Android Graphite libs to only keep required files and create marker
  if (graphite && pkg.platform === "android") {
    cleanupAndroidLibs(libsDir);
    await stripDebugSymbols(libsDir);
    fs.writeFileSync(path.join(libsDir, "graphite.enabled"), "");
    console.log(`    Created graphite.enabled marker file`);
  }

  if (graphite) {
    await addSharedDawn(pkg, libsDir);
  }

  // Generate Package.swift for Apple packages (SwiftPM consumers). This is a
  // no-op for CocoaPods and for non-Apple packages.
  const packageSwift = generatePackageSwift(pkg, graphite, libsDir);
  if (packageSwift) {
    fs.writeFileSync(path.join(pkgDir, "Package.swift"), packageSwift);
    console.log(`    Generated Package.swift`);
  }

  // Generate package.json
  const packageJson = generatePackageJson(
    pkg,
    skiaVersion,
    npmVersion,
    graphite,
    packageSwift !== null
  );
  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );

  // Generate README.md
  const readme = generateReadme(pkg, skiaVersion, npmVersion, graphite);
  fs.writeFileSync(path.join(pkgDir, "README.md"), readme);

  console.log(`    Done!`);
  return pkgDir;
};

/**
 * Writes a `key=value` line to $GITHUB_OUTPUT when running inside GitHub
 * Actions, so a later workflow step can read this script's own output (e.g.
 * the release tag for the remote SwiftPM package) instead of re-deriving it.
 * No-ops outside of CI.
 */
const writeGithubOutput = (key: string, value: string): void => {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  fs.appendFileSync(outputFile, `${key}=${value}\n`);
};

interface SkiaConfig {
  version: string;
  // owner/name of the repository hosting this version's Build SKIA release
  repo?: string;
  checksums?: Record<string, string>;
}

interface ConfigFile {
  skia?: SkiaConfig;
  "skia-graphite"?: SkiaConfig;
}

const generateAllFromConfig = async (
  configPath: string,
  outputDir: string,
  variant: "all" | "ganesh" | "graphite" = "all",
  patch = 0,
  spmRepo: string = DEFAULT_SPM_REPO
): Promise<string[]> => {
  const configFullPath = path.resolve(configPath);
  if (!fs.existsSync(configFullPath)) {
    throw new Error(`Config file not found: ${configFullPath}`);
  }

  const config: ConfigFile = JSON.parse(fs.readFileSync(configFullPath, "utf8"));
  const generatedDirs: string[] = [];

  // Only the Graphite path writes dist/spm, so clear it here: a Ganesh-only run
  // must not leave a previous run's manifest for validate-spm to check.
  fs.rmSync(path.join(outputDir, REMOTE_SPM_DIR), { recursive: true, force: true });

  // Generate Ganesh packages
  if (config.skia?.version && (variant === "all" || variant === "ganesh")) {
    const skiaVersion = config.skia.version;
    const npmVersion = deriveNpmVersion(skiaVersion, patch);
    setReleasesRepo(config.skia.repo ?? DEFAULT_RELEASES_REPO);

    console.log("Generating Ganesh binary packages...");
    console.log(`  Skia version: ${skiaVersion}`);
    console.log(`  NPM version: ${npmVersion}`);
    console.log("");

    for (const pkg of GANESH_PACKAGES) {
      const pkgDir = await generatePackage(pkg, outputDir, skiaVersion, npmVersion, false);
      generatedDirs.push(pkgDir);
      console.log("");
    }

    if (variant === "ganesh") {
      console.log("Skipping remote SwiftPM package: it is published for Graphite iOS only.");
      console.log("");
    }
  }

  // Generate Graphite packages
  if (config["skia-graphite"]?.version && (variant === "all" || variant === "graphite")) {
    const skiaVersion = config["skia-graphite"].version;
    const npmVersion = deriveNpmVersion(skiaVersion, patch);
    setReleasesRepo(config["skia-graphite"].repo ?? DEFAULT_RELEASES_REPO);

    console.log("Generating Graphite binary packages...");
    console.log(`  Skia version: ${skiaVersion}`);
    console.log(`  NPM version: ${npmVersion}`);
    console.log("");

    for (const pkg of GRAPHITE_PACKAGES) {
      const pkgDir = await generatePackage(pkg, outputDir, skiaVersion, npmVersion, true);
      generatedDirs.push(pkgDir);
      console.log("");
    }

    await generateRemoteSpmPackage(outputDir, npmVersion, spmRepo);
    writeGithubOutput("graphite_npm_version", npmVersion);
    writeGithubOutput("spm_release_tag", spmReleaseTag(npmVersion));
    console.log("");
  }

  return generatedDirs;
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  const outputDir = (args["output-dir"] as string) || path.join(ROOT_DIR, "dist");

  // Config mode: generate all packages from config file
  if (args.config) {
    try {
      const variant = (args.variant as string) || "all";
      const patch = args.patch ? parseInt(args.patch as string, 10) : 0;
      const spmRepo = (args.repo as string) || DEFAULT_SPM_REPO;
      const generatedDirs = await generateAllFromConfig(args.config as string, outputDir, variant as "all" | "ganesh" | "graphite", patch, spmRepo);
      console.log(`Generated ${generatedDirs.length} package(s)`);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
    return;
  }

  // Single version mode
  if (!args["skia-version"]) {
    console.error("Error: --skia-version or --config is required");
    console.error(
      "Usage: npx tsx src/generate-packages.ts --skia-version=m144c"
    );
    console.error(
      "       npx tsx src/generate-packages.ts --config=skia-config.json"
    );
    process.exit(1);
  }

  const skiaVersion = args["skia-version"] as string;

  // Derive npm version from skia version if not provided
  let npmVersion: string;
  if (args["npm-version"]) {
    npmVersion = args["npm-version"] as string;
  } else {
    try {
      npmVersion = deriveNpmVersion(skiaVersion);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  }
  const graphite = args.graphite === true;
  const specificPackage = args.package as string | undefined;

  const packages = graphite ? GRAPHITE_PACKAGES : GANESH_PACKAGES;
  const packagesToGenerate = specificPackage
    ? packages.filter((p) => p.name === specificPackage)
    : packages;

  if (specificPackage && packagesToGenerate.length === 0) {
    console.error(`Error: Package "${specificPackage}" not found`);
    console.error(
      `Available packages: ${packages.map((p) => p.name).join(", ")}`
    );
    process.exit(1);
  }

  console.log(
    `Generating ${graphite ? "Graphite" : "Ganesh"} binary packages...`
  );
  console.log(`  Skia version: ${skiaVersion}`);
  console.log(`  NPM version: ${npmVersion}`);
  console.log(`  Output: ${outputDir}`);
  console.log("");

  const generatedDirs: string[] = [];
  for (const pkg of packagesToGenerate) {
    try {
      const pkgDir = await generatePackage(
        pkg,
        outputDir,
        skiaVersion,
        npmVersion,
        graphite
      );
      generatedDirs.push(pkgDir);
      console.log("");
    } catch (error) {
      console.error(`  Failed to generate ${pkg.name}: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  console.log(`Generated ${generatedDirs.length} package(s)`);
};

main();
