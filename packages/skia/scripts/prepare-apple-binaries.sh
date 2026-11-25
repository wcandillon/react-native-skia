#!/bin/bash
#
# CocoaPods and RN SwiftPM share this Node-free preparation phase.
# SDK archives contain static libraries; headers already ship in react-native-skia.
# Nothing compiles here: resolve libraries, update XCFramework slices, then copy
# the selected SDK's archives into Xcode's library search path.
#
# Usage:
#   /bin/bash prepare-apple-binaries.sh --config --project-root <app>
#   /bin/bash prepare-apple-binaries.sh --config --spm-package <generated-package>
#   /bin/bash prepare-apple-binaries.sh --project-root <app> \
#     --output <build-products> --assembly-root <build-intermediates> --dawn own
#
# Xcode environment:
#   PLATFORM_NAME, EFFECTIVE_PLATFORM_NAME, SDK_VARIANT select the SDK/variant.
#   ARCHS, EXCLUDED_ARCHS, ONLY_ACTIVE_ARCH, CURRENT_ARCH, NATIVE_ARCH_ACTUAL
#     select required architectures; metadata may contain additional ones.
#   IPHONEOS_DEPLOYMENT_TARGET, TVOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET
#     must meet the selected archive's deployment floor.
#   BUILT_PRODUCTS_DIR and OBJROOT supply default output/assembly directories.
#   ENABLE_USER_SCRIPT_SANDBOXING must be NO on the target running this phase.
#
# Overrides:
#   RNSKIA_CACHE_DIR changes the shared download cache (default:
#     ~/Library/Caches/react-native-skia). Version/checksum subdirectories remain.
#   REACT_NATIVE_SKIA_BINARIES_URL changes the release base URL; the installed
#     binaries.json still pins the tag and checksums, including for mirrors.
#   RNSKIA_VENDOR_DAWN=1 disables automatic sharing with react-native-webgpu.
#     Explicit --dawn own/external comes from native autolinking.
#   libs/apple and libs/dawn/apple, when present, are read-only local overrides.
set -Eeuo pipefail

# MARK: Package paths and shared constants

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/apple-binaries-utils.sh"

# MARK: Failure reporting and cleanup

# Report the actual command failure before Xcode's generic PhaseScriptExecution error.
report_failure() {
  local status="$1" line="$2" command="$3"
  if [[ ! -f "$WORK_DIR/failed" ]]; then
    printf 'error: [react-native-skia] Preparation failed at line %s (exit %s): %s. Check the diagnostic above, permissions, and free disk space.\n' "$line" "$status" "$command" >&2
    : > "$WORK_DIR/failed"
  fi
  exit "$status"
}

# Release only locks still owned by this process, never a later cache writer.
cleanup() {
  # Missing pid files are expected for locks released before EXIT. Bash 3.2
  # otherwise inherits ERR into their reads and reports a successful run as failed.
  trap - ERR
  local directory owner entry
  for directory in ${LOCKS[@]+"${LOCKS[@]}"}; do
    owner=$(cat "$directory/pid" 2>/dev/null) || owner=''
    if [[ "$owner" == "$$" ]]; then rm -rf "$directory"; fi
  done
  # Interrupted downloads/copies are temporary. Keep verified cache entries,
  # local overrides, and complete XCFramework slices from earlier builds.
  for entry in ${TEMP_PATHS[@]+"${TEMP_PATHS[@]}"}; do rm -rf "$entry"; done
  rm -rf "$WORK_DIR"
}

# MARK: Xcode target selection

