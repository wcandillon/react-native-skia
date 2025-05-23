import type { ViewProps } from "react-native";
import { createElement, useEffect, useRef } from "react";

import { SkiaPictureView } from "../views/SkiaPictureView.web";

import type { ISkiaViewApiWeb } from "./NativeSkiaModule.web";

export interface NativeProps extends ViewProps {
  opaque?: boolean;
  nativeID: string;
}

const SkiaPictureViewNativeComponent = ({
  nativeID,
  opaque,
  onLayout,
  ...viewProps
}: NativeProps) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      (global.SkiaViewApi as ISkiaViewApiWeb).registerView(
        nativeID,
        ref.current
      );
    }
  }, [nativeID]);
  return createElement(SkiaPictureView, {
    ref,
    opaque,
    onLayout,
    ...viewProps,
  });
};
// eslint-disable-next-line import/no-default-export
export default SkiaPictureViewNativeComponent;
