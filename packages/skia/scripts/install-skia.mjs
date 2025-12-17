import fs from "fs";
import https from "https";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repo = "shopify/react-native-skia";

const packageJsonPath = path.join(__dirname, "..", "package.json");

const getPackageJson = () => {
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
};

const getSkiaConfig = (graphite = false) => {
  const packageJson = getPackageJson();
  return graphite ? packageJson["skia-graphite"] : packageJson.skia;
};

const getSkiaVersion = (graphite = false) => {
  const packageJson = getPackageJson();
  const skiaConfig = getSkiaConfig(graphite);
  return skiaConfig?.version || packageJson.skiaVersion;
};

const updateSkiaChecksums = (checksums, graphite = false) => {
  const packageJson = getPackageJson();
  const field = graphite ? "skia-graphite" : "skia";

  if (!packageJson[field]) {
    packageJson[field] = { version: packageJson[field]?.version || "m142", checksums: {} };
  }

  packageJson[field].checksums = checksums;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
};

const GRAPHITE = !!process.env.SK_GRAPHITE;
const prefix = GRAPHITE ? "skia-graphite" : "skia";
const names = [
  `${prefix}-android-arm`,
  `${prefix}-android-arm-64`,
  `${prefix}-android-arm-x64`,
  `${prefix}-android-arm-x86`,
  `${prefix}-apple-xcframeworks`,
];
if (GRAPHITE) {
  names.push(`${prefix}-headers`);
}

const skiaVersion = getSkiaVersion(GRAPHITE);
const releaseTag = GRAPHITE ? `skia-graphite-${skiaVersion}` : `skia-${skiaVersion}`;
console.log(
  `📦 Downloading Skia prebuilt binaries for ${releaseTag}`
);

const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "inherit", "inherit"],
      ...options,
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} exited with code ${code}`));
      }
    });
  });
};

const runCommandWithOutput = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command ${command} exited with code ${code}: ${stderr}`));
      }
    });
  });
};

const skiaDir = path.resolve(__dirname, "../../../externals/skia");

