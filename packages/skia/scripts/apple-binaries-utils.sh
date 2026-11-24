#!/bin/bash
# Shared Apple preparation helpers. Bash 3.2 and macOS system tools only.
#
# Sourced by prepare-apple-binaries.sh; does not download or write files on load.
# The caller owns WORK_DIR, LOCKS, TEMP_PATHS, and cleanup traps. Helpers return
# resolved paths/metadata through globals so lock ownership stays in one shell.

# MARK: Supported SDKs and linked libraries

# The release metadata supplies architectures; SDK groups can change their archs
# without changing this list or hardcoding XCFramework slice identifiers.
RNSKIA_SDKS=(
  iphoneos iphonesimulator maccatalyst
  appletvos appletvsimulator macos
)
RNSKIA_SKIA_LIBRARIES=(
  libskia.a libsvg.a libskshaper.a libskparagraph.a
  libskunicode_core.a libskunicode_libgrapheme.a libskottie.a libsksg.a
)
RNSKIA_DAWN_LIBRARY=libwebgpu_dawn.a

# MARK: Release and cache policy

# Overrides are resolved when loading the installed manifest, not while sourcing.
RNSKIA_RELEASE_BASE_URL=https://github.com/wcandillon/react-native-skia/releases/download
RNSKIA_LOCK_TIMEOUT_SECONDS=600
RNSKIA_LOCK_POLL_SECONDS=0.1

# Bound retries and transfer time so an unavailable mirror fails the build phase
# with a useful error. A failed transfer never replaces a verified cache entry.
RNSKIA_CURL_OPTIONS=(
  --fail --location --silent --show-error
  --retry 2 --retry-delay 1 --retry-max-time 300
  --connect-timeout 20 --max-time 300
)

# MARK: Diagnostics and metadata readers

# Diagnostics stay on stderr so --config can return machine-readable JSON.
# The marker suppresses a second generic diagnostic from the caller's ERR trap.
fail() {
  printf 'error: [react-native-skia] %s\n' "$*" >&2
  : > "$WORK_DIR/failed"
  exit 1
}

note() {
  printf 'note: [react-native-skia] %s\n' "$*" >&2
}

# Read typed JSON values without Node or an optional package such as jq.
json_string() {
  if ! plutil -extract "$2" raw -expect string -o - "$1"; then
    printf 'error: [react-native-skia] Cannot read string %s in %s. Check the package/SDK metadata.\n' "$2" "$1" >&2
    return 1
  fi
}

# json_strings FILE KEY: emit one array element per line, preserving JSON types.
json_strings() {
  local file="$1" key="$2" count index
  count=$(plutil -extract "$key" raw -expect array -o - "$file") || return 1
  for ((index = 0; index < count; index++)); do
    json_string "$file" "$key.$index" || return 1
  done
}

# Hash downloaded archives and small manifests, not each large extracted library.
hash_file() {
  shasum -a 256 "$1" | cut -d ' ' -f 1
}

# MARK: Platform and dependency resolution

# PLATFORM_NAME=macosx needs its Catalyst variant to select iOS-compatible code.
# Each row is SDK|binary platform|variant|deployment setting.
sdk_descriptor() {
  case "$1" in
    iphoneos)         echo 'iphoneos|ios||IPHONEOS_DEPLOYMENT_TARGET' ;;
    iphonesimulator)  echo 'iphonesimulator|ios|simulator|IPHONEOS_DEPLOYMENT_TARGET' ;;
    maccatalyst)      echo 'maccatalyst|ios|maccatalyst|IPHONEOS_DEPLOYMENT_TARGET' ;;
    appletvos)        echo 'appletvos|tvos||TVOS_DEPLOYMENT_TARGET' ;;
    appletvsimulator) echo 'appletvsimulator|tvos|simulator|TVOS_DEPLOYMENT_TARGET' ;;
    macos)            echo 'macos|macos||MACOSX_DEPLOYMENT_TARGET' ;;
    *) return 1 ;;
  esac
}

# Resolve regular, hoisted, and pnpm-linked packages by walking node_modules
# from the real package directory, matching Node's filesystem search order.
# Missing optional packages yield an empty path, not a shell error diagnostic.
find_package() {
  local name="$1" start directory
  shift
  for start in "$@"; do
    [[ -d "$start" ]] || continue
    directory=$(cd "$start" && pwd -P)
    while :; do
      if [[ -f "$directory/node_modules/$name/package.json" ]]; then
        (cd "$directory/node_modules/$name" && pwd -P)
        return 0
      fi
      [[ "$directory" != / ]] || break
      directory=$(dirname "$directory")
    done
  done
  return 0
}

