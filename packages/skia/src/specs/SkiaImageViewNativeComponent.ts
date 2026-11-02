import { codegenNativeComponent, type ViewProps } from "react-native";
import type { Double } from "react-native/Libraries/Types/CodegenTypes";

// pointerEvents, like every View prop, reaches the Android view through
// ReactViewManager's setters (see SkiaImageViewManager).
export interface NativeProps extends ViewProps {
  // The id the view shows its image by (SkiaViewApi.presentedImageId); 0
  // shows nothing.
  presentedImageId?: Double;
}

// eslint-disable-next-line import/no-default-export
export default codegenNativeComponent<NativeProps>("SkiaImageView");
