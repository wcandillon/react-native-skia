import fs from "fs";
import path from "path";

import type { AppleArchitecture, AppleSDK } from "./apple-configuration";
import { appleConfigurations, appleSDKs } from "./apple-configuration";
import { applyPatches } from "./patches";
import { prepareDawnHeaders } from "./prepare-dawn-headers";
import { $, fileOps } from "./utils";

const DEBUG = false;
const BUILD_WITH_PARAGRAPH = true;

export const SkiaSrc = path.join(__dirname, "../../../externals/skia");
export const ProjectRoot = path.join(__dirname, "../../..");
export const PackageRoot = path.join(__dirname, "..");
export const OutFolder = path.join(SkiaSrc, DEBUG ? "debug" : "out");
export const SkiaPatches = path.join(__dirname, "skia-patches");

/** Applies the Skia patches, skipping those already in the pinned checkout. */
export const applySkiaPatches = () => applyPatches(SkiaSrc, SkiaPatches);

// The wasm build output, which is also the layout of the release asset:
// lib/ (archives), skia/ (headers), emdawnwebgpu/ and metadata.json.
export const WasmLibs = path.join(PackageRoot, "libs", "wasm");
// Stands in for Dawn on wasm: see skia-patches/wasm-emdawnwebgpu-dependency.patch.
export const EmdawnwebgpuDir = path.join(WasmLibs, "emdawnwebgpu");

const NdkDir = process.env.ANDROID_NDK ?? "";

/** Minimum Android API used by both Skia's GN and Dawn's CMake builds. */
export const androidPlatform = 26;

const NoParagraphArgs = [
  ["skia_use_harfbuzz", false],
  ["skia_use_icu", false],
];

// To build the paragraph API:
// On Android: we use system ICU
// On Apple: we use libgrapheme
const CommonParagraphArgs = [
  ["skia_enable_skparagraph", true],
  ["skia_use_system_icu", false],
  ["skia_use_harfbuzz", true],
  ["skia_use_system_harfbuzz", false],
];
const ParagraphArgsAndroid = BUILD_WITH_PARAGRAPH
  ? [
      ...CommonParagraphArgs,
      ["skia_use_icu", true],
      ["skia_use_runtime_icu", true],
    ]
  : NoParagraphArgs;

const ParagraphArgsApple = BUILD_WITH_PARAGRAPH
  ? [
      ...CommonParagraphArgs,
      ["skia_use_icu", false],
      ["skia_use_client_icu", false],
      ["skia_use_libgrapheme", true],
    ]
  : NoParagraphArgs;

const ParagraphApple = BUILD_WITH_PARAGRAPH
  ? ["libskparagraph.a", "libskunicode_core.a", "libskunicode_libgrapheme.a"]
  : [];

const ParagraphOutputsAndroid = BUILD_WITH_PARAGRAPH
  ? ["libskparagraph.a", "libskunicode_core.a", "libskunicode_icu.a"]
  : [];

// Dawn is not taken from the GN build: skia_use_dawn makes it build Dawn's
// non-monolithic libdawn_combined.a as a dependency of the Graphite sources,
// but what ships is the monolithic libwebgpu_dawn that build-dawn.ts builds
// from the same checkout.

export const commonArgs = [
  // No RAW codec: React Native apps do not decode camera RAW files through
  // Skia, CanvasKit never shipped it, and SkRawCodec was the one Skia source
  // built with exceptions.
  ["skia_use_dng_sdk", false],
  ["skia_use_piex", false],
  ["skia_use_system_expat", false],
  ["skia_use_system_libjpeg_turbo", false],
  ["skia_use_system_libpng", false],
  ["skia_use_system_libwebp", false],
  ["skia_use_system_zlib", false],
  ["skia_enable_tools", false],
  ["is_official_build", !DEBUG],
  ["skia_enable_skottie", true],
  ["is_debug", DEBUG],
  ["skia_enable_pdf", false],
  ["paragraph_tests_enabled", false],
  ["is_component_build", false],
  ["skia_enable_graphite", true],
  ["skia_use_dawn", true],
  // m152 turns PartitionAlloc on by default for clang builds, which leaves
  // raw_ptr/PartitionAddressSpace symbols undefined when linking against the
  // prebuilt libskia.a (the allocator lives in its own target we don't ship).
  // Skia's noop raw_ptr shims are used instead.
  ["skia_use_partition_alloc", false],
];

