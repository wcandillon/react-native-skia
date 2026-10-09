import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

import { OutFolder, PackageRoot, SkiaSrc } from "./skia-configuration";
import { fileOps } from "./utils";

// Dawn is built from the checkout Skia pins in its DEPS, so the prebuilt Dawn
// is exactly the Dawn the Skia binaries were compiled against.
export const DawnSrc = path.join(SkiaSrc, "third_party", "externals", "dawn");
export const DawnOut = path.join(OutFolder, "dawn");
// Build outputs. The build workflow uploads each target directory as an
// artifact and package-binaries.ts stages them back into this same layout.
export const DawnLibs = path.join(PackageRoot, "libs", "dawn");
export const DawnLib = "libwebgpu_dawn";
export const DawnPatches = path.join(__dirname, "dawn-patches");
// Fixes missing from the pinned Dawn, including Tint and Catalyst Metal feature checks.
export const DawnAppleXcframework = path.join(
  DawnLibs,
  "apple",
  `${DawnLib}.xcframework`
);

// Deployment targets of the podspec (s.platforms) and ndk_api of
// skia-configuration.ts.
const iosMinTarget = "15.1";
const tvosMinTarget = "15.1";
const macosMinTarget = "11.0";
const androidPlatform = "android-26";

export type DawnOS = "android" | "apple";

export interface DawnTarget {
  os: DawnOS;
  // Directory under libs/dawn/<os>/ that receives the library.
  output: string;
  args: Record<string, string>;
}

// Monolithic Dawn, as react-native-webgpu has always linked it: one shared
// library on Android (both react-native-skia and react-native-webgpu load the
// same copy) and one static library per Apple slice. Vulkan only on Android
// and Metal only on Apple. OpenGL ES is deliberately left out.
const commonArgs: Record<string, string> = {
  CMAKE_BUILD_TYPE: "Release",
  BUILD_SHARED_LIBS: "OFF",
  DAWN_BUILD_SAMPLES: "OFF",
  DAWN_BUILD_TESTS: "OFF",
  DAWN_BUILD_BENCHMARKS: "OFF",
  DAWN_BUILD_PROTOBUF: "OFF",
  DAWN_USE_GLFW: "OFF",
  DAWN_ENABLE_DESKTOP_GL: "OFF",
  DAWN_ENABLE_OPENGLES: "OFF",
  DAWN_ENABLE_SWIFTSHADER: "OFF",
  DAWN_ENABLE_INSTALL: "OFF",
  TINT_BUILD_TESTS: "OFF",
  TINT_BUILD_CMD_TOOLS: "OFF",
  TINT_BUILD_IR_BINARY: "OFF",
  TINT_BUILD_BENCHMARKS: "OFF",
};

const android = (abi: string): DawnTarget => ({
  os: "android",
  output: abi,
  args: {
    ...commonArgs,
    CMAKE_TOOLCHAIN_FILE: `${process.env.ANDROID_NDK}/build/cmake/android.toolchain.cmake`,
    ANDROID_ABI: abi,
    ANDROID_PLATFORM: androidPlatform,
    // Exceptions from the libraries that link Dawn reach JS through Hermes,
    // which only matches them against the app's libc++_shared.so.
    ANDROID_STL: "c++_shared",
    ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES: "ON",
    DAWN_BUILD_MONOLITHIC_LIBRARY: "SHARED",
    DAWN_ENABLE_VULKAN: "ON",
    DAWN_ENABLE_METAL: "OFF",
    CMAKE_EXE_LINKER_FLAGS: "-llog",
    CMAKE_SHARED_LINKER_FLAGS: "-llog -Wl,-z,max-page-size=16384",
  },
});