# The installed manifest pins immutable release assets; never fetch a remote pin.
# Sets MANIFEST, VERSION, RELEASE_TAG, CACHE_ROOT, and RELEASE_URL. Cache entries
# are shared across projects and isolated by release tag and pinned SHA-256.
load_release() {
  MANIFEST="$PACKAGE_ROOT/binaries.json"
  VERSION=$(json_string "$MANIFEST" version) || fail "Cannot read version from $MANIFEST. Reinstall the package."
  RELEASE_TAG=$(json_string "$MANIFEST" tag) || fail "Cannot read tag from $MANIFEST. Reinstall the package."
  [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ && "$RELEASE_TAG" == "binaries-$VERSION" ]] ||
    fail "Invalid version/tag in $MANIFEST. Refresh the release manifest."
  CACHE_ROOT="${RNSKIA_CACHE_DIR:-$HOME/Library/Caches/react-native-skia}/$RELEASE_TAG"
  [[ "$CACHE_ROOT" == /* ]] || fail 'RNSKIA_CACHE_DIR must be an absolute path.'
  RELEASE_URL="${REACT_NATIVE_SKIA_BINARIES_URL:-$RNSKIA_RELEASE_BASE_URL}"
  RELEASE_URL="${RELEASE_URL%/}/$RELEASE_TAG"
}

# One compatible Dawn per app. Explicit ownership comes from native autolinking.
# Sets DAWN_MODE to own/external. External ownership requires both the release
# version and Dawn commit to match; older npm binary packages are not consulted.
resolve_dawn() {
  local webgpu actual commit expected_commit
  DAWN_MODE="${DAWN_MODE:-auto}"
  [[ "$DAWN_MODE" == auto || "$DAWN_MODE" == own || "$DAWN_MODE" == external ]] || fail "--dawn must be own or external."
  # An explicit standalone build needs no optional module lookup at all.
  [[ "$DAWN_MODE" != own ]] || return 0
  webgpu=$(find_package react-native-webgpu "$PROJECT_ROOT" "$PACKAGE_ROOT")
  if [[ "$DAWN_MODE" == auto ]]; then
    DAWN_MODE=own
    if [[ -n "$webgpu" && "${RNSKIA_VENDOR_DAWN:-0}" != 1 ]]; then DAWN_MODE=external; fi
  fi
  [[ "$DAWN_MODE" == external ]] || return 0
  [[ -n "$webgpu" ]] || fail 'react-native-webgpu supplies Dawn but cannot be found. Reinstall dependencies or refresh native autolinking.'
  [[ -f "$webgpu/binaries.json" ]] || fail 'react-native-webgpu must ship binaries.json to verify the shared Dawn release. Upgrade WebGPU to the SDK-archive integration.'
  actual=$(json_string "$webgpu/binaries.json" version)
  commit=$(json_string "$webgpu/binaries.json" dawn.commit)
  expected_commit=$(json_string "$MANIFEST" dawn.commit)
  [[ -n "$commit" && -n "$expected_commit" && "$actual" == "$VERSION" && "$commit" == "$expected_commit" ]] ||
    fail "Dawn version mismatch: Skia requires $VERSION ($expected_commit), WebGPU pins $actual ($commit). Align their binaries.json releases."
}

# MARK: Shared cache synchronization

# acquire_lock DIRECTORY: mkdir serializes writers across app/build processes.
# Locks cover writers only. Recover an owner terminated during another build.
# LOCKS is owned by the caller's EXIT trap, including interrupted downloads.
acquire_lock() {
  local directory="$1" started=$SECONDS pid
  mkdir -p "$(dirname "$directory")"
  until mkdir "$directory" 2>/dev/null; do
    pid=$(cat "$directory/pid" 2>/dev/null) || pid=''
    if [[ "$pid" =~ ^[1-9][0-9]*$ ]] && ! kill -0 "$pid" 2>/dev/null; then
      rm -rf "$directory"
      continue
    fi
    (( SECONDS - started < RNSKIA_LOCK_TIMEOUT_SECONDS )) ||
      fail "Timed out waiting for $directory. Check for another running build before removing this lock."
    sleep "$RNSKIA_LOCK_POLL_SECONDS"
  done
  LOCKS+=("$directory")
  printf '%s\n' "$$" > "$directory/pid"
}

# Completed writes release early; the caller's cleanup ignores locks now absent.
release_lock() {
  rm -rf "$1"
}

# Keep a previous complete directory if replacing it fails.
replace_directory() {
  local source="$1" destination="$2" backup="$2.previous-$$"
  rm -rf "$backup"
  if [[ -e "$destination" ]]; then mv "$destination" "$backup"; fi
  if ! mv "$source" "$destination"; then
    if [[ -e "$backup" ]]; then mv "$backup" "$destination"; fi
    fail "Cannot replace $destination. Check build/cache permissions and free disk space."
  fi
  rm -rf "$backup"
}

# MARK: Verified release downloads

# cached_asset NAME: resolve one pinned ZIP into ASSET_DIRECTORY and set its
# SHA-256 as SOURCE_SIGNATURE. Only that SDK/module is downloaded.
# Verify every reused ZIP. Downloads/extractions are staged before replacing cache
# entries; a failed network request or checksum cannot become a cache hit.
# Returns ASSET_DIRECTORY, without capturing lock state in a subshell.
cached_asset() {
  local name="$1" expected escaped archive temporary marker entry actual
  escaped=${name//./\\.}
  expected=$(json_string "$MANIFEST" "assets.$escaped.sha256" 2>/dev/null) || expected=''
  [[ "$expected" =~ ^[a-f0-9]{64}$ ]] ||
    fail "Release $VERSION has no pinned asset '$name'. Publish/select SDK archives or build this SDK locally."
  ASSET_DIRECTORY="$CACHE_ROOT/$expected/${name%.zip}"
  archive="$ASSET_DIRECTORY.zip"
  acquire_lock "$ASSET_DIRECTORY.lock"
  actual=''
  if [[ -f "$archive" ]]; then actual=$(hash_file "$archive"); fi
  if [[ "$actual" != "$expected" ]]; then
    temporary="$archive.$$.download"
    TEMP_PATHS+=("$temporary")
    note "Downloading $name ($VERSION)"
    curl "${RNSKIA_CURL_OPTIONS[@]}" \
      --output "$temporary" "$RELEASE_URL/$name" ||
      fail "Cannot download $name. Check the release URL/network or REACT_NATIVE_SKIA_BINARIES_URL, then retry."
    actual=$(hash_file "$temporary")
    [[ "$actual" == "$expected" ]] ||
      fail "SHA-256 mismatch for $name. Expected $expected; received $actual. Unverified data was discarded."
    mv "$temporary" "$archive"
  fi
  marker="$ASSET_DIRECTORY/.verified"
  # Reuse extracted files only after the ZIP passed verification above. The
  # marker avoids extracting the same immutable archive on every app build.
  if [[ ! -f "$marker" || "$(cat "$marker")" != "$expected" ]]; then
    temporary="$ASSET_DIRECTORY.$$.extract"
    TEMP_PATHS+=("$temporary")
    mkdir -p "$temporary"
    # Archive members must remain inside the extraction directory.
    unzip -Z1 "$archive" > "$WORK_DIR/zip-entries"
    while IFS= read -r entry; do
      case "$entry" in
        ''|/*|*\\*|..|../*|*/../*|*/..) fail "Unsafe path in $name: $entry" ;;
      esac
    done < "$WORK_DIR/zip-entries"
    unzip -q "$archive" -d "$temporary"
    printf '%s\n' "$expected" > "$temporary/.verified"
    replace_directory "$temporary" "$ASSET_DIRECTORY"
  fi
  release_lock "$ASSET_DIRECTORY.lock"
  SOURCE_SIGNATURE="$expected"
}

