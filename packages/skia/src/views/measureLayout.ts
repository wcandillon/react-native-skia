import type React from "react";

import { Platform } from "../Platform";
import type SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
import type { SkSize } from "../skia/types";

export type NativeView = React.ComponentRef<typeof SkiaViewNativeComponent>;

/**
 * The layout size of a Skia view in points, read synchronously. A view
 * measured relative to itself gets its layout size, without the transforms
 * getBoundingClientRect() includes; measureLayout() calls back synchronously
 * on the new architecture. On the web the native component is the view's
 * handle, which measures its canvas element itself (see SkiaView.web).
 */
export const measureLayout = (view: NativeView): SkSize => {
  if (Platform.OS === "web") {
    return (view as unknown as { getSize(): SkSize }).getSize();
  }
  let size = { width: 0, height: 0 };
  view.measureLayout(view, (_left, _top, width, height) => {
    size = { width, height };
  });
  return size;
};
