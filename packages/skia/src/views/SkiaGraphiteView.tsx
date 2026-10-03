import React, { useImperativeHandle, useMemo, useRef } from "react";

import type { SkGraphiteContext } from "../skia/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
import { Platform } from "../Platform";

import { SkiaViewApi } from "./api";
import { androidNativeProps } from "./android";
import type { SkiaGraphiteViewNativeProps } from "./types";
import { SkiaViewNativeId } from "./SkiaViewNativeId";

export interface SkiaGraphiteViewRef {
  /**
   * The recording side of the view. Call it once the view is mounted. The
   * returned context can be captured into worklets and used from any runtime.
   */
  getContext(): SkGraphiteContext;
  getNativeId(): number;
}

export interface SkiaGraphiteViewProps extends SkiaGraphiteViewNativeProps {
  ref?: React.Ref<SkiaGraphiteViewRef>;
}

// The layout is known synchronously on the new architecture;
// getBoundingClientRect became stable in React Native 0.83. On the web the
// view measures itself (see SkiaView.web).
const measureLayout = (view: unknown) => {
  if (Platform.OS === "web") {
    return { width: 0, height: 0 };
  }
  const host = view as {
    getBoundingClientRect?: () => { width: number; height: number };
    unstable_getBoundingClientRect: () => { width: number; height: number };
  };
  return host.getBoundingClientRect
    ? host.getBoundingClientRect()
    : host.unstable_getBoundingClientRect();
};

/**
 * A view whose frames are recorded from JavaScript, on any runtime, through
 * the context of its ref. See {@link SkGraphiteContext}.
 */
export const SkiaGraphiteView = ({
  opaque = false,
  highBitDepth = false,
  android,
  ref,
  ...viewProps
}: SkiaGraphiteViewProps) => {
  const nativeId = useMemo(() => SkiaViewNativeId.current++, []);
  const viewRef =
    useRef<React.ComponentRef<typeof SkiaViewNativeComponent>>(null);
  useImperativeHandle(
    ref,
    () => ({
      getNativeId: () => nativeId,
      getContext: () => {
        assertSkiaViewApi();
        const view = viewRef.current;
        if (!view) {
          throw new Error(
            "SkiaGraphiteView: getContext() was called before the view was mounted."
          );
        }
        const size = measureLayout(view);
        return SkiaViewApi.makeGraphiteContext(
          nativeId,
          size.width,
          size.height,
          opaque,
          highBitDepth
        );
      },
    }),
    [nativeId, opaque, highBitDepth]
  );
  return (
    <SkiaViewNativeComponent
      ref={viewRef}
      collapsable={false}
      nativeID={`${nativeId}`}
      opaque={opaque}
      highBitDepth={highBitDepth}
      {...androidNativeProps(android)}
      {...viewProps}
    />
  );
};

const assertSkiaViewApi = () => {
  if (SkiaViewApi === null || SkiaViewApi.makeGraphiteContext === null) {
    throw Error("Skia View Api was not found.");
  }
};