# MARK: SDK metadata and local overrides

# validate_metadata DIRECTORY SDK: sets META_ARCHS and META_IDENTIFIER.
# Validate all requested architectures and every linked library against metadata.
# Metadata also determines future slice identifiers; no hardcoded arch sets.
# Release builds verify Mach-O members before publishing; consumers check the
# pinned archive and its descriptor without scanning every object at build time.
validate_metadata() {
  local directory="$1" sdk="$2" file platform variant ignored deployment
  local actual_sdk actual_platform actual_variant arch seen='' library libraries minimum
  file="$directory/metadata.json"
  [[ -f "$file" ]] || fail "Missing SDK metadata: $file. Rebuild local $MODULE '$sdk' or refresh the pinned SDK archive/cache."
  IFS='|' read -r ignored platform variant deployment <<< "$(sdk_descriptor "$sdk")"
  actual_sdk=$(json_string "$file" sdk)
  actual_platform=$(json_string "$file" platform)
  # Device/native macOS metadata omits variant. Catch absence inside the
  # substitution so Bash 3.2 does not inherit ERR for this optional value.
  actual_variant=$(json_string "$file" variant 2>/dev/null || true)
  [[ "$actual_sdk" == "$sdk" && "$actual_platform" == "$platform" && "$actual_variant" == "$variant" ]] ||
    fail "Incorrect SDK metadata in $directory; expected $sdk. Rebuild locally or refresh the pinned release."
  META_ARCHS=$(json_strings "$file" architectures) || fail "Invalid architecture array in $file."
  [[ -n "$META_ARCHS" ]] || fail "No architectures recorded in $file."
  while IFS= read -r arch; do
    [[ "$arch" =~ ^[A-Za-z0-9_]+$ && " $seen " != *" $arch "* ]] || fail "Invalid/duplicate architecture in $file: $arch"
    seen="$seen $arch"
  done <<< "$META_ARCHS"
  for arch in "${REQUESTED_ARCHS[@]}"; do
    [[ " $seen " == *" $arch "* ]] || fail "$sdk binaries in $directory do not contain $arch. Build that architecture or select a compatible release."
  done
  libraries=$(json_strings "$file" libraries) || fail "Invalid library array in $file."
  for library in "${MODULE_LIBRARIES[@]}"; do
    [[ -f "$directory/$library" ]] || fail "Incomplete $sdk binaries: $directory/$library is missing. Rebuild locally or remove the incomplete cache."
    [[ $'\n'"$libraries"$'\n' == *$'\n'"$library"$'\n'* ]] || fail "$file does not declare $library."
  done
  minimum=$(json_string "$file" minimumDeploymentTarget)
  if [[ -n "$minimum" ]]; then
    [[ "$minimum" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]] || fail "Invalid deployment target in $file: $minimum"
    # Numeric comparison handles both major-only and dotted deployment versions.
    if [[ -n "${!deployment:-}" ]] && ! awk -v actual="${!deployment}" -v minimum="$minimum" '
      BEGIN { split(actual, a, "."); split(minimum, m, ".");
        for (i = 1; i <= 3; i++) { if (a[i]+0 > m[i]+0) exit 0; if (a[i]+0 < m[i]+0) exit 1; } }'; then
      fail "$sdk binaries require deployment target $minimum, but $deployment=${!deployment}. Raise the app deployment target."
    fi
  fi
  META_IDENTIFIER="$platform-$(printf '%s\n' "$META_ARCHS" | LC_ALL=C sort | paste -sd _ -)${variant:+-$variant}"
}

