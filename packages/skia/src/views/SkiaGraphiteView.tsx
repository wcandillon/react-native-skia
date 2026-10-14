import React, { useEffect, useImperativeHandle, useMemo, useRef } from "react";

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

// A view measured relative to itself gets its layout size, without the
// transforms getBoundingClientRect() includes; measureLayout() calls back
// synchronously on the new architecture. On the web the view measures itself
// (see SkiaView.web).
const measureLayout = (
  view: React.ComponentRef<typeof SkiaViewNativeComponent>
) => {
  if (Platform.OS === "web") {
    return { width: 0, height: 0 };
  }
  let size = { width: 0, height: 0 };
  view.measureLayout(view, (_left, _top, width, height) => {
    size = { width, height };
  });
  return size;
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
  // Retires the native target made for this id on unmount, in case no native
  // view ever bound to it; a bound target is retired by the view's teardown.
  useEffect(
    () => () => {
      if (SkiaViewApi && SkiaViewApi.destroyGraphiteContext) {
        SkiaViewApi.destroyGraphiteContext(nativeId);
      }
    },
    [nativeId]
  );
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
