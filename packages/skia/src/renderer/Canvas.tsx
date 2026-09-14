import type { FC, RefObject } from "react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  LayoutChangeEvent,
  MeasureInWindowOnSuccessCallback,
  MeasureOnSuccessCallback,
  View,
  ViewProps,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";

import Rea from "../external/reanimated/ReanimatedProxy";
import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import SkiaPictureViewNativeComponent from "../specs/SkiaPictureViewNativeComponent";
import type { SkImage, SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";
import { Platform } from "../Platform";
import { HAS_REANIMATED_3 } from "../external";

export interface CanvasRef extends FC<CanvasProps> {
  makeImageSnapshot(rect?: SkRect): SkImage;
  makeImageSnapshotAsync(rect?: SkRect): Promise<SkImage>;
  redraw(): void;
  getNativeId(): number;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
}

export const useCanvasRef = () => useRef<CanvasRef>(null);

const useReanimatedFrame = !HAS_REANIMATED_3 ? () => {} : Rea.useFrameCallback;
const measure = !HAS_REANIMATED_3 ? null : Rea.measure;

const useCanvasRefPriv: typeof useRef<View> = !HAS_REANIMATED_3
  ? useRef
  : Rea.useAnimatedRef;

export const useCanvasSize = (userRef?: RefObject<CanvasRef | null>) => {
  const ourRef = useCanvasRef();
  const ref = userRef ?? ourRef;
  const [size, setSize] = useState<SkSize>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.measure((_x, _y, width, height) => {
        setSize({ width, height });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, size };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isFabric = Boolean((global as any)?.nativeFabricUIManager);

export interface CanvasProps extends Omit<ViewProps, "onLayout"> {
  debug?: boolean;
  /** @deprecated Not supported on Fabric. Use `onSize` or `useCanvasSize()` instead. */
  onLayout?: ViewProps["onLayout"];
  opaque?: boolean;
  onSize?: SharedValue<SkSize>;
  colorSpace?: "p3" | "srgb";
  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. Colors are
   * identical to the default 8-bit surface, only with more precision (this is
   * about bit depth, not HDR). On Android the extra precision survives
   * composition only when combined with `opaque`, and the prop must be set
   * before the canvas is mounted.
   */
  highBitDepth?: boolean;
  ref?: React.Ref<CanvasRef>;
  androidWarmup?: boolean;
  __destroyWebGLContextAfterRender?: boolean;
}

export const Canvas = ({
  debug,
  opaque,
  children,
  onSize,
  colorSpace = "p3",
  highBitDepth = false,
  androidWarmup = false,
  ref,
  onLayout,
  ...viewProps
}: CanvasProps) => {
  if (onLayout && isFabric) {
    console.error(
      "<Canvas onLayout={onLayout} /> is not supported on the new architecture, to fix the issue, see: https://shopify.github.io/react-native-skia/docs/canvas/overview/#getting-the-canvas-size"
    );
  }
  const viewRef = useCanvasRefPriv(null);
  // Native ID
  const nativeId = useMemo(() => {
    return SkiaViewNativeId.current++;
  }, []);

  // Root
  const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

  useReanimatedFrame(() => {
    "worklet";
    if (onSize && measure) {
      const result =
        // eslint-disable-next-line no-nested-ternary
        Platform.OS === "web"
          ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            viewRef.current?.canvasRef
            ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              measure(viewRef.current.canvasRef)
            : { width: 0, height: 0 }
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            measure(viewRef as any);
      if (result) {
        const { width, height } = result;
        if (onSize.value.width !== width || onSize.value.height !== height) {
          onSize.value = { width, height };
        }
      }
    }
  }, !!onSize);

  // Render effects
  useLayoutEffect(() => {
    root.render(children);
  }, [children, root, nativeId]);

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
        measure: (callback) => {
          viewRef.current?.measure(callback);
        },
        measureInWindow: (callback) => {
          viewRef.current?.measureInWindow(callback);
        },
      }) as CanvasRef
  );

  const onLayoutWeb = useCallback(
    (e: LayoutChangeEvent) => {
      if (onLayout) {
        onLayout(e);
      }
      if (Platform.OS === "web" && onSize) {
        const { width, height } = e.nativeEvent.layout;
        onSize.value = { width, height };
      }
    },
    [onLayout, onSize]
  );
  return (
    <SkiaPictureViewNativeComponent
      ref={viewRef}
      collapsable={false}
      nativeID={`${nativeId}`}
      debug={debug}
      opaque={opaque}
      colorSpace={colorSpace}
      highBitDepth={highBitDepth}
      androidWarmup={androidWarmup}
      onLayout={
        Platform.OS === "web" && (onSize || onLayout) ? onLayoutWeb : onLayout
      }
      {...viewProps}
    />
  );
};
