import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import type { SkGraphiteContext, SkImage, SkRect, SkSize } from "../skia/types";

/** The Android view a canvas draws into, see {@link AndroidCanvasProps}. */
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
   * `zIndex`. Defaults to false. Applied in place on Android 11 and later;
   * read once, at mount, before that.
   */
  zOrderOnTop?: boolean;
  /**
   * Composite above the other `SurfaceView`s below the window (video players,
   * other canvases), while staying below the window itself. Defaults to
   * false; `zOrderOnTop` takes precedence. Applied in place on Android 11 and
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
   * the canvas uses a `TextureView`, with a warning in development. Always
   * composites with alpha.
   */
  backingView: "HardwareBufferView";
}

/**
 * Android-only rendering options: the native view behind the canvas and its
 * options. The view is created when the canvas mounts and kept: a change of
 * `backingView` is ignored, with a warning in development; remount the canvas
 * (with a `key`) to change it. `opaque` applies in place, and so do the
 * z-order options on Android 11 and later. Ignored on iOS and web.
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
   * and the props its surface format follows from.
   */
  makeGraphiteContext: (
    nativeId: number,
    width: number,
    height: number,
    opaque: boolean,
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
  /**
   * The id a `<SkiaImageView>` shows an image by, the same for every view of
   * one image. Native only.
   */
  presentedImageId: (image: SkImage) => number;
  /**
   * Keeps an image presentable while a `<SkiaImageView>` shows it. The first
   * retain reads the image back and hands it to the platform as a bitmap,
   * which every view showing the image draws. Native only.
   */
  retainPresentedImage: (image: SkImage) => void;
  /**
   * Gives back a retain, by id. The last one discards the bitmap. Native only.
   */
  releasePresentedImage: (id: number) => void;
}

export interface SkiaImageViewProps extends ViewProps {
  /** The image the view shows, filling its bounds; null shows nothing. */
  image: SkImage | null;
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
   * Draws each frame into an image that a plain view shows, with no surface,
   * swapchain or display link of its own: the canvas mounts and unmounts at
   * the cost of a view. A change of its content draws it again the same way,
   * through a readback, so it suits content that changes rarely. Read once,
   * when the canvas mounts; it takes precedence over `android.backingView`
   * and `highBitDepth`.
   */
  static?: boolean;

  /**
   * Android-only rendering options: the native view behind the canvas and its
   * options, see {@link AndroidCanvasProps}. Ignored on iOS and web.
   */
  android?: AndroidCanvasProps;

  /** @deprecated Does nothing: on web, every view shares one WebGL context. */
  __destroyWebGLContextAfterRender?: boolean;
}

export type SkiaGraphiteViewNativeProps = SkiaBaseViewProps;
