# Contributing

## Branches

| Branch | Version | Skia backend | npm dist-tag | Documentation |
|:--|:--|:--|:--|:--|
| `main` | v3 | Graphite | `latest` | [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) |
| `2.x` | v2 | Ganesh | `2.x` | [wcandillon.github.io/react-native-skia/v2](https://wcandillon.github.io/react-native-skia/v2/) |

`main` is where v3 is developed: it only supports the [Graphite](https://skia.org/docs/user/graphite/) backend.
`2.x` is the maintenance branch of the v2 line, which keeps the Ganesh backend and the platforms Graphite does not support (tvOS, Mac Catalyst).
Open pull requests against `main`, unless the change only applies to v2.

## Library Development

To develop react-native-skia, you can build the skia libraries on your computer. Alternatively, you can use the pre-built binaries.

### Using pre-built binaries

The Skia prebuilt binaries are installed as npm dependencies (`react-native-skia-graphite-android`, `react-native-skia-graphite-apple-*`). They ship the [Graphite](https://skia.org/docs/user/graphite/) backend, the default since v3, together with the shared Dawn (`libwebgpu_dawn`). The native build systems (Gradle, CocoaPods) automatically resolve these packages; there is no `postinstall` step.

- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`
- Copy the headers: `cd packages/skia && yarn copy-skia-headers`

`yarn copy-skia-headers` copies the Skia headers from the submodule and the Graphite and Dawn headers from the `react-native-skia-graphite-headers` package. The binaries themselves are not copied: Gradle reads them in place from `node_modules`, and the podspec copies them in at `pod install` time.

The binary packages are built and published by the **Build and publish binaries** workflow (`.github/workflows/build-binaries.yml`), see [Upgrading Skia](#upgrading-skia).

### Building

If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.
If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_.
And then the _SDK Location_ section. It will show you the NDK path, or the option to Download it if you don't have it installed.


- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`
- Go to the package folder: `cd packages/skia`
- Build the Skia libraries: `yarn build-skia` (this can take a while). Locally built binaries in `libs/` take precedence over the npm packages; delete `libs/` to go back to the prebuilt ones.
- Optionally build Dawn: `yarn build-dawn` builds the monolithic `libwebgpu_dawn` that ships as the `react-native-webgpu-dawn` package into `libs/dawn`, from the Dawn checkout Skia pins. Developing the library does not need it: the Dawn from the npm packages is used (see below).
- Copy Skia headers: `yarn copy-skia-headers`

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
   yarn build-skia          # all platforms, or scope it: yarn build-skia apple-ios android
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

Binaries you build locally take precedence over the npm packages: `build.gradle` uses `packages/skia/libs/android` when it exists, and the podspec keeps `libs/ios` and `libs/macos` when they hold xcframeworks without a `.version` stamp (the stamp marks frameworks copied from npm). `yarn build-skia` builds Skia only, while the native builds link the shared Dawn (`libwebgpu_dawn`, the same artifact react-native-webgpu links), so copy it in from the npm packages next to your build:

```sh
for abi in armeabi-v7a arm64-v8a x86 x86_64; do
  cp node_modules/react-native-skia-graphite-android/libs/$abi/libwebgpu_dawn.so packages/skia/libs/android/$abi/
done
for platform in ios macos; do
  cp -R node_modules/react-native-skia-graphite-apple-$platform/libs/libwebgpu_dawn.xcframework packages/skia/libs/$platform/
done
cd apps/example/ios && pod install && cd -
```

Delete `packages/skia/libs` (and run `pod install` again) to go back to the published binaries.

Then build both platforms:

- iOS:
  ```sh
  cd apps/example/ios
  xcodebuild -workspace example.xcworkspace -scheme example -sdk iphonesimulator \
    -configuration Debug -destination 'generic/platform=iOS Simulator' \
    build CODE_SIGNING_ALLOWED=NO
  ```
- Android:
  ```sh
  cd apps/example/android && ./gradlew :app:assembleDebug
  ```

`yarn ios` / `yarn android` work too. Run the e2e tests (see [Testing](#testing)) to validate behavior, not just compilation.

#### 4. Publish the binary npm packages (GitHub Actions)

With the submodule bump merged (the workflow detects the Skia branch from the checked-in submodule), run **Build and publish binaries** (`.github/workflows/build-binaries.yml`) from the Actions tab. It is `workflow_dispatch` only and takes these inputs:

- `skia_branch`: build a Skia branch other than the submodule commit.
- `respin`: a letter for another build of the same Skia branch; it becomes the minor of the npm version (see below).
- `dry_run`: on by default. Build and package, upload the packages as the `npm-packages` artifact of the run, and skip the npm publish. Run it first; the real run is the same workflow with `dry_run` unchecked.

One run builds everything and publishes it: Skia for iOS, macOS and the four Android ABIs (no tvOS/maccatalyst), the monolithic Dawn (`libwebgpu_dawn`) for the same platforms from the Dawn commit Skia pins in its DEPS, with the patches in `scripts/dawn-patches` applied, and then the four npm packages generated by `scripts/package-binaries.ts` from the build artifacts:

| Package | Contents |
|:--|:--|
| `react-native-skia-graphite-android` | the Skia archives per ABI |
| `react-native-skia-graphite-apple-ios` | the Skia xcframeworks and a `Package.swift` |
| `react-native-skia-graphite-apple-macos` | the Skia xcframeworks and a `Package.swift` |
| `react-native-webgpu-dawn` | `libwebgpu_dawn` for Android and Apple, the Dawn headers and a `Package.swift`, shared by react-native-skia and react-native-webgpu |

They all carry the same version, derived from the Skia branch the submodule commit is on, without its `chrome/` prefix: `m150` right after a milestone bump, but once `chrome/m154` has moved past the pinned commit it is the Chromium release branch that still ends there, for example `m154_8037_58` (Chrome 154.0.8037.58). The milestone is the major and the `respin` letter the minor: `m154` is 154.0.0, `m154_8037_58b` is 154.2.0, and the branch digits do not affect it. npm never lets a version be republished: a package already on npm at the run's version is skipped by the publish step (so a rerun after a partial publish, or a first version published by hand, does not block the others), and a rebuild of the same branch once every package exists needs the next letter, which the workflow checks before building.

Publishing uses npm trusted publishing (OIDC): the workflow file must be registered as the trusted publisher of each package on npmjs.com (repository `wcandillon/react-native-skia`, workflow `build-binaries.yml`, no environment), and the first version of a new package has to be published by hand from the `npm-packages` artifact of a dry run.

The same packages can be generated locally from a full `yarn build-skia` and `yarn build-dawn` with `yarn package-binaries --skia-version=m154_8037_58b`, or from the downloaded artifacts of a run with `--artifacts=<dir>`.

#### 5. Point the library at the new binaries

Bump the prebuilt binary versions in `packages/skia/package.json` (`react-native-skia-graphite-*`) to the version you just published, delete `packages/skia/libs`, run `yarn`, and re-run `pod install` in the example app so it consumes the released binaries.

### Swift Package Manager (preview)

CocoaPods stays the default. `Package.swift` is additive: SwiftPM ignores the
podspec, and CocoaPods ignores `Package.swift`.

SwiftPM support requires **React Native 0.87 or newer**: earlier releases ship
no `scripts/spm`. `apps/example` is on an older version, so it cannot exercise
this path.

Autolinking references the library through a symlink at
`<app>/ios/build/generated/autolinking/libs/ReactNativeSkia`, and SwiftPM
resolves the manifest's relative paths against that symlink rather than against
`packages/skia`. The two React Native package paths are therefore identical for
every standard app. The target name is pinned in `react-native.config.js`;
without it a future React Native release would derive it from the podspec
instead and change the header import prefix.

Skia's Apple sources still gate on `RCT_NEW_ARCH_ENABLED` and
`RCT_REMOVE_LEGACY_ARCH`. CocoaPods forces both project-wide; the SwiftPM path
defines neither, so `Package.swift` defines them itself.

The library requires iOS 15.1 (see the podspec), but the platform floor of
`Package.swift` stays at `.iOS(.v15)`: React Native's generated `Autolinked`
aggregate is hardcoded to iOS 15.0, and SwiftPM refuses to link a product whose
floor is above the depending target's.

#### Binaries

The manifest links the `react-native-skia-graphite-apple-ios` npm package, the
same one the CocoaPods build uses, so no network is needed once dependencies are
installed. It is resolved by path, from either a sibling in `node_modules` or
this monorepo's root, and the manifest fails with an explanatory message when
neither exists, which is what an `--omit=optional` install looks like.

A remote Swift package with the binaries as `url` targets was tried and dropped: the
path-based manifest covers React Native's SwiftPM autolinking, and hosting the
xcframework zips was the only thing that still needed a GitHub release.

After changing which binaries a checkout uses, delete
`ios/<App>.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`:
a stale pin silently keeps the previous source.

### Publishing

Releases are published from GitHub Actions by the **Create a release (react-native-skia)** workflow (`.github/workflows/build-npm-react-native-skia.yml`), which is triggered manually and runs [semantic-release](https://github.com/semantic-release/semantic-release):

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
