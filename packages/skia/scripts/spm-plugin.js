"use strict";

// MARK: Autolinking helpers

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/** Quote a generated path as one shell argument, including spaces/apostrophes. */
const shellQuote = (value) => `'${value.replace(/'/g, "'\\''")}'`;

/**
 * RN requires a JavaScript autolinking entry point. It delegates configuration
 * and package generation to Bash; the installed Xcode phase never invokes Node.
 * RN invokes this hook again when it regenerates the autolinked package graph.
 * Configuration reads the installed release pin; binary downloads wait for Xcode
 * to supply the SDK and architecture build settings.
 */
module.exports = function skiaSwiftPM(context) {
  const packageRoot = path.join(__dirname, "..");
  const scriptPath = path.join(__dirname, "prepare-apple-binaries.sh");

  // MARK: RN hook compatibility

  // Check the installed hook's capability, rather than assuming a semver string
  // describes it: local RN checkouts and prereleases may carry different tooling.
  // Without scriptPhases, libraries would be linked before they were prepared.
  const contract = path.join(
    context.reactNativeRoot,
    "scripts/spm/autolinking-plugins.js"
  );
  if (
    !fs.existsSync(contract) ||
    !fs.readFileSync(contract, "utf8").includes("scriptPhases")
  ) {
    throw new Error(
      "react-native-skia: automatic SwiftPM binary preparation requires React Native 0.87.1 or newer. Upgrade React Native or use CocoaPods."
    );
  }

  // MARK: Dawn ownership and generated link settings

  // Use RN's resolved native dependency list, including explicit iOS exclusions.
  // Installing WebGPU alone does not mean it is linked into this native target.
  // Ownership is fixed during autolinking and passed explicitly to the phase.
  const dependency = context.autolinking.dependencies?.["react-native-webgpu"];
  const external =
    Boolean(dependency && dependency.platforms?.ios !== null) &&
    process.env.RNSKIA_VENDOR_DAWN !== "1";

  // --config validates shared Dawn metadata and emits linker names without any
  // downloads. --spm-package writes the local link-settings package referenced by
  // Skia's Package.swift; its headers do not depend on the selected binary SDK.
  // Keep shell arguments separate so package/app paths can contain apostrophes.
  const configuration = JSON.parse(
    execFileSync(
      "/bin/bash",
      [
        scriptPath,
        "--config",
        "--project-root",
        context.projectRoot || context.appRoot,
        "--dawn",
        external ? "external" : "own",
        "--spm-package",
        path.join(context.outputDir, "ReactNativeSkiaBinaries"),
      ],
      { encoding: "utf8" }
    )
  );

  // MARK: Xcode preparation phase

  // RN already resolved the package during autolinking. A project-relative path
  // handles hoisting/pnpm and relocation without Node lookups inside Xcode.
  // Resolve symlinks on both sides before computing the path so workspace package
  // aliases do not produce a different path after Xcode expands SRCROOT.
  const relativeScript = shellQuote(
    path.relative(fs.realpathSync(context.appRoot), fs.realpathSync(scriptPath))
  );

  // Xcode expands SDK/architecture variables when this phase runs. Cache and
  // assembly logic stays in the shared shell scripts used by CocoaPods too.
  // exec preserves their exit status and error diagnostics in Xcode's build log.
  const script = `set -eo pipefail
# Check before reading package files, which script sandboxing may already deny.
if [ "\${ENABLE_USER_SCRIPT_SANDBOXING:-NO}" = YES ]; then
  echo "error: [react-native-skia] Set User Script Sandboxing to No on this app target; preparation needs release-cache and build-product access." >&2
  exit 1
fi
PREPARE_SCRIPT="$SRCROOT"/${relativeScript}
if [ ! -f "$PREPARE_SCRIPT" ]; then
  echo "error: [react-native-skia] Binary preparation script is missing. Reinstall dependencies and rerun react-native spm update." >&2
  exit 1
fi
exec /bin/bash "$PREPARE_SCRIPT" --project-root "$SRCROOT" --output "$BUILT_PRODUCTS_DIR" --assembly-root "$OBJROOT/ReactNativeSkiaBinaries" --dawn ${configuration.dawn}
`;

  // MARK: Native package registration

  // RN delegates the plugin host's native contribution entirely to this hook.
  // Recreate its usual libs/<name> alias so Package.swift's relative React and
  // generated-code dependencies resolve within this app's autolinking tree.
  const packageAlias = path.join(context.outputDir, "libs", "ReactNativeSkia");
  fs.mkdirSync(path.dirname(packageAlias), { recursive: true });
  if (!fs.existsSync(packageAlias)) {
    fs.symlinkSync(packageRoot, packageAlias, "dir");
  }

  // MARK: RN phase reconciliation and synchronization

  return {
    packageDependencies: [{ name: "ReactNativeSkia", path: packageAlias }],
    productDependencies: [
      { name: "ReactNativeSkia", package: "ReactNativeSkia" },
    ],
    scriptPhases: [
      {
        // RN uses this stable id to update the phase instead of adding duplicates.
        id: "react-native-skia.prepare-binaries",
        name: "Prepare React Native Skia binaries",
        script,
        // Bundled headers allow package compilation without downloading binaries;
        // prepare libraries before the app's compile/link steps consume them.
        position: "beforeCompile",
        // SDK selection and local overrides are not fixed Xcode input files.
        // Run every build; shell signatures skip unchanged assembly and copies.
        alwaysOutOfDate: true,
      },
    ],
    // These trigger RN autolinking regeneration when the pin or adapter changes.
    // They are separate from the preparation phase's own binary/cache checks.
    watchPaths: [
      path.join(packageRoot, "binaries.json"),
      __filename,
      scriptPath,
      path.join(__dirname, "apple-binaries-utils.sh"),
    ],
  };
};
