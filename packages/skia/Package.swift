// swift-tools-version: 6.0
// Optional RN 0.87.1+ SwiftPM integration; CocoaPods remains supported.
// RN aliases this package under build/generated/autolinking/libs/ReactNativeSkia.
// The autolinking plugin emits the adjacent binary link package and an app phase.
// Headers are in npm; SDK binaries are prepared before the app links.
import PackageDescription
import Foundation

// SwiftPM discovers resources even with an explicit sources list. Keep only the
// native source/header directories visible; new build or JS folders are excluded
// automatically. Enumerating existing entries also avoids missing-path warnings.
let packageDirectory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let nativeDirectories: Set<String> = ["apple", "cpp", "include"]
let excludedPaths = try FileManager.default.contentsOfDirectory(atPath: packageDirectory.path).filter {
  !nativeDirectories.contains($0)
}

let package = Package(
  name: "ReactNativeSkia",
  platforms: [.iOS(.v15), .tvOS(.v15), .macOS(.v14)],
  products: [
    // Autolinking looks this name up verbatim; react-native.config.js pins it.
    .library(name: "ReactNativeSkia", targets: ["ReactNativeSkia"])
  ],
  dependencies: [
    .package(name: "React-GeneratedCode", path: "../../../ios"),
    .package(name: "ReactNative", path: "../../../../xcframeworks"),
    .package(name: "ReactNativeSkiaBinaries", path: "../../ReactNativeSkiaBinaries"),
  ],
  targets: [
    .target(
      name: "ReactNativeSkia",
      dependencies: [
        .product(name: "ReactHeaders", package: "ReactNative"),
        .product(name: "ReactNativeHeaders", package: "ReactNative"),
        .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
        .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
        .product(name: "ReactNativeSkiaBinaries", package: "ReactNativeSkiaBinaries"),
      ],
      // apple/ and cpp/ have no common ancestor below the package root, and
      // .headerSearchPath cannot escape the target path.
      path: ".",
      exclude: excludedPaths,
      // Compile only native sources. The copied Skia header tree also carries
      // x86 AVX skcms implementations that cannot build as arm64 app sources.
      sources: [
        "apple",
        "cpp/api",
        "cpp/jsi",
        "cpp/rnskia",
        "cpp/rnwgpu",
        "cpp/utils",
        // libskottie.a needs skjson and Apple builds no libskjson archive.
        // CocoaPods compiles this via its cpp/**/*.cpp glob.
        "cpp/skia/modules/jsonreader/SkJSONReader.cpp",
      ],
      cxxSettings: [
        // Replaces the podspec's recursive cpp/** glob, which expands to 90.
        .headerSearchPath("cpp"), // "api/…", "jsi/…", "utils/…"
        .headerSearchPath("cpp/skia"), // "include/core/…", "modules/…", "src/…"
        .headerSearchPath("cpp/dawn/include"), // "webgpu/…", "dawn/…"
        .headerSearchPath("cpp/rnskia"), // apple/ uses bare "RNSkView.h"
        .headerSearchPath("cpp/utils"), // apple/ uses bare "RNSkLog.h"

        // CocoaPods defines both project-wide for a New Architecture app; the
        // SwiftPM path defines neither. Skia's own sources no longer gate on
        // them, but React's headers do (RCT_REMOVE_LEGACY_ARCH hides the
        // legacy bridge API), so mirror what CocoaPods does.
        .define("RCT_NEW_ARCH_ENABLED", to: "1"),
        .define("RCT_REMOVE_LEGACY_ARCH", to: "1"),

        // Skia's public headers only declare the Graphite API with SK_GRAPHITE.
        .define("SK_GRAPHITE", to: "1"),
        .define("SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API", to: "1"),
        .define("SK_DISABLE_LEGACY_SHAPER_FACTORY", to: "1"),
        // The Skia binaries are release builds: their inline code is compiled
        // the same way here in every configuration (SK_RELEASE), else a Debug
        // build mixes the SK_DEBUG assertions compiled into the package with
        // the release code of the library on the same objects (a ref-counted
        // object destroyed by the library then fails the debug destructor's
        // assertion). Set explicitly: Skia would otherwise derive it from
        // NDEBUG, which the debug configuration leaves out.
        .define("SK_RELEASE", to: "1"),

        // React's prebuilt C++ ABI is NDEBUG-gated. Omitting either breaks
        // the Release link.
        .define("DEBUG", .when(configuration: .debug)),
        .define("NDEBUG", .when(configuration: .release)),
      ],
      linkerSettings: [
        .linkedFramework("MetalKit"),
        .linkedFramework("AVFoundation"),
        .linkedFramework("AVKit"),
        .linkedFramework("CoreMedia"),
      ]
    )
  ],
  // React Native's headers need C++20, and so does Skia m152: SkMathPriv.h
  // calls std::countl_zero, std::countr_zero and std::popcount.
  cxxLanguageStandard: .cxx20
)
