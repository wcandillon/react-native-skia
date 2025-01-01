import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { LayoutChangeEvent, ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import SkiaPictureViewNativeComponent from "../specs/SkiaPictureViewNativeComponent";
import type { SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";
import type { SkiaBaseViewProps } from "../views";

const NativeSkiaPictureView = SkiaPictureViewNativeComponent;

// TODO: no need to go through the JS thread for this
const useOnSizeEvent = (
  resultValue: SkiaBaseViewProps["onSize"],
  onLayout?: (event: LayoutChangeEvent) => void
) => {
  return useCallback(
    (event: LayoutChangeEvent) => {
      if (onLayout) {
        onLayout(event);
      }
      const { width, height } = event.nativeEvent.layout;

      if (resultValue) {
        resultValue.value = { width, height };
      }
    },
    [onLayout, resultValue]
  );
};

export interface CanvasProps extends ViewProps {
  debug?: boolean;
  opaque?: boolean;
  onSize?: SharedValue<SkSize>;
  mode?: "continuous" | "default";
}

export const Canvas = forwardRef(
  (
    {
      mode,
      debug,
      opaque,
      children,
      onSize,
      onLayout: _onLayout,
      ...viewProps
    }: CanvasProps,
    ref
  ) => {
    const rafId = useRef<number | null>(null);
    const onLayout = useOnSizeEvent(onSize, _onLayout);
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

    const requestRedraw = useCallback(() => {
      rafId.current = requestAnimationFrame(() => {
        root.render(children);
        if (mode === "continuous") {
          requestRedraw();
        }
      });
    }, [children, mode, root]);

    useEffect(() => {
      if (mode === "continuous") {
        requestRedraw();
      }
      return () => {
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [mode, requestRedraw]);

    // Component methods
    useImperativeHandle(ref, () => ({
      makeImageSnapshot: (rect?: SkRect) => {
        return SkiaViewApi.makeImageSnapshot(nativeId, rect);
      },
      makeImageSnapshotAsync: (rect?: SkRect) => {
        return SkiaViewApi.makeImageSnapshotAsync(nativeId, rect);
      },
      redraw: () => {
        SkiaViewApi.requestRedraw(nativeId);
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
        onLayout={onLayout}
        {...viewProps}
      />
    );
  }
);
