# Contributing

## Library Development

To develop react-native-skia, you can build the skia libraries on your computer. Alternatively, you can use the pre-built binaries.

### Using pre-built binaries

The Skia prebuilt binaries are installed as npm dependencies (`react-native-skia-android`, `react-native-skia-apple-*`). The native build systems (Gradle, CocoaPods) automatically resolve these packages.

- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`

### Building

If you have Android Studio installed, make sure `$ANDROID_NDK` is available.
`ANDROID_NDK=/Users/username/Library/Android/sdk/ndk/<version>` for instance.
If the NDK is not installed, you can install it via Android Studio by going to the menu _File > Project Structure_.
And then the _SDK Location_ section. It will show you the NDK path, or the option to Download it if you don't have it installed.


- Checkout submodules: `git submodule update --init --recursive`
- Install dependencies: `yarn`
- Go to the package folder: `cd packages/skia`
- Build the Skia libraries: `yarn build-skia` (this can take a while)
- Copy Skia headers: `yarn copy-skia-headers`

### Upgrading

If a new version of Skia is included in an upgrade of this library, you need to perform a few extra steps before continuing:

1. Update submodules: `git submodule update --recursive --remote`
2. Clean Skia: `yarn clean-skia`
3. Build Skia: `yarn build-skia`
4. Copy Skia Headers: `yarn copy-skia-headers`
5. Run pod install in the example project

### Publishing

- Run the commands in the [Building](#building) section
- Build the Android binaries with `yarn build-skia-android`
- Build the NPM package with `yarn build-npm`

Publish the NPM package manually. The output is found in the `dist` folder.

- Install Cocoapods in the example/ios folder `cd example/ios && pod install && cd ..`

### Testing

When making contributions to the project, an important part is testing.
In the `package` folder, we have several scripts set up to help you maintain the quality of the codebase and test your changes:

- `yarn lint` — Lints the code for potential errors and to ensure consistency with our coding standards.
- `yarn tsc` — Runs the TypeScript compiler to check for typing issues.
- `yarn test` — Executes the unit tests to ensure existing features work as expected after changes.
- `yarn e2e` — Runs end-to-end tests. For these tests to run properly, you need to have the example app running. Use `yarn ios` or `yarn android` in the `example` folder and navigate to the Tests screen within the app.

### Running End-to-End Tests

To ensure the best reliability, we encourage running end-to-end tests before submitting your changes:

1. Start the example app:
```sh
cd example
yarn ios # or yarn android for Android testing
```

Once the app is open in your simulator or device, press the "Tests" item at the bottom of the list.
   
2. With the example app running and the Tests screen open, run the following command in the `package` folder:
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

e2e tests are located in the `package/__tests__/e2e/` directory. You can create a file there or add a new test to an existing file depending on what is most sensible.
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

### 🔑 Key Differences

#### Drawing Commands (Skottie-style)
- Use `CommandType::DrawSkottie` or similar
- Implement `draw(DrawingCtx *ctx)` method
- Render directly to `ctx->canvas`
- Examples: Skottie, Circle, Rect, Text

#### Context Declarations (ImageFilter-style)
- Use `CommandType::PushImageFilter` or similar
- Implement `pushImageFilter(DrawingCtx *ctx)` method
- Modify context state (e.g., `ctx->imageFilters.push_back()`)
- Examples: ImageFilter, ColorFilter, MaskFilter, Shader

### 📋 Checklist

When adding a new component, ensure you:

- [ ] Define props interface in `Drawings.ts`
- [ ] Add node type in `NodeType.ts`
- [ ] Create React component
- [ ] Export component in `index.ts`
- [ ] Add property converter (if needed) in `Convertor.h`
- [ ] Implement C++ command class
- [ ] Register command in `RNRecorder.h`
- [ ] Add execution logic in `RNRecorder.h`
- [ ] Update Node classification (if needed) in `Node.ts`
- [ ] Create comprehensive tests
- [ ] Verify TypeScript compilation
- [ ] Run and verify tests pass

### 📚 Reference Implementation

The ImageFilter component serves as a complete reference implementation for context declarations, while Skottie serves as a reference for drawing commands. Both follow the established patterns and can be used as templates for new components.

### 🔄 Pattern Summary

This pattern allows you to add both types of components consistently to the React Native Skia scene graph system, maintaining clean separation between React component layer, type definitions, and native C++ implementation.
