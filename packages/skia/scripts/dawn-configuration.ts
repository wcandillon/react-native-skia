import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

import type { AppleArchitecture, AppleSDK } from "./apple-configuration";
import { appleConfigurations, appleSDKs } from "./apple-configuration";
import {
  androidPlatform,
  OutFolder,
  PackageRoot,
  SkiaSrc,
} from "./skia-configuration";
import { applyPatches, listPatches } from "./patches";
import { validateAppleArchive } from "./apple-binaries-validation";
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
// XCFramework destination used by npm packaging and native consumers.
export const DawnAppleXcframework = path.join(
  DawnLibs,
  "apple",
  `${DawnLib}.xcframework`
);

/** Library families select Android .so or Apple .a outputs, not individual SDKs. */
export type DawnOS = "android" | "apple";

/** Apple target identity is explicit, independent of its CLI selector spelling. */
export type DawnTarget = {
  // Directory under libs/dawn/<os>/ that receives the library.
  output: string;
  args: Record<string, string>;
} & (
  | { os: "android" }
  | { os: "apple"; sdk: AppleSDK; architecture: AppleArchitecture }
);

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
    ANDROID_PLATFORM: `android-${androidPlatform}`,
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

/** Configure one SDK/architecture; universal libraries are combined after building. */
const apple = (sdk: AppleSDK, architecture: AppleArchitecture): DawnTarget => {
  const configuration = appleConfigurations[sdk];
  const isCatalyst = configuration.variant === "maccatalyst";
  const args: Record<string, string> = {
    ...commonArgs,
    CMAKE_SYSTEM_NAME: configuration.systemName,
    CMAKE_OSX_ARCHITECTURES: architecture,
    CMAKE_OSX_SYSROOT: configuration.sysroot,
    // Catalyst's iOS deployment target is encoded in the macabi triple.
    CMAKE_OSX_DEPLOYMENT_TARGET: isCatalyst ? "" : configuration.minimumTarget,
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
      args[`CMAKE_${lang}_COMPILER_TARGET`] =
        `${architecture}-apple-ios${configuration.minimumTarget}-macabi`;
      args[`CMAKE_${lang}_FLAGS`] =
        "-iwithsysroot /System/iOSSupport/usr/include " +
        "-iframeworkwithsysroot /System/iOSSupport/System/Library/Frameworks";
    }
  }
  return {
    os: "apple",
    sdk,
    architecture,
    output: `${sdk}-${architecture}`,
    args,
  };
};

export const dawnTargets: Record<string, DawnTarget> = {
  "android-armeabi-v7a": android("armeabi-v7a"),
  "android-arm64-v8a": android("arm64-v8a"),
  "android-x86": android("x86"),
  "android-x86_64": android("x86_64"),
  ...Object.fromEntries(
    appleSDKs.flatMap((sdk) =>
      appleConfigurations[sdk].architectures.map((architecture) => [
        `${sdk}-${architecture}`,
        apple(sdk, architecture),
      ])
    )
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
  options: { cwd?: string; env?: NodeJS.ProcessEnv; label?: string } = {}
): Promise<void> =>
  new Promise((resolve, reject) => {
    console.log(`$ ${[command, ...args].join(" ")}`);
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.label ? ["inherit", "pipe", "pipe"] : "inherit",
    });
    if (options.label) {
      // Label compiler output as well as headings when several SDKs are built.
      child.stdout?.on("data", (data) =>
        process.stdout.write(`${options.label} ${data}`)
      );
      child.stderr?.on("data", (data) =>
        process.stderr.write(`${options.label} ${data}`)
      );
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${options.label ?? command} exited with code ${code}`)
        );
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
export const applyDawnPatches = () => applyPatches(DawnSrc, DawnPatches);

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
  // Match Skia's platform labels for both Apple SDKs and Android ABIs.
  const label = target.os === "android" ? `🤖 ${target.output}` : `🍏 ${name}`;
  console.log(`🔨 Configuring Dawn for ${name}`);
  await run(
    "cmake",
    ["-S", DawnSrc, "-B", buildDir, "-G", "Ninja", ...defines],
    { label }
  );
  console.log(`🔨 Building Dawn for ${name}`);
  await run("ninja", ["-C", buildDir, "webgpu_dawn"], { label });

  const libName = dawnLibraryName(target.os);
  const built = path.join(buildDir, "src", "dawn", "native", libName);
  if (!fs.existsSync(built)) {
    throw new Error(`${built} was not produced`);
  }
  if (target.os === "apple") {
    // Each target is one SDK/architecture; inspect it before copying or lipo.
    validateAppleArchive(built, target.sdk, [target.architecture]);
    console.log(`${label} ✅ Mach-O verified`);
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
        patches: listPatches(DawnPatches),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`✅ ${include}`);
};
