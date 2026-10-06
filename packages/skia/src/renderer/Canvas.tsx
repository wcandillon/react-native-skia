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
import { androidNativeProps } from "../views/android";
import type { AndroidCanvasProps } from "../views/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
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

export interface CanvasProps extends Omit<ViewProps, "onLayout"> {
  /** @deprecated Not supported on native. Use `onSize` or `useCanvasSize()` instead. */
  onLayout?: ViewProps["onLayout"];
  /**
   * Declares that the canvas covers every pixel of its bounds, so nothing
   * behind it needs to show through. On Android an opaque canvas is backed by
   * a `SurfaceView` by default, the cheapest path (see `android.surfaceType`).
   * Defaults to false.
   */
  opaque?: boolean;
  onSize?: SharedValue<SkSize>;
  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. Colors are
   * identical to the default 8-bit surface, only with more precision (this is
   * about bit depth, not HDR). On Android the extra precision survives
   * composition only when combined with `opaque`, and the prop must be set
   * before the canvas is mounted.
   */
  highBitDepth?: boolean;
  /** Android-only rendering options. Ignored on iOS and web. */
  android?: AndroidCanvasProps;
  ref?: React.Ref<CanvasRef>;
  __destroyWebGLContextAfterRender?: boolean;
}

/**
 * What the canvas owns: the native id, the scene graph root rendered into it,
 * the `onSize` measurement and the imperative handle of the ref.
 */
const useCanvasRoot = ({
  children,
  onSize,
  ref,
  onLayout,
}: Pick<CanvasProps, "children" | "onSize" | "ref" | "onLayout">) => {
  if (onLayout && Platform.OS !== "web") {
    console.error(
      "<Canvas onLayout={onLayout} /> is not supported on the new architecture, to fix the issue, see: https://wcandillon.github.io/react-native-skia/docs/canvas/overview/#canvas-size"
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
  return { nativeId, viewRef };
};

/**
 * The declarative canvas. Its children are rendered by Skia's own React
 * renderer; the frames are produced off the JS thread:
 *
 * - the JS thread records the scene graph into a native recorder once per
 *   React commit and hands it to the view;
 * - the Reanimated UI runtime only reads the shared values into it (the one
 *   step that needs a JS runtime), it never replays anything;
 * - a dedicated native thread pool replays the recorder into a Graphite
 *   recording whenever the content changed, at most once per presented frame;
 * - the view presents the recording on the next vsync.
 *
 * On the web the scene is drawn into a picture on the JS thread and painted
 * on a WebGL canvas.
 */
export const Canvas = ({
  opaque,
  children,
  onSize,
  highBitDepth = false,
  android,
  ref,
  onLayout,
  ...viewProps
}: CanvasProps) => {
  const { nativeId, viewRef } = useCanvasRoot({
    children,
    onSize,
    ref,
    onLayout,
  });

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
    <SkiaViewNativeComponent
      ref={viewRef}
      collapsable={false}
      nativeID={`${nativeId}`}
      opaque={opaque}
      highBitDepth={highBitDepth}
      {...androidNativeProps(android)}
      onLayout={
        Platform.OS === "web" && (onSize || onLayout) ? onLayoutWeb : onLayout
      }
      {...viewProps}
    />
  );
};
