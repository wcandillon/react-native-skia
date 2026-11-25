/**
 * Packages the prebuilt binaries in packages/skia/libs into the assets of the
 * GitHub release `binaries-<version>`, which the native build systems
 * download from:
 *
 *   skia-graphite-android-<abi>.zip   <abi>/*.a
 *   dawn-android-<abi>.zip            <abi>/libwebgpu_dawn.so
 *   dawn-headers.zip                  include/{dawn,webgpu}, LICENSE
 *   dawn-LICENSE.txt
 *   skia-graphite-apple-<sdk>.zip     *.a, metadata.json
 *   dawn-apple-<sdk>.zip              libwebgpu_dawn.a, metadata.json
 *   checksums.json                    sha256 and size of each
 *
 * The libs/ tree is what `yarn build-skia` and `yarn build-dawn` produce. The
 * build workflow builds every target in its own job and uploads each output
 * directory as an artifact; `--artifacts` stages those back into libs/ first.
 *
 * Usage:
 *   yarn package-binaries --skia-version=m154_8037_58b [--artifacts=<dir>] [--output=<dir>]
 *   yarn package-binaries --skia-version=m154_8037_58b --print-version
 *
 * Options:
 *   --skia-version  The Skia branch the binaries were built from, without its
 *                   chrome/ prefix, plus an optional re-spin letter: a
 *                   milestone (m154), or the Chromium release branch once
 *                   chrome/m154 has moved past the pinned commit
 *                   (m154_8037_58, m154_8037_58b). It derives the version of
 *                   the release: the milestone is the major and the letter
 *                   the minor (m154 → 154.0.0, m154_8037_58b → 154.2.0; the
 *                   branch digits do not affect it).
 *   --artifacts     Directory holding the build workflow's artifacts, one
 *                   subdirectory per artifact (skia-iphoneos, skia-android-arm64,
 *                   dawn-iphoneos, dawn-headers, ...), to stage into libs/.
 *                   skia-apple and dawn-apple hold every Apple SDK at once,
 *                   one subdirectory per SDK.
 *   --output        Where the release assets are written (default:
 *                   build/release).
 *   --print-version Print the derived version and exit.
 */

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exit } from "process";

import {
  DawnLib,
  DawnLibs,
  dawnTargetOutputDir,
  dawnTargets,
} from "./dawn-configuration";
import {
  PackageRoot,
  configurations,
  appleOutputNames,
} from "./skia-configuration";
import { validateAppleLibraries } from "./apple-build";
import { appleSDKs } from "./apple-configuration";
import { fileOps } from "./utils";

const LibsRoot = path.join(PackageRoot, "libs");
const DefaultOutput = path.join(PackageRoot, "build", "release");

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

