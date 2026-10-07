/**
 * Shared helpers for downloading and extracting Skia binaries from the
 * Build SKIA GitHub releases.
 *
 * Two asset layouts exist:
 *
 *   - Android and Graphite headers: a single `<artifact>-<tag>.tar.gz`.
 *   - Apple xcframeworks (since m154): one `<artifact>-<lib>-<tag>.zip` per
 *     xcframework, listed with their SHA256 in `<artifact>-<tag>.checksums.txt`.
 *     Releases before m154 shipped a single `<artifact>-<tag>.tar.gz` instead,
 *     which is still supported as a fallback.
 */

import fs from "fs";
import https from "https";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";

// GitHub repository hosting the Skia build releases (Build SKIA workflow).
// Releases up to m154 were built in shopify/react-native-skia; skia-config.json
// pins the repository per backend, and SKIA_RELEASES_REPO overrides the default.
export const DEFAULT_RELEASES_REPO =
  process.env.SKIA_RELEASES_REPO ?? "wcandillon/react-native-skia";

let releasesRepo = DEFAULT_RELEASES_REPO;

export const setReleasesRepo = (repo: string): void => {
  releasesRepo = repo;
};

export const assetUrl = (releaseTag: string, assetName: string): string =>
  `https://github.com/${releasesRepo}/releases/download/${releaseTag}/${assetName}`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const runCommand = (
  command: string,
  args: string[],
  options: object = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "inherit", "inherit"],
      ...options,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} exited with code ${code}`));
      }
    });
  });
};

export interface DownloadError extends Error {
  statusCode?: number;
  code?: string;
}

export const downloadToFile = (
  url: string,
  destPath: string,
  maxRetries = 5
): Promise<void> => {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const attemptDownload = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = (currentUrl: string): void => {
        https
          .get(currentUrl, { headers: { "User-Agent": "node" } }, (res) => {
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode)
            ) {
              const { location } = res.headers;
              if (location) {
                res.resume();
                request(location);
              } else {
                reject(new Error(`Redirect without location for ${currentUrl}`));
              }
              return;
            }

            if (res.statusCode !== 200) {
              const error: DownloadError = new Error(
                `Failed to download: ${res.statusCode} ${res.statusMessage}`
              );
              error.statusCode = res.statusCode;
              res.resume();
              reject(error);
              return;
            }

            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);

            fileStream.on("finish", () => {
              fileStream.close((err) => {
                if (err) {
                  fileStream.destroy();
                  fs.unlink(destPath, () => reject(err));
                } else {
                  resolve();
                }
              });
            });

            const cleanup = (error: Error): void => {
              fileStream.destroy();
              fs.unlink(destPath, () => reject(error));
            };

            res.on("error", cleanup);
            fileStream.on("error", cleanup);
          })
          .on("error", reject);
      };

      request(url);
    });
  };

  const downloadWithRetry = async (retryCount = 0): Promise<void> => {
    try {
      await attemptDownload();
    } catch (error) {
      const downloadError = error as DownloadError;
      const isRateLimit =
        downloadError.statusCode === 403 ||
        downloadError.message.includes("rate limit");
      const shouldRetry =
        retryCount < maxRetries &&
        (isRateLimit ||
          downloadError.code === "ECONNRESET" ||
          downloadError.code === "ETIMEDOUT");

      if (shouldRetry) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(
          `      Retry ${retryCount + 1}/${maxRetries} in ${delay / 1000}s...`
        );
        await sleep(delay);
        return downloadWithRetry(retryCount + 1);
      } else {
        throw error;
      }
    }
  };

  return downloadWithRetry();
};

const isNotFound = (error: unknown): boolean =>
  (error as DownloadError).statusCode === 404;

/**
 * Runs the first available command from `candidates` with `args`. Used to
 * pick a platform-appropriate archive tool.
 */
const runFirstAvailable = async (
  candidates: string[],
  args: string[],
  what: string
): Promise<void> => {
  let lastError: Error | undefined;
  for (const candidate of candidates) {
    try {
      await runCommand(candidate, args);
      return;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        lastError = new Error(`Command ${candidate} not found`);
        continue;
      }
      lastError = error;
    }
  }

  throw new Error(`Failed to ${what}: ${lastError?.message ?? "unknown error"}`);
};

const windowsTar = (): string[] => [
  "tar.exe",
  path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"),
];

export const extractTarGz = async (
  archivePath: string,
  destDir: string
): Promise<void> => {
  fs.mkdirSync(destDir, { recursive: true });
  const candidates = process.platform === "win32" ? windowsTar() : ["tar"];
  await runFirstAvailable(candidates, ["-xzf", archivePath, "-C", destDir], "extract");
};

export const extractZip = async (
  archivePath: string,
  destDir: string
): Promise<void> => {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    // bsdtar (shipped with Windows 10+) extracts zip archives.
    await runFirstAvailable(windowsTar(), ["-xf", archivePath, "-C", destDir], "extract");
    return;
  }
  // `unzip` preserves file permissions and symlinks inside xcframeworks.
  await runFirstAvailable(["unzip"], ["-q", "-o", archivePath, "-d", destDir], "extract");
};

export const sha256File = (filePath: string): string => {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
};

export const copyDir = (src: string, dest: string): void => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    const stat = fs.lstatSync(srcPath);
    if (
      stat.isSocket() ||
      stat.isFIFO() ||
      stat.isCharacterDevice() ||
      stat.isBlockDevice()
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

/** Copies every entry of `sourceDir` into `destDir`. */
const copyContents = (sourceDir: string, destDir: string): void => {
  fs.mkdirSync(destDir, { recursive: true });
  for (const item of fs.readdirSync(sourceDir)) {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(destDir, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const withTempDir = async <T>(
  fn: (tempDir: string) => Promise<T>
): Promise<T> => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skia-download-"));
  try {
    return await fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

/**
 * Downloads `<artifact>-<releaseTag>.tar.gz` and copies its contents into
 * `destDir`. If the archive has a single top-level directory it is unwrapped,
 * and if that directory contains `srcSubdir` only that subdirectory is copied.
 */
export const downloadAndExtractAsset = async (
  artifact: string,
  releaseTag: string,
  destDir: string,
  srcSubdir?: string
): Promise<void> => {
  const assetName = `${artifact}-${releaseTag}.tar.gz`;

  await withTempDir(async (tempDir) => {
    const archivePath = path.join(tempDir, assetName);
    const extractDir = path.join(tempDir, "extracted");

    console.log(`      Downloading ${assetName}...`);
    await downloadToFile(assetUrl(releaseTag, assetName), archivePath);

    console.log(`      Extracting...`);
    await extractTarGz(archivePath, extractDir);

    const extractedContents = fs.readdirSync(extractDir);
    if (extractedContents.length === 0) {
      throw new Error("Archive extracted but no contents found");
    }

    let sourceDir = extractDir;

    // If there's a single top-level directory, descend into it
    if (
      extractedContents.length === 1 &&
      fs.statSync(path.join(extractDir, extractedContents[0])).isDirectory()
    ) {
      sourceDir = path.join(extractDir, extractedContents[0]);

      // Check if there's a subdir matching srcSubdir
      if (
        srcSubdir &&
        fs.existsSync(path.join(sourceDir, srcSubdir)) &&
        fs.statSync(path.join(sourceDir, srcSubdir)).isDirectory()
      ) {
        sourceDir = path.join(sourceDir, srcSubdir);
      }
    }

    copyContents(sourceDir, destDir);
  });
};

interface XcframeworkAsset {
  name: string;
  sha256: string;
}

/**
 * Parses a `<artifact>-<tag>.checksums.txt` file: one `<asset>  <sha256>` per line.
 */
const parseChecksums = (contents: string): XcframeworkAsset[] =>
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, sha256] = line.split(/\s+/);
      if (!name || !sha256 || !/^[0-9a-f]{64}$/i.test(sha256)) {
        throw new Error(`Malformed checksum line: "${line}"`);
      }
      return { name, sha256: sha256.toLowerCase() };
    });

/**
 * Downloads the Apple xcframeworks for `artifact` (e.g. skia-apple-ios-xcframeworks)
 * into `destDir`, so that `destDir` contains `libskia.xcframework`, `libsvg.xcframework`, ...
 *
 * Prefers the per-xcframework zip layout (m154 and later), verifying each zip against
 * the SHA256 published in the release's checksums file. Falls back to the single
 * tarball layout of older releases when no checksums file is published.
 */
export const downloadXcframeworks = async (
  artifact: string,
  releaseTag: string,
  destDir: string,
  legacySrcSubdir?: string
): Promise<void> => {
  const checksumsName = `${artifact}-${releaseTag}.checksums.txt`;

  await withTempDir(async (tempDir) => {
    const checksumsPath = path.join(tempDir, checksumsName);
    try {
      await downloadToFile(assetUrl(releaseTag, checksumsName), checksumsPath);
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      console.log(
        `      ${checksumsName} not found, falling back to single tarball...`
      );
      await downloadAndExtractAsset(artifact, releaseTag, destDir, legacySrcSubdir);
      return;
    }

    const assets = parseChecksums(fs.readFileSync(checksumsPath, "utf8"));
    if (assets.length === 0) {
      throw new Error(`${checksumsName} lists no assets`);
    }

    fs.mkdirSync(destDir, { recursive: true });

    for (const asset of assets) {
      const archivePath = path.join(tempDir, asset.name);
      console.log(`      Downloading ${asset.name}...`);
      await downloadToFile(assetUrl(releaseTag, asset.name), archivePath);

      const actual = sha256File(archivePath);
      if (actual !== asset.sha256) {
        throw new Error(
          `Checksum mismatch for ${asset.name}: expected ${asset.sha256}, got ${actual}`
        );
      }

      const extractDir = path.join(tempDir, "extracted", asset.name);
      await extractZip(archivePath, extractDir);
      copyContents(extractDir, destDir);
      fs.rmSync(archivePath, { force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });
    }

    console.log(`      Verified ${assets.length} xcframework archive(s)`);
  });
};
