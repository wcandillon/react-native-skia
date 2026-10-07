/**
 * Validates the generated SwiftPM manifests (Package.swift) in the dist/
 * directory. The manifests are produced by scanning the extracted xcframeworks,
 * so the failure modes are drift between the manifest, the binaries on disk, and
 * the npm package.json. This script cross-checks all three.
 *
 * Three kinds of manifest are validated:
 *   - the per-package ones in dist/<pkg>/, whose binaryTargets are local paths
 *     into libs/, consumed from node_modules;
 *   - the generated one in dist/spm/, whose binaryTargets are release asset
 *     urls, consumed with .package(url:from:);
 *   - the committed one at the repository root, which is dist/spm/Package.swift
 *     copied into place by hand at release time, and must stay in sync with
 *     skia-config.json.
 *
 * It performs only fast, toolchain-free filesystem checks so it can run in CI
 * before publishing and gate it. For a deeper check that SwiftPM can actually
 * parse and evaluate the manifest, run `swift package dump-package` in each
 * package directory on a macOS runner (see the CI workflow).
 *
 * Usage:
 *   npx tsx src/validate-spm.ts                 # validates ./dist
 *   npx tsx src/validate-spm.ts --dist=./dist
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { spmReleaseTag, spmVersionFromTag } from "./spm-release.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

// Directory holding the generated remote SwiftPM package, and the npm package
// its release version is taken from. Both are written by generate-packages.ts.
const REMOTE_SPM_DIR = "spm";
const REMOTE_SPM_SOURCE_PACKAGE = "react-native-skia-graphite-apple-ios";

// The manifest the maintainer commits, and the file its release tag must agree with.
const ROOT_MANIFEST = "Package.swift";
const SKIA_CONFIG_FILE = "skia-config.json";

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

/** Extracts the `name:` argument of the Package(...) manifest. */
const parsePackageName = (manifest: string): string | null => {
  const match = manifest.match(/Package\(\s*name:\s*"([^"]+)"/);
  return match ? match[1] : null;
};

interface BinaryTarget {
  name?: string;
  path?: string;
  url?: string;
  checksum?: string;
}

/**
 * Extracts every `.binaryTarget(...)` declaration. Per-package manifests use
 * `path:`, the root manifest uses `url:` + `checksum:`, so each field is
 * optional and callers take the ones their manifest kind carries.
 */
const parseBinaryTargets = (manifest: string): BinaryTarget[] => {
  const targets: BinaryTarget[] = [];
  const regex = /\.binaryTarget\(([\s\S]*?)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(manifest)) !== null) {
    const field = (name: string): string | undefined =>
      match![1].match(new RegExp(`${name}:\\s*"([^"]+)"`))?.[1];
    targets.push({
      name: field("name"),
      path: field("path"),
      url: field("url"),
      checksum: field("checksum"),
    });
  }
  return targets;
};

type UrlBinaryTarget = Required<Pick<BinaryTarget, "name" | "url" | "checksum">>;

/** Keeps only the binaryTargets that carry a remote url and its checksum. */
const parseUrlBinaryTargets = (manifest: string): UrlBinaryTarget[] =>
  parseBinaryTargets(manifest).filter(
    (t): t is UrlBinaryTarget =>
      t.name !== undefined && t.url !== undefined && t.checksum !== undefined
  );

