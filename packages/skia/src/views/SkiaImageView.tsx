import React, { useEffect } from "react";

import SkiaImageViewNativeComponent from "../specs/SkiaImageViewNativeComponent";

import { SkiaViewApi } from "./api";
import type { SkiaImageViewProps } from "./types";

/**
 * A view showing an image, with no canvas of its own. The image is read back
 * once, however many views show it, and each view draws the same platform
 * bitmap inside the window's own drawing: no surface, swapchain or render
 * loop per view, so a view mounts and unmounts at the cost of any view and
 * composites, clips, fades and transforms like one. The image fills the
 * view's bounds.
 *
 * For an image that does not change. A drawing that animates, or that is
 * redrawn as its props change, belongs in a <Canvas>.
 */
export const SkiaImageView = ({ image, ...viewProps }: SkiaImageViewProps) => {
  if (typeof SkiaViewApi.presentedImageId !== "function") {
    throw new Error(
      "React Native Skia: the native module does not provide SkiaImageView. " +
        "Rebuild the app so the native code matches the JavaScript."
    );
  }
  const presentedImageId =
    image === null ? 0 : SkiaViewApi.presentedImageId(image);
  useEffect(() => {
    if (image === null) {
      return undefined;
    }
    SkiaViewApi.retainPresentedImage(image);
    return () => {
      // After the commit's other effects: a view taking the image over retains it first.
      queueMicrotask(() => SkiaViewApi.releasePresentedImage(presentedImageId));
    };
  }, [image, presentedImageId]);
  return (
    <SkiaImageViewNativeComponent
      presentedImageId={presentedImageId}
      {...viewProps}
    />
  );
};
