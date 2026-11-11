import type { ViewProps } from "react-native";
import { createElement } from "react";

import { SkiaView } from "../views/SkiaView.web";
import type { AndroidNativeProps } from "../views/android";

export interface NativeProps extends ViewProps, Partial<AndroidNativeProps> {
  highBitDepth?: boolean;
  colorSpace?: string;
  nativeID: string;
}

const SkiaViewNativeComponent = ({
  nativeID,
  onLayout,
  // Surface settings, never reach the DOM
  highBitDepth: _highBitDepth,
  colorSpace: _colorSpace,
  androidBackingView: _androidBackingView,
  androidOpacity: _androidOpacity,
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
