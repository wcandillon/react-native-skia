import type { ViewProps } from "react-native";
import { createElement } from "react";

import { SkiaView } from "../views/SkiaView.web";

export interface NativeProps extends ViewProps {
  highBitDepth?: boolean;
  nativeID: string;
  androidBackingView?: "TextureView" | "SurfaceView" | "HardwareBufferView";
  androidOpaque?: boolean;
  androidZOrderOnTop?: boolean;
  androidZOrderMediaOverlay?: boolean;
}

const SkiaViewNativeComponent = ({
  nativeID,
  onLayout,
  // Surface settings, never reach the DOM
  highBitDepth: _highBitDepth,
  androidBackingView: _androidBackingView,
  androidOpaque: _androidOpaque,
  androidZOrderOnTop: _androidZOrderOnTop,
  androidZOrderMediaOverlay: _androidZOrderMediaOverlay,
  ...viewProps
}: NativeProps) => {
  return createElement(SkiaView, {
    nativeID,
    onLayout,
    ...viewProps,
  });
};
// eslint-disable-next-line import/no-default-export
export default SkiaViewNativeComponent;
