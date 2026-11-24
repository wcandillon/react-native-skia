import React, { useEffect } from "react";

import SkiaImageViewNativeComponent from "../specs/SkiaImageViewNativeComponent";

import { SkiaViewApi } from "./api";
import { IMAGE_VIEW_BASE_STYLE } from "./imageViewBaseStyle";
import type { SkiaImageViewProps } from "./types";

/**
 * A view showing an image, with no canvas of its own. The image is drawn
 * once, however many views show it, into a bitmap of the platform's that each
 * view draws inside the window's own drawing: no surface, swapchain or render
 * loop per view. A view mounts and unmounts as any view does, and composites,
 * clips, fades and transforms like one. The image fills the view's content
 * box, inside its padding and border, and is clipped to its rounded corners
 * unless its style sets `overflow`. A view whose image changes keeps showing
 * the previous one until the next is drawn. When an image cannot be drawn, its
 * views show nothing until a later drawing of it succeeds, and a view that
 * changes to it shows nothing too rather than its previous image.
 *
 * For an image that does not change. A drawing that animates, or that is
 * redrawn as its props change, belongs in a <Canvas>.
 */
export const SkiaImageView = ({
  image,
  style,
  ...viewProps
}: SkiaImageViewProps) => {
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
      style={[IMAGE_VIEW_BASE_STYLE, style]}
    />
  );
};
