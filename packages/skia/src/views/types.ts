import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { Node } from "../dom/types";
import type { SkImage, SkPicture, SkRect, SkSize } from "../skia/types";

export type NativeSkiaViewProps = ViewProps & {
  opaque?: boolean;
};

export interface ISkiaViewApi {
  web?: boolean;
  setJsiProperty: <T>(nativeId: number, name: string, value: T) => void;
  requestRedraw: (nativeId: number) => void;
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
  makeImageSnapshotAsync: (nativeId: number, rect?: SkRect) => Promise<SkImage>;
}

export interface SkiaBaseViewProps extends ViewProps {
  /**
   * Pass an animated value to the onSize property to get updates when
   * the Skia view is resized.
   */
  onSize?: SharedValue<SkSize>;

  opaque?: boolean;
}

export interface SkiaPictureViewNativeProps extends SkiaBaseViewProps {
  picture?: SkPicture;
}

export interface SkiaDomViewNativeProps extends SkiaBaseViewProps {
  root?: Node<unknown>;
}
