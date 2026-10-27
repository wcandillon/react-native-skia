import React, { useEffect, useImperativeHandle, useMemo, useRef } from "react";

import type { SkGraphiteContext } from "../skia/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";

import { SkiaViewApi } from "./api";
import {
  androidNativeProps,
  resolveOpaque,
  useBackingViewWarning,
} from "./android";
import type { SkiaGraphiteViewNativeProps } from "./types";
import { measureLayout } from "./measureLayout";

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

/**
 * A view whose frames are recorded from JavaScript, on any runtime, through
 * the context of its ref. See {@link SkGraphiteContext}.
 */
export const SkiaGraphiteView = ({
  highBitDepth = false,
  android,
  ref,
  ...viewProps
}: SkiaGraphiteViewProps) => {
  const nativeId = useMemo(() => SkiaViewApi.allocateNativeId(), []);
  const viewRef =
    useRef<React.ComponentRef<typeof SkiaViewNativeComponent>>(null);
  useBackingViewWarning({ highBitDepth, android });
  // What the surface format follows from on Android, see makeGraphiteContext.
  const opaque = resolveOpaque({ highBitDepth, android });
  // Retires the native target made for this id on unmount, in case no native
  // view ever bound to it; a bound target is retired by the view's teardown.
  // StrictMode runs this cleanup right after mount too, possibly before the
  // native view registered: a context kept from the first effect run keeps
  // its target, which the native view takes over when it registers.
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
      highBitDepth={highBitDepth}
      {...androidNativeProps({ highBitDepth, android })}
      {...viewProps}
    />
  );
};

const assertSkiaViewApi = () => {
  if (SkiaViewApi === null || SkiaViewApi.makeGraphiteContext === null) {
    throw Error("Skia View Api was not found.");
  }
};
