import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type {
  SkGraphiteContext,
  SkImage,
  SkPicture,
  SkRect,
  SkSize,
} from "../skia/types";

export type AndroidSurfaceType = "SurfaceView" | "TextureView";

export interface AndroidCanvasProps {
  /**
   * Backing view. Defaults to `SurfaceView` when the canvas is `opaque` and to
   * `TextureView` otherwise; both composite correctly in React Native stacking
   * order without further flags. Before Android 11 an opaque canvas defaults
   * to `TextureView` too, unless it sets `zOrderOnTop` or `highBitDepth`:
   * those releases remove a `SurfaceView` as it leaves the window, a frame
   * before the window stops showing it.
   */
  surfaceType?: AndroidSurfaceType;
  /**
   * SurfaceView only: composite above every React Native view in the window,
   * ignoring `zIndex`. Ignored for TextureView. Defaults to false.
   */
  zOrderOnTop?: boolean;
}

export interface ISkiaViewApi {
  web?: boolean;
  setJsiProperty: <T>(nativeId: number, name: string, value: T) => void;
  requestRedraw: (nativeId: number) => void;
  /**
   * Reads the shared values into the recording held for the view and
   * schedules a redraw. Native only; called from a worklet on every frame.
   * Until the view registers, the recording is queued for it and kept
   * current all the same. Ignored when the recording `recorderId` is neither
   * held by the view nor queued for it.
   */
  applyUpdates: (
    nativeId: number,
    recorderId: number,
    values: SharedValue<unknown>[]
  ) => void;
  /**
   * Renders the view into an offscreen surface and returns a GPU image of
   * it, on the calling thread. Native: the declarative content is replayed
   * with its latest values; otherwise the current frame is.
   */
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
  size: (nativeId: number) => SkSize;
  /**
   * The recording side of a view: its native id, the layout size in points,
   * and the props its surface format follows from.
   */
  makeGraphiteContext: (
    nativeId: number,
    width: number,
    height: number,
    opaque: boolean,
    highBitDepth: boolean
  ) => SkGraphiteContext;
}

/** The props every Skia view takes, whichever way it is drawn. */
export interface SkiaBaseViewProps extends ViewProps {
  /**
   * Declares that the canvas covers every pixel of its bounds. On Android an
   * opaque canvas is backed by a `SurfaceView` by default, the cheapest path,
   * except before Android 11 (see `android.surfaceType`). Defaults to false.
   */
  opaque?: boolean;

  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. On Android
   * the extra precision survives composition only when combined with `opaque`.
   */
  highBitDepth?: boolean;

  /** Android-only rendering options. Ignored on iOS and web. */
  android?: AndroidCanvasProps;

  // On web, only 16 WebGL contextes are allowed. If the drawing is non-animated, set
  // __destroyWebGLContextAfterRender to true to release the context after each draw.
  __destroyWebGLContextAfterRender?: boolean;
}

export interface SkiaPictureViewNativeProps extends SkiaBaseViewProps {
  picture?: SkPicture;
}

export type SkiaGraphiteViewNativeProps = SkiaBaseViewProps;