# Sets SDK and REQUESTED_ARCHS from Xcode's expanded architecture settings.
# Catalyst uses the macOS SDK, but must select iOS/macabi libraries. Exclusions
# apply before ONLY_ACTIVE_ARCH reduces the request to the current architecture.
detect_target() {
  SDK="${PLATFORM_NAME:-}"
  if [[ "$SDK" == macosx ]]; then
    SDK=macos
    if [[ "${EFFECTIVE_PLATFORM_NAME:-}" == -maccatalyst || "${SDK_VARIANT:-}" == maccatalyst || "${SDK_VARIANT:-}" == iosmac ]]; then
      SDK=maccatalyst
    fi
  fi
  sdk_descriptor "$SDK" >/dev/null ||
    fail "Unsupported Apple platform '${PLATFORM_NAME:-unset}' (EFFECTIVE_PLATFORM_NAME='${EFFECTIVE_PLATFORM_NAME:-}'). Supported SDKs: ${RNSKIA_SDKS[*]}. Build an Apple target in Xcode."
  local arch excluded skip seen='' active="${CURRENT_ARCH:-}"
  if [[ -z "$active" || "$active" == undefined_arch ]]; then active="${NATIVE_ARCH_ACTUAL:-}"; fi
  REQUESTED_ARCHS=()
  for arch in ${ARCHS:-}; do
    [[ "$arch" =~ ^[A-Za-z0-9_]+$ ]] || fail "Invalid architecture in ARCHS: $arch"
    skip=false
    for excluded in ${EXCLUDED_ARCHS:-}; do
      if [[ "$arch" == "$excluded" ]]; then skip=true; fi
    done
    if [[ "$skip" == false && " $seen " != *" $arch "* ]]; then
      REQUESTED_ARCHS+=("$arch")
      seen="$seen $arch"
    fi
  done
  ((${#REQUESTED_ARCHS[@]} > 0)) || fail "Cannot determine Apple architectures from ARCHS='${ARCHS:-}'. Run preparation from an Xcode target."
  if [[ "${ONLY_ACTIVE_ARCH:-NO}" == YES && -n "$active" && " $seen " == *" $active "* ]]; then
    REQUESTED_ARCHS=("$active")
  fi
}

# MARK: CocoaPods and SwiftPM configuration

# Plain JSON is consumed by the podspec and the mandatory RN JavaScript adapter.
# Names are prefixed at staging so they cannot collide with another dependency's
# libskia.a or libwebgpu_dawn.a in the shared build-products directory.
print_configuration() {
  local library name separator=''
  printf '{"dawn":"%s","linkNames":[' "$DAWN_MODE"
  for library in "${ALL_LIBRARIES[@]}"; do
    name="${library#lib}"
    printf '%s"rnskia_%s"' "$separator" "${name%.a}"
    separator=,
  done
  printf ']}\n'
}

# Keep generated files stable across repeated SwiftPM autolinking synchronizations.
write_if_changed() {
  local source="$1" destination="$2"
  if ! cmp -s "$source" "$destination"; then
    mkdir -p "$(dirname "$destination")"
    cp "$source" "$destination"
  fi
}

# write_spm_package DIRECTORY: generate a link-settings target, not binaryTargets.
# SwiftPM resolves this small local package before Xcode knows the selected SDK;
# the build phase provides its libraries later. Headers stay in react-native-skia.
# Only the RN hook is JavaScript. Package generation and the native phase use shell.
write_spm_package() {
  local directory="$1" library name
  printf '// Link settings only; Skia/Dawn headers ship in react-native-skia.\n' > "$WORK_DIR/ReactNativeSkiaBinaries.h"
  printf '// Propagates static binary link settings to the app.\n' > "$WORK_DIR/link.c"
  cat > "$WORK_DIR/Package.swift" <<'SWIFT'
// swift-tools-version: 6.0
// Generated by react-native-skia; SDK binaries are prepared by its Xcode phase.
import PackageDescription

let package = Package(
  name: "ReactNativeSkiaBinaries",
  platforms: [.iOS(.v15), .tvOS(.v15), .macOS(.v14)],
  products: [.library(name: "ReactNativeSkiaBinaries", targets: ["ReactNativeSkiaBinaries"])],
  targets: [
    .target(
      name: "ReactNativeSkiaBinaries",
      path: ".",
      sources: ["link.c"],
      publicHeadersPath: "include",
      linkerSettings: [
SWIFT
  for library in "${ALL_LIBRARIES[@]}"; do
    name="${library#lib}"
    printf '        .linkedLibrary("rnskia_%s"),\n' "${name%.a}" >> "$WORK_DIR/Package.swift"
  done
  cat >> "$WORK_DIR/Package.swift" <<'SWIFT'
        // Keep the shared Dawn entry point visible to react-native-webgpu's dlsym.
        .unsafeFlags(["-Xlinker", "-u", "-Xlinker", "_rnskia_getWGPUInstance"]),
      ]
    )
  ]
)
SWIFT
  write_if_changed "$WORK_DIR/Package.swift" "$directory/Package.swift"
  write_if_changed "$WORK_DIR/link.c" "$directory/link.c"
  write_if_changed "$WORK_DIR/ReactNativeSkiaBinaries.h" "$directory/include/ReactNativeSkiaBinaries.h"
}

# MARK: Incremental XCFramework assembly

# write_xcframework_plist CONTAINER LIBRARY METADATA_ROOT: describe only SDKs
# already prepared in this build folder. A later SDK appends its own slice.
# All values written to XML are fixed library/platform names or validated archs.
# The descriptors come from saved SDK metadata, rather than hardcoded slice names.
write_xcframework_plist() {
  local container="$1" library="$2" metadata_root="$3" sdk file identifier archs arch
  local ignored platform variant deployment
  {
    cat <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundlePackageType</key><string>XFWK</string>
<key>XCFrameworkFormatVersion</key><string>1.0</string>
<key>AvailableLibraries</key><array>
PLIST
    for sdk in "${RNSKIA_SDKS[@]}"; do
      file="$metadata_root/$sdk.json"
      [[ -f "$file" ]] || continue
      IFS='|' read -r ignored platform variant deployment <<< "$(sdk_descriptor "$sdk")"
      archs=$(json_strings "$file" architectures)
      identifier="$platform-$(printf '%s\n' "$archs" | LC_ALL=C sort | paste -sd _ -)${variant:+-$variant}"
      printf '<dict><key>LibraryIdentifier</key><string>%s</string>\n' "$identifier"
      printf '<key>LibraryPath</key><string>%s</string>\n' "$library"
      printf '<key>SupportedPlatform</key><string>%s</string>\n' "$platform"
      if [[ -n "$variant" ]]; then printf '<key>SupportedPlatformVariant</key><string>%s</string>\n' "$variant"; fi
      printf '<key>SupportedArchitectures</key><array>\n'
      while IFS= read -r arch; do printf '<string>%s</string>\n' "$arch"; done <<< "$archs"
      printf '</array></dict>\n'
    done
    printf '</array></dict></plist>\n'
  } > "$container/Info.plist"
}

# Clone on APFS where possible; fall back to an ordinary copy on other volumes.
copy_library() {
  cp -c "$1" "$2" 2>/dev/null || cp -p "$1" "$2"
}

# Update one SDK atomically and retain other SDKs already prepared in this build.
# Returns the module's CONTAINER_ROOT for the linker staging step.
# The caller holds the assembly lock across both assembly and linker staging.
assemble_module() {
  local root="$CONTAINERS/$MODULE" library existing=true temporary previous='' old_archs platform variant ignored deployment
  local signature_file="$CONTAINERS/$MODULE/.slices/$SDK.stamp"
  CONTAINER_ROOT="$root"
  for library in "${MODULE_LIBRARIES[@]}"; do
    if [[ ! -f "$root/${library%.a}.xcframework/$META_IDENTIFIER/$library" || ! -f "$root/${library%.a}.xcframework/Info.plist" ]]; then existing=false; fi
  done
  if [[ -f "$signature_file" && "$(cat "$signature_file")" == "$SOURCE_SIGNATURE" && "$existing" == true ]]; then return; fi
  temporary="$root.$$.assemble"
  TEMP_PATHS+=("$temporary")
  mkdir -p "$temporary"
  if [[ -d "$root" ]]; then ditto "$root" "$temporary"; fi
  if [[ -f "$temporary/.slices/$SDK.json" ]]; then
    old_archs=$(json_strings "$temporary/.slices/$SDK.json" architectures)
    IFS='|' read -r ignored platform variant deployment <<< "$(sdk_descriptor "$SDK")"
    previous="$platform-$(printf '%s\n' "$old_archs" | LC_ALL=C sort | paste -sd _ -)${variant:+-$variant}"
  fi
  mkdir -p "$temporary/.slices"
  rm -f "$temporary/.slices/$SDK.signature"
  cp "$SOURCE_DIRECTORY/metadata.json" "$temporary/.slices/$SDK.json"
  for library in "${MODULE_LIBRARIES[@]}"; do
    local container="$temporary/${library%.a}.xcframework"
    if [[ -n "$previous" && "$previous" != "$META_IDENTIFIER" ]]; then rm -rf "$container/$previous"; fi
    mkdir -p "$container/$META_IDENTIFIER"
    copy_library "$SOURCE_DIRECTORY/$library" "$container/$META_IDENTIFIER/$library"
    write_xcframework_plist "$container" "$library" "$temporary/.slices"
  done
  printf '%s\n' "$SOURCE_SIGNATURE" > "$temporary/.slices/$SDK.stamp"
  replace_directory "$temporary" "$root"
  note "Prepared $SDK XCFramework slices ($(printf '%s' "$META_ARCHS" | tr '\n' ' '))"
}

# MARK: Linker inputs

# stage_module: expose the selected slice as librnskia_<name>.a in OUTPUT.
# Static libraries link into the app; XCFramework containers are build inputs,
# rather than dynamic frameworks copied into the app's Frameworks directory.
# Build-product stamps include SDK/version/source identity, avoiding equal-size
# archives from another platform and unnecessary copies on incremental builds.
# Stamps must never use the .signature extension: Xcode collects *.signature
# files from build products into the archive, and App Store Connect rejects
# them as invalid XCFramework code signatures (ITMS-91063).
stage_module() {
  local library destination temporary stamp="$OUTPUT/.rnskia-$MODULE.stamp"
  local signature="$SDK:$VERSION:$SOURCE_SIGNATURE" name
  mkdir -p "$OUTPUT"
  # Archive build folders persist across runs; drop stamps from older releases.
  rm -f "$OUTPUT/.rnskia-$MODULE.signature"
  for library in "${MODULE_LIBRARIES[@]}"; do
    name="${library#lib}"
    destination="$OUTPUT/librnskia_$name"
    if [[ -f "$stamp" && "$(cat "$stamp")" == "$signature" && -f "$destination" ]]; then continue; fi
    temporary="$destination.$$.tmp"
    TEMP_PATHS+=("$temporary")
    copy_library "$CONTAINER_ROOT/${library%.a}.xcframework/$META_IDENTIFIER/$library" "$temporary"
    mv "$temporary" "$destination"
  done
  printf '%s\n' "$signature" > "$stamp"
}

# MARK: Entry point

# Configuration mode performs no downloads; native mode requires Xcode settings.
# Global state is shared with helpers; initialize cleanup ownership before any
# operation that may fail. CLI arguments override the Xcode directory defaults.
main() {
  WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/rnskia-apple.XXXXXX")
  LOCKS=()
  TEMP_PATHS=()
  trap 'report_failure "$?" "$LINENO" "$BASH_COMMAND"' ERR
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  local config=false spm_package='' header module manifest_hash
  PROJECT_ROOT="$PACKAGE_ROOT"
  OUTPUT="${BUILT_PRODUCTS_DIR:-}"
  ASSEMBLY_ROOT="${OBJROOT:+$OBJROOT/ReactNativeSkiaBinaries}"
  DAWN_MODE=auto
  while (($# > 0)); do
    case "$1" in
      --config) config=true; shift ;;
      --project-root|--output|--assembly-root|--dawn|--spm-package)
        (($# > 1)) && [[ -n "$2" ]] || fail "Missing value for $1."
        case "$1" in
          --project-root) PROJECT_ROOT="$2" ;;
          --output) OUTPUT="$2" ;;
          --assembly-root) ASSEMBLY_ROOT="$2" ;;
          --dawn) DAWN_MODE="$2" ;;
          --spm-package) spm_package="$2" ;;
        esac
        shift 2 ;;
      *) fail "Unknown preparation option '$1'." ;;
    esac
  done
  if [[ "$config" != true ]]; then detect_target; fi
  load_release
  resolve_dawn
  ALL_LIBRARIES=("${RNSKIA_SKIA_LIBRARIES[@]}")
  if [[ "$DAWN_MODE" == own ]]; then ALL_LIBRARIES+=("$RNSKIA_DAWN_LIBRARY"); fi
  if [[ -n "$spm_package" ]]; then write_spm_package "$spm_package"; fi
  if [[ "$config" == true ]]; then print_configuration; return; fi
  [[ "$OUTPUT" == /* && "$ASSEMBLY_ROOT" == /* ]] || fail 'Missing absolute binary output/build directory. Run preparation from the installed Xcode phase.'
  [[ "${ENABLE_USER_SCRIPT_SANDBOXING:-NO}" != YES ]] || fail 'Binary preparation needs release-cache/build-product access. Set User Script Sandboxing to No on this app target.'
  for header in cpp/skia/include/core/SkCanvas.h cpp/dawn/include/webgpu/webgpu.h; do
    [[ -f "$PACKAGE_ROOT/$header" ]] || fail "The react-native-skia package is missing $header. Reinstall it; contributors must run yarn copy-skia-headers."
  done
  # Isolate assembly after a release/manifest change, while keeping all SDKs of
  # this manifest together. A clean build folder removes generated containers.
  manifest_hash=$(hash_file "$MANIFEST")
  CONTAINERS="$ASSEMBLY_ROOT/$VERSION-${manifest_hash:0:16}"
  # Downloads have their own shared locks; assembly/staging uses this build root.
  local modules=(skia)
  if [[ "$DAWN_MODE" == own ]]; then modules+=(dawn); fi
  for module in "${modules[@]}"; do
    MODULE="$module"
    MODULE_LIBRARIES=("${RNSKIA_SKIA_LIBRARIES[@]}")
    if [[ "$module" == dawn ]]; then MODULE_LIBRARIES=("$RNSKIA_DAWN_LIBRARY"); fi
    resolve_libraries "$SDK"
    acquire_lock "$ASSEMBLY_ROOT.lock"
    assemble_module
    stage_module
    release_lock "$ASSEMBLY_ROOT.lock"
  done
  note "Ready: $SDK (${REQUESTED_ARCHS[*]}); Dawn $DAWN_MODE"
}

# Sourcing exposes helpers for fixture tests; direct execution prepares binaries.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
