/** Apple build identities shared by Skia, Dawn, and release packaging. */
export type AppleSDK =
  | "iphoneos"
  | "iphonesimulator"
  | "maccatalyst"
  | "appletvos"
  | "appletvsimulator"
  | "macos";

export type AppleArchitecture = "arm64" | "x86_64";
export type ApplePlatform = "ios" | "tvos" | "macos";

export interface AppleConfiguration {
  /** Binary platform; Catalyst shares iOS while using the macOS SDK. */
  platform: ApplePlatform;
  /** SDK name understood by CMake and xcrun, independent of output names. */
  sysroot: string;
  systemName: "iOS" | "tvOS" | "Darwin";
  minimumTarget: string;
  /** Architectures to build; multiple entries produce lipo'd universal libraries. */
  architectures: AppleArchitecture[];
  /** Distinguishes simulator and Catalyst slices from native device slices. */
  variant?: "simulator" | "maccatalyst";
}

// Deployment targets belong to the binaries, independently of SwiftPM metadata.
const iosMinTarget = "15.1";
const tvosMinTarget = "15.1";
const macosMinTarget = "14.0";

export const appleConfigurations: Record<AppleSDK, AppleConfiguration> = {
  iphoneos: {
    platform: "ios",
    sysroot: "iphoneos",
    systemName: "iOS",
    minimumTarget: iosMinTarget,
    architectures: ["arm64"],
  },
  iphonesimulator: {
    platform: "ios",
    sysroot: "iphonesimulator",
    systemName: "iOS",
    minimumTarget: iosMinTarget,
    architectures: ["arm64", "x86_64"],
    variant: "simulator",
  },
  maccatalyst: {
    platform: "ios",
    sysroot: "macosx",
    systemName: "Darwin",
    minimumTarget: iosMinTarget,
    architectures: ["arm64", "x86_64"],
    variant: "maccatalyst",
  },
  appletvos: {
    platform: "tvos",
    sysroot: "appletvos",
    systemName: "tvOS",
    minimumTarget: tvosMinTarget,
    architectures: ["arm64"],
  },
  appletvsimulator: {
    platform: "tvos",
    sysroot: "appletvsimulator",
    systemName: "tvOS",
    minimumTarget: tvosMinTarget,
    architectures: ["arm64", "x86_64"],
    variant: "simulator",
  },
  macos: {
    platform: "macos",
    sysroot: "macosx",
    systemName: "Darwin",
    minimumTarget: macosMinTarget,
    architectures: ["arm64", "x86_64"],
  },
};

export const appleSDKs = Object.keys(appleConfigurations) as AppleSDK[];

/** Expand platform groups into unique architecture targets; reject unknown names. */
export const selectBuildTargets = (specs: string[], targets: string[]) => {
  if (specs.length === 0) {
    return targets;
  }
  const selected = new Set<string>();
  for (const spec of specs) {
    // Only catalogued groups expand; partial names must not select other SDKs.
    const isGroup =
      spec === "android" ||
      spec === "wasm" ||
      appleSDKs.includes(spec as AppleSDK);
    let matches: string[] = [];
    if (targets.includes(spec)) {
      matches = [spec];
    } else if (isGroup) {
      matches = targets.filter((target) => target.startsWith(`${spec}-`));
    }
    if (matches.length === 0) {
      throw new Error(
        `Unknown target '${spec}'. Valid targets: ${targets.join(
          ", "
        )}; groups: android, wasm, ${appleSDKs.join(", ")}`
      );
    }
    matches.forEach((target) => selected.add(target));
  }
  return [...selected];
};
