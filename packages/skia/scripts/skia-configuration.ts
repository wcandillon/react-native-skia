/* eslint-disable max-len */
import path from "path";

import { $ } from "./utils";

const DEBUG = false;
const GRAPHITE = true;

export const SkiaSrc = path.join(__dirname, "../../../externals/skia");
export const ProjectRoot = path.join(__dirname, "../../..");
export const PackageRoot = path.join(__dirname, "..");
export const OutFolder = path.join(SkiaSrc, DEBUG ? "debug" : "out");

const NdkDir = process.env.ANDROID_NDK ?? "";

export const BUILD_WITH_PARAGRAPH = true;
const NoParagraphArgs = [
  ["skia_use_harfbuzz", false],
  ["skia_use_icu", false],
];

// To build the paragraph API:
// On Android: we use system ICU
// On iOS: we use libgrapheme
const CommonParagraphArgs = [
  ["skia_enable_paragraph", true],
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

const ParagraphArgsIOS = BUILD_WITH_PARAGRAPH
  ? [
      ...CommonParagraphArgs,
      ["skia_use_icu", false],
      ["skia_use_client_icu", false],
      ["skia_use_libgrapheme", true],
    ]
  : NoParagraphArgs;

const ParagraphIOS = BUILD_WITH_PARAGRAPH
  ? ["libskparagraph.a", "libskunicode_core.a", "libskunicode_libgrapheme.a"]
  : [];

const ParagraphOutputsAndroid = BUILD_WITH_PARAGRAPH
  ? ["libskparagraph.a", "libskunicode_core.a", "libskunicode_icu.a"]
  : [];

const DawnOutput = [
  "libdawn_native_static.a",
  "libdawn_platform_static.a",
  "libdawn_proc_static.a",
];

export const commonArgs = [
  ["skia_use_piex", true],
  ["skia_use_sfntly", false],
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
  ["skia_enable_ganesh", !GRAPHITE],
  ["skia_enable_graphite", GRAPHITE],
  ["skia_use_dawn", GRAPHITE],
];

export type PlatformName = "ios" | "android";

type Arg = (string | boolean | number)[];
export type Target = {
  args?: Arg[];
  cpu: string;
  output?: string;
  options?: Arg[];
};

export type Platform = {
  targets: { [key: string]: Target };
  args: Arg[];
  outputRoot: string;
  outputNames: string[];
  options?: Arg[];
};

const androidMinSDK = 26;
const iosMinTarget = '"15.1"';

export const configurations = {
  android: {
    targets: {
      arm: {
        cpu: "arm",
        output: "armeabi-v7a",
      },
      arm64: {
        cpu: "arm64",
        output: "arm64-v8a",
      },
      x86: {
        cpu: "x86",
        output: "x86",
      },
      x64: {
        cpu: "x64",
        output: "x86_64",
      },
    },
    args: [
      ["ndk_api", androidMinSDK],
      ["ndk", `"${NdkDir}"`],
      ["skia_use_system_freetype2", false],
      ["skia_use_gl", !GRAPHITE],
      ["cc", '"clang"'],
      ["cxx", '"clang++"'],
      [
        "extra_cflags",
        '["-DSKIA_C_DLL", "-DHAVE_SYSCALL_GETRANDOM", "-DXML_DEV_URANDOM"]',
      ],
      ...ParagraphArgsAndroid,
    ],
    outputRoot: "libs/android",
    outputNames: [
      "libskia.a",
      "libskshaper.a",
      "libsvg.a",
      "libskottie.a",
      "libsksg.a",
      ...ParagraphOutputsAndroid,
      ...DawnOutput,
    ],
  },
  ios: {
    targets: {
      "arm64-iphoneos": {
        cpu: "arm64",
        args: [
          ["ios_min_target", iosMinTarget],
          ["extra_cflags", '["-target", "arm64-apple-ios"]'],
          ["extra_asmflags", '["-target", "arm64-apple-ios"]'],
          ["extra_ldflags", '["-target", "arm64-apple-ios"]'],
        ],
      },
      "arm64-iphonesimulator": {
        cpu: "arm64",
        args: [
          ["ios_min_target", iosMinTarget],
          ["extra_cflags", '["-target", "arm64-apple-ios-simulator"]'],
          ["extra_asmflags", '["-target", "arm64-apple-ios-simulator"]'],
          ["extra_ldflags", '["-target", "arm64-apple-ios-simulator"]'],
          ["ios_use_simulator", true],
        ],
      },
      x64: {
        cpu: "x64",
        args: [
          ["ios_min_target", iosMinTarget],
          ["extra_cflags", '["-target", "arm64-apple-ios-simulator"]'],
          ["extra_asmflags", '["-target", "arm64-apple-ios-simulator"]'],
          ["extra_ldflags", '["-target", "arm64-apple-ios-simulator"]'],
        ],
      },
    },
    args: [
      ["skia_use_metal", true],
      ["cc", '"clang"'],
      ["cxx", '"clang++"'],
      ...ParagraphArgsIOS,
    ],
    outputRoot: "libs/ios",
    outputNames: [
      "libskia.a",
      "libskshaper.a",
      "libsvg.a",
      "libskottie.a",
      "libsksg.a",
      ...ParagraphIOS,
      ...DawnOutput,
    ],
  },
};

const copyModule = (module: string) => [
  `mkdir -p ./cpp/skia/modules/${module}/include`,
  `cp -a ../../externals/skia/modules/${module}/include/. ./cpp/skia/modules/${module}/include`,
];

export const copyHeaders = () => {
  process.chdir(PackageRoot);
  [
    "rm -rf ./cpp/skia",
    "rm -rf ./cpp/dawn",

    "mkdir -p ./cpp/dawn/include",
    "mkdir -p ./cpp/skia/include",
    "mkdir -p ./cpp/skia/modules",
    "mkdir -p ./cpp/skia/src",

    // "mkdir -p ./cpp/skia/src/image",
    // "cp -a ../../externals/skia/src/image/SkSurface_Base.h ./cpp/skia/src/image/.",

    "mkdir -p ./cpp/skia/src/gpu/graphite",
    // "cp -a ../../externals/skia/src/gpu/SkBackingFit.h ./cpp/skia/src/gpu/.",
    "cp -a ../../externals/skia/src/gpu/graphite/ContextOptionsPriv.h ./cpp/skia/src/gpu/graphite/.",
    "cp -a ../../externals/skia/src/gpu/graphite/ResourceTypes.h ./cpp/skia/src/gpu/graphite/.",
    "cp -a ../../externals/skia/src/gpu/graphite/TextureProxyView.h ./cpp/skia/src/gpu/graphite/.",

    "cp -a ../../externals/skia/out/android/arm/gen/third_party/externals/dawn/include/. ./cpp/dawn/include",
    "cp -a ../../externals/skia/third_party/externals/dawn/include/. ./cpp/dawn/include",
    "cp -a ../../externals/skia/third_party/externals/dawn/include/. ./cpp/dawn/include",

    "cp -a ../../externals/skia/include/. ./cpp/skia/include",
    ...copyModule("svg"),
    ...copyModule("skresources"),
    ...copyModule("skparagraph"),
    ...copyModule("skshaper"),
    "cp -a ../../externals/skia/modules/skcms/. ./cpp/skia/modules/skcms",
    "mkdir -p ./cpp/skia/src/",
    "mkdir -p ./cpp/skia/src/core/",
    "cp -a ../../externals/skia/src/core/SkChecksum.h ./cpp/skia/src/core/.",
    "cp -a ../../externals/skia/src/core/SkTHash.h ./cpp/skia/src/core/.",

    // TODO: remove ganesh
    "mkdir -p ./cpp/skia/src/gpu/ganesh/gl",
    "cp -a ../../externals/skia/src/gpu/ganesh/gl/GrGLDefines.h ./cpp/skia/src/gpu/ganesh/gl/.",

    "cp -a ../../externals/skia/src/core/SkLRUCache.h ./cpp/skia/src/core/.",

    "mkdir -p ./cpp/skia/src/base",
    "cp -a ../../externals/skia/src/base/SkTLazy.h ./cpp/skia/src/base/.",
    "cp -a ../../externals/skia/src/base/SkMathPriv.h ./cpp/skia/src/base/.",
    "cp -a ../../externals/skia/src/base/SkTInternalLList.h ./cpp/skia/src/base/.",
    "cp -a ../../externals/skia/src/base/SkUTF.h ./cpp/skia/src/base/.",

    "mkdir -p ./cpp/skia/modules/skunicode/include/",
    "cp -a ../../externals/skia/modules/skunicode/include/SkUnicode.h ./cpp/skia/modules/skunicode/include/.",

    // Remove duplicated WebGPU headers
    "sed -i '' 's/#include \"dawn\\/webgpu.h\"/#include \"webgpu\\/webgpu.h\"/' ./cpp/dawn/include/dawn/dawn_proc_table.h",
    "cp ./cpp/dawn/include/dawn/webgpu.h ./cpp/dawn/include/webgpu/webgpu.h",
    "cp ./cpp/dawn/include/dawn/webgpu_cpp.h ./cpp/dawn/include/webgpu/webgpu_cpp.h",
    "rm -rf ./cpp/dawn/include/dawn/webgpu.h",
    "rm -rf ./cpp/dawn/include/dawn/webgpu_cpp.h",
    "rm -rf ./cpp/dawn/include/dawn/wire",

    // Remove migrated headers
    //grep -R "Delete this after migrating clients" cpp
    "rm -rf ./cpp/skia/include/gpu/GrContextThreadSafeProxy.h",
    "rm -rf ./cpp/skia/include/gpu/GrDirectContext.h",
    "rm -rf ./cpp/skia/include/gpu/GrBackendSemaphore.h",
    "rm -rf ./cpp/skia/include/gpu/mock/GrMockTypes.h",
    "rm -rf ./cpp/skia/include/gpu/GrDriverBugWorkaroundsAutogen.h",
    "rm -rf ./cpp/skia/include/gpu/GrTypes.h",
    "rm -rf ./cpp/skia/include/gpu/vk/GrVkTypes.h",
    "rm -rf ./cpp/skia/include/gpu/GrDriverBugWorkarounds.h",
    "rm -rf ./cpp/skia/include/gpu/GrContextOptions.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLExtensions.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLAssembleInterface.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLTypes.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLConfig.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLFunctions.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLAssembleHelpers.h",
    "rm -rf ./cpp/skia/include/gpu/gl/GrGLInterface.h",
    "rm -rf ./cpp/skia/include/gpu/GrYUVABackendTextures.h",
    "rm -rf ./cpp/skia/include/gpu/GrRecordingContext.h",
    "rm -rf ./cpp/skia/include/gpu/GrBackendSurface.h",
    "rm -rf ./cpp/skia/include/gpu/d3d/GrD3DBackendContext.h",
    "rm -rf ./cpp/skia/include/gpu/d3d/GrD3DTypes.h",
  ].map((cmd) => {
    console.log(cmd);
    $(cmd);
  });
};