# An existing local module tree is an explicit, read-only override. Missing SDKs
# fail instead of mixing local output with downloaded replacements.
# Sets SOURCE_DIRECTORY and SOURCE_SIGNATURE for assembly/staging. Skia and
# Dawn resolve independently, so one can be local while the other is downloaded.
resolve_libraries() {
  local sdk="$1" local_root="$PACKAGE_ROOT/libs/apple" library
  if [[ "$MODULE" == dawn ]]; then local_root="$PACKAGE_ROOT/libs/dawn/apple"; fi
  if [[ -d "$local_root" ]]; then
    SOURCE_DIRECTORY="$local_root/$sdk"
    [[ -f "$SOURCE_DIRECTORY/metadata.json" ]] ||
      fail "Local $MODULE overrides are enabled, but $SOURCE_DIRECTORY/metadata.json is missing. Build '$sdk' locally or remove that override directory."
    note "Using local $MODULE: $SOURCE_DIRECTORY"
    validate_metadata "$SOURCE_DIRECTORY" "$sdk"
    SOURCE_SIGNATURE=$({
      cat "$SOURCE_DIRECTORY/metadata.json"
      for library in "${MODULE_LIBRARIES[@]}"; do
        # Nanosecond timestamps catch rapid rebuilds without hashing large local archives.
        stat -f '%N %z %.9Fm %.9Fc' "$SOURCE_DIRECTORY/$library"
      done
    } | shasum -a 256 | cut -d ' ' -f 1)
  else
    local prefix=skia-graphite
    if [[ "$MODULE" == dawn ]]; then prefix=dawn; fi
    cached_asset "$prefix-apple-$sdk.zip"
    SOURCE_DIRECTORY="$ASSET_DIRECTORY"
    validate_metadata "$SOURCE_DIRECTORY" "$sdk"
  fi
}
