import type { FC } from "react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { LayoutChangeEvent, ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import SkiaPictureViewNativeComponent from "../specs/SkiaPictureViewNativeComponent";
import type { SkImage, SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";
import type { SkiaBaseViewProps } from "../views";

export interface CanvasRef extends FC<CanvasProps> {
  makeImageSnapshot(rect?: SkRect): SkImage;
  makeImageSnapshotAsync(rect?: SkRect): Promise<SkImage>;
  redraw(): void;
  getNativeId(): number;
}

export const useCanvasRef = () => useRef<CanvasRef>(null);

//const NativeSkiaPictureView = SkiaPictureViewNativeComponent;

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
  ref?: React.Ref<CanvasRef>;
}

export const Canvas = ({
  debug,
  opaque,
  children,
  onSize,
  onLayout: _onLayout,
  ref,
  ...viewProps
}: CanvasProps) => {
  const onLayout = useOnSizeEvent(onSize, _onLayout);
  // Native ID
  const nativeId = useMemo(() => {
    return SkiaViewNativeId.current++;
  }, []);

  // Root
  const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

  // Render effects
  useLayoutEffect(() => {
    root.render(children);
  }, [children, root]);

  useEffect(() => {
    return () => {
      root.unmount();
    };
  }, [root]);

  // Component methods
  useImperativeHandle(
    ref,
    () =>
      ({
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
      } as CanvasRef)
  );
  return (
    <SkiaPictureViewNativeComponent
      collapsable={false}
      nativeID={`${nativeId}`}
      debug={debug}
      opaque={opaque}
      onLayout={onLayout}
      {...viewProps}
    />
  );
};