// Build groups identify Android, wasm or one Apple SDK, independently of library
// format. GN keeps its own CPU/platform spellings.
export type PlatformName = "android" | "wasm" | AppleSDK;

type Arg = (string | boolean | number)[];
export type Target = {
  args?: Arg[];
  cpu: string;
  platform?: string;
  options?: Arg[];
};

type AndroidTarget = Target & {
  output: string;
};

export type Platform<PlatformTarget extends Target = Target> = {
  targets: { [key: string]: PlatformTarget };
  args: Arg[];
  outputRoot: string;
  outputNames: string[];
  options?: Arg[];
};

// Common Apple build arguments shared across all Apple platforms
const appleCommonArgs: Arg[] = [
  // Cross builds also compile macOS host tools, such as libgrapheme generators.
  // Their current_os is "mac" even when the destination is iOS/tvOS/Catalyst.
  // Keep the host deployment target independent of that destination's minimum.
  ["macos_min_target", `"${appleConfigurations.macos.minimumTarget}"`],
  ["skia_use_metal", true],
  ["skia_use_gl", false],
  ["cc", '"clang"'],
  ["cxx", '"clang++"'],
  ...ParagraphArgsApple,
];

// Common Apple output names shared across all Apple platforms
export const appleOutputNames = [
  "libskia.a",
  "libskshaper.a",
  "libsvg.a",
  "libskottie.a",
  "libsksg.a",
  ...ParagraphApple,
];

/** Configure Skia's GN toolchain for one SDK and its supported architectures. */
const apple = (sdk: AppleSDK): Platform => {
  const configuration = appleConfigurations[sdk];
  const isCatalyst = configuration.variant === "maccatalyst";
  let platform = "ios";
  if (isCatalyst || configuration.platform === "macos") {
    platform = "mac";
  } else if (configuration.platform === "tvos") {
    platform = "tvos";
  }
  const targets = Object.fromEntries(
    configuration.architectures.map((architecture: AppleArchitecture) => {
      const args: Arg[] = [["extra_cflags_cc", `["-fexceptions", "-frtti"]`]];
      // ios_min_target carries this SDK's floor, including tvOS/Catalyst.
      // macos_min_target remains separate for macOS host generators in the same run.
      if (configuration.platform !== "macos") {
        args.unshift(["ios_min_target", `"${configuration.minimumTarget}"`]);
      }
      if (configuration.variant === "simulator") {
        args.push(["ios_use_simulator", true]);
      }
      // Catalyst needs an environment selector in addition to target_os.
      if (isCatalyst) {
        args.push(["target_environment", '"catalyst"']);
      }
      return [
        architecture,
        {
          cpu: architecture === "x86_64" ? "x64" : architecture,
          platform,
          args,
        },
      ];
    })
  );
  return {
    targets,
    args: appleCommonArgs,
    outputRoot: `libs/apple/${sdk}`,
    outputNames: appleOutputNames,
  };
};

// The module libraries a wasm consumer links, in addition to libskia.a. GN
// names them lib<name>.wasm.a; they are staged without the infix.
export const wasmOutputNames = [
  "libskia.a",
  "libskshaper.a",
  "libsvg.a",
  "libskottie.a",
  "libsksg.a",
  "libskresources.a",
  "libjsonreader.a",
  ...ParagraphApple,
];

