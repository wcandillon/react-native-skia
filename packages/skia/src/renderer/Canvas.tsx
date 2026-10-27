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
  ViewProps,
} from "react-native";

import { SkiaViewApi } from "../views/api";
import { androidNativeProps, useBackingViewWarning } from "../views/android";
import type { AndroidCanvasProps } from "../views/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
import { measureLayout } from "../views/measureLayout";
import type { NativeView } from "../views/measureLayout";
import type { SkImage, SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";

export interface CanvasRef {
  makeImageSnapshot(rect?: SkRect): SkImage;
  redraw(): void;
  getNativeId(): number;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  /**
   * The size of the canvas in points, the one of its layout, read
   * synchronously: for a one-off read, in an event handler for instance. It
   * is `0x0` before the canvas is mounted. To follow the size across layout
   * changes, see `useCanvasSize`.
   */
  readonly size: SkSize;
}

export const useCanvasRef = () => useRef<CanvasRef>(null);

/**
 * The size of a canvas in points, on the JS thread. Pass `onLayout` to the
 * canvas: `size` is its layout, 0x0 until the canvas is laid out, and follows
 * every resize. The canvas is a regular view, its size is the one of its
 * layout; to read it on the UI thread, write the layout into a shared value.
 */
export const useCanvasSize = () => {
  const [size, setSize] = useState<SkSize>({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    );
  }, []);
  return { size, onLayout };
};

export interface CanvasProps extends ViewProps {
  /**
   * Renders into a surface with more than 8 bits per channel (16-bit float on
   * iOS, 10-bit on Android) to avoid banding in subtle gradients. Colors are
   * identical to the default 8-bit surface, only with more precision (this is
   * about bit depth, not HDR). On Android it needs a `SurfaceView` (see
   * `android.backingView`), which it makes opaque, as the 10-bit format only
   * has 2 bits of alpha; it is read once, when the canvas mounts.
   */
  highBitDepth?: boolean;
  /**
   * Android-only rendering options: the native view behind the canvas and its
   * options, see {@link AndroidCanvasProps}. The view is created when the
   * canvas mounts and kept: a change of `backingView` is ignored, with a
   * warning in development; remount the canvas, with a `key`, to change it.
   * Ignored on iOS and web.
   */
  android?: AndroidCanvasProps;
  ref?: React.Ref<CanvasRef>;
}

/**
 * What the canvas owns: the native id, the scene graph root rendered into it
 * and the imperative handle of the ref.
 */
const useCanvasRoot = ({
  children,
  ref,
}: Pick<CanvasProps, "children" | "ref">) => {
  const viewRef = useRef<NativeView>(null);
  // Native ID
  const nativeId = useMemo(() => SkiaViewApi.allocateNativeId(), []);

  // Root
  const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

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
    (): CanvasRef => ({
      makeImageSnapshot: (rect?: SkRect) => {
        // The snapshot draws the current values of the shared values, read
        // here: the mapper may not have read them yet (a snapshot in the
        // commit that installed the recording), or not since they changed.
        root.readSharedValues();
        return SkiaViewApi.makeImageSnapshot(nativeId, rect);
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
      get size() {
        const view = viewRef.current;
        return view ? measureLayout(view) : { width: 0, height: 0 };
      },
    }),
    [nativeId, root, viewRef]
  );
  return { nativeId, viewRef };
};

/**
 * The declarative canvas. Its children are rendered by Skia's own React
 * renderer; the frames are produced off the JS thread:
 *
 * - the JS thread records the scene graph into a native recorder once per
 *   React commit that changes it and hands it to the view;
 * - the Reanimated UI runtime only reads the shared values into it (the one
 *   step that needs a JS runtime), it never replays anything;
 * - a dedicated native thread pool replays the recorder into a Graphite
 *   recording whenever the content changed, keeping at most one frame ahead
 *   of the display;
 * - the view presents the recording on the next vsync.
 *
 * On the web the scene is drawn into a picture on the JS thread and painted
 * on a WebGL canvas.
 *
 * The canvas is a regular view: its size is the one of its layout, reported
 * by `onLayout` (see `useCanvasSize`).
 */
export const Canvas = ({
  children,
  highBitDepth = false,
  android,
  ref,
  ...viewProps
}: CanvasProps) => {
  const { nativeId, viewRef } = useCanvasRoot({ children, ref });
  useBackingViewWarning({ highBitDepth, android });
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
