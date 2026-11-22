/**
 * Uses local Dawn headers or prepares the published headers pinned in binaries.json.
 * Header copying and Skia builds await this before changing outputs or compiling.
 * Uses Node and extract-zip on Linux, macOS and Windows; no Dawn compilation.
 */
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import extract from "extract-zip";

const PackageRoot = path.join(__dirname, "..");
const AssetName = "dawn-headers.zip";
const ReleaseBaseURL =
  "https://github.com/wcandillon/react-native-skia/releases/download";

/** Header archives are small; hash their complete bytes before extraction. */
const sha256 = (file: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** Match the Apple preparer's cache layout; downloaded SDKs stay untouched. */
const cacheDirectory = () => {
  if (process.env.RNSKIA_CACHE_DIR) {
    if (!path.isAbsolute(process.env.RNSKIA_CACHE_DIR)) {
      throw new Error("RNSKIA_CACHE_DIR must be an absolute path.");
    }
    return process.env.RNSKIA_CACHE_DIR;
  }
  let root = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
  if (process.platform === "darwin") {
    root = path.join(os.homedir(), "Library", "Caches");
  } else if (process.platform === "win32") {
    root =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  }
  return path.join(root, "react-native-skia");
};

/** Mirrors may provide HTTP(S) releases or a local file:/// release tree. */
const download = async (url: URL, destination: string) => {
  if (url.protocol === "file:") {
    fs.copyFileSync(fileURLToPath(url), destination);
    return;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Cannot download ${url}: HTTP ${response.status}.`);
  }
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
};

/** Prefer local builds; marked downloads refresh when the pinned checksum changes. */
export const prepareDawnHeaders = async () => {
  const dawnRoot = path.join(PackageRoot, "libs", "dawn");
  const destination = path.join(dawnRoot, "include");
  const marker = path.join(destination, ".release-sha256");
  const hasHeaders = fs.existsSync(
    path.join(destination, "webgpu", "webgpu.h")
  );
  // build-dawn replaces include/ without this marker. Preserve its headers,
  // including when a contributor is testing a different Dawn revision.
  if (hasHeaders && !fs.existsSync(marker)) {
    return destination;
  }
  const binaries = JSON.parse(
    fs.readFileSync(path.join(PackageRoot, "binaries.json"), "utf8")
  );
  const { version, tag } = binaries;
  const expected = binaries.assets?.[AssetName]?.sha256;
  if (
    !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version) ||
    tag !== `binaries-${version}` ||
    !/^[a-f0-9]{64}$/.test(expected)
  ) {
    throw new Error(
      "Invalid release or Dawn header checksum in binaries.json."
    );
  }

  if (hasHeaders && fs.readFileSync(marker, "utf8").trim() === expected) {
    return destination;
  }

  const cache = path.join(cacheDirectory(), tag, expected);
  const archive = path.join(cache, AssetName);
  fs.mkdirSync(cache, { recursive: true });
  if (!fs.existsSync(archive) || sha256(archive) !== expected) {
    const url = new URL(
      `${tag}/${AssetName}`,
      `${(process.env.REACT_NATIVE_SKIA_BINARIES_URL ?? ReleaseBaseURL).replace(
        /\/$/,
        ""
      )}/`
    );
    // Unique temporary files and atomic rename keep parallel cache writers safe.
    const temporary = fs.mkdtempSync(path.join(cache, ".headers-"));
    try {
      const candidate = path.join(temporary, AssetName);
      console.log(`Downloading ${url}`);
      await download(url, candidate);
      if (sha256(candidate) !== expected) {
        throw new Error(
          `SHA-256 mismatch for ${AssetName}; download discarded.`
        );
      }
      fs.renameSync(candidate, archive);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  } else {
    console.log(`Verified cached ${AssetName} (${version}).`);
  }

  fs.mkdirSync(dawnRoot, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(dawnRoot, ".headers-"));
  const previous = path.join(temporary, "previous");
  try {
    await extract(archive, { dir: temporary });
    const include = path.join(temporary, "include");
    if (!fs.existsSync(path.join(include, "webgpu", "webgpu.h"))) {
      throw new Error(`${AssetName} has no include/webgpu/webgpu.h.`);
    }
    // Keep the marker inside include/ so a fresh local build removes it too.
    fs.writeFileSync(path.join(include, ".release-sha256"), `${expected}\n`);
    // Extract first: a failed download/unpack must leave current headers intact.
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, previous);
    }
    try {
      fs.renameSync(include, destination);
    } catch (error) {
      if (fs.existsSync(previous)) {
        fs.renameSync(previous, destination);
      }
      throw error;
    }
    console.log(`Prepared Dawn headers ${version}: ${destination}`);
    return destination;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
};

// Importing the helper performs no I/O; the CLI remains available for setup.
if (require.main === module) {
  prepareDawnHeaders().catch((error: Error) => {
    console.error(
      `Dawn header preparation failed: ${error.message}\nCheck binaries.json, the published release, and REACT_NATIVE_SKIA_BINARIES_URL, then retry.`
    );
    process.exitCode = 1;
  });
}
