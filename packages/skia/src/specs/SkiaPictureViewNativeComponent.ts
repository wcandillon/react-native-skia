import { codegenNativeComponent, type ViewProps } from "react-native";
import type { WithDefault } from "react-native/Libraries/Types/CodegenTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - pointerEvents needs to be redeclared for codegen to generate native bindings
export interface NativeProps extends ViewProps {
  debug?: boolean;
  opaque?: boolean;
  colorSpace?: string;
  highBitDepth?: boolean;
  androidWarmup?: boolean;
  pointerEvents?: WithDefault<
    "auto" | "none" | "box-none" | "box-only",
    "auto"
  >;
}

// eslint-disable-next-line import/no-default-export
export default codegenNativeComponent<NativeProps>("SkiaPictureView");
