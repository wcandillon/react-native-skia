/**
 * Packages the prebuilt binaries in packages/skia/libs into the npm packages
 * react-native-skia depends on:
 *
 *   react-native-skia-graphite-android      libs/<abi>/*.a
 *   react-native-skia-graphite-apple-ios    libs/*.xcframework, Package.swift
 *   react-native-skia-graphite-apple-tvos   libs/*.xcframework, Package.swift
 *   react-native-skia-graphite-apple-macos  libs/*.xcframework, Package.swift
 *   react-native-webgpu-dawn                libs/android/<abi>/libwebgpu_dawn.so,
 *                                           libs/apple/libwebgpu_dawn.xcframework,
 *                                           include/{dawn,webgpu}, Package.swift
 *
 * The libs/ tree is what `yarn build-skia` and `yarn build-dawn` produce. The
 * build workflow builds every target in its own job and uploads each output
 * directory as an artifact; `--artifacts` stages those back into libs/ first.
 *
 * The same files are then archived as the assets of the GitHub release
 * `binaries-<version>`, which the native build systems download from instead
 * of node_modules:
 *
 *   skia-graphite-android-<abi>.zip                        <abi>/*.a
 *   dawn-android-<abi>.zip                                 <abi>/libwebgpu_dawn.so
 *   dawn-headers.zip                                       include/{dawn,webgpu}, LICENSE
 *   dawn-LICENSE.txt
 *   skia-graphite-apple-<platform>-<name>.xcframework.zip  <name>.xcframework
 *   dawn-apple-libwebgpu_dawn.xcframework.zip              libwebgpu_dawn.xcframework
 *   checksums.json                                         sha256 and size of each
 *
 * The archives are made from the package directories, so a release holds the
 * very bytes of the npm packages at that version. `--from-packages` makes them
 * from package directories that exist already (the extracted tarballs of a
 * published version) and generates nothing else.
 *
 * Usage:
 *   yarn package-binaries --skia-version=m154_8037_58b [--artifacts=<dir>] [--output=<dir>] [--release-output=<dir>]
 *   yarn package-binaries --skia-version=m154_8037_58b --print-version
 *   yarn package-binaries --from-packages=<dir> [--release-output=<dir>]
 *
 * Options:
 *   --skia-version  The Skia branch the binaries were built from, without its
 *                   chrome/ prefix, plus an optional re-spin letter: a
 *                   milestone (m154), or the Chromium release branch once
 *                   chrome/m154 has moved past the pinned commit
 *                   (m154_8037_58, m154_8037_58b). It derives the npm version
 *                   of every package: the milestone is the major and the
 *                   letter the minor (m154 → 154.0.0, m154_8037_58b → 154.2.0;
 *                   the branch digits do not affect it).
 *   --artifacts     Directory holding the build workflow's artifacts, one
 *                   subdirectory per artifact (skia-apple-ios, skia-android-arm64,
 *                   dawn-ios-arm64, dawn-headers, ...), to stage into libs/.
 *   --output        Where the packages are written (default: build/binaries).
 *   --release-output Where the release assets are written (default:
 *                   build/release).
 *   --from-packages Directory holding the five packages, one subdirectory per
 *                   package name: only the release assets are made, from them.
 *   --print-version Print the derived npm version and exit.
 */

import { execFileSync, execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exit } from "process";

import {
  DawnAppleXcframework,
  DawnLib,
  DawnLibs,
  createDawnXcframework,
  dawnTargetOutputDir,
  dawnTargets,
} from "./dawn-configuration";
import { PackageRoot, configurations } from "./skia-configuration";
import { fileOps } from "./utils";

const LibsRoot = path.join(PackageRoot, "libs");
const DefaultOutput = path.join(PackageRoot, "build", "binaries");
const DefaultReleaseOutput = path.join(PackageRoot, "build", "release");

const REPOSITORY_URL =
  "git+https://github.com/wcandillon/react-native-skia.git";

const ANDROID_ABIS = Object.values(configurations.android.targets).map(
  (t) => t.output
);

// The archives android/CMakeLists.txt links.
const ANDROID_SKIA_LIBS = [
  "libskia.a",
  "libsvg.a",
  "libskshaper.a",
  "libskottie.a",
  "libsksg.a",
  "libskparagraph.a",
  "libskunicode_core.a",
  "libskunicode_icu.a",
  "libjsonreader.a",
];

