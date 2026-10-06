/**
 * Script to verify checksums of downloaded Skia binaries.
 *
 * Usage:
 *   npx tsx src/verify-checksums.ts --config=skia-config.json
 *   npx tsx src/verify-checksums.ts --config=skia-config.json --graphite
 *
 * The config file should have the same format as package.json in react-native-skia:
 * {
 *   "skia": {
 *     "version": "m144c",
 *     "checksums": {
 *       "android-armeabi-v7a": "...",
 *       ...
 *     }
 *   },
 *   "skia-graphite": {
 *     "version": "m142b",
 *     "checksums": { ... }
 *   }
 * }
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
 * Calculate SHA256 checksum of a directory by hashing all files.
 */
const calculateDirectoryChecksum = (directory: string): string | null => {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const hash = crypto.createHash("sha256");
  const files: string[] = [];

  const collectFiles = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };

  collectFiles(directory);
  files.sort();

  for (const file of files) {
    const relativePath = path.relative(directory, file);
    hash.update(relativePath);
    hash.update(fs.readFileSync(file));
  }

  return hash.digest("hex");
};

interface ChecksumResult {
  platform: string;
  expected: string | undefined;
  actual: string | null;
  match: boolean;
  exists: boolean;
}

interface SkiaConfig {
  version: string;
  checksums: Record<string, string>;
}

interface ConfigFile {
  skia?: SkiaConfig;
  "skia-graphite"?: SkiaConfig;
}

/**
 * Verify checksums for all platforms in a libs directory.
 */
const verifyChecksums = (
  libsDir: string,
  expectedChecksums: Record<string, string>,
  graphite: boolean
): ChecksumResult[] => {
  const results: ChecksumResult[] = [];

  // Android architectures
  const androidArchs = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];
  for (const arch of androidArchs) {
    const archDir = path.join(libsDir, "android", arch);
    const checksumKey = `android-${arch}`;
    const expected = expectedChecksums[checksumKey];
    const actual = calculateDirectoryChecksum(archDir);

    results.push({
      platform: checksumKey,
      expected,
      actual,
      match: expected === actual,
      exists: actual !== null,
    });
  }

  // Apple platforms
  const applePlatforms = graphite ? ["ios", "macos"] : ["ios", "tvos", "macos"];

  for (const platform of applePlatforms) {
    const platformDir = path.join(libsDir, "apple", platform);
    const checksumKey = `apple-${platform}-xcframeworks`;
    const expected = expectedChecksums[checksumKey];
    const actual = calculateDirectoryChecksum(platformDir);

    results.push({
      platform: checksumKey,
      expected,
      actual,
      match: expected === actual,
      exists: actual !== null,
    });
  }

  return results;
};

const main = (): void => {
  const args = parseArgs();

  if (!args.config) {
    console.error("Error: --config is required");
    console.error("Usage: npx tsx src/verify-checksums.ts --config=skia-config.json");
    process.exit(1);
  }

  const configPath = path.resolve(args.config as string);
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config: ConfigFile = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const graphite = args.graphite === true;
  const skiaConfig = graphite ? config["skia-graphite"] : config.skia;

  if (!skiaConfig) {
    console.error(
      `Error: ${graphite ? "skia-graphite" : "skia"} config not found in ${configPath}`
    );
    process.exit(1);
  }

  const libsDir = (args["libs-dir"] as string) || path.join(process.cwd(), "libs");

  console.log(`Verifying ${graphite ? "Graphite" : "Ganesh"} checksums...`);
  console.log(`  Config: ${configPath}`);
  console.log(`  Version: ${skiaConfig.version}`);
  console.log(`  Libs: ${libsDir}`);
  console.log("");

  const results = verifyChecksums(libsDir, skiaConfig.checksums || {}, graphite);

  let allMatch = true;
  for (const result of results) {
    if (!result.exists) {
      console.log(`  [ ] ${result.platform}: NOT FOUND`);
      allMatch = false;
    } else if (result.match) {
      console.log(`  [OK] ${result.platform}`);
    } else {
      console.log(`  [X] ${result.platform}: MISMATCH`);
      console.log(`      Expected: ${result.expected}`);
      console.log(`      Actual:   ${result.actual}`);
      allMatch = false;
    }
  }

  console.log("");
  if (allMatch) {
    console.log("All checksums match!");
    process.exit(0);
  } else {
    console.log("Some checksums do not match or are missing.");
    process.exit(1);
  }
};

main();
