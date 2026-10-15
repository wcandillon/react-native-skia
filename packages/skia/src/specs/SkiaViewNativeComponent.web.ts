import type { LayoutChangeEvent, ViewProps } from "react-native";
import { createElement } from "react";

import { SkiaView } from "../views/SkiaView.web";

import type { LayoutSizeEvent } from "./SkiaViewNativeComponent";

export interface NativeProps extends ViewProps {
  opaque?: boolean;
  highBitDepth?: boolean;
  nativeID: string;
  androidSurfaceType?: "auto" | "SurfaceView" | "TextureView";
  androidZOrderOnTop?: boolean;
  reportsLayoutSize?: boolean;
  onLayoutSize?: (event: { nativeEvent: LayoutSizeEvent }) => void;
}

const SkiaViewNativeComponent = ({
  nativeID,
  onLayout,
  onLayoutSize,
  // Surface settings, never reach the DOM
  opaque: _opaque,
  highBitDepth: _highBitDepth,
  androidSurfaceType: _androidSurfaceType,
  androidZOrderOnTop: _androidZOrderOnTop,
  // The web view's layout events carry every size it takes
  reportsLayoutSize: _reportsLayoutSize,
  ...viewProps
}: NativeProps) => {
  const handleLayout = onLayoutSize
    ? (event: LayoutChangeEvent) => {
        onLayout?.(event);
        const { width, height } = event.nativeEvent.layout;
        onLayoutSize({ nativeEvent: { width, height } });
      }
    : onLayout;
  return createElement(SkiaView, {
    nativeID,
    onLayout: handleLayout,
    ...viewProps,
  });
};
// eslint-disable-next-line import/no-default-export
export default SkiaViewNativeComponent;