const checkoutSkiaBranch = async (version) => {
  const branchName = `chrome/${version}`;

  // Check if the skia directory exists and is a git repo
  // (won't exist when installed via npm - submodule is not included in the package)
  if (!fs.existsSync(skiaDir) || !fs.existsSync(path.join(skiaDir, ".git"))) {
    return;
  }

  console.log(`🔀 Checking out Skia branch: ${branchName}`);

  try {
    // Get current branch/commit
    const currentRef = await runCommandWithOutput("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: skiaDir });

    if (currentRef === branchName) {
      console.log(`   ✓ Already on branch ${branchName}`);
      return;
    }

    // Fetch the branch from origin
    console.log(`   Fetching branch ${branchName} from origin...`);
    try {
      await runCommand("git", ["fetch", "origin", `${branchName}:${branchName}`], { cwd: skiaDir });
    } catch (e) {
      // Branch might already exist locally, try to update it
      await runCommand("git", ["fetch", "origin", branchName], { cwd: skiaDir });
    }

    // Checkout the branch (use -f to discard local changes in the submodule)
    console.log(`   Checking out ${branchName}...`);
    await runCommand("git", ["checkout", "-f", branchName], { cwd: skiaDir });

    console.log(`   ✓ Successfully checked out ${branchName}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to checkout branch ${branchName}: ${error.message}`);
    console.error("   Headers may not match the prebuilt binaries!");
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const downloadToFile = (url, destPath, maxRetries = 5) => {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const attemptDownload = (retryCount = 0) => {
    return new Promise((resolve, reject) => {
      const request = (currentUrl) => {
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
              const error = new Error(
                `Failed to download: ${res.statusCode} ${res.statusMessage}`
              );
              error.statusCode = res.statusCode;
              reject(error);
              res.resume();
              return;
            }

            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);

            fileStream.on("finish", () => {
              fileStream.close((err) => {
                if (err) {
                  // If closing the stream errors, perform the same cleanup and reject.
                  fileStream.destroy();
                  fs.unlink(destPath, () => reject(err));
                } else {
                  resolve();
                }
              });
            });

            const cleanup = (error) => {
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

  const downloadWithRetry = async (retryCount = 0) => {
    try {
      await attemptDownload(retryCount);
    } catch (error) {
      const isRateLimit = error.statusCode === 403 || error.message.includes('rate limit');
      const shouldRetry = retryCount < maxRetries && (isRateLimit || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT');

      if (shouldRetry) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
        console.log(`   ⚠️  Download failed (${error.message}), retrying in ${delay/1000}s... (attempt ${retryCount + 1}/${maxRetries})`);
        await sleep(delay);
        return downloadWithRetry(retryCount + 1);
      } else {
        throw error;
      }
    }
  };

  return downloadWithRetry();
};

const extractTarGz = async (archivePath, destDir) => {
  fs.mkdirSync(destDir, { recursive: true });

  const args = [
    "-xzf",
    archivePath,
    "-C",
    destDir,
  ];
  const candidates =
    process.platform === "win32"
      ? [
          "tar.exe",
          path.join(
            process.env.SystemRoot ?? "C:\\Windows",
            "System32",
            "tar.exe"
          ),
          "bsdtar.exe",
          "bsdtar",
        ]
      : ["tar"];

  let lastError;
  for (const candidate of candidates) {
    try {
      await runCommand(candidate, args);
      return;
    } catch (err) {
      if (err.code === "ENOENT") {
        lastError = new Error(`Command ${candidate} not found`);
        continue;
      }
      lastError = err;
    }
  }

  throw new Error(
    `Failed to extract ${path.basename(
      archivePath
    )}. Please install a compatible tar binary. Last error: ${
      lastError?.message ?? "unknown error"
    }`
  );
};

// Helper function to download and extract a tar.gz file
const downloadAndExtract = async (url, destDir, tempDir) => {
  const archivePath = path.join(tempDir, path.basename(url));
  await downloadToFile(url, archivePath);
  try {
    await extractTarGz(archivePath, destDir);
  } finally {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }
  }
};

const artifactsDir = path.resolve(
  __dirname,
  "../../../packages/skia/artifacts"
);

const libsDir = path.resolve(__dirname, "../libs");

// Function to calculate the checksum of a directory
const calculateDirectoryChecksum = (directory) => {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const hash = crypto.createHash("sha256");
  const files = [];

  const collectFiles = (dir) => {
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

// Function to calculate all library checksums
const calculateLibraryChecksums = () => {
  const checksums = {};

  // Android architectures
  const androidArchs = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];
  for (const arch of androidArchs) {
    const archDir = path.join(libsDir, "android", arch);
    const checksum = calculateDirectoryChecksum(archDir);
    if (checksum) {
      const checksumKey = `android-${arch}`;
      checksums[checksumKey] = checksum;
    }
  }

  // Apple frameworks
  const appleDir = path.join(libsDir, "apple");
  const appleChecksum = calculateDirectoryChecksum(appleDir);
  if (appleChecksum) {
    checksums["apple-xcframeworks"] = appleChecksum;
  }

  return checksums;
};

// Function to verify if checksums match
const verifyChecksums = () => {
  const skiaConfig = getSkiaConfig(GRAPHITE);
  const expectedChecksums = skiaConfig?.checksums || {};

  // If no checksums in package.json, we need to download
  if (Object.keys(expectedChecksums).length === 0) {
    console.log("⚠️  No checksums found in package.json");
    return false;
  }

  const actualChecksums = calculateLibraryChecksums();

  // Check if all expected checksums match
  for (const [key, expectedChecksum] of Object.entries(expectedChecksums)) {
    const actualChecksum = actualChecksums[key];
    if (actualChecksum !== expectedChecksum) {
      console.log(`⚠️  Checksum mismatch for ${key}`);
      console.log(`   Expected: ${expectedChecksum}`);
      console.log(`   Actual: ${actualChecksum || "missing"}`);
      return false;
    }
  }

  console.log("✅ All checksums match");
  return true;
};

// Function to check if prebuilt binaries are already installed
const areBinariesInstalled = () => {
  if (!fs.existsSync(libsDir)) {
    return false;
  }

  // Check for Android libraries
  const androidDir = path.join(libsDir, "android");
  const androidArchs = ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"];
  for (const arch of androidArchs) {
    const archDir = path.join(androidDir, arch);
    if (!fs.existsSync(archDir) || fs.readdirSync(archDir).length === 0) {
      return false;
    }
  }

  // Check for Apple frameworks
  const appleDir = path.join(libsDir, "apple");
  if (!fs.existsSync(appleDir) || fs.readdirSync(appleDir).length === 0) {
    return false;
  }

  return true;
};

// Function to clear directory contents
const clearDirectory = (directory) => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        clearDirectory(curPath);
        fs.rmdirSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    //console.log(`❌ ${directory}`);
  } else {
    console.log(`Directory ${directory} does not exist, creating it...`);
    fs.mkdirSync(directory, { recursive: true });
  }
};

const main = async () => {
  // Ensure the skia submodule is on the correct branch for copying headers
  await checkoutSkiaBranch(skiaVersion);

  // Check if binaries are installed and checksums match
  if (areBinariesInstalled() && verifyChecksums()) {
    console.log("✅ Prebuilt binaries already installed with matching checksums, skipping download");
    return;
  }

  if (areBinariesInstalled()) {
    console.log("⚠️  Binaries installed but checksums don't match, re-downloading...");
  }

  console.log("🧹 Clearing existing artifacts...");
  clearDirectory(artifactsDir);

  console.log(`⬇️  Downloading release assets to ${artifactsDir}`);
  const tempDownloadDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "skia-download-")
  );

  for (const artifactName of names) {
    const assetName = `${artifactName}-${releaseTag}.tar.gz`;
    const extractDir = path.join(artifactsDir, artifactName);
    const downloadUrl = `https://github.com/${repo}/releases/download/${releaseTag}/${assetName}`;

    console.log(`   Downloading ${assetName}...`);
    try {
      await downloadAndExtract(downloadUrl, extractDir, tempDownloadDir);
      console.log(`   ✓ ${assetName} extracted`);
    } catch (error) {
      console.error(`   ✗ Failed to download ${assetName}:`, error);
      fs.rmSync(tempDownloadDir, { recursive: true, force: true });
      throw error;
    }
  }
  fs.rmSync(tempDownloadDir, { recursive: true, force: true });

  // Copy artifacts to libs folder in the required structure
  console.log("📦 Copying artifacts to libs folder...");
  clearDirectory(libsDir);

  // Create android directory structure
  const androidDir = path.join(libsDir, "android");
  fs.mkdirSync(androidDir, { recursive: true });

  // Copy android artifacts
  const androidArchs = GRAPHITE ? [
    { artifact: `${prefix}-android-arm`, srcSubdir: "arm", dest: "armeabi-v7a" },
    { artifact: `${prefix}-android-arm-64`, srcSubdir: "arm64", dest: "arm64-v8a" },
    { artifact: `${prefix}-android-arm-x86`, srcSubdir: "x86", dest: "x86" },
    { artifact: `${prefix}-android-arm-x64`, srcSubdir: "x64", dest: "x86_64" },
  ] : [
    { artifact: `${prefix}-android-arm`, srcSubdir: "armeabi-v7a", dest: "armeabi-v7a" },
    { artifact: `${prefix}-android-arm-64`, srcSubdir: "arm64-v8a", dest: "arm64-v8a" },
    { artifact: `${prefix}-android-arm-x86`, srcSubdir: "x86", dest: "x86" },
    { artifact: `${prefix}-android-arm-x64`, srcSubdir: "x86_64", dest: "x86_64" },
  ];

  androidArchs.forEach(({ artifact, srcSubdir, dest }) => {
    // The tar file extracts to artifactName/srcSubdir
    const srcDir = path.join(artifactsDir, artifact, srcSubdir);
    const destDir = path.join(androidDir, dest);
    console.log(`   Checking ${srcDir} -> ${destDir}`);
    if (fs.existsSync(srcDir)) {
      console.log(`   ✓ Copying ${artifact}/${srcSubdir}`);
      fs.mkdirSync(destDir, { recursive: true });

      const copyDir = (srcPath, destPath) => {
        fs.mkdirSync(destPath, { recursive: true });
        fs.readdirSync(srcPath).forEach((file) => {
          const srcFile = path.join(srcPath, file);
          const destFile = path.join(destPath, file);
          const stat = fs.lstatSync(srcFile);

          // Skip sockets and other special files
          if (stat.isSocket() || stat.isFIFO() || stat.isCharacterDevice() || stat.isBlockDevice()) {
            return;
          }

          if (stat.isDirectory()) {
            copyDir(srcFile, destFile);
          } else {
            fs.copyFileSync(srcFile, destFile);
          }
        });
      };

      copyDir(srcDir, destDir);
    } else {
      console.log(`   ✗ Source directory not found: ${srcDir}`);
    }
  });

  // Create apple directory structure
  const appleDir = path.join(libsDir, "apple");
  // The tar file extracts to skia-apple-xcframeworks/apple
  const appleSrcDir = path.join(
    artifactsDir,
    `${prefix}-apple-xcframeworks`,
    "apple"
  );
  if (fs.existsSync(appleSrcDir)) {
    fs.mkdirSync(appleDir, { recursive: true });

    // Copy all xcframeworks
    fs.readdirSync(appleSrcDir).forEach((item) => {
      const srcPath = path.join(appleSrcDir, item);
      const destPath = path.join(appleDir, item);

      if (fs.lstatSync(srcPath).isDirectory()) {
        // Copy directory recursively
        const copyDir = (src, dest) => {
          fs.mkdirSync(dest, { recursive: true });
          fs.readdirSync(src).forEach((file) => {
            const srcFile = path.join(src, file);
            const destFile = path.join(dest, file);
            if (fs.lstatSync(srcFile).isDirectory()) {
              copyDir(srcFile, destFile);
            } else {
              fs.copyFileSync(srcFile, destFile);
            }
          });
        };
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  // Create or remove Graphite marker files based on build type
  const androidMarkerFile = path.join(androidDir, "graphite.enabled");
  const appleMarkerFile = path.join(appleDir, "graphite.enabled");

  if (GRAPHITE) {
    // Create marker files for Graphite builds
    fs.writeFileSync(androidMarkerFile, "");
    fs.writeFileSync(appleMarkerFile, "");
    console.log("✓ Created Graphite marker files");
  } else {
    // Ensure marker files don't exist for non-Graphite builds
    if (fs.existsSync(androidMarkerFile)) {
      fs.unlinkSync(androidMarkerFile);
    }
    if (fs.existsSync(appleMarkerFile)) {
      fs.unlinkSync(appleMarkerFile);
    }
  }

  // Copy Graphite headers if using Graphite
  if (GRAPHITE) {
    console.log("📦 Copying Graphite headers...");
    const cppDir = path.resolve(__dirname, "../cpp");
    const headersSrcDir = path.join(artifactsDir, `${prefix}-headers`);

    console.log(`   Looking for headers in: ${headersSrcDir}`);
    console.log(`   Headers dir exists: ${fs.existsSync(headersSrcDir)}`);

    if (fs.existsSync(headersSrcDir)) {
      console.log(`   Contents: ${fs.readdirSync(headersSrcDir).join(", ")}`);

      // The asset contains packages/skia/cpp structure, so we need to navigate into it
      const packagesDir = path.join(headersSrcDir, "packages", "skia", "cpp");
      console.log(`   Looking for packages dir: ${packagesDir}`);
      console.log(`   Packages dir exists: ${fs.existsSync(packagesDir)}`);

      if (fs.existsSync(packagesDir)) {
        console.log(`   Packages contents: ${fs.readdirSync(packagesDir).join(", ")}`);

        // Copy dawn/include
        const dawnIncludeSrc = path.join(packagesDir, "dawn", "include");
        const dawnIncludeDest = path.join(cppDir, "dawn", "include");
        console.log(`   Dawn source: ${dawnIncludeSrc}`);
        console.log(`   Dawn source exists: ${fs.existsSync(dawnIncludeSrc)}`);

        if (fs.existsSync(dawnIncludeSrc)) {
          const copyDir = (src, dest) => {
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((file) => {
              const srcFile = path.join(src, file);
              const destFile = path.join(dest, file);
              if (fs.lstatSync(srcFile).isDirectory()) {
                copyDir(srcFile, destFile);
              } else {
                fs.copyFileSync(srcFile, destFile);
              }
            });
          };
          copyDir(dawnIncludeSrc, dawnIncludeDest);
          console.log("   ✓ Dawn headers copied");
        } else {
          console.log("   ✗ Dawn headers not found");
        }

        // Copy graphite headers
        const graphiteSrc = path.join(packagesDir, "skia", "src", "gpu", "graphite");
        const graphiteDest = path.join(cppDir, "skia", "src", "gpu", "graphite");
        console.log(`   Graphite source: ${graphiteSrc}`);
        console.log(`   Graphite source exists: ${fs.existsSync(graphiteSrc)}`);

        if (fs.existsSync(graphiteSrc)) {
          const copyDir = (src, dest) => {
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((file) => {
              const srcFile = path.join(src, file);
              const destFile = path.join(dest, file);
              if (fs.lstatSync(srcFile).isDirectory()) {
                copyDir(srcFile, destFile);
              } else {
                fs.copyFileSync(srcFile, destFile);
              }
            });
          };
          copyDir(graphiteSrc, graphiteDest);
          console.log("   ✓ Graphite headers copied");
        } else {
          console.log("   ✗ Graphite headers not found");
        }
      } else {
        console.log("   ✗ Packages directory not found in headers asset");
      }
    } else {
      console.log("   ✗ Headers directory not found");
    }
  }

  console.log("✅ Completed installation of Skia prebuilt binaries.");

  // Calculate and update checksums in package.json
  console.log("🔐 Calculating and updating checksums...");
  const newChecksums = calculateLibraryChecksums();
  updateSkiaChecksums(newChecksums, GRAPHITE);
  console.log("✅ Checksums updated in package.json");

  // Clean up artifacts directory
  console.log("🗑️  Cleaning up artifacts directory...");
  clearDirectory(artifactsDir);
  fs.rmdirSync(artifactsDir);
};

// Run the main function
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});