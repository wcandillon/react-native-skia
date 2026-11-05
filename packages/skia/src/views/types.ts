import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { SkGraphiteContext, SkImage, SkRect, SkSize } from "../skia/types";

/**
 * The Android view a canvas draws into, see {@link AndroidCanvasProps}. Not
 * read off the native component's spec, whose declarations a consumer's type
 * check rejects.
 */
export type AndroidBackingView =
  "TextureView" | "SurfaceView" | "HardwareBufferView";

/** The options of a canvas backed by a `TextureView`, the default. */
export interface AndroidTextureViewProps {
  /**
   * A `TextureView`: a regular view, composited like any other (parent
   * transforms, clipping, alpha and z-order apply), at the price of an extra
   * texture copy and typically a frame of latency. The default.
   */
  backingView?: "TextureView";
  /**
   * Declares that the canvas covers every pixel of its bounds, so the UI
   * toolkit skips blending the view. Defaults to false. Applied in place.
   */
  opaque?: boolean;
  /** `SurfaceView` only: name it with `backingView: "SurfaceView"`. */
  zOrderOnTop?: false;
  /** `SurfaceView` only: name it with `backingView: "SurfaceView"`. */
  zOrderMediaOverlay?: false;
}

/** The options of a canvas backed by a `SurfaceView`. */
export interface AndroidSurfaceViewProps {
  /**
   * A `SurfaceView`: each frame goes to the system compositor as its own
   * layer, the fastest path, with no extra copy. It is not view content:
   * parent transforms, clipping, rounded corners and z-order with sibling
   * views do not apply to it.
   */
  backingView: "SurfaceView";
  /**
   * Declares that the canvas covers every pixel of its bounds, so the
   * compositor skips blending the layer and can show it through a hardware
   * overlay. Defaults to true: a translucent `SurfaceView` blends against
   * what is below the window, usually black, rather than the React Native
   * views beneath it (pair it with `zOrderOnTop`). Applied in place; a
   * `highBitDepth` canvas is always opaque.
   */
  opaque?: boolean;
  /**
   * Composite above every React Native view in the window, ignoring
   * `zIndex`. Defaults to false. Applied in place on Android 11 and later,
   * on Android 13 only without `zOrderMediaOverlay`; read once, at mount,
   * otherwise.
   */
  zOrderOnTop?: boolean;
  /**
   * Composite above the other `SurfaceView`s below the window (video players,
   * other canvases), while staying below the window itself. Defaults to
   * false; `zOrderOnTop` takes precedence. Applied in place on Android 14 and
   * later; read once, at mount, before that.
   */
  zOrderMediaOverlay?: boolean;
}

/** The options of a canvas backed by a `HardwareBufferView`. */
export interface AndroidHardwareBufferViewProps {
  /**
   * A plain view drawing each frame's `AHardwareBuffer` inline: composited
   * like a `TextureView`, without its extra copy (Android 10 and later, the
   * opt-in of React Native WebGPU). Not available in React Native Skia yet:
   * the canvas uses a `TextureView`, with a warning. Always
   * composites with alpha.
   */
  backingView: "HardwareBufferView";
  opaque?: false;
  zOrderOnTop?: false;
  zOrderMediaOverlay?: false;
}

/**
 * Android-only rendering options: the native view behind the canvas and its
 * options. The view is created with the canvas's native view and kept for as
 * long as that lives: a change of `backingView` is ignored, with a warning;
 * remount the canvas (with a `key`) to change it. `opaque` applies in place,
 * and so do
 * `zOrderOnTop` on Android 11 and later (on Android 13 only without
 * `zOrderMediaOverlay`) and `zOrderMediaOverlay` on Android 14 and later.
 * Ignored on iOS and web.
 */
export type AndroidCanvasProps =
  | AndroidTextureViewProps
  | AndroidSurfaceViewProps
  | AndroidHardwareBufferViewProps;

export interface ISkiaViewApi {
  web?: boolean;
  /**
   * The id a view about to mount registers under. Ids are unique for the
   * life of the process, not of the JS runtime: the native registries
   * outlive a reload, and the views of the bundle being replaced leave them
   * while the new bundle is already mounting.
   */
  allocateNativeId: () => number;
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
   * and the bit depth its surface will have, resolved from the props (see
   * `resolveHighBitDepth`).
   */
  makeGraphiteContext: (
    nativeId: number,
    width: number,
    height: number,
    highBitDepth: boolean
  ) => SkGraphiteContext;
  /**
   * Retires what `makeGraphiteContext` made for a view id, once the view
   * component unmounts. A no-op when a view bound to the id: its own
   * teardown retires it. A context still held keeps its target for the
   * native view to bind to, as React's StrictMode runs the unmount cleanup
   * right after mount and keeps the first effect run's context. On the web
   * the view owns its context; a no-op.
   */
  destroyGraphiteContext: (nativeId: number) => void;
}

/**
 * The color space a canvas renders in, see {@link SkiaBaseViewProps.colorSpace}.
 */
export type CanvasColorSpace = "srgb" | "display-p3";

/** The props every Skia view takes, whichever way it is drawn. */
export interface SkiaBaseViewProps extends ViewProps {
  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. On Android
   * it needs a `SurfaceView` (see `android.backingView`), which it makes
   * opaque, as the 10-bit format only has 2 bits of alpha; it is read once,
   * when the canvas mounts.
   */
  highBitDepth?: boolean;

  /**
   * The color space the canvas renders in. By default, Display P3 on Apple
   * devices with a wide color gamut display, sRGB everywhere else. Use
   * `"srgb"` to match offscreen rendering (`drawAsImage`,
   * `Skia.Surface.MakeOffscreen`, snapshots). Android and the web always
   * render in sRGB.
   */
  colorSpace?: CanvasColorSpace;

  /**
   * Android-only rendering options: the native view behind the canvas and its
   * options, see {@link AndroidCanvasProps}. Ignored on iOS and web.
   */
  android?: AndroidCanvasProps;

  /** @deprecated Does nothing: on web, every view shares one WebGL context. */
  __destroyWebGLContextAfterRender?: boolean;
}

export type SkiaGraphiteViewNativeProps = SkiaBaseViewProps;
