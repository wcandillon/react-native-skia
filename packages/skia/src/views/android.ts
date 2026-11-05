import { Platform } from "../Platform";
import type { NativeProps } from "../specs/SkiaViewNativeComponent";

import type { AndroidBackingView, AndroidCanvasProps } from "./types";

type AndroidNativePropName =
  | "androidBackingView"
  | "androidOpacity"
  | "androidZOrderOnTop"
  | "androidZOrderMediaOverlay";

/** What the native component is handed for the `android` prop. */
export type AndroidNativeProps = {
  [Name in AndroidNativePropName]-?: NonNullable<NativeProps[Name]>;
};

// A value a JavaScript caller can pass that no view takes would hit the
// generated string-enum parser, which aborts on unknown values: it gets the
// default view, while TypeScript still reports a view the switch misses.
const resolveUnknownBackingView = (_backingView: never): AndroidBackingView =>
  "TextureView";

/** The view the `android` prop names: its `backingView`, a `TextureView` by default. */
export const resolveBackingView = (
  android?: AndroidCanvasProps
): AndroidBackingView => {
  const backingView = android?.backingView;
  switch (backingView) {
    case "SurfaceView":
    case "TextureView":
    case "HardwareBufferView":
      return backingView;
    case undefined:
      return "TextureView";
    default:
      return resolveUnknownBackingView(backingView);
  }
};

// An opaque from untyped JavaScript that is no boolean leaves the view its own.
const resolveUnknownOpacity = (
  _opaque: never
): AndroidNativeProps["androidOpacity"] => "Default";

const resolveOpacity = (
  opaque: boolean | undefined
): AndroidNativeProps["androidOpacity"] => {
  switch (opaque) {
    case undefined:
      return "Default";
    case true:
      return "Opaque";
    case false:
      return "Translucent";
    default:
      return resolveUnknownOpacity(opaque);
  }
};

/**
 * The native props the `android` prop resolves to: what it asks for. The
 * native view resolves them for the view it created, which it keeps,
 * ignoring a later `backingView` with a warning: the opacity default is that
 * view's (see BackingViewKind.resolveOpaque()), and the z-order options go to
 * every view, a `SurfaceView` taking them and any other warning about them.
 */
export const androidNativeProps = (
  android: AndroidCanvasProps | undefined
): AndroidNativeProps => ({
  androidBackingView: resolveBackingView(android),
  androidOpacity: resolveOpacity(android?.opaque),
  androidZOrderOnTop: !!android?.zOrderOnTop,
  androidZOrderMediaOverlay: !!android?.zOrderMediaOverlay,
});

/**
 * Whether a canvas made from these props has the high bit depth format: on
 * Android only a `SurfaceView` has it (see
 * BackingViewKind.resolveHighBitDepth()); elsewhere any canvas that asks
 * does.
 */
export const resolveHighBitDepth = (
  highBitDepth: boolean,
  backingView: AndroidBackingView
) =>
  Platform.OS === "android"
    ? highBitDepth && backingView === "SurfaceView"
    : highBitDepth;