const apple = (
  platform: "iOS" | "tvOS" | "Darwin" | "Catalyst",
  architectures: string,
  sysroot: string,
  minTarget: string,
  output: string
): DawnTarget => {
  const isCatalyst = platform === "Catalyst";
  const args: Record<string, string> = {
    ...commonArgs,
    CMAKE_SYSTEM_NAME: isCatalyst ? "Darwin" : platform,
    CMAKE_OSX_ARCHITECTURES: architectures,
    CMAKE_OSX_SYSROOT: sysroot,
    // Catalyst's iOS deployment target is encoded in the macabi triple.
    CMAKE_OSX_DEPLOYMENT_TARGET: isCatalyst ? "" : minTarget,
    DAWN_BUILD_MONOLITHIC_LIBRARY: "STATIC",
    DAWN_ENABLE_METAL: "ON",
    DAWN_ENABLE_VULKAN: "OFF",
    // The static library is linked into the app or a pod; nothing needs its
    // symbols exported.
    CMAKE_C_VISIBILITY_PRESET: "hidden",
    CMAKE_CXX_VISIBILITY_PRESET: "hidden",
    CMAKE_VISIBILITY_INLINES_HIDDEN: "ON",
  };
  if (isCatalyst) {
    args.DAWN_TARGET_MACOS = "OFF";
    for (const lang of ["C", "CXX", "ASM"]) {
      // CMake resolves the SDK; Clang resolves these paths against its sysroot.
      args[`CMAKE_${lang}_COMPILER_TARGET`] = `apple-ios${minTarget}-macabi`;
      args[`CMAKE_${lang}_FLAGS`] =
        "-iwithsysroot /System/iOSSupport/usr/include " +
        "-iframeworkwithsysroot /System/iOSSupport/System/Library/Frameworks";
    }
  }
  return { os: "apple", output, args };
};

export const dawnTargets: Record<string, DawnTarget> = {
  "android-armeabi-v7a": android("armeabi-v7a"),
  "android-arm64-v8a": android("arm64-v8a"),
  "android-x86": android("x86"),
  "android-x86_64": android("x86_64"),
  "ios-arm64": apple("iOS", "arm64", "iphoneos", iosMinTarget, "ios-arm64"),
  "ios-simulator-arm64": apple(
    "iOS",
    "arm64",
    "iphonesimulator",
    iosMinTarget,
    "ios-simulator-arm64"
  ),
  "ios-simulator-x86_64": apple(
    "iOS",
    "x86_64",
    "iphonesimulator",
    iosMinTarget,
    "ios-simulator-x86_64"
  ),
  "tvos-arm64": apple(
    "tvOS",
    "arm64",
    "appletvos",
    tvosMinTarget,
    "tvos-arm64"
  ),
  "tvos-simulator-arm64": apple(
    "tvOS",
    "arm64",
    "appletvsimulator",
    tvosMinTarget,
    "tvos-simulator-arm64"
  ),
  "tvos-simulator-x86_64": apple(
    "tvOS",
    "x86_64",
    "appletvsimulator",
    tvosMinTarget,
    "tvos-simulator-x86_64"
  ),
  "maccatalyst-universal": apple(
    "Catalyst",
    "arm64;x86_64",
    "macosx",
    iosMinTarget,
    "maccatalyst-universal"
  ),
  "macos-universal": apple(
    "Darwin",
    "arm64;x86_64",
    "macosx",
    macosMinTarget,
    "macos-universal"
  ),
};

export const dawnTargetNames = Object.keys(dawnTargets);

export const dawnLibraryName = (os: DawnOS) =>
  `${DawnLib}.${os === "android" ? "so" : "a"}`;

export const dawnTargetOutputDir = (name: string) => {
  const target = dawnTargets[name];
  return path.join(DawnLibs, target.os, target.output);
};

/** Runs a command, streaming its output, and rejects on a non-zero exit. */
export const run = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<void> =>
  new Promise((resolve, reject) => {
    console.log(`$ ${[command, ...args].join(" ")}`);
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });

/**
 * Checks out Dawn and its dependencies at the commits Skia's DEPS pins
 * (see sync-dawn-deps.py).
 */
export const syncDawnDeps = () =>
  run("python3", [path.join(__dirname, "sync-dawn-deps.py"), SkiaSrc]);

/**
 * Applies the patches in scripts/dawn-patches to the Dawn checkout. Each one
 * fixes code the pinned Dawn does not handle yet. A patch the
 * checkout already contains is skipped; one that no longer applies fails the
 * build so it gets dropped or refreshed with the Dawn bump that broke it.
 */
