import { useEffect, useRef } from "react";

import { Platform } from "../Platform";

import type { CanvasColorSpace } from "./types";

/** The props the format of an Apple canvas is chosen from when it mounts. */
export interface AppleFormatProps {
  highBitDepth?: boolean;
  colorSpace?: CanvasColorSpace;
}

const warnIgnoredChange = (prop: string) =>
  console.warn(
    `Ignoring a change of ${prop} on a mounted canvas: the pixel format and ` +
      "the color space are chosen when the canvas mounts. Remount the canvas " +
      "(give it a new key) to change it."
  );

/**
 * Warns, in development on Apple platforms, about a change of these props
 * that the native view ignores: its layer gets its pixel format and its color
 * space when the canvas mounts (see the setters of SkiaView.mm, whose rules
 * these mirror). Android has its own warnings, see ./android.ts.
 */
export const warnAppleFormatChange = (
  prev: AppleFormatProps,
  next: AppleFormatProps
) => {
  if (!__DEV__ || (Platform.OS !== "ios" && Platform.OS !== "macos")) {
    return;
  }
  if (!!prev.highBitDepth !== !!next.highBitDepth) {
    warnIgnoredChange("highBitDepth");
  }
  if (prev.colorSpace !== next.colorSpace) {
    warnIgnoredChange("colorSpace");
  }
};

/**
 * warnAppleFormatChange() for a function component: compares the props of
 * each render with the previous one's.
 */
export const useAppleFormatWarning = (props: AppleFormatProps) => {
  const prev = useRef(props);
  useEffect(() => {
    warnAppleFormatChange(prev.current, props);
    prev.current = props;
  });
};