/** Extracts the release tag of a `.../releases/download/<tag>/<asset>` url. */
const parseReleaseTag = (url: string): string | null => {
  const match = url.match(/\/releases\/download\/([^/]+)\//);
  return match ? match[1] : null;
};

const sha256File = (filePath: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

/** Fails unless the library product lists exactly the declared targets. */
const checkProductClosure = (
  manifest: string,
  declared: Set<string>,
  fail: (msg: string) => void
): void => {
  const productTargets = new Set(parseProductTargets(manifest));
  for (const name of declared) {
    if (!productTargets.has(name)) {
      fail(`binaryTarget not listed in the product: ${name}`);
    }
  }
  for (const name of productTargets) {
    if (!declared.has(name)) {
      fail(`product references unknown target: ${name}`);
    }
  }
};

/** Extracts the target names listed in the `.library(... targets: [...])`. */
const parseProductTargets = (manifest: string): string[] => {
  const productMatch = manifest.match(
    /\.library\(([\s\S]*?targets:\s*\[)([\s\S]*?)\]/
  );
  if (!productMatch) {
    return [];
  }
  return [...productMatch[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const validatePackage = (pkgDir: string, errors: string[]): boolean => {
  const name = path.basename(pkgDir);
  const manifestPath = path.join(pkgDir, "Package.swift");

  // Only Apple packages carry a manifest; others are skipped silently.
  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  const fail = (msg: string): void => {
    errors.push(`[${name}] ${msg}`);
  };

  const manifest = fs.readFileSync(manifestPath, "utf8");
  const libsDir = path.join(pkgDir, "libs");

  // 1. Manifest name matches the npm package name.
  const pkgJsonPath = path.join(pkgDir, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const manifestName = parsePackageName(manifest);
    if (manifestName !== pkgJson.name) {
      fail(
        `Package.swift name "${manifestName}" does not match package.json name "${pkgJson.name}"`
      );
    }
    // 2. Package.swift is whitelisted in package.json files so it ships in the tarball.
    const files: string[] = pkgJson.files ?? [];
    if (!files.includes("Package.swift")) {
      fail(`package.json "files" does not include "Package.swift"`);
    }
  } else {
    fail("package.json not found");
  }

  // 3. Every binaryTarget path resolves to an xcframework directory with an Info.plist.
  const referenced = new Set<string>();
  for (const target of parseBinaryTargets(manifest)) {
    const relPath = target.path;
    if (!relPath) {
      continue;
    }
    const abs = path.join(pkgDir, relPath);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      fail(`binaryTarget path does not exist: ${relPath}`);
      continue;
    }
    if (!fs.existsSync(path.join(abs, "Info.plist"))) {
      fail(`xcframework is missing Info.plist: ${relPath}`);
    }
    referenced.add(path.basename(relPath));
  }

  // 4. No orphan frameworks: every xcframework on disk is referenced.
  if (fs.existsSync(libsDir)) {
    const onDisk = fs
      .readdirSync(libsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.endsWith(".xcframework"))
      .map((e) => e.name);
    for (const fw of onDisk) {
      if (!referenced.has(fw)) {
        fail(`xcframework not referenced by any binaryTarget: ${fw}`);
      }
    }
  }

  // 5. Product targets are closed over declared binaryTargets.
  const targetNames = new Set(
    parseBinaryTargets(manifest)
      .map((t) => t.name)
      .filter((n): n is string => n !== undefined)
  );
  const productTargets = parseProductTargets(manifest);
  if (productTargets.length === 0) {
    fail("library product declares no targets");
  }
  for (const t of productTargets) {
    if (!targetNames.has(t)) {
      fail(`product references unknown target: ${t}`);
    }
  }

  return true;
};

/**
 * Validates the root manifest in dist/spm/, which SwiftPM resolves over the
 * network: its binaryTargets must match the archives that will be uploaded as
 * release assets, and the release tag in every url must be the swiftpm-<version>
 * release of the version the npm packages were generated with. Returns false
 * when there is nothing to validate.
 */
const validateRemoteSpmPackage = (distDir: string, errors: string[]): boolean => {
  const spmDir = path.join(distDir, REMOTE_SPM_DIR);
  const manifestPath = path.join(spmDir, "Package.swift");

  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  const fail = (msg: string): void => {
    errors.push(`[${REMOTE_SPM_DIR}] ${msg}`);
  };

  const manifest = fs.readFileSync(manifestPath, "utf8");

  // 1. The release tag in the urls is the one for the version the npm packages carry.
  const pkgJsonPath = path.join(
    distDir,
    REMOTE_SPM_SOURCE_PACKAGE,
    "package.json"
  );
  let expectedTag: string | null = null;
  if (fs.existsSync(pkgJsonPath)) {
    expectedTag = spmReleaseTag(
      JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")).version
    );
  } else {
    fail(
      `${REMOTE_SPM_SOURCE_PACKAGE}/package.json not found, cannot check the release version`
    );
  }

  const targets = parseUrlBinaryTargets(manifest);
  if (targets.length === 0) {
    fail("manifest declares no url-based binaryTargets");
  }

  for (const target of targets) {
    if (expectedTag && !target.url.includes(`/download/${expectedTag}/`)) {
      fail(
        `binaryTarget "${target.name}" url does not point at release ${expectedTag}: ${target.url}`
      );
    }

    // 2. Every declared archive exists and hashes to the declared checksum.
    const archiveName = target.url.split("/").pop() ?? "";
    const archivePath = path.join(spmDir, archiveName);
    if (!fs.existsSync(archivePath)) {
      fail(`binaryTarget "${target.name}" archive is missing: ${archiveName}`);
      continue;
    }

    const actual = sha256File(archivePath);
    if (actual !== target.checksum) {
      fail(
        `binaryTarget "${target.name}" checksum mismatch for ${archiveName}: manifest ${target.checksum}, actual ${actual}`
      );
    }
  }

  // 3. The product lists exactly the declared targets.
  checkProductClosure(manifest, new Set(targets.map((t) => t.name)), fail);

  return true;
};

/** The Graphite milestone number declared in skia-config.json, e.g. 152 for m152. */
const readGraphiteMilestone = (fail: (msg: string) => void): string | null => {
  const configPath = path.join(ROOT_DIR, SKIA_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    fail(`${SKIA_CONFIG_FILE} not found, cannot check the release tag`);
    return null;
  }

  const config: { "skia-graphite"?: { version?: string } } = JSON.parse(
    fs.readFileSync(configPath, "utf8")
  );
  const version = config["skia-graphite"]?.version;
  const match = version?.match(/^m(\d+)/);
  if (!match) {
    fail(
      `${SKIA_CONFIG_FILE} has no usable "skia-graphite".version: ${version ?? "missing"}`
    );
    return null;
  }
  return match[1];
};

/**
 * Validates the root manifest, which is dist/spm/Package.swift copied into the
 * repository root and committed by hand at release time. Its urls point at
 * release assets, so what can drift is the release tag it pins and the
 * checksums it declares: the tag must belong to the Skia milestone in
 * skia-config.json, and the checksums must be the ones the archives hash to
 * whenever dist/spm is still around. Returns false when there is no root
 * manifest to validate.
 */
const validateRootSpmPackage = (distDir: string, errors: string[]): boolean => {
  const manifestPath = path.join(ROOT_DIR, ROOT_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    console.log(`  Skipped root SwiftPM manifest: no ${ROOT_MANIFEST} at the repository root`);
    return false;
  }

  const fail = (msg: string): void => {
    errors.push(`[${ROOT_MANIFEST}] ${msg}`);
  };

  const manifest = fs.readFileSync(manifestPath, "utf8");
  const targets = parseUrlBinaryTargets(manifest);
  if (targets.length === 0) {
    fail("manifest declares no url-based binaryTargets");
    return true;
  }

  // 1. Every url pins the same release tag, and that tag belongs to the Skia
  //    milestone in skia-config.json. Only the major version is compared, so a
  //    patch release of the same milestone is not drift. Releases cut before
  //    the zips moved to wcandillon/react-native-skia carry no swiftpm- prefix.
  const tags = new Set<string>();
  for (const target of targets) {
    const tag = parseReleaseTag(target.url);
    if (tag === null) {
      fail(`binaryTarget "${target.name}" url is not a release asset url: ${target.url}`);
      continue;
    }
    tags.add(tag);
  }
  if (tags.size > 1) {
    fail(`binaryTargets do not share one release tag: ${[...tags].sort().join(", ")}`);
  }

  const milestone = readGraphiteMilestone(fail);
  if (milestone !== null) {
    for (const tag of tags) {
      if (spmVersionFromTag(tag).split(".")[0] !== milestone) {
        fail(
          `release tag ${tag} does not match ${SKIA_CONFIG_FILE} skia-graphite m${milestone}: expected ${spmReleaseTag(`${milestone}.x.y`)}`
        );
      }
    }
  }

  // 2. Declared checksums match the archives. A plain checkout has no dist/,
  //    and then the tag check above is all that can be done. The archives are
  //    only comparable when the root manifest pins the release being generated:
  //    while a new release is cut it still describes the previous one, whose
  //    assets live on GitHub (and zips are not byte-reproducible anyway).
  const spmDir = path.join(distDir, REMOTE_SPM_DIR);
  const pkgJsonPath = path.join(distDir, REMOTE_SPM_SOURCE_PACKAGE, "package.json");
  const generatedVersion = fs.existsSync(pkgJsonPath)
    ? (JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")).version as string)
    : null;
  const pinsGeneratedVersion = [...tags].some(
    (tag) => spmVersionFromTag(tag) === generatedVersion
  );
  if (generatedVersion !== null && !pinsGeneratedVersion) {
    console.log(
      `  Root ${ROOT_MANIFEST} pins ${[...tags].join(", ")}, not ${spmReleaseTag(generatedVersion)}: skipped archive checks (commit dist/${REMOTE_SPM_DIR}/${ROOT_MANIFEST} after this release)`
    );
  } else if (fs.existsSync(spmDir)) {
    for (const target of targets) {
      const archiveName = target.url.split("/").pop() ?? "";
      const archivePath = path.join(spmDir, archiveName);
      if (!fs.existsSync(archivePath)) {
        fail(
          `binaryTarget "${target.name}" archive is missing from ${REMOTE_SPM_DIR}/: ${archiveName}`
        );
        continue;
      }

      const actual = sha256File(archivePath);
      if (actual !== target.checksum) {
        fail(
          `binaryTarget "${target.name}" checksum mismatch for ${archiveName}: manifest ${target.checksum}, actual ${actual}`
        );
      }
    }
  }

  // 3. The product lists exactly the declared targets.
  checkProductClosure(manifest, new Set(targets.map((t) => t.name)), fail);

  return true;
};

const main = (): void => {
  const args = parseArgs();
  const distDir = path.resolve(
    (args.dist as string) || path.join(ROOT_DIR, "dist")
  );

  if (!fs.existsSync(distDir)) {
    console.error(`Error: dist directory not found: ${distDir}`);
    process.exit(1);
  }

  const errors: string[] = [];
  let validated = 0;

  const entries = fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const entry of entries) {
    if (entry.name === REMOTE_SPM_DIR) {
      continue;
    }
    const pkgDir = path.join(distDir, entry.name);
    if (validatePackage(pkgDir, errors)) {
      validated++;
      console.log(`  Validated SwiftPM manifest: ${entry.name}`);
    }
  }

  if (validateRemoteSpmPackage(distDir, errors)) {
    validated++;
    console.log(`  Validated remote SwiftPM manifest: ${REMOTE_SPM_DIR}`);
  }

  if (validateRootSpmPackage(distDir, errors)) {
    validated++;
    console.log(`  Validated root SwiftPM manifest: ${ROOT_MANIFEST}`);
  }

  console.log("");
  if (errors.length > 0) {
    console.error(`SwiftPM validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (validated === 0) {
    console.warn("No SwiftPM manifests found to validate.");
    return;
  }

  console.log(`SwiftPM validation passed for ${validated} package(s).`);
};

main();