export const configurations: {
  android: Platform<AndroidTarget>;
  wasm: Platform;
} & Record<AppleSDK, Platform> = {
  android: {
    targets: {
      arm: {
        platform: "android",
        cpu: "arm",
        output: "armeabi-v7a",
      },
      arm64: {
        platform: "android",
        cpu: "arm64",
        output: "arm64-v8a",
      },
      x86: {
        platform: "android",
        cpu: "x86",
        output: "x86",
      },
      x64: {
        platform: "android",
        cpu: "x64",
        output: "x86_64",
      },
    },
    args: [
      ["ndk_api", androidPlatform],
      ["ndk", `"${NdkDir}"`],
      ["skia_use_system_freetype2", false],
      ["skia_use_gl", false],
      ["cc", '"clang"'],
      ["cxx", '"clang++"'],
      [
        "extra_cflags",
        `["-DSKIA_C_DLL", "-DHAVE_SYSCALL_GETRANDOM", "-DXML_DEV_URANDOM"]`,
      ],
      // RTTI, as on the Apple targets. Without it, a source built with
      // exceptions gets its own copies of the C++ runtime's exception typeinfo
      // (SkRawCodec did, before the RAW codec was dropped); build-skia.ts
      // rejects an archive that defines one.
      ["extra_cflags_cc", `["-frtti"]`],
      ...ParagraphArgsAndroid,
    ],
    outputRoot: "libs/android",
    outputNames: [
      "libskia.a",
      "libskshaper.a",
      "libsvg.a",
      "libskottie.a",
      "libsksg.a",
      "libjsonreader.a",
      ...ParagraphOutputsAndroid,
    ],
  },
  // Graphite on the browser's WebGPU. Built with Emscripten from the emsdk
  // Skia pins; see wasm-configuration.ts for the toolchain and for what a
  // consumer of these archives has to match.
  wasm: {
    targets: {
      wasm32: {
        platform: "wasm",
        cpu: "wasm",
      },
    },
    args: [
      // Graphite only. The WebGL (Ganesh) backend would be a separate build.
      ["skia_enable_ganesh", false],
      ["skia_use_webgl", false],
      // The browser implements WebGPU: Dawn is neither built nor linked.
      ["skia_emdawnwebgpu_dir", `"${EmdawnwebgpuDir}"`],
      // A module with threads needs a shared memory, which browsers only give
      // to cross-origin isolated pages.
      ["skia_wasm_enable_pthreads", false],
      // No system fonts on the web: FreeType with fonts supplied as data.
      ["skia_use_freetype", true],
      ["skia_use_system_freetype2", false],
      ["skia_enable_fontmgr_custom_directory", false],
      // Same text stack as the Apple targets: no ICU data to ship.
      ...ParagraphArgsApple,
    ],
    outputRoot: "libs/wasm",
    outputNames: wasmOutputNames,
  },
  ...(Object.fromEntries(appleSDKs.map((sdk) => [sdk, apple(sdk)])) as Record<
    AppleSDK,
    Platform
  >),
};

/** Per-architecture build selectors for SDK groups and Android CPU targets. */
export const skiaTargets = Object.fromEntries(
  Object.entries(configurations).flatMap(([platform, configuration]) =>
    Object.keys(configuration.targets).map((architecture) => [
      `${platform}-${architecture}`,
      { platform: platform as PlatformName, architecture },
    ])
  )
) as Record<string, { platform: PlatformName; architecture: string }>;

/** GN intermediates are separate from the SDK libraries uploaded by CI. */
export const skiaBuildDir = (platform: PlatformName, architecture: string) =>
  platform === "android" || platform === "wasm"
    ? path.join(OutFolder, platform, architecture)
    : path.join(OutFolder, "apple", `${platform}-${architecture}`);

export const skiaTargetOutputDir = (name: string) => {
  const { platform, architecture } = skiaTargets[name];
  if (platform === "wasm") {
    return path.join(WasmLibs, "lib");
  }
  return platform === "android"
    ? path.join(
        PackageRoot,
        "libs",
        "android",
        configurations.android.targets[architecture].output
      )
    : path.join(PackageRoot, "libs", "apple", name);
};

const copyModule = (module: string) => {
  const destDir = `./cpp/skia/modules/${module}/include`;
  const srcDir = `../../externals/skia/modules/${module}/include`;
  fileOps.mkdir(destDir);
  fileOps.cp(srcDir, destDir);
};