// The frameworks the podspec vendors.
const APPLE_SKIA_FRAMEWORKS = [
  "libskia",
  "libsvg",
  "libskshaper",
  "libskparagraph",
  "libskunicode_core",
  "libskunicode_libgrapheme",
  "libskottie",
  "libsksg",
];

const ANDROID_PACKAGE = "react-native-skia-graphite-android";
const APPLE_PLATFORMS = ["ios", "tvos", "macos"] as const;
const applePackage = (platform: (typeof APPLE_PLATFORMS)[number]) =>
  `react-native-skia-graphite-apple-${platform}`;
const DAWN_PACKAGE = "react-native-webgpu-dawn";

// Metadata for SwiftPM resolution; the binaries carry their own deployment
// targets. React Native's generated aggregate links at iOS 15, and SwiftPM
// accepts any lower floor.
const SPM_IOS = ".iOS(.v13)";
const SPM_TVOS = ".tvOS(.v13)";
const SPM_MACOS = ".macOS(.v10_15)";

const parseArgs = () => {
  const args: Record<string, string | boolean> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value ?? true;
    }
  }
  return args;
};

/**
 * m154 → 154.0.0, m154a → 154.1.0, m154_8037_58 → 154.0.0,
 * m154_8037_58b → 154.2.0.
 */
export const deriveNpmVersion = (skiaVersion: string): string => {
  const match = skiaVersion.match(/^m(\d+)(?:_\d+)*([a-z])?$/);
  if (!match) {
    throw new Error(
      `Invalid Skia version ${skiaVersion}: expected m154, m154a or m154_8037_58b`
    );
  }
  const [, major, respin] = match;
  const minor = respin ? respin.charCodeAt(0) - "a".charCodeAt(0) + 1 : 0;
  return `${major}.${minor}.0`;
};

// --- Staging the workflow artifacts into libs/ ---

/** Where each artifact of the build workflow lands in libs/. */
const artifactDestinations = (): Record<string, string> => {
  const destinations: Record<string, string> = {
    "skia-apple-ios": path.join(LibsRoot, "ios"),
    "skia-apple-tvos": path.join(LibsRoot, "tvos"),
    "skia-apple-macos": path.join(LibsRoot, "macos"),
    "dawn-headers": DawnLibs,
  };
  for (const [target, { output }] of Object.entries(
    configurations.android.targets
  )) {
    destinations[`skia-android-${target}`] = path.join(
      LibsRoot,
      "android",
      output
    );
  }
  for (const target of Object.keys(dawnTargets)) {
    destinations[`dawn-${target}`] = dawnTargetOutputDir(target);
  }
  return destinations;
};

const stageArtifacts = (artifactsDir: string) => {
  console.log(`📥 Staging ${artifactsDir} into ${LibsRoot}`);
  fileOps.rm(LibsRoot);
  const destinations = artifactDestinations();
  const missing: string[] = [];
  for (const [artifact, destination] of Object.entries(destinations)) {
    const source = path.join(artifactsDir, artifact);
    if (!fs.existsSync(source)) {
      missing.push(artifact);
      continue;
    }
    fileOps.mkdir(destination);
    fileOps.cp(source, destination);
    console.log(`   ${artifact} → ${path.relative(PackageRoot, destination)}`);
  }
  if (missing.length > 0) {
    throw new Error(`Missing artifacts: ${missing.join(", ")}`);
  }
  createDawnXcframework();
};

// --- Package generation ---

interface PackageSpec {
  name: string;
  description: string;
  // Called once the package directory exists; returns the SwiftPM binary
  // targets (xcframework names) to declare, if any.
  populate: (pkgDir: string) => string[];
  spmPlatforms?: string[];
  extra?: Record<string, unknown>;
  license?: { name: string; file?: string };
}

const requireFile = (file: string) => {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
  return file;
};

const copyXcframeworks = (
  source: string,
  destination: string,
  expected: string[]
): string[] => {
  fileOps.mkdir(destination);
  for (const name of expected) {
    const framework = requireFile(path.join(source, `${name}.xcframework`));
    requireFile(path.join(framework, "Info.plist"));
    fileOps.cp(framework, path.join(destination, `${name}.xcframework`));
  }
  return expected;
};