export const applyDawnPatches = () => {
  const gitApply = (args: string[]) => {
    try {
      execSync(`git ${["apply", ...args].join(" ")}`, {
        cwd: DawnSrc,
        stdio: "pipe",
      });
      return true;
    } catch {
      return false;
    }
  };
  const patches = fs
    .readdirSync(DawnPatches)
    .filter((f) => f.endsWith(".patch"))
    .sort();
  for (const name of patches) {
    const patch = path.join(DawnPatches, name);
    if (gitApply(["--check", patch])) {
      gitApply([patch]);
      console.log(`🩹 Applied ${name}`);
    } else if (gitApply(["--reverse", "--check", patch])) {
      console.log(
        `✅ ${name} is already in the Dawn checkout (applied earlier, or the pinned Dawn carries it and the patch can be dropped)`
      );
    } else {
      throw new Error(
        `${name} does not apply to ${DawnSrc}: the patched code changed upstream. Check whether the pinned Dawn already carries an equivalent change and drop or refresh the patch.`
      );
    }
  }
};

/**
 * The -D arguments Skia's own Dawn build passes to CMake: the location of
 * every third-party project Dawn needs, all synced by DEPS, plus the
 * optional components Skia leaves out.
 */
const skiaThirdPartyLocations = (): string[] =>
  execSync(
    `python3 -c "import sys; sys.path.insert(0, 'third_party/dawn'); from cmake_utils import get_third_party_locations; print('\\n'.join(get_third_party_locations()))"`,
    { cwd: SkiaSrc, encoding: "utf8" }
  )
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-D"));

const ndkBin = () => {
  const ndk = process.env.ANDROID_NDK;
  if (!ndk) {
    throw new Error("ANDROID_NDK is not set");
  }
  const prebuilt = path.join(ndk, "toolchains", "llvm", "prebuilt");
  const [host] = fs.readdirSync(prebuilt);
  return path.join(prebuilt, host, "bin");
};

// Exceptions from the libraries that link Dawn reach JS through Hermes, which
// only matches them against the app's libc++_shared.so.
const assertSharedCxxRuntime = (libPath: string) => {
  const runtimeSymbols = execSync(
    `${ndkBin()}/llvm-nm -D --defined-only ${libPath}`,
    { maxBuffer: Infinity }
  )
    .toString()
    .split("\n")
    .filter((line) => / (__cxa_throw|__gxx_personality_v0)$/.test(line));
  if (runtimeSymbols.length > 0) {
    throw new Error(
      `${libPath} defines its own C++ runtime; build it with ANDROID_STL=c++_shared`
    );
  }
};

export const buildDawnTarget = async (name: string) => {
  const target = dawnTargets[name];
  if (!target) {
    throw new Error(`Unknown Dawn target ${name}`);
  }
  if (target.os === "android" && !process.env.ANDROID_NDK) {
    throw new Error(`ANDROID_NDK must be set to build ${name}`);
  }
  const buildDir = path.join(DawnOut, name);
  fs.mkdirSync(buildDir, { recursive: true });

  const defines = [
    ...Object.entries(target.args).map(([key, value]) => `-D${key}=${value}`),
    ...skiaThirdPartyLocations(),
  ];
  console.log(`🔨 Configuring Dawn for ${name}`);
  await run("cmake", [
    "-S",
    DawnSrc,
    "-B",
    buildDir,
    "-G",
    "Ninja",
    ...defines,
  ]);
  console.log(`🔨 Building Dawn for ${name}`);
  await run("ninja", ["-C", buildDir, "webgpu_dawn"]);

  const libName = dawnLibraryName(target.os);
  const built = path.join(buildDir, "src", "dawn", "native", libName);
  if (!fs.existsSync(built)) {
    throw new Error(`${built} was not produced`);
  }
  const outDir = dawnTargetOutputDir(name);
  fs.mkdirSync(outDir, { recursive: true });
  const lib = path.join(outDir, libName);
  fs.copyFileSync(built, lib);
  if (target.os === "android") {
    console.log(`🤖 Stripping ${lib}`);
    execSync(`${ndkBin()}/llvm-strip ${lib}`);
    assertSharedCxxRuntime(lib);
  }
  console.log(`✅ ${lib}`);
  return buildDir;
};

const pruneNonHeaders = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pruneNonHeaders(entryPath);
      if (fs.readdirSync(entryPath).length === 0) {
        fs.rmdirSync(entryPath);
      }
    } else if (!entry.name.endsWith(".h")) {
      fs.rmSync(entryPath);
    }
  }
};

