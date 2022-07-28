/* eslint-disable @typescript-eslint/ban-ts-comment */

import type { HostComponent, ViewProps } from "react-native";
// @ts-ignore
import codegenNativeComponent from "react-native/Libraries/Utilities/codegenNativeComponent";
// @ts-ignore
import type { WithDefault } from "react-native/Libraries/Types/CodegenTypes";

type DrawMode = "continuous" | "default";

export interface NativeProps extends ViewProps {
  nativeID: string;
  debug?: boolean;
  mode?: WithDefault<DrawMode, "default">;
}

// eslint-disable-next-line import/no-default-export
export default codegenNativeComponent<NativeProps>(
  "ReactNativeSkiaView"
) as HostComponent<NativeProps>;
