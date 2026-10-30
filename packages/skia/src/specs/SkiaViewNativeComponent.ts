import { codegenNativeComponent, type ViewProps } from "react-native";
import type { WithDefault } from "react-native/Libraries/Types/CodegenTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - pointerEvents needs to be redeclared for codegen to generate native bindings
export interface NativeProps extends ViewProps {
  highBitDepth?: boolean;
  // "srgb", "display-p3", or empty for the display's color space (see
  // views/types.ts)
  colorSpace?: string;
  // The `static` prop: frames presented as images, with no surface.
  staticPresentation?: WithDefault<boolean, false>;
  // The `android` prop, resolved (see views/android.ts)
  androidBackingView?: WithDefault<
    "TextureView" | "SurfaceView" | "HardwareBufferView",
    "TextureView"
  >;
  androidOpaque?: WithDefault<boolean, false>;
  androidZOrderOnTop?: WithDefault<boolean, false>;
  androidZOrderMediaOverlay?: WithDefault<boolean, false>;
  pointerEvents?: WithDefault<
    "auto" | "none" | "box-none" | "box-only",
    "auto"
  >;
}

// eslint-disable-next-line import/no-default-export
export default codegenNativeComponent<NativeProps>("SkiaView");
