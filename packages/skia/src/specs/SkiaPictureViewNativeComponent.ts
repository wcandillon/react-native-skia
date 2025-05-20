import codegenNativeComponent from "react-native/Libraries/Utilities/codegenNativeComponent";
import type { ViewProps } from "react-native";

export interface NativeProps extends ViewProps {
  debug?: boolean;
  opaque?: boolean;
  colorSpace?: string;
}

// eslint-disable-next-line import/no-default-export
export default codegenNativeComponent<NativeProps>("SkiaPictureView");
