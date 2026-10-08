import type { RefObject } from "react";
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

import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import { androidNativeProps } from "../views/android";
import type { AndroidCanvasProps } from "../views/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
import type { SkImage, SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";

type LayoutSizeListener = (size: SkSize) => void;

export interface CanvasRef {
  makeImageSnapshot(rect?: SkRect): SkImage;
  redraw(): void;
  getNativeId(): number;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  /** Untransformed layout size: now if laid out, then once per change. Returns the remover. */
  addLayoutSizeListener(listener: LayoutSizeListener): () => void;
}

export const useCanvasRef = () => useRef<CanvasRef>(null);

export const useCanvasSize = (userRef?: RefObject<CanvasRef | null>) => {
  const ourRef = useCanvasRef();
  const ref = userRef ?? ourRef;
  const [size, setSize] = useState<SkSize>({ width: 0, height: 0 });
  useLayoutEffect(() => ref.current?.addLayoutSizeListener(setSize), [ref]);
  return { ref, size };
};

export interface CanvasProps extends ViewProps {
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
 * the layout handler that reports `onSize`, and the imperative handle of the
 * ref.
 */
const useCanvasRoot = ({
  children,
  onSize,
  ref,
  onLayout,
}: Pick<CanvasProps, "children" | "onSize" | "ref" | "onLayout">) => {
  const viewRef = useRef<View>(null);
  // Native ID
  const nativeId = useMemo(() => {
    return SkiaViewNativeId.current++;
  }, []);

  // Root
  const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

  // The size comes from the view's own layout event: a per-frame measure outlives the view until its effect cleanup and reports the transformed box.
  const layoutSize = useRef<SkSize | null>(null);
  const [layoutSizeListeners] = useState(() => new Set<LayoutSizeListener>());
  useLayoutEffect(() => {
    if (onSize && layoutSize.current) {
      onSize.value = layoutSize.current;
    }
  }, [onSize]);

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
  useImperativeHandle(ref, (): CanvasRef => ({
    makeImageSnapshot: (rect?: SkRect) => {
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
    addLayoutSizeListener: (listener) => {
      layoutSizeListeners.add(listener);
      if (layoutSize.current) {
        listener(layoutSize.current);
      }
      return () => {
        layoutSizeListeners.delete(listener);
      };
    },
  }));

  const onLayoutWithSize = useCallback(
    (e: LayoutChangeEvent) => {
      if (onLayout) {
        onLayout(e);
      }
      const { width, height } = e.nativeEvent.layout;
      const previous = layoutSize.current;
      if (previous && previous.width === width && previous.height === height) {
        return;
      }
      const size = { width, height };
      layoutSize.current = size;
      if (onSize) {
        onSize.value = size;
      }
      layoutSizeListeners.forEach((listener) => listener(size));
    },
    [onLayout, onSize, layoutSizeListeners]
  );
  return { nativeId, viewRef, onLayoutWithSize };
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
  const { nativeId, viewRef, onLayoutWithSize } = useCanvasRoot({
    children,
    onSize,
    ref,
    onLayout,
  });
  return (
    <SkiaViewNativeComponent
      ref={viewRef}
      collapsable={false}
      nativeID={`${nativeId}`}
      opaque={opaque}
      highBitDepth={highBitDepth}
      {...androidNativeProps(android)}
      onLayout={onLayoutWithSize}
      {...viewProps}
    />
  );
};
