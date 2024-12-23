import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import type { ViewProps } from "react-native";

import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import SkiaPictureViewNativeComponent from "../specs/SkiaPictureViewNativeComponent";
import type { SkRect } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";

const NativeSkiaPictureView = SkiaPictureViewNativeComponent;

interface Canvas2Props extends ViewProps {
  debug?: boolean;
  opaque?: boolean;
}

export const Canvas2 = forwardRef(
  ({ debug, opaque, children, ...viewProps }: Canvas2Props, ref) => {
    // Native ID
    const nativeId = useMemo(() => {
      return SkiaViewNativeId.current++;
    }, []);

    // Root
    const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

    // Render effects
    useEffect(() => {
      root.render(children);
    }, [children, root]);

    useEffect(() => {
      return () => {
        root.unmount();
      };
    }, [root]);

    // Component methods
    useImperativeHandle(ref, () => ({
      makeImageSnapshot: (rect?: SkRect) => {
        //return SkiaViewApi.makeImageSnapshot(nativeId, rect);
      },
      makeImageSnapshotAsync: (rect?: SkRect) => {
        //return SkiaViewApi.makeImageSnapshot(nativeId, rect);
      },
      redraw: () => {
       //SkiaViewApi.requestRedraw(nativeId);
      },
      getNativeId: () => {
        return nativeId;
      },
    }));
    return (
      <NativeSkiaPictureView
        collapsable={false}
        nativeID={`${nativeId}`}
        debug={debug}
        opaque={opaque}
        {...viewProps}
      />
    );
  }
);