const parseArgs = (values: string[]) => {
  const args: Record<string, string | boolean> = {};
  for (const arg of values) {
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
export const deriveVersion = (skiaVersion: string): string => {
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
  // Dawn artifact names include the Android ABI; each ABI has its own directory.
  for (const [target, configuration] of Object.entries(dawnTargets)) {
    if (configuration.os === "android") {
      destinations[`dawn-${target}`] = dawnTargetOutputDir(target);
    }
  }
  for (const sdk of appleSDKs) {
    destinations[`skia-${sdk}`] = path.join(LibsRoot, "apple", sdk);
    destinations[`dawn-${sdk}`] = path.join(DawnLibs, "apple", sdk);
  }
  return destinations;
};

/**
 * Where an artifact is in the downloaded artifacts. A job that builds every
 * Apple SDK uploads them together as skia-apple or dawn-apple, one
 * subdirectory per SDK, in place of skia-<sdk> or dawn-<sdk>.
 */
const artifactSource = (artifactsDir: string, artifact: string) => {
  const source = path.join(artifactsDir, artifact);
  const [, library, sdk] = artifact.match(/^(skia|dawn)-(.+)$/) ?? [];
  if (
    fs.existsSync(source) ||
    !library ||
    !appleSDKs.includes(sdk as (typeof appleSDKs)[number])
  ) {
    return source;
  }
  return path.join(artifactsDir, `${library}-apple`, sdk);
};

const stageArtifacts = (artifactsDir: string) => {
  console.log(`📥 Staging ${artifactsDir} into ${LibsRoot}`);
  fileOps.rm(LibsRoot);
  const destinations = artifactDestinations();
  const missing: string[] = [];
  for (const [artifact, destination] of Object.entries(destinations)) {
    const source = artifactSource(artifactsDir, artifact);
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
};

// --- Release assets ---

const requireFile = (file: string) => {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
  return file;
};

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

const releaseAssets = (): ReleaseAsset[] => {
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
          cwd: path.join(LibsRoot, "android"),
          entries: ANDROID_SKIA_LIBS.map((lib) => path.join(abi, lib)),
        },
      ],
    });
    assets.push({
      name: `dawn-android-${abi}.zip`,
      parts: [
        {
          cwd: path.join(DawnLibs, "android"),
          entries: [path.join(abi, `${DawnLib}.so`)],
        },
      ],
    });
  }

  // Dawn is BSD-3-Clause: its license is an asset of the release, and is in
  // the one Dawn archive every build of react-native-webgpu extracts.
  const dawnInclude = path.join(DawnLibs, "include");
  requireFile(path.join(dawnInclude, "webgpu", "webgpu.h"));
  requireFile(path.join(dawnInclude, "dawn", "native", "DawnNative.h"));
  assets.push({
    name: "dawn-headers.zip",
    parts: [
      {
        cwd: DawnLibs,
        entries: [
          path.join("include", "dawn"),
          path.join("include", "webgpu"),
          "LICENSE",
        ],
      },
    ],
  });
  assets.push({
    name: "dawn-LICENSE.txt",
    file: requireFile(path.join(DawnLibs, "LICENSE")),
  });

  // One download per SDK, carrying every static library of that SDK.
  for (const sdk of appleSDKs) {
    assets.push({
      name: `skia-graphite-apple-${sdk}.zip`,
      parts: [
        {
          cwd: path.join(LibsRoot, "apple", sdk),
          entries: [...appleOutputNames, "metadata.json"],
        },
      ],
    });
    assets.push({
      name: `dawn-apple-${sdk}.zip`,
      parts: [
        {
          cwd: path.join(DawnLibs, "apple", sdk),
          entries: [`${DawnLib}.a`, "metadata.json"],
        },
      ],
    });
  }
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
 * Archive the build outputs and write checksums.json, which consumers pin
 * (as binaries.json) to check each asset's hash and size.
 */
const generateReleaseAssets = (
  releaseDir: string,
  skiaVersion: string,
  version: string
) => {
  // Release jobs must not silently publish a partial universal SDK archive.
  validateAppleLibraries(path.join(LibsRoot, "apple"), appleOutputNames);
  validateAppleLibraries(path.join(DawnLibs, "apple"), [`${DawnLib}.a`]);
  const dawn = JSON.parse(
    fs.readFileSync(requireFile(path.join(DawnLibs, "metadata.json")), "utf8")
  );

  console.log(`🏷️  ${releaseTag(version)} → ${releaseDir}`);
  fileOps.rm(releaseDir);
  fileOps.mkdir(releaseDir);

  const checksums: Record<string, { sha256: string; size: number }> = {};
  let total = 0;
  for (const asset of releaseAssets()) {
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
    skia: skiaVersion,
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

/** Package existing build outputs; importing this module never starts native tools. */
export const packageBinaries = (values = process.argv.slice(2)) => {
  const args = parseArgs(values);

  const skiaVersion = args["skia-version"];
  if (typeof skiaVersion !== "string") {
    throw new Error("--skia-version is required");
  }
  const version = deriveVersion(skiaVersion);
  if (args["print-version"]) {
    console.log(version);
    return;
  }

  if (typeof args.artifacts === "string") {
    stageArtifacts(path.resolve(args.artifacts));
  }

  const outputDir =
    typeof args.output === "string" ? path.resolve(args.output) : DefaultOutput;

  console.log(`Skia version: ${skiaVersion}`);
  console.log(`Version:      ${version}`);
  console.log("");

  generateReleaseAssets(outputDir, skiaVersion, version);
};

if (require.main === module) {
  try {
    packageBinaries();
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    exit(1);
  }
}
