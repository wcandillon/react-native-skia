// swift-tools-version: 6.0
//
// SwiftPM manifest for @shopify/react-native-skia. iOS, Ganesh.
// Additive: the CocoaPods podspec remains the supported default.
//
// React Native 0.87+ references a library that ships its own Package.swift
// through a symlink at <app>/ios/build/generated/autolinking/libs/<name>, and
// resolves the relative paths below against that symlink. They are the same
// for every standard app, because the symlink location is.

import Foundation
import PackageDescription

// Skia's xcframeworks are ~200MB and are not carried in this package. They come
// from the react-native-skia-apple-ios npm package, which @shopify/react-native-skia
// depends on, so a checkout that has installed its dependencies builds offline.
// Xcode passes the symlink as the package directory, hence resolvingSymlinks.
let packageRoot = URL(fileURLWithPath: Context.packageDirectory)
  .resolvingSymlinksInPath().path

let binariesPath = [
  "../../react-native-skia-apple-ios", // consumer: sibling in node_modules
  "../../node_modules/react-native-skia-apple-ios", // this monorepo
]
.map { "\(packageRoot)/\($0)" }
.first { FileManager.default.fileExists(atPath: "\($0)/Package.swift") }

guard let binariesPath else {
  // Reached when the package was skipped at install time (`--omit=optional`,
  // or a non-Apple `os` filter), which SwiftPM would otherwise report as an
  // unresolvable dependency path.
  fatalError(
    """
    react-native-skia-apple-ios was not found next to @shopify/react-native-skia. \
    It ships the prebuilt Skia binaries this package links against. Reinstall \
    dependencies without --omit=optional, on macOS.
    """)
}

let package = Package(
  name: "ReactNativeSkia",
  platforms: [.iOS(.v15)],
  products: [
    // Autolinking looks this name up verbatim; react-native.config.js pins it.
    .library(name: "ReactNativeSkia", targets: ["ReactNativeSkia"])
  ],
  dependencies: [
    .package(name: "React-GeneratedCode", path: "../../../ios"),
    .package(name: "ReactNative", path: "../../../../xcframeworks"),
    .package(path: binariesPath),
  ],
  targets: [
    .target(
      name: "ReactNativeSkia",
      dependencies: [
        .product(name: "ReactHeaders", package: "ReactNative"),
        .product(name: "ReactNativeHeaders", package: "ReactNative"),
        .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
        .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
        .product(name: "react-native-skia-apple-ios", package: "react-native-skia-apple-ios"),
      ],
      // apple/ and cpp/ have no common ancestor below the package root, and
      // .headerSearchPath cannot escape the target path.
      path: ".",
      exclude: [
        "cpp/rnskia/RNDawnWindowContext.cpp", // Graphite only
        "cpp/rnskia/RNDawnInterop.cpp", // Graphite only
      ],
      // Explicit, so SwiftPM never walks node_modules, lib, android, or the
      // headers-only cpp/skia — which carries x86 AVX skcms sources that
      // cannot build for arm64.
      sources: [
        "apple",
        "cpp/api",
        "cpp/jsi",
        "cpp/rnskia",
        "cpp/utils",
        // libskottie.a needs skjson and Apple builds no libskjson archive.
        // CocoaPods compiles this via its cpp/**/*.cpp glob.
        "cpp/skia/modules/jsonreader/SkJSONReader.cpp",
      ],
      cxxSettings: [
        // Replaces the podspec's recursive cpp/** glob, which expands to 90.
        .headerSearchPath("cpp"), // "api/…", "jsi/…", "utils/…"
        .headerSearchPath("cpp/skia"), // "include/core/…", "modules/…", "src/…"
        .headerSearchPath("cpp/rnskia"), // apple/ uses bare "RNSkView.h"
        .headerSearchPath("cpp/utils"), // apple/ uses bare "RNSkLog.h"

        // CocoaPods defines both project-wide for a New Architecture app; the
        // SwiftPM path defines neither. Skia's own sources no longer gate on
        // them, but React's headers do (RCT_REMOVE_LEGACY_ARCH hides the
        // legacy bridge API), so mirror what CocoaPods does.
        .define("RCT_NEW_ARCH_ENABLED", to: "1"),
        .define("RCT_REMOVE_LEGACY_ARCH", to: "1"),

        .define("SK_METAL", to: "1"),
        .define("SK_GANESH", to: "1"),
        .define("SK_IMAGE_READ_PIXELS_DISABLE_LEGACY_API", to: "1"),
        .define("SK_DISABLE_LEGACY_SHAPER_FACTORY", to: "1"),

        // React's prebuilt C++ ABI is NDEBUG-gated, and Skia derives
        // SK_RELEASE from it. Omitting either breaks the Release link.
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
