import { useEffect, useRef } from "react";

import { Platform } from "../Platform";

import type { AndroidBackingView, AndroidCanvasProps } from "./types";

/** The props the Android backing view is chosen from when a canvas mounts. */
export interface BackingViewProps {
  highBitDepth?: boolean;
  android?: AndroidCanvasProps;
}

/** What the native component is handed for the `android` prop. */
export interface AndroidNativeProps {
  androidBackingView: AndroidBackingView;
  androidOpaque: boolean;
  androidZOrderOnTop: boolean;
  androidZOrderMediaOverlay: boolean;
}

// The union read as one bag of options; which of them apply to the view is
// decided below, as it is on the native side.
type AndroidOptions = Partial<{
  backingView: AndroidBackingView;
  opaque: boolean;
  zOrderOnTop: boolean;
  zOrderMediaOverlay: boolean;
}>;

const options = (android?: AndroidCanvasProps): AndroidOptions =>
  (android ?? {}) as AndroidOptions;

// Anything else reaching the native component would hit the generated
// string-enum parser, which aborts on unknown values.
export const resolveBackingView = (
  android?: AndroidCanvasProps
): AndroidBackingView => {
  const { backingView } = options(android);
  return backingView === "SurfaceView" || backingView === "HardwareBufferView"
    ? backingView
    : "TextureView";
};

// The view that is created: a HardwareBufferView is not available yet and
// falls back to a TextureView, see BackingViewKind.fromBackingView().
const resolveKind = (android?: AndroidCanvasProps) =>
  resolveBackingView(android) === "SurfaceView" ? "SurfaceView" : "TextureView";

// Whether the canvas gets the 10-bit format, see
// BackingViewKind.resolveHighBitDepth().
export const resolveHighBitDepth = ({
  highBitDepth,
  android,
}: BackingViewProps) =>
  !!highBitDepth && resolveKind(android) === "SurfaceView";

// Whether the canvas composites as opaque, see BackingViewKind.resolveOpaque():
// a SurfaceView is opaque unless asked otherwise, and always with the 10-bit
// format; a TextureView is translucent unless asked otherwise; a
// HardwareBufferView always composites with alpha.
export const resolveOpaque = (props: BackingViewProps): boolean => {
  const { opaque } = options(props.android);
  switch (resolveBackingView(props.android)) {
    case "SurfaceView":
      return resolveHighBitDepth(props) || opaque !== false;
    case "TextureView":
      return opaque === true;
    case "HardwareBufferView":
      return false;
  }
};

/** The native props the `highBitDepth` and `android` props resolve to. */
export const androidNativeProps = (
  props: BackingViewProps
): AndroidNativeProps => {
  const backingView = resolveBackingView(props.android);
  const { zOrderOnTop, zOrderMediaOverlay } = options(props.android);
  const surfaceView = backingView === "SurfaceView";
  return {
    androidBackingView: backingView,
    androidOpaque: resolveOpaque(props),
    androidZOrderOnTop: surfaceView && !!zOrderOnTop,
    androidZOrderMediaOverlay: surfaceView && !!zOrderMediaOverlay,
  };
};

const warnIgnoredChange = (prop: string) =>
  console.warn(
    `Ignoring a change of ${prop} on a mounted canvas: the backing view is ` +
      "chosen when the canvas mounts. Remount the canvas (give it a new key) " +
      "to change it."
  );

/**
 * Warns, in development on Android, about options a mounting canvas asks for
 * that the native view cannot honour (see BackingViewKind.java, whose rules
 * these mirror). The native side only says so in logcat, which is not where a
 * JS developer looks.
 */
export const warnBackingViewAtMount = (mount: BackingViewProps) => {
  if (!__DEV__ || Platform.OS !== "android") {
    return;
  }
  const backingView = resolveBackingView(mount.android);
  if (backingView === "HardwareBufferView") {
    console.warn(
      "android.backingView: HardwareBufferView is not available in React " +
        "Native Skia yet, the canvas uses a TextureView."
    );
  }
  if (mount.highBitDepth && backingView !== "SurfaceView") {
    console.warn(
      "highBitDepth needs a SurfaceView on Android (android.backingView: " +
        '"SurfaceView"), the canvas keeps the 8-bit format.'
    );
  }
  if (
    mount.highBitDepth &&
    backingView === "SurfaceView" &&
    options(mount.android).opaque === false
  ) {
    console.warn(
      "Ignoring android.opaque: false, a highBitDepth canvas is opaque on " +
        "Android (the 10-bit format only has 2 bits of alpha)."
    );
  }
};

/**
 * Warns, in development on Android, about a change of these props that the
 * native view ignores: the backing view is created from them when the canvas
 * mounts (see SkiaView.java, whose setters these rules mirror).
 */
export const warnBackingViewChange = (
  mount: BackingViewProps,
  prev: BackingViewProps,
  next: BackingViewProps
) => {
  if (!__DEV__ || Platform.OS !== "android") {
    return;
  }
  if (resolveBackingView(prev.android) !== resolveBackingView(next.android)) {
    warnIgnoredChange("android.backingView");
  }
  const before = options(prev.android);
  const after = options(next.android);
  // Only a SurfaceView has a z-order of its own, which Android 11 and later
  // changes in place.
  const zOrderAtMount =
    resolveKind(mount.android) === "SurfaceView" &&
    Number(Platform.Version) < 30;
  if (zOrderAtMount && !!before.zOrderOnTop !== !!after.zOrderOnTop) {
    warnIgnoredChange("android.zOrderOnTop");
  }
  if (
    zOrderAtMount &&
    !!before.zOrderMediaOverlay !== !!after.zOrderMediaOverlay
  ) {
    warnIgnoredChange("android.zOrderMediaOverlay");
  }
  // The buffer format is read at mount, and so is the opacity the 10-bit
  // format implies.
  if (resolveHighBitDepth(prev) !== resolveHighBitDepth(next)) {
    warnIgnoredChange("highBitDepth");
  }
  if (
    resolveHighBitDepth(mount) &&
    (before.opaque !== false) !== (after.opaque !== false)
  ) {
    warnIgnoredChange("android.opaque (a highBitDepth canvas is opaque)");
  }
};

/**
 * warnBackingViewAtMount() and warnBackingViewChange() for a function
 * component: checks the props it mounts with, then compares the props of each
 * render with the previous one's.
 */
export const useBackingViewWarning = (props: BackingViewProps) => {
  const mount = useRef(props);
  const prev = useRef(props);
  useEffect(() => {
    warnBackingViewAtMount(mount.current);
  }, []);
  useEffect(() => {
    warnBackingViewChange(mount.current, prev.current, props);
    prev.current = props;
  });
};