/** Prepare Dawn inputs before removing or copying any existing headers. */
export const copyHeaders = async () => {
  const dawnInclude = await prepareDawnHeaders();
  console.log("⚙️ Copying Skia headers...");
  process.chdir(PackageRoot);

  // Sources first: a run that cannot copy leaves the current headers in place.
  if (!fs.existsSync("../../externals/skia/include")) {
    throw new Error(
      "No Skia headers found in externals/skia: check out the submodules with `git submodule update --init --recursive`"
    );
  }

  console.log("   Cleaning up existing directories...");
  fileOps.rm("./cpp/skia");
  fileOps.rm("./cpp/dawn");

  console.log("   Creating base directories...");
  fileOps.mkdir("./cpp/skia/include");
  fileOps.mkdir("./cpp/skia/modules");
  fileOps.mkdir("./cpp/skia/src");

  // Graphite source headers the wrapper needs beyond Skia's public include/.
  console.log("   Copying Graphite source headers...");
  fileOps.mkdir("./cpp/skia/src/gpu/graphite");
  for (const header of [
    "ContextOptionsPriv.h",
    "ResourceTypes.h",
    "TextureProxyView.h",
  ]) {
    fileOps.cp(
      `../../externals/skia/src/gpu/graphite/${header}`,
      `./cpp/skia/src/gpu/graphite/${header}`
    );
  }

  {
    fileOps.mkdir("./cpp/dawn/include");
    fileOps.cp(path.join(dawnInclude, "dawn"), "./cpp/dawn/include/dawn");
    fileOps.cp(path.join(dawnInclude, "webgpu"), "./cpp/dawn/include/webgpu");

    // Dawn ships the generated webgpu.h and webgpu_cpp.h under dawn/ and
    // forwarding shims under webgpu/. Xcode's header maps resolve by basename,
    // so keep one file per name: the generated headers move to webgpu/, which
    // is where the sources include them from.
    fileOps.rm("./cpp/dawn/include/dawn/wire");
    fileOps.sed(
      "./cpp/dawn/include/dawn/dawn_proc_table.h",
      /#include "dawn\/webgpu\.h"/g,
      '#include "webgpu/webgpu.h"'
    );
    for (const header of ["webgpu.h", "webgpu_cpp.h"]) {
      fileOps.rm(`./cpp/dawn/include/webgpu/${header}`);
      fileOps.cp(
        `./cpp/dawn/include/dawn/${header}`,
        `./cpp/dawn/include/webgpu/${header}`
      );
      fileOps.rm(`./cpp/dawn/include/dawn/${header}`);
    }
    fileOps.rm("./cpp/dawn/include/webgpu/webgpu_cpp_print.h");
    console.log("      ✓ Dawn headers copied");
  }

  console.log("   Copying main include directory...");
  // Copy main include directory
  fileOps.cp("../../externals/skia/include", "./cpp/skia/include");

  console.log("   Copying Skia modules...");
  // Copy modules
  copyModule("svg");
  copyModule("skresources");
  copyModule("skparagraph");
  copyModule("skshaper");
  copyModule("skottie");
  copyModule("sksg");

  console.log("   Copying jsonreader module...");
  // Copy jsonreader module
  fileOps.rm("./cpp/skia/modules/jsonreader");
  fileOps.cp(
    "../../externals/skia/modules/jsonreader",
    "./cpp/skia/modules/jsonreader"
  );

  console.log("   Copying skottie source files...");
  // Copy skottie src files
  fileOps.rm("./cpp/skia/modules/skottie/src");
  fileOps.mkdir("./cpp/skia/modules/skottie/src");
  fileOps.mkdir("./cpp/skia/modules/skottie/src/text");
  fileOps.mkdir("./cpp/skia/modules/skottie/src/animator");
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/SkottieValue.h",
    "./cpp/skia/modules/skottie/src/SkottieValue.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/text/TextAdapter.h",
    "./cpp/skia/modules/skottie/src/text/TextAdapter.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/text/Font.h",
    "./cpp/skia/modules/skottie/src/text/Font.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/text/TextAnimator.h",
    "./cpp/skia/modules/skottie/src/text/TextAnimator.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/text/TextValue.h",
    "./cpp/skia/modules/skottie/src/text/TextValue.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skottie/src/animator/Animator.h",
    "./cpp/skia/modules/skottie/src/animator/Animator.h"
  );

  console.log("   Copying skcms module...");
  // Copy skcms module
  fileOps.cp("../../externals/skia/modules/skcms", "./cpp/skia/modules/skcms");

  console.log("   Copying src/core files...");
  // Copy src/core files
  fileOps.mkdir("./cpp/skia/src/");
  fileOps.mkdir("./cpp/skia/src/core/");
  fileOps.cp(
    "../../externals/skia/src/core/SkChecksum.h",
    "./cpp/skia/src/core/SkChecksum.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkTHash.h",
    "./cpp/skia/src/core/SkTHash.h"
  );

  fileOps.cp(
    "../../externals/skia/src/core/SkLRUCache.h",
    "./cpp/skia/src/core/SkLRUCache.h"
  );

  console.log("✅ Skia headers copied successfully");

  // These used to live in src/base; they were folded into src/core in m152.
  fileOps.cp(
    "../../externals/skia/src/core/SkTLazy.h",
    "./cpp/skia/src/core/SkTLazy.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkMathPriv.h",
    "./cpp/skia/src/core/SkMathPriv.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkTInternalLList.h",
    "./cpp/skia/src/core/SkTInternalLList.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkUTF.h",
    "./cpp/skia/src/core/SkUTF.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkArenaAlloc.h",
    "./cpp/skia/src/core/SkArenaAlloc.h"
  );
  fileOps.cp(
    "../../externals/skia/src/core/SkAutoLocaleSetter.h",
    "./cpp/skia/src/core/SkAutoLocaleSetter.h"
  );

  // Copy skunicode
  fileOps.mkdir("./cpp/skia/modules/skunicode/include/");
  fileOps.cp(
    "../../externals/skia/modules/skunicode/include/SkUnicode.h",
    "./cpp/skia/modules/skunicode/include/SkUnicode.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skunicode/include/SkUnicode_libgrapheme.h",
    "./cpp/skia/modules/skunicode/include/SkUnicode_libgrapheme.h"
  );
  fileOps.cp(
    "../../externals/skia/modules/skunicode/include/SkUnicode_icu.h",
    "./cpp/skia/modules/skunicode/include/SkUnicode_icu.h"
  );
  // Check for duplicate header names and issue warnings. The pod's header
  // search path is recursive, so a header name present twice is ambiguous
  // for a bare #include "Name.h" (#3209). Skia includes its own headers by
  // their full path, so the pairs it ships are fine as long as the wrapper
  // includes them by path too.
  const knownDuplicateHeaders = [
    // include/cpu/Recorder.h (skcpu::Recorder, included by Graphite's
    // Recorder.h since m157) and include/gpu/graphite/Recorder.h.
    "Recorder.h",
  ];
  const duplicateHeaders = $(
    "find ./cpp -name '*.h' -type f | sed 's/.*\\///' | sort | uniq -d"
  )
    .toString()
    .split("\n")
    .filter((name: string) => name && !knownDuplicateHeaders.includes(name))
    .join("\n");
  if (duplicateHeaders.trim()) {
    console.warn("⚠️  WARNING: Found duplicate header names:");
    duplicateHeaders
      .split("\n")
      .filter(Boolean)
      .forEach((filename: string) => {
        const fullPaths = $(
          `find ./cpp -name "${filename}" -type f`
        ).toString();
        console.warn(`   ${filename}:`);
        fullPaths
          .split("\n")
          .filter(Boolean)
          .forEach((filePath: string) => {
            console.warn(`     ${filePath}`);
          });
      });
    console.error(
      "❌ ERROR: Duplicate headers found that will cause iOS build conflicts!"
    );
    process.exit(1);
  }
  // Use the build's patch set on pristine or already patched header copies.
  // Source/build sections whose files were not copied are left out.
  applyPatches(path.join(PackageRoot, "cpp/skia"), SkiaPatches, {
    copiedFilesOnly: true,
  });
  console.log("✅ Skia headers copied to ./cpp/skia");
};
