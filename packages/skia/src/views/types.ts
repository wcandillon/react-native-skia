import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type {
  SkGraphiteContext,
  SkImage,
  SkPicture,
  SkRect,
  SkSize,
} from "../skia/types";

export type NativeSkiaViewProps = ViewProps & {
  debug?: boolean;
  opaque?: boolean;
};

export type AndroidSurfaceType = "SurfaceView" | "TextureView";

export interface AndroidCanvasProps {
  /**
   * Backing view. Defaults to `SurfaceView` when the canvas is `opaque` and to
   * `TextureView` otherwise; both composite correctly in React Native stacking
   * order without further flags.
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
  /** Set a view property, optionally deferring a recorder's initial redraw. */
  setJsiProperty: <T>(
    nativeId: number,
    name: string,
    value: T,
    requestRedraw?: boolean
  ) => void;
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
  makeImageSnapshot: (nativeId: number, rect?: SkRect) => SkImage;
  makeImageSnapshotAsync: (nativeId: number, rect?: SkRect) => Promise<SkImage>;
  size: (nativeId: number) => SkSize;
  /**
   * The recording side of a SkiaGraphiteView: its native id, the layout size
   * in points, and the props its surface format follows from. Graphite only.
   */
  makeGraphiteContext: (
    nativeId: number,
    width: number,
    height: number,
    opaque: boolean,
    highBitDepth: boolean
  ) => SkGraphiteContext;
}

export interface SkiaBaseViewProps extends ViewProps {
  /**
   * When set to true the view will display information about the
   * average time it takes to render.
   */
  debug?: boolean;

  /**
   * Declares that the canvas covers every pixel of its bounds. On Android an
   * opaque canvas is backed by a `SurfaceView` by default, the cheapest path
   * (see `android.surfaceType`). Defaults to false.
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
  androidWarmup?: boolean;
}

export type SkiaGraphiteViewNativeProps = SkiaBaseViewProps;