const packageSpecs = (skiaVersion: string): PackageSpec[] => [
  {
    name: ANDROID_PACKAGE,
    description:
      "Skia Graphite prebuilt binaries for Android (all architectures)",
    populate: (pkgDir) => {
      for (const abi of ANDROID_ABIS) {
        const source = path.join(LibsRoot, "android", abi);
        const destination = path.join(pkgDir, "libs", abi);
        fileOps.mkdir(destination);
        for (const lib of ANDROID_SKIA_LIBS) {
          fs.copyFileSync(
            requireFile(path.join(source, lib)),
            path.join(destination, lib)
          );
        }
      }
      return [];
    },
  },
  {
    name: applePackage("ios"),
    description:
      "Skia Graphite prebuilt binaries for iOS (device + simulator + Mac Catalyst)",
    populate: (pkgDir) =>
      copyXcframeworks(
        path.join(LibsRoot, "ios"),
        path.join(pkgDir, "libs"),
        APPLE_SKIA_FRAMEWORKS
      ),
    spmPlatforms: [SPM_IOS],
  },
  {
    name: applePackage("tvos"),
    description:
      "Skia Graphite prebuilt binaries for tvOS (device + simulator)",
    populate: (pkgDir) =>
      copyXcframeworks(
        path.join(LibsRoot, "tvos"),
        path.join(pkgDir, "libs"),
        APPLE_SKIA_FRAMEWORKS
      ),
    spmPlatforms: [SPM_TVOS],
  },
  {
    name: applePackage("macos"),
    description: "Skia Graphite prebuilt binaries for macOS (arm64 + x64)",
    populate: (pkgDir) =>
      copyXcframeworks(
        path.join(LibsRoot, "macos"),
        path.join(pkgDir, "libs"),
        APPLE_SKIA_FRAMEWORKS
      ),
    spmPlatforms: [SPM_MACOS],
  },
  {
    name: DAWN_PACKAGE,
    description:
      "Dawn (WebGPU) prebuilt binaries and headers, shared by react-native-skia and react-native-webgpu",
    populate: (pkgDir) => {
      for (const abi of ANDROID_ABIS) {
        const destination = path.join(pkgDir, "libs", "android", abi);
        fileOps.mkdir(destination);
        fs.copyFileSync(
          requireFile(path.join(DawnLibs, "android", abi, `${DawnLib}.so`)),
          path.join(destination, `${DawnLib}.so`)
        );
      }
      copyXcframeworks(
        path.dirname(DawnAppleXcframework),
        path.join(pkgDir, "libs", "apple"),
        [DawnLib]
      );
      fileOps.mkdir(path.join(pkgDir, "include"));
      for (const tree of ["dawn", "webgpu"]) {
        const source = requireFile(path.join(DawnLibs, "include", tree));
        fileOps.cp(source, path.join(pkgDir, "include", tree));
      }
      requireFile(path.join(pkgDir, "include", "webgpu", "webgpu.h"));
      requireFile(
        path.join(pkgDir, "include", "dawn", "native", "DawnNative.h")
      );
      return [DawnLib];
    },
    spmPlatforms: [SPM_IOS, SPM_TVOS, SPM_MACOS],
    license: { name: "BSD-3-Clause", file: path.join(DawnLibs, "LICENSE") },
    extra: {
      dawn: {
        ...JSON.parse(
          fs.readFileSync(
            requireFile(path.join(DawnLibs, "metadata.json")),
            "utf8"
          )
        ),
        skia: skiaVersion,
      },
    },
  },
];

const generatePackageSwift = (
  name: string,
  platforms: string[],
  targets: { name: string; path: string }[]
) => `// swift-tools-version:5.9
// This file is auto-generated by react-native-skia. Do not edit.
import PackageDescription

let package = Package(
    name: "${name}",
    platforms: [
${platforms.map((p) => `        ${p},`).join("\n")}
    ],
    products: [
        .library(
            name: "${name}",
            targets: [
${targets.map((t) => `                "${t.name}",`).join("\n")}
            ]
        )
    ],
    targets: [
${targets
  .map(
    (t) =>
      `        .binaryTarget(\n            name: "${t.name}",\n            path: "${t.path}"\n        ),`
  )
  .join("\n")}
    ]
)
`;

const generateReadme = (
  spec: PackageSpec,
  skiaVersion: string,
  npmVersion: string
) => `# ${spec.name}

${spec.description}

Prebuilt for [react-native-skia](https://github.com/wcandillon/react-native-skia)
from Skia \`${skiaVersion}\`${
  spec.name === DAWN_PACKAGE
    ? ", the Dawn commit that Skia release pins in its DEPS"
    : ""
}. Version ${npmVersion}.

The binaries are included directly in this package: no download happens at install time.
react-native-skia${
  spec.name === DAWN_PACKAGE ? " and react-native-webgpu" : ""
} depend on it at the exact version they were built with; there is no need to install it by hand.
`;

