import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { Node } from "../dom/types";
import type { SkImage, SkPicture, SkRect, SkSize } from "../skia/types";

export type NativeSkiaViewProps = ViewProps & {
  debug?: boolean;
  opaque?: boolean;
};

export interface ISkiaViewApi {
  web?: boolean;
  setJsiProperty: <T>(nativeId: number, name: string, value: T) => void;
  requestRedraw: (nativeId: number) => void;
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
  makeImageSnapshotAsync: (nativeId: number, rect?: SkRect) => Promise<SkImage>;
  size: (nativeId: number) => SkSize;
}

export interface SkiaBaseViewProps extends ViewProps {
  /**
   * When set to true the view will display information about the
   * average time it takes to render.
   */
  debug?: boolean;
  /**
   * Pass an animated value to the onSize property to get updates when
   * the Skia view is resized.
   */
  onSize?: SharedValue<SkSize>;

  opaque?: boolean;

  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. On Android
   * the extra precision survives composition only when combined with `opaque`.
   */
  highBitDepth?: boolean;

  // On web, only 16 WebGL contextes are allowed. If the drawing is non-animated, set
  // __destroyWebGLContextAfterRender to true to release the context after each draw.
  __destroyWebGLContextAfterRender?: boolean;
}

export interface SkiaPictureViewNativeProps extends SkiaBaseViewProps {
  picture?: SkPicture;
  androidWarmup?: boolean;
}

export interface SkiaDomViewNativeProps extends SkiaBaseViewProps {
  root?: Node<unknown>;
}
