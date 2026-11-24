# Contributing

## Branches

| Branch | Version | Skia backend | npm dist-tag | Documentation |
|:--|:--|:--|:--|:--|
| `main` | v3 | Graphite | `latest` | [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) |
| `2.x` | v2 | Ganesh | `2.x` | [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/) |

`main` is where v3 is developed: it only supports the [Graphite](https://skia.org/docs/user/graphite/) backend.
`2.x` is the maintenance branch of the v2 line, which keeps the Ganesh backend and the platforms Graphite does not support (Android TV).
Open pull requests against `main`, unless the change only applies to v2.

## Contributing with coding agents

We happily accept contributions made with coding agents. Our ask is simple: if you send us agent-written content, in a pull request or an issue, start with a few sentences in your own words covering how you came across the problem, whether you experienced it yourself or it came up in an audit, a sense of how much of a pain point it is, and what your own understanding of the issue is. A partial understanding is fine; any attempt at owning the change goes a long way. Agent-written content after that is welcome.

## Library Development

To develop react-native-skia, you can build the skia libraries on your computer. Alternatively, you can use the pre-built binaries.

The minimum Apple deployment targets are iOS 15.1, tvOS 15.1, and macOS 14.0. Keep the podspec, Skia and Dawn build configurations, and Apple SDK checks aligned when changing them.

### Using pre-built binaries

The Skia prebuilt binaries ship the [Graphite](https://skia.org/docs/user/graphite/) backend, the default since v3, along with Dawn, the WebGPU implementation Graphite renders with, built from the Dawn commit the Skia release pins and shared with react-native-webgpu. There is no `postinstall` step:

- On Android, Gradle downloads them at build time from the GitHub release `binaries-<version>` of this repository, one archive per ABI being built. `packages/skia/binaries.json` pins the version and the sha256 of every archive. They are resolved as Gradle dependencies, so they are cached in the Gradle user home and later builds work offline; the `prepareSkiaBinaries` task verifies them and extracts them into `android/build/binaries`. To download from a mirror, or from a directory with `file:///...`, set the `reactNativeSkiaBinariesUrl` Gradle property or the `REACT_NATIVE_SKIA_BINARIES_URL` environment variable to a location holding `binaries-<version>/<asset>`.
- On Apple platforms an Xcode build phase prepares the selected SDK's archives from that same pinned release. CocoaPods adds the phase during `pod install`; optional SwiftPM integration adds it during `react-native spm update`. Headers ship in the main `react-native-skia` package, without binary npm dependencies. See [Apple binary preparation](#how-apple-binaries-are-prepared) for caching, local builds, and errors.

- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`
- Copy the headers: `cd packages/skia && yarn copy-skia-headers`

`yarn copy-skia-headers` copies Skia and Graphite headers from the submodule and Dawn headers from `packages/skia/libs/dawn/include`. Local Dawn headers take precedence. Otherwise, it downloads and verifies `dawn-headers.zip` from the release pinned by `binaries.json`; downloaded headers refresh when that pin's checksum changes. `yarn build-skia` prepares these inputs before dependency sync or compilation.

`yarn prepare-dawn-headers` also runs this preparation on its own. It uses the system user cache (`RNSKIA_CACHE_DIR` to override) and `REACT_NATIVE_SKIA_BINARIES_URL` for mirrors; it does not build Dawn. A source build with `yarn build-dawn <target>` supplies both source and generated headers, replacing downloaded ones. The Dawn checkout's forwarding headers alone are insufficient.

The binary packages are built and published by the **Release binaries** workflow (`.github/workflows/build-binaries.yml`), see [Upgrading Skia](#upgrading-skia).

### Building

- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`
- Go to the package folder: `cd packages/skia`
- To test a different Dawn revision, build it first with `yarn build-dawn <target>`; one target supplies the shared local headers.
- Build the Skia libraries: `yarn build-skia` (this can take a while). Header preparation errors fail before dependency sync or compilation.
- Copy Skia headers: `yarn copy-skia-headers`

#### Android

Before building, set `$ANDROID_NDK` and `$ANDROID_HOME` to your NDK and Android SDK directories.
`ANDROID_NDK="$HOME/Library/Android/sdk/ndk/<version>"` for instance.
If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_.
And then the _SDK Location_ section. It will show you the NDK path, or the option to Download it if you don't have it installed.

Both builders accept `android` to build all ABIs. For one architecture, use a Skia target such as `yarn build-skia android-arm64` or a Dawn target such as `yarn build-dawn android-arm64-v8a`.

Skia writes `.a` libraries to `libs/android/<abi>`. Dawn writes `libwebgpu_dawn.so` to `libs/dawn/android/<abi>`. Local Android libraries take precedence over downloaded binaries.

#### WebAssembly (experimental)

`yarn build-skia wasm` builds Skia Graphite for the browser's WebGPU with the Emscripten release Skia pins (installed in the Skia checkout on first use). There is no Dawn build: the browser implements WebGPU, and the WebGPU headers and JavaScript glue are generated from the pinned Dawn checkout.

Skia writes `.a` libraries to `libs/wasm/lib`, next to the headers (`skia/`), the WebGPU package (`emdawnwebgpu/`) and `metadata.json`, which records the Emscripten version, flags and defines a consumer has to match. These archives are not a module: the [skia-wasm](https://github.com/wcandillon/skia-wasm) repository links them into one. `yarn package-skia-wasm` zips them. The Release Skia Wasm workflow (`.github/workflows/build-skia-wasm.yml`) does both and publishes the archive as the GitHub release `skia-wasm-<version>`, which skia-wasm pins.

#### Apple

Both Apple builders accept SDK groups (`iphoneos`, `iphonesimulator`, `maccatalyst`, `appletvos`, `appletvsimulator`, `macos`) and individual targets such as `iphonesimulator-arm64` or `iphonesimulator-x86_64`. A group builds its configured architectures and produces lipo'd universal libraries when it has multiple architectures; a single target keeps only that architecture. Single-architecture SDKs copy their libraries directly.

Skia stages per-architecture archives in `libs/apple/<sdk>-<arch>` and writes assembled libraries plus `metadata.json` to `libs/apple/<sdk>`, including for single-architecture builds. After successful SDK assembly, its consumed staging directories are removed. Dawn uses the same layout under `libs/dawn/apple`. GN/CMake build directories remain available for incremental builds. Neither builder assembles XCFrameworks. Native consumers assemble the requested SDK slices during their Xcode build; `package-binaries` also creates the existing Apple npm XCFrameworks for other consumers.

After each Apple target compiles, both builders verify every Mach-O object's platform and architecture in its `.a` libraries before copying them or starting the next target. Each check expects only that target's architecture. The check reads archive headers and load commands directly, without extracting objects or running a tool per object.

### Upgrading Skia

Upgrading to a new Skia milestone (for example `chrome/m147` to `chrome/m150`) is a multi-stage process: bump the submodule, build locally and fix the C++ API churn, test the example app against the freshly built binaries, and publish the binary npm packages from CI. The steps below use `m150` as the running example; substitute the milestone you are upgrading to.

#### 1. Update the Skia submodule

1. In `.gitmodules`, change the `externals/skia` submodule `branch` from `chrome/m147` to `chrome/m150`.
2. Fetch and checkout the new tip:
   ```sh
   cd externals/skia
   git fetch origin chrome/m150
   git checkout FETCH_HEAD --
   cd ../..
   ```
   Confirm the submodule is on the new tip with `git -C externals/skia rev-parse HEAD`. (Once `.gitmodules` points at the new branch, `git submodule update --recursive --remote` also moves it.)

#### 2. Build Skia and fix the C++ API churn

Make sure `$ANDROID_NDK` and `$ANDROID_HOME` are set (see [Building](#building)).

1. Bootstrap depot_tools once (otherwise `gn gen` fails with `python3_bin_reldir.txt not found`):
   ```sh
   cd externals/depot_tools && ./update_depot_tools && cd ../..
   ```
2. Clean and build from `packages/skia`:
   ```sh
   cd packages/skia
   yarn clean-skia
   yarn build-skia          # all platforms, or scope it: yarn build-skia iphoneos android
                            # or a single target: yarn build-skia iphonesimulator-arm64
   yarn copy-skia-headers   # build-skia also runs this at the end
   ```
   `build-skia` runs `tools/git-sync-deps` first, which fetches third-party deps from `*.googlesource.com`. This can fail with HTTP 429 ("Short term server-time rate limit exceeded"). Re-run it with backoff until it succeeds before retrying the build:
   ```sh
   cd externals/skia && PATH=../depot_tools/:$PATH python3 tools/git-sync-deps
   ```
3. Fix any C++ compilation errors coming from the new headers. Skia's public API churns between milestones (APIs that start returning `std::optional`, `SkPath` becoming `SkPathBuilder`, gradients moving to `SkGradient`/`SkShaders`, new required includes, and so on). The wrapper code in `cpp/**` is what needs updating; the previous Skia bump commit is a good reference for the kinds of changes to expect.
   - If a vendored Skia source file starts including a header that is not copied yet (for example `src/base/SkAutoLocaleSetter.h`), add it to the copy list in `scripts/skia-configuration.ts` (`copyHeaders`) and re-run `yarn copy-skia-headers`.
   - The vendored headers under `cpp/skia/**` are generated by `copy-skia-headers` and are gitignored, so only the script and the wrapper sources show up as changes.

#### 3. Test the example app locally

Binaries you build locally take precedence over released ones: Android reads `packages/skia/libs/android` and `libs/dawn/android`, while Apple preparation reads `libs/apple/<sdk>` and `libs/dawn/apple/<sdk>`. Those directories must hold the ABIs/architectures being built. No packaging command is needed before testing local Apple SDK output.

Delete `packages/skia/libs` (and run `pod install` again) to go back to the published binaries.

From the repository root, install the native dependencies and build the example for your platform:

- iOS:

  Install CocoaPods dependencies:

  ```sh
  yarn workspace example pod:install:ios
  ```

  Then build and run:

  ```sh
  yarn workspace example ios
  ```

  Or build with:

  ```sh
  cd apps/example/ios
  xcodebuild -workspace example.xcworkspace -scheme example -sdk iphonesimulator \
    -configuration Debug -destination 'generic/platform=iOS Simulator' \
    build CODE_SIGNING_ALLOWED=NO
  cd -
  ```

- macOS:

  Install CocoaPods dependencies:

  ```sh
  yarn workspace example-macos pod:install:macos
  ```

  Then build and run:

  ```sh
  yarn workspace example-macos macos
  ```

  Or build with:

  ```sh
  cd apps/example-macos/macos
  xcodebuild -workspace example.xcworkspace -scheme ReactTestApp -sdk macosx \
    -configuration Debug -destination 'platform=macOS' \
    build CODE_SIGNING_ALLOWED=NO
  cd -
  ```

  > The [macOS runner](../../apps/example-macos/README.md) shares the mobile gallery, with a JavaScript stack for desktop navigation. Its dependencies are isolated from the mobile app.

- Android:

  Build and run:

  ```sh
  yarn workspace example android
  ```

  Or build with:

  ```sh
  cd apps/example/android
  ./gradlew :app:assembleDebug
  cd -
  ```

Run the e2e tests (see [Testing](#testing)) to validate behavior, not just compilation.

#### 4. Publish the binary npm packages (GitHub Actions)

With the submodule bump merged (the workflow detects the Skia branch from the checked-in submodule), run **Release binaries** (`.github/workflows/build-binaries.yml`) from the Actions tab. It is `workflow_dispatch` only and takes these inputs:

- `skia_branch`: build a Skia branch other than the submodule commit.
- `respin`: a letter for another build of the same Skia branch; it becomes the minor of the npm version (see below).
- `dry_run`: on by default. Build and package, upload the packages as the `npm-packages` artifact of the run and the release assets as `release-assets`, and skip the npm publish and the GitHub release. Run it first; the real run is the same workflow with `dry_run` unchecked.

One run builds everything and publishes it: Skia for iOS (device, simulator and Mac Catalyst), tvOS (device and simulator), macOS and the four Android ABIs, the monolithic Dawn (`libwebgpu_dawn`) for the same platforms from the Dawn commit Skia pins in its DEPS, with the patches in `scripts/dawn-patches` applied, and then the five npm packages generated by `scripts/package-binaries.ts` from the build artifacts:

| Package | Contents |
|:--|:--|
| `react-native-skia-graphite-android` | the Skia archives per ABI |
| `react-native-skia-graphite-apple-ios` | the Skia xcframeworks and a `Package.swift` |
| `react-native-skia-graphite-apple-tvos` | the Skia xcframeworks and a `Package.swift` |
| `react-native-skia-graphite-apple-macos` | the Skia xcframeworks and a `Package.swift` |
| `react-native-webgpu-dawn` | `libwebgpu_dawn` for Android and Apple, the Dawn headers and a `Package.swift`, shared by react-native-skia and react-native-webgpu |

They all carry the same version, derived from the Skia branch the submodule commit is on, without its `chrome/` prefix: `m150` right after a milestone bump, but once `chrome/m154` has moved past the pinned commit it is the Chromium release branch that still ends there, for example `m154_8037_58` (Chrome 154.0.8037.58). The milestone is the major and the `respin` letter the minor: `m154` is 154.0.0, `m154_8037_58b` is 154.2.0, and the branch digits do not affect it. npm never lets a version be republished: a package already on npm at the run's version is skipped by the publish step (so a rerun after a partial publish, or a first version published by hand, does not block the others), and a rebuild of the same branch once every package exists needs the next letter, which the workflow checks before building.

Publishing uses npm trusted publishing (OIDC): the workflow file must be registered as the trusted publisher of each package on npmjs.com (repository `wcandillon/react-native-skia`, workflow `build-binaries.yml`, no environment), and the first version of a new package has to be published by hand from the `npm-packages` artifact of a dry run.

The same run archives those files as the assets of the GitHub release `binaries-<version>` (a pre-release, so it never becomes the repository's latest release). Android archives are made from the package directories. Apple archives come directly from the combined SDK outputs, without npm XCFramework containers:

| Asset | Contents |
|:--|:--|
| `skia-graphite-android-<abi>.zip` | `<abi>/*.a`, one archive per ABI |
| `dawn-android-<abi>.zip` | `<abi>/libwebgpu_dawn.so`, one archive per ABI |
| `dawn-headers.zip` | `include/dawn`, `include/webgpu` and the Dawn license |
| `dawn-LICENSE.txt` | the Dawn license |
| `skia-graphite-apple-<sdk>.zip` | all Skia `.a` libraries for one SDK, plus `metadata.json` |
| `dawn-apple-<sdk>.zip` | `libwebgpu_dawn.a` for one SDK, plus `metadata.json` |
| `checksums.json` | the version, the Skia branch, the Dawn commit, and the sha256 and size of every asset |

Each Apple SDK archive is extracted into its own SDK directory; its metadata records the platform, variant, architectures, deployment target, and library names. Android archives retain their existing ABI subdirectories. A release that is already published is left alone, like a version already on npm.

The same packages and release assets can be generated locally from a full `yarn build-skia` and `yarn build-dawn` with `yarn package-binaries --skia-version=m154_8037_58b`, or from the downloaded artifacts of a run with `--artifacts=<dir>`. `yarn package-binaries --from-packages=<dir>` makes the release assets alone, from package directories that exist already (one subdirectory per package name): this historical mode preserves the previous per-XCFramework Apple asset layout, allowing an older npm release to be reproduced from extracted tarballs.

#### 5. Point the library at the new binaries

Replace `packages/skia/binaries.json`, which pins both Android and Apple downloads, with the `checksums.json` of the new release:

```sh
curl -fL https://github.com/wcandillon/react-native-skia/releases/download/binaries-<version>/checksums.json -o packages/skia/binaries.json
```

Remove local overrides under `packages/skia/libs` when switching back to released binaries, refresh the copied headers, and re-run the example's `pod install` or `spm update`. The new pin selects its own download cache. react-native-webgpu must provide the same Dawn version; the native integrations refuse mismatches.

Add the new milestone row to the compatibility table in `apps/docs/docs/webgpu.md` so users can pair the two libraries. It is the only copy: react-native-webgpu's documentation links to it.

### Swift Package Manager (preview)

CocoaPods stays the default. `Package.swift` is additive: SwiftPM ignores the
podspec, and CocoaPods ignores `Package.swift`.

Automatic SwiftPM binary preparation requires **React Native 0.87.1 or newer**.
RN 0.87.0 introduced SwiftPM tooling but lacks the autolinking plugin's
`scriptPhases` hook. Use CocoaPods or upgrade for this integration; The main
example uses CocoaPods; `spm-example` exercises the optional SwiftPM path
separately.

The harness is `spm-example/` at the repo root, deliberately outside the yarn
workspace so its React Native does not collide with the workspace's. Its
[README](../../spm-example/README.md) covers the details; the short form is:

```sh
cd spm-example && npm install
cd ios && npx react-native spm update
xcodebuild -project SpmExample.xcodeproj -scheme SpmExample \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

`spm-plugin.js` registers Skia's package and product with RN's `Autolinked`
aggregate. RN delegates native registration to the plugin, so adding only the
preparation phase would leave the native module unlinked.

The plugin references the installed Skia package through a symlink at
`<app>/ios/build/generated/autolinking/libs/ReactNativeSkia`, and SwiftPM
resolves the manifest's relative paths against that symlink rather than against
`packages/skia`. The two React Native package paths are therefore identical for
every standard app. The target name is pinned in `react-native.config.js`;
without it a future React Native release would derive it from the podspec
instead and change the header import prefix.

Autolinking recreates this generated symlink. After moving the checkout, rerun
`npx react-native spm update` from `ios/` to refresh its absolute target path.
The manifest allows only `apple`, `cpp`, and `include` into resource discovery,
excluding build products and JS dependencies automatically.

CocoaPods defines `RCT_NEW_ARCH_ENABLED` and `RCT_REMOVE_LEGACY_ARCH`
project-wide for a New Architecture app; the SwiftPM path defines neither.
Skia's own sources no longer gate on them, but React's headers do
(`RCT_REMOVE_LEGACY_ARCH` hides the legacy bridge API), so `Package.swift`
defines both itself.

The native binaries require iOS 15.1, tvOS 15.1, and macOS 14.0.
The SwiftPM integration currently targets iOS, and the platform floor of
`Package.swift` stays at `.iOS(.v15)`: React Native's generated `Autolinked`
aggregate is hardcoded to iOS 15.0, and SwiftPM refuses to link a product whose
floor is above the depending target's.

#### Binaries

The plugin generates `build/generated/autolinking/ReactNativeSkiaBinaries`,
a tiny C package carrying static library link settings, and an app phase before
compilation. `Package.swift` depends on that package alongside React Native's
generated packages. Source compilation uses headers bundled in npm, so SwiftPM
resolution does not need binary placeholders or all-platform downloads.

The app phase uses the same cache, SDK selection, local overrides, and errors
as CocoaPods (see [Apple binary preparation](#how-apple-binaries-are-prepared)). It
calls Bash directly and stages libraries into `$BUILT_PRODUCTS_DIR` before app linking. Rerun
`react-native spm update` after upgrading Skia or changing Dawn ownership so
the generated phase and link settings match the installed package.

The app's **User Script Sandboxing** must be **NO** for this preparation phase,
as it accesses the shared release cache and build products. The phase reports
an explicit error if sandboxing is enabled. CocoaPods sets this on the Skia
pod target automatically.

### How Apple binaries are prepared

This section explains what the scripts do automatically during setup and app builds (both CocoaPods and SwiftPM). No extra manual steps are required.

0. `pod install` or `react-native spm update` registers the Xcode build phase.

   CocoaPods or the RN 0.87.1+ SwiftPM plugin (`spm-plugin.js`) adds the phase automatically.
   The phase runs `prepare-apple-binaries.sh`, which sources `apple-binaries-utils.sh`.
   No binaries are downloaded during setup.

During each Apple app build, the script:

1. Selects the SDK, platform variant, and required architectures from Xcode.
2. Uses local overrides or downloads the selected SDK's Skia and Dawn archives.
3. Verifies pinned checksums and SDK metadata before use.
4. Updates the selected XCFramework slice under `$OBJROOT/ReactNativeSkiaBinaries`.
5. Stages `librnskia_*.a` files in build products for static linking.
6. Reuses unchanged downloads, slices, and libraries on later builds.

- Downloads share `~/Library/Caches/react-native-skia`, similar to React Native and Hermes handling.
- Set `RNSKIA_CACHE_DIR` to change the cache location.
- Shared Dawn requires matching release versions and Dawn commits in WebGPU's `binaries.json`.
- Expand **Prepare React Native Skia binaries** in Xcode's report navigator for errors.

See [installation](../../apps/docs/docs/getting-started/installation.md#prebuilt-binaries) for downloads and mirrors, [Apple builds](#apple) for local outputs, and [SwiftPM binaries](#binaries) for SwiftPM integration.

### Publishing

Releases are published from GitHub Actions by the **Release npm package** workflow (`.github/workflows/build-npm-react-native-skia.yml`), which is triggered manually and runs [semantic-release](https://github.com/semantic-release/semantic-release):

- On `main`, it publishes the next v3 version under the `latest` dist-tag.
- On `2.x`, it publishes the next v2 version under the `2.x` dist-tag, so that `latest` stays on v3.

The workflow takes two inputs:

- `skip_npm_publish`: build the package and upload the tarball as a workflow artifact instead of publishing it.
- `version`: release this exact version instead of letting semantic-release compute it from the commit messages.

### Documentation

The documentation website lives in [`apps/docs`](../../apps/docs). Run it locally with `yarn start` and type check its code samples with `yarn test`.
The `main` branch holds the documentation of v3. The v2 documentation is a frozen build stored in the `docs-v2` branch and served under `/v2/`.

### Testing

When making contributions to the project, an important part is testing.
In the `packages/skia` folder, we have several scripts set up to help you maintain the quality of the codebase and test your changes:

- `yarn lint`: lints the code for potential errors and to ensure consistency with our coding standards.
- `yarn tsc`: runs the TypeScript compiler to check for typing issues.
- `yarn test`: executes the unit tests to ensure existing features work as expected after changes.
- `yarn e2e`: runs end-to-end tests. For these tests to run properly, you need to have the example app running. Use `yarn ios` or `yarn android` in the `apps/example` folder and navigate to the Tests screen within the app.

### Running End-to-End Tests

To ensure the best reliability, we encourage running end-to-end tests before submitting your changes:

1. Start the example app:
```sh
cd apps/example
yarn ios # or yarn android for Android testing
```

Once the app is open in your simulator or device, press the "Tests" item at the bottom of the list.
   
2. With the example app running and the Tests screen open, run the following command in the `packages/skia` folder:
```sh
yarn e2e
```
   
This will run through the automated tests and verify that your changes have not introduced any regressions.
You can also run a particular using the following command:
```sh
E2E=true yarn test -i e2e/Colors
```

### Writing End-to-End Tests

Contributing end-to-end tests to React Native Skia is extremely useful. Below you'll find guidelines for writing tests using the `eval`, `draw`, and `drawOffscreen` commands. 

e2e tests are located in the `packages/skia/src/renderer/__tests__/e2e/` directory. You can create a file there or add a new test to an existing file depending on what is most sensible.
When looking to contribute a new test, you can refer to existing tests to see how these can be built.
The `eval` command is used to test Skia's imperative API. It requires a pure function that invokes Skia operations and returns a serialized result.

```tsx
it("should generate commands properly", async () => {
  const result = await surface.eval((Skia) => {
    const path = Skia.Path.Make();
    path.lineTo(30, 30);
    return path.toCmds();
  });
  expect(result).toEqual([[0, 0, 0], [1, 30, 30]]);
});
```

Both the `eval` and `draw` commands require a function that will be executed in an isolated context, so the functions must be pure (without external dependencies) and serializable. You can use the second parameter to provide extra data to that function.

```tsx
it("should generate commands properly", async () => {
  // Referencing the SVG variable directly in the tests would fail
  // as the function wouldn't be able to run in an isolated context
  const svg = "M 0 0, L 30 30";
  const result = await surface.eval((Skia, ctx) => {
    const path = Skia.Path.MakeFromSVGString(ctx.svg);
    return path.toCmds();
  }, { svg });
  expect(result).toEqual([[0, 0, 0], [1, 30, 30]]);
});
```

A second option is to use the `draw` command where you can test the Skia components and get the resulting image:
```tsx
it("Path with default fillType", async () => {
  const { Skia } = importSkia();
  const path = star(Skia);
  const img = await surface.draw(
    <>
      <Fill color="white" />
      <Path path={path} style="stroke" strokeWidth={4} color="#3EB489" />
      <Path path={path} color="lightblue" />
    </>
  );
  checkImage(image, "snapshots/drawings/path.png");
});
```

Finally, you can use `drawOffscreen` to receive a canvas object as parameter. You will also get the resulting image:

```tsx
  it("Should draw cyan", async () => {
    const image = await surface.drawOffscreen(
      (Skia, canvas, { size }) => {
        canvas.drawColor(Skia.Color("cyan"));
      }
    );
    checkImage(image, "snapshots/cyan.png");
  });
```

Again, since `eval`, `draw`, and `drawOffscreen` serialize the function's content, avoid any external dependencies that can't be serialized.

## Adding a Component to the Scene Graph

This guide explains how to add new components to the React Native Skia scene graph system.

### 🎯 Two Types of Components

**1. Drawing Commands** (like `Skottie`)
- Draw content directly to the canvas
- Examples: Skottie, Circle, Rect, Text

**2. Context Declarations** (like `ImageFilter`)
- Modify the rendering context for child components
- Examples: ImageFilter, ColorFilter, MaskFilter, Shader

### 📝 Step-by-Step Implementation

#### 1. **Define Component Props Interface**
📁 `src/dom/types/Drawings.ts`

```typescript
// Add import for Skia types
import { SkImageFilter } from "../../skia/types";

// Define props interface
export interface ImageFilterProps extends GroupProps {
  imageFilter: SkImageFilter;
}
```

#### 2. **Add Node Type**
📁 `src/dom/types/NodeType.ts`

```typescript
export const enum NodeType {
  // ... existing types
  ImageFilter = "skImageFilter",
}
```

#### 3. **Create React Component**
📁 `src/renderer/components/ImageFilter.tsx`

```typescript
import React from "react";
import type { ImageFilterProps } from "../../dom/types";
import type { SkiaProps } from "../processors";

export const ImageFilter = (props: SkiaProps<ImageFilterProps>) => {
  return <skImageFilter {...props} />;
};
```

#### 4. **Export Component**
📁 `src/renderer/components/index.ts`

```typescript
export * from "./ImageFilter";
```

#### 5. **Add Property Converter (if needed)**
📁 `cpp/api/recorder/Convertor.h`

For components that use complex Skia types (like `SkImageFilter`, `skottie::Animation`, etc.), add a template specialization to convert JSI values to native types:

```cpp
template <>
sk_sp<SkImageFilter> getPropertyValue(jsi::Runtime &runtime,
                                      const jsi::Value &value) {
  if (value.isObject() && value.asObject(runtime).isHostObject(runtime)) {
    auto ptr = std::dynamic_pointer_cast<JsiSkImageFilter>(
        value.asObject(runtime).asHostObject(runtime));
    if (ptr != nullptr) {
      return ptr->getObject();
    }
  } else if (value.isNull()) {
    return nullptr;
  }
  throw std::runtime_error(
      "Expected JsiSkImageFilter object or null for the imageFilter property.");
}
```

#### 6. **Implement C++ Command**
📁 `cpp/api/recorder/ImageFilters.h`

##### For Context Declarations (like ImageFilter)

```cpp
struct ImageFilterCmdProps {
  sk_sp<SkImageFilter> imageFilter;
};

class ImageFilterCmd : public Command {
private:
  ImageFilterCmdProps props;

public:
  ImageFilterCmd(jsi::Runtime &runtime, const jsi::Object &object,
                 Variables &variables)
      : Command(CommandType::PushImageFilter, "skImageFilter") {
    convertProperty(runtime, object, "imageFilter", props.imageFilter, variables);
  }

  void pushImageFilter(DrawingCtx *ctx) {
    ctx->imageFilters.push_back(props.imageFilter);
  }
};
```

##### For Drawing Commands (like Skottie)

```cpp
struct SkottieCmdProps {
  sk_sp<skottie::Animation> animation;
  float frame;
};

class SkottieCmd : public Command {
private:
  SkottieCmdProps props;

public:
  SkottieCmd(jsi::Runtime &runtime, const jsi::Object &object,
             Variables &variables)
      : Command(CommandType::DrawSkottie) {
    convertProperty(runtime, object, "animation", props.animation, variables);
    convertProperty(runtime, object, "frame", props.frame, variables);
  }

  void draw(DrawingCtx *ctx) {
    props.animation->seekFrame(props.frame);
    props.animation->render(ctx->canvas);
  }
};
```

#### 7. **Register in Recorder**
📁 `cpp/api/recorder/RNRecorder.h`

```cpp
// Add to appropriate push method
void pushImageFilter(jsi::Runtime &runtime, const std::string &nodeType,
                     const jsi::Object &props) {
  // ... existing registrations
  } else if (nodeType == "skImageFilter") {
    commands.push_back(
        std::make_unique<ImageFilterCmd>(runtime, props, variables));
  }
}
```

#### 8. **Add Execution Logic**
📁 `cpp/api/recorder/RNRecorder.h`

```cpp
// In the play method's switch statement
case CommandType::PushImageFilter: {
  auto nodeType = cmd->nodeType;
  // ... existing cases
  } else if (nodeType == "skImageFilter") {
    auto *imageFilterCmd = static_cast<ImageFilterCmd *>(cmd.get());
    imageFilterCmd->pushImageFilter(ctx);
  }
  break;
}
```

#### 9. **Update Node Classification (if needed)**
📁 `src/sksg/Node.ts`

For new general component types (like `ImageFilter`, `ColorFilter`, etc.), add them to the appropriate classification function:

```typescript
// For context declarations like ImageFilter
export const isImageFilter = (type: NodeType) => {
  "worklet";
  return (
    type === NodeType.ImageFilter ||        // Add your new general type here
    type === NodeType.OffsetImageFilter ||
    // ... other specific types
  );
};
```

#### 10. **Create Tests**
📁 `src/renderer/__tests__/e2e/ImageFilter.spec.tsx`

```typescript
import React from "react";
import { checkImage, docPath } from "../../../__tests__/setup";
import { importSkia, surface } from "../setup";
import { ImageFilter, Circle, Group } from "../../components";
import { TileMode } from "../../../skia/types";

describe("ImageFilter", () => {
  it("Should render ImageFilter component with blur filter", async () => {
    const { Skia } = importSkia();
    const blurFilter = Skia.ImageFilter.MakeBlur(10, 10, TileMode.Clamp, null);
    
    const img = await surface.draw(
      <Group>
        <ImageFilter imageFilter={blurFilter}>
          <Circle cx={50} cy={50} r={30} color="red" />
        </ImageFilter>
      </Group>
    );
    
    checkImage(img, docPath("image-filter/blur-filter.png"));
  });
});
```

#### 11. **Verify Implementation**

```bash
# Check TypeScript compilation
yarn tsc --noEmit

# Create test image directory
mkdir -p apps/docs/static/img/your-component/

# Run tests
yarn test src/renderer/__tests__/e2e/YourComponent.spec.tsx
```
This pattern allows you to add both types of components consistently to the React Native Skia scene graph system, maintaining clean separation between React component layer, type definitions, and native C++ implementation.