/** The names of the xcframeworks directly under `dir`. */
const findXcframeworks = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.endsWith(".xcframework"))
    .map((e) => e.name.replace(/\.xcframework$/, ""))
    .sort();
};

const generatePackage = (
  spec: PackageSpec,
  outputDir: string,
  skiaVersion: string,
  npmVersion: string
) => {
  const pkgDir = path.join(outputDir, spec.name);
  console.log(`📦 ${spec.name}@${npmVersion}`);
  fileOps.rm(pkgDir);
  fileOps.mkdir(pkgDir);

  const binaryTargets = spec.populate(pkgDir);

  const files = ["libs/**"];
  if (fs.existsSync(path.join(pkgDir, "include"))) {
    files.push("include/**");
  }

  if (binaryTargets.length > 0) {
    if (!spec.spmPlatforms) {
      throw new Error(`${spec.name} declares binary targets without platforms`);
    }
    // Binary targets live in libs/ or libs/apple/; the manifest paths are
    // relative to the package root.
    const targets = binaryTargets.map((name) => {
      const candidates = [
        path.join("libs", `${name}.xcframework`),
        path.join("libs", "apple", `${name}.xcframework`),
      ];
      const found = candidates.find((c) => fs.existsSync(path.join(pkgDir, c)));
      if (!found) {
        throw new Error(`${spec.name}: ${name}.xcframework not found in libs/`);
      }
      return { name, path: found };
    });
    fs.writeFileSync(
      path.join(pkgDir, "Package.swift"),
      generatePackageSwift(spec.name, spec.spmPlatforms, targets)
    );
    files.push("Package.swift");
  }

  if (spec.license?.file) {
    fs.copyFileSync(spec.license.file, path.join(pkgDir, "LICENSE"));
    files.push("LICENSE");
  }

  const packageJson = {
    name: spec.name,
    version: npmVersion,
    description: spec.description,
    license: spec.license?.name ?? "MIT",
    repository: {
      type: "git",
      // Must match the repository the publish workflow runs in, or npm
      // rejects the provenance attestation.
      url: REPOSITORY_URL,
      directory: "packages/skia",
    },
    publishConfig: { access: "public" },
    files,
    // The Dawn package records the Skia version under `dawn` instead.
    ...(spec.name === DAWN_PACKAGE
      ? {}
      : { skia: { version: skiaVersion, graphite: true } }),
    ...spec.extra,
  };
  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  fs.writeFileSync(
    path.join(pkgDir, "README.md"),
    generateReadme(spec, skiaVersion, npmVersion)
  );
  return pkgDir;
};

// --- Validation ---

/**
 * The manifests are generated from what was copied, so what can drift is
 * the manifest against the xcframeworks on disk and package.json. Fast,
 * toolchain-free checks; `swift package dump-package` is the deeper one.
 */