/**
 * Collects the Dawn headers into libs/dawn/include: the dawn/ and webgpu/
 * trees of the checkout plus the ones a build generates from dawn.json
 * (webgpu.h, webgpu_cpp.h, dawn_proc_table.h, ...). Taken from the source
 * trees rather than from `cmake --install`, which only installs the backend
 * headers of the platform that was built: every consumer needs both
 * MetalBackend.h and VulkanBackend.h. The generated headers do not depend on
 * the platform, so any target's build directory will do.
 */
export const collectDawnHeaders = (buildDir: string) => {
  const include = path.join(DawnLibs, "include");
  fileOps.rm(include);
  fileOps.mkdir(include);
  for (const tree of ["dawn", "webgpu"]) {
    fileOps.cp(path.join(DawnSrc, "include", tree), path.join(include, tree));
    fileOps.cp(
      path.join(buildDir, "gen", "include", tree),
      path.join(include, tree)
    );
  }
  // The wire protocol is not built into the monolithic library.
  fileOps.rm(path.join(include, "dawn", "wire"));
  pruneNonHeaders(include);

  fs.copyFileSync(
    path.join(DawnSrc, "LICENSE"),
    path.join(DawnLibs, "LICENSE")
  );
  const git = (args: string) =>
    execSync(`git ${args}`, { cwd: DawnSrc, encoding: "utf8" }).trim();
  fs.writeFileSync(
    path.join(DawnLibs, "metadata.json"),
    JSON.stringify(
      {
        commit: git("rev-parse HEAD"),
        repository: git("remote get-url origin"),
        patches: fs
          .readdirSync(DawnPatches)
          .filter((f) => f.endsWith(".patch"))
          .sort(),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`✅ ${include}`);
};

/**
 * Assembles libs/dawn/apple/libwebgpu_dawn.xcframework from the Apple slices
 * in libs/dawn/apple and the headers in libs/dawn/include, which every slice
 * embeds so SwiftPM consumers see them without any search path.
 */
export const createDawnXcframework = () => {
  const appleDir = path.join(DawnLibs, "apple");
  const include = path.join(DawnLibs, "include");
  const slice = (name: string) => {
    const lib = path.join(appleDir, name, dawnLibraryName("apple"));
    if (!fs.existsSync(lib)) {
      throw new Error(
        `Missing Dawn slice ${lib}: build the ${name} target first`
      );
    }
    return lib;
  };
  if (!fs.existsSync(path.join(include, "webgpu", "webgpu.h"))) {
    throw new Error(`Missing Dawn headers in ${include}`);
  }

  const simulator = path.join(appleDir, "ios-simulator");
  fs.mkdirSync(simulator, { recursive: true });
  const simulatorLib = path.join(simulator, dawnLibraryName("apple"));
  console.log("📱 Creating the fat iOS simulator library");
  execSync(
    `lipo -create ${slice("ios-simulator-arm64")} ${slice("ios-simulator-x86_64")} -output ${simulatorLib}`
  );

  const tvSimulator = path.join(appleDir, "tvos-simulator");
  fs.mkdirSync(tvSimulator, { recursive: true });
  const tvSimulatorLib = path.join(tvSimulator, dawnLibraryName("apple"));
  console.log("📺 Creating the fat tvOS simulator library");
  execSync(
    `lipo -create ${slice("tvos-simulator-arm64")} ${slice(
      "tvos-simulator-x86_64"
    )} -output ${tvSimulatorLib}`
  );

  fileOps.rm(DawnAppleXcframework);
  console.log(`🍏 Creating ${DawnAppleXcframework}`);
  execSync(
    [
      "xcodebuild -create-xcframework",
      `-library ${slice("ios-arm64")} -headers ${include}`,
      `-library ${simulatorLib} -headers ${include}`,
      `-library ${slice("tvos-arm64")} -headers ${include}`,
      `-library ${tvSimulatorLib} -headers ${include}`,
      `-library ${slice("maccatalyst-universal")} -headers ${include}`,
      `-library ${slice("macos-universal")} -headers ${include}`,
      `-output ${DawnAppleXcframework}`,
    ].join(" ")
  );
  fileOps.rm(simulator);
  fileOps.rm(tvSimulator);
  console.log(`✅ ${DawnAppleXcframework}`);
};