const validatePackage = (pkgDir: string, errors: string[]) => {
  const name = path.basename(pkgDir);
  const fail = (msg: string) => errors.push(`[${name}] ${msg}`);
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")
  );
  const manifestPath = path.join(pkgDir, "Package.swift");
  const onDisk = [
    ...findXcframeworks(path.join(pkgDir, "libs")),
    ...findXcframeworks(path.join(pkgDir, "libs", "apple")),
  ];

  if (!fs.existsSync(manifestPath)) {
    if (onDisk.length > 0) {
      fail(`ships xcframeworks but no Package.swift: ${onDisk.join(", ")}`);
    }
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf8");
  if (!(pkgJson.files as string[]).includes("Package.swift")) {
    fail(`package.json "files" does not include "Package.swift"`);
  }
  if (!manifest.includes(`name: "${pkgJson.name}"`)) {
    fail(
      `Package.swift name does not match package.json name "${pkgJson.name}"`
    );
  }
  const declared = new Set<string>();
  for (const match of manifest.matchAll(
    /\.binaryTarget\(\s*name:\s*"([^"]+)",\s*path:\s*"([^"]+)"/g
  )) {
    const [, target, relPath] = match;
    declared.add(target);
    const abs = path.join(pkgDir, relPath);
    if (!fs.existsSync(path.join(abs, "Info.plist"))) {
      fail(
        `binaryTarget ${target} does not point at an xcframework: ${relPath}`
      );
    }
  }
  for (const framework of onDisk) {
    if (!declared.has(framework)) {
      fail(`xcframework not referenced by any binaryTarget: ${framework}`);
    }
  }
  const product = manifest.match(
    /\.library\([\s\S]*?targets:\s*\[([\s\S]*?)\]/
  );
  const productTargets = product
    ? [...product[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : [];
  if (productTargets.length === 0) {
    fail("library product declares no targets");
  }
  for (const target of productTargets) {
    if (!declared.has(target)) {
      fail(`product references unknown target: ${target}`);
    }
  }
  for (const target of declared) {
    if (!productTargets.includes(target)) {
      fail(`binaryTarget not listed in the product: ${target}`);
    }
  }
};

const summarize = (pkgDir: string) => {
  const [size] = execSync(`du -sh ${pkgDir}`, { encoding: "utf8" }).split("	");
  const files = execSync(`find ${pkgDir} -type f | wc -l`, {
    encoding: "utf8",
  }).trim();
  console.log(`   ${path.basename(pkgDir)}: ${size.trim()}, ${files} files`);
};

// --- Release assets ---

/** The tag of the GitHub release that holds the binaries of a version. */
const releaseTag = (version: string) => `binaries-${version}`;

// `entries` (files or directories) are archived under the paths they have
// relative to `cwd`.
interface ArchivePart {
  cwd: string;
  entries: string[];
}

// An archive made of `parts`, or a copy of `file`.
interface ReleaseAsset {
  name: string;
  parts?: ArchivePart[];
  file?: string;
}

// One xcframework per archive, at its root: what a SwiftPM binary target takes.
const xcframeworkAsset = (
  prefix: string,
  dir: string,
  name: string
): ReleaseAsset => {
  requireFile(path.join(dir, `${name}.xcframework`, "Info.plist"));
  return {
    name: `${prefix}-${name}.xcframework.zip`,
    parts: [{ cwd: dir, entries: [`${name}.xcframework`] }],
  };
};

const releaseAssets = (packagesDir: string): ReleaseAsset[] => {
  const androidLibs = path.join(packagesDir, ANDROID_PACKAGE, "libs");
  const dawnDir = path.join(packagesDir, DAWN_PACKAGE);
  const assets: ReleaseAsset[] = [];

  // One archive per ABI, so that a build only downloads the ABIs it compiles.
  // Each holds its <abi>/ directory and nothing else: extracted into the same
  // directory, they give the layout android/CMakeLists.txt reads, and no two
  // archives carry the same path (Gradle fails a copy on a duplicate entry).
  for (const abi of ANDROID_ABIS) {
    assets.push({
      name: `skia-graphite-android-${abi}.zip`,
      parts: [
        {
          cwd: androidLibs,
          entries: ANDROID_SKIA_LIBS.map((lib) => path.join(abi, lib)),
        },
      ],
    });
    assets.push({
      name: `dawn-android-${abi}.zip`,
      parts: [
        {
          cwd: path.join(dawnDir, "libs", "android"),
          entries: [path.join(abi, `${DawnLib}.so`)],
        },
      ],
    });
  }

  // Dawn is BSD-3-Clause: its license is an asset of the release, and is in
  // the one Dawn archive every build of react-native-webgpu extracts.
  requireFile(path.join(dawnDir, "include", "webgpu", "webgpu.h"));
  requireFile(path.join(dawnDir, "include", "dawn", "native", "DawnNative.h"));
  assets.push({
    name: "dawn-headers.zip",
    parts: [{ cwd: dawnDir, entries: ["include", "LICENSE"] }],
  });
  assets.push({
    name: "dawn-LICENSE.txt",
    file: requireFile(path.join(dawnDir, "LICENSE")),
  });

  for (const platform of APPLE_PLATFORMS) {
    const libs = path.join(packagesDir, applePackage(platform), "libs");
    for (const framework of APPLE_SKIA_FRAMEWORKS) {
      assets.push(
        xcframeworkAsset(`skia-graphite-apple-${platform}`, libs, framework)
      );
    }
  }
  assets.push(
    xcframeworkAsset("dawn-apple", path.join(dawnDir, "libs", "apple"), DawnLib)
  );
  return assets;
};

// Adds to the archive when it exists already.
const zip = (archive: string, { cwd, entries }: ArchivePart) => {
  entries.forEach((entry) => requireFile(path.join(cwd, entry)));
  execFileSync(
    "zip",
    // -X: no uid/gid nor extended timestamps; -y: a symlink stays a symlink.
    ["-q", "-r", "-X", "-y", archive, ...entries, "-x", "*.DS_Store"],
    { cwd, stdio: "inherit" }
  );
};

const sha256 = (file: string) => {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(1 << 20);
    for (;;) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) {
        break;
      }
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
};

/**
 * Archives the package directories under `packagesDir` into the assets of the
 * GitHub release of their version, with a checksums.json that the packages
 * downloading them pin.
 */
const generateReleaseAssets = (packagesDir: string, releaseDir: string) => {
  const names = [
    ANDROID_PACKAGE,
    ...APPLE_PLATFORMS.map(applePackage),
    DAWN_PACKAGE,
  ];
  const packages = names.map((name) =>
    JSON.parse(
      fs.readFileSync(
        requireFile(path.join(packagesDir, name, "package.json")),
        "utf8"
      )
    )
  );
  const versions = [...new Set(packages.map((pkg) => pkg.version as string))];
  if (versions.length !== 1) {
    throw new Error(
      `The packages in ${packagesDir} are not at the same version: ${names
        .map((name, i) => `${name}@${packages[i].version}`)
        .join(", ")}`
    );
  }
  const [version] = versions;
  const [android] = packages;
  // The Dawn package repeats the Skia version under `dawn`.
  const { skia: _, ...dawn } = packages[packages.length - 1].dawn ?? {};

  console.log("");
  console.log(`🏷️  ${releaseTag(version)} → ${releaseDir}`);
  fileOps.rm(releaseDir);
  fileOps.mkdir(releaseDir);

  const checksums: Record<string, { sha256: string; size: number }> = {};
  let total = 0;
  for (const asset of releaseAssets(packagesDir)) {
    const archive = path.join(releaseDir, asset.name);
    if (asset.file) {
      fs.copyFileSync(asset.file, archive);
    }
    asset.parts?.forEach((part) => zip(archive, part));
    const { size } = fs.statSync(archive);
    checksums[asset.name] = { sha256: sha256(archive), size };
    total += size;
    console.log(`   ${asset.name}: ${(size / 1e6).toFixed(1)} MB`);
  }
  const manifest = {
    version,
    tag: releaseTag(version),
    skia: android.skia?.version,
    dawn,
    assets: checksums,
  };
  fs.writeFileSync(
    path.join(releaseDir, "checksums.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log(
    `✅ ${Object.keys(checksums).length} assets, ${(total / 1e6).toFixed(
      1
    )} MB, and checksums.json`
  );
};

const main = () => {
  const args = parseArgs();
  const releaseOutput =
    typeof args["release-output"] === "string"
      ? path.resolve(args["release-output"])
      : DefaultReleaseOutput;

  if (typeof args["from-packages"] === "string") {
    generateReleaseAssets(path.resolve(args["from-packages"]), releaseOutput);
    return;
  }

  const skiaVersion = args["skia-version"];
  if (typeof skiaVersion !== "string") {
    throw new Error("--skia-version is required");
  }
  const npmVersion = deriveNpmVersion(skiaVersion);
  if (args["print-version"]) {
    console.log(npmVersion);
    return;
  }

  if (typeof args.artifacts === "string") {
    stageArtifacts(path.resolve(args.artifacts));
  }

  const outputDir =
    typeof args.output === "string" ? path.resolve(args.output) : DefaultOutput;
  fileOps.mkdir(outputDir);

  console.log(`Skia version: ${skiaVersion}`);
  console.log(`npm version:  ${npmVersion}`);
  console.log(`Output:       ${outputDir}`);
  console.log("");

  const packageDirs = packageSpecs(skiaVersion).map((spec) =>
    generatePackage(spec, outputDir, skiaVersion, npmVersion)
  );

  const errors: string[] = [];
  for (const pkgDir of packageDirs) {
    validatePackage(pkgDir, errors);
  }
  if (errors.length > 0) {
    throw new Error(
      `Validation failed:\n${errors.map((e) => `  ${e}`).join("\n")}`
    );
  }

  console.log("");
  console.log("✅ Packages:");
  packageDirs.forEach(summarize);

  generateReleaseAssets(outputDir, releaseOutput);
};

try {
  main();
} catch (error) {
  console.error(`❌ ${(error as Error).message}`);
  exit(1);
}
