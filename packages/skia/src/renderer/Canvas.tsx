import type { RefObject } from "react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  MeasureInWindowOnSuccessCallback,
  MeasureOnSuccessCallback,
  View,
  ViewProps,
} from "react-native";
import type { ReanimatedEvent, SharedValue } from "react-native-reanimated";

import Rea from "../external/reanimated/ReanimatedProxy";
import { Worklets } from "../external/reanimated/WorkletsProxy";
import { HAS_REANIMATED_4 } from "../external/reanimated/renderHelpers";
import { SkiaViewNativeId } from "../views/SkiaViewNativeId";
import { androidNativeProps } from "../views/android";
import type { AndroidCanvasProps, ISkiaViewApi } from "../views/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";
import type { LayoutSizeEvent } from "../specs/SkiaViewNativeComponent";
import type { SkImage, SkRect, SkSize } from "../skia/types";
import { SkiaSGRoot } from "../sksg/Reconciler";
import { Skia } from "../skia";
import { Platform } from "../Platform";

import { exhaustiveCheck } from "./typeddash";

export interface CanvasRef {
  makeImageSnapshot(rect?: SkRect): SkImage;
  redraw(): void;
  getNativeId(): number;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
}

export const useCanvasRef = () => useRef<CanvasRef>(null);

type Notify = () => void;

/**
 * Connects the useCanvasSize hooks reading through a ref to the canvas that
 * ref is attached to, wherever either of them renders: the canvas publishes
 * its size here, and asks its view for that size while any hook reads it.
 */
interface CanvasSizeChannel {
  size: SkSize;
  readonly readers: Set<Notify>;
  readonly canvases: Set<Notify>;
}

const canvasSizeChannels = new WeakMap<object, CanvasSizeChannel>();

const openCanvasSizeChannel = (ref: object) => {
  const existing = canvasSizeChannels.get(ref);
  if (existing) {
    return existing;
  }
  const channel: CanvasSizeChannel = {
    size: { width: 0, height: 0 },
    readers: new Set(),
    canvases: new Set(),
  };
  canvasSizeChannels.set(ref, channel);
  return channel;
};

const notifyAll = (subscribers: ReadonlySet<Notify>) =>
  subscribers.forEach((notify) => notify());

const subscribeReader = (channel: CanvasSizeChannel, notify: Notify) => {
  channel.readers.add(notify);
  if (channel.readers.size === 1) {
    notifyAll(channel.canvases);
  }
  return () => {
    channel.readers.delete(notify);
    if (channel.readers.size === 0) {
      notifyAll(channel.canvases);
    }
  };
};

const subscribeCanvas = (channel: CanvasSizeChannel, notify: Notify) => {
  channel.canvases.add(notify);
  return () => {
    channel.canvases.delete(notify);
  };
};

const publishCanvasSize = (channel: CanvasSizeChannel, size: SkSize) => {
  if (
    size.width === channel.size.width &&
    size.height === channel.size.height
  ) {
    return;
  }
  channel.size = size;
  notifyAll(channel.readers);
};

export const useCanvasSize = (userRef?: RefObject<CanvasRef | null>) => {
  const ourRef = useCanvasRef();
  const ref = userRef ?? ourRef;
  const channel = openCanvasSizeChannel(ref);
  const subscribe = useCallback(
    (notify: Notify) => subscribeReader(channel, notify),
    [channel]
  );
  const readSize = useCallback(() => channel.size, [channel]);
  const size = useSyncExternalStore(subscribe, readSize, readSize);
  return { ref, size };
};

const isRefObject = (
  ref: CanvasProps["ref"]
): ref is RefObject<CanvasRef | null> =>
  typeof ref === "object" && ref !== null;

const subscribeToNothing = () => () => {};

/** Whether useCanvasSize hooks read the size of the canvas behind the channel. */
const useHasCanvasSizeReaders = (channel: CanvasSizeChannel | null) => {
  const subscribe = useCallback(
    (notify: Notify) =>
      channel === null
        ? subscribeToNothing()
        : subscribeCanvas(channel, notify),
    [channel]
  );
  const hasReaders = useCallback(
    () => channel !== null && channel.readers.size > 0,
    [channel]
  );
  return useSyncExternalStore(subscribe, hasReaders, hasReaders);
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
}

const LAYOUT_SIZE_EVENT = "onLayoutSize";

const writeLayoutSize = (
  onSize: SharedValue<SkSize>,
  width: number,
  height: number
) => {
  "worklet";
  const { value } = onSize;
  if (value.width !== width || value.height !== height) {
    onSize.value = { width, height };
  }
};

const readLayoutSize = (
  viewApi: ISkiaViewApi,
  onSize: SharedValue<SkSize>,
  nativeId: number
) => {
  "worklet";
  const size = viewApi.layoutSize(nativeId);
  if (size !== null) {
    writeLayoutSize(onSize, size.width, size.height);
  }
};

type LayoutSizeHandlerApi = ISkiaViewApi &
  Required<Pick<ISkiaViewApi, "setLayoutSizeHandler">>;

const installsLayoutSizeHandlers = (
  viewApi: ISkiaViewApi
): viewApi is LayoutSizeHandlerApi =>
  viewApi.setLayoutSizeHandler !== undefined;

/**
 * How onSize gets its value:
 * - native: the view runs a worklet on the UI runtime from its own layout,
 *   with no event reaching JS (react-native-worklets linked natively);
 * - uiEvent: a Reanimated handler on the UI thread receives the view's
 *   onLayoutSize events, which also reach JS;
 * - jsEvent: the web has no UI thread, the canvas writes it from the view's
 *   layout events;
 * - none: without Reanimated 4 on native, onSize is left as it is.
 */
type OnSizeWriter =
  | { kind: "native"; viewApi: LayoutSizeHandlerApi }
  | { kind: "uiEvent" }
  | { kind: "jsEvent" }
  | { kind: "none" };

const resolveOnSizeWriter = (): OnSizeWriter => {
  if (Platform.OS === "web") {
    return { kind: "jsEvent" };
  }
  if (!HAS_REANIMATED_4) {
    return { kind: "none" };
  }
  return installsLayoutSizeHandlers(SkiaViewApi)
    ? { kind: "native", viewApi: SkiaViewApi }
    : { kind: "uiEvent" };
};

interface OnSizeWriterProps {
  onSize: SharedValue<SkSize>;
  nativeId: number;
  viewRef: RefObject<View | null>;
}

const NativeOnSizeWriter = ({
  onSize,
  nativeId,
  viewApi,
}: OnSizeWriterProps & { viewApi: LayoutSizeHandlerApi }) => {
  useEffect(() => {
    const writeSize = (width: number, height: number) => {
      "worklet";
      writeLayoutSize(onSize, width, height);
    };
    viewApi.setLayoutSizeHandler(
      nativeId,
      Worklets.getUIRuntimeHolder(),
      Worklets.createSerializable(writeSize)
    );
    return () => viewApi.setLayoutSizeHandler(nativeId, null, null);
  }, [onSize, nativeId, viewApi]);
  return null;
};

interface WorkletEventHandler {
  registerForEvents(viewTag: number): void;
  unregisterFromEvents(viewTag: number): void;
}

// Registered on the view's tag the way Reanimated's useScrollOffset follows a
// scroll view.
const UIEventOnSizeWriter = ({
  onSize,
  nativeId,
  viewRef,
}: OnSizeWriterProps) => {
  const writeEventSize = (event: ReanimatedEvent<LayoutSizeEvent>) => {
    "worklet";
    writeLayoutSize(onSize, event.width, event.height);
  };
  const { doDependenciesDiffer } = Rea.useHandler({ writeEventSize }, [onSize]);
  const { workletEventHandler } = Rea.useEvent(
    writeEventSize,
    [LAYOUT_SIZE_EVENT],
    doDependenciesDiffer
  ) as unknown as { workletEventHandler: WorkletEventHandler };
  useEffect(() => {
    const viewTag = Platform.findNodeHandle(viewRef.current);
    if (viewTag === null) {
      return undefined;
    }
    workletEventHandler.registerForEvents(viewTag);
    // A size the view sent before the handler was registered never reached it.
    Worklets.scheduleOnUI(readLayoutSize, SkiaViewApi, onSize, nativeId);
    return () => workletEventHandler.unregisterFromEvents(viewTag);
  }, [onSize, nativeId, viewRef, workletEventHandler]);
  return null;
};

const OnSizeWriter = ({
  writer,
  ...props
}: OnSizeWriterProps & { writer: OnSizeWriter }) => {
  switch (writer.kind) {
    case "native":
      return <NativeOnSizeWriter {...props} viewApi={writer.viewApi} />;
    case "uiEvent":
      return <UIEventOnSizeWriter {...props} />;
    case "jsEvent":
    case "none":
      return null;
    default:
      return exhaustiveCheck(writer);
  }
};

/**
 * What the canvas owns: the native id, the scene graph root rendered into it,
 * the size its view reports, and the imperative handle of the ref.
 */
const useCanvasRoot = ({
  children,
  onSize,
  ref,
}: Pick<CanvasProps, "children" | "onSize" | "ref">) => {
  const viewRef = useRef<View>(null);
  // Native ID
  const nativeId = useMemo(() => {
    return SkiaViewNativeId.current++;
  }, []);

  // Root
  const root = useMemo(() => new SkiaSGRoot(Skia, nativeId), [nativeId]);

  // Size
  const writer = resolveOnSizeWriter();
  const writesOnSizeFromJS = writer.kind === "jsEvent" && onSize !== undefined;
  const channel = isRefObject(ref) ? openCanvasSizeChannel(ref) : null;
  const hasSizeReaders = useHasCanvasSizeReaders(channel);
  // Readers that start after the view was laid out start from its size.
  useLayoutEffect(() => {
    const size = hasSizeReaders ? SkiaViewApi.layoutSize(nativeId) : null;
    if (channel !== null && size !== null) {
      publishCanvasSize(channel, size);
    }
  }, [channel, hasSizeReaders, nativeId]);
  useLayoutEffect(() => {
    if (writesOnSizeFromJS && onSize !== undefined) {
      readLayoutSize(SkiaViewApi, onSize, nativeId);
    }
  }, [onSize, nativeId, writesOnSizeFromJS]);
  const onLayoutSize = useCallback(
    ({ nativeEvent }: { nativeEvent: LayoutSizeEvent }) => {
      if (writesOnSizeFromJS && onSize !== undefined) {
        writeLayoutSize(onSize, nativeEvent.width, nativeEvent.height);
      }
      if (channel !== null) {
        publishCanvasSize(channel, {
          width: nativeEvent.width,
          height: nativeEvent.height,
        });
      }
    },
    [channel, onSize, writesOnSizeFromJS]
  );
  const writesOnSizeFromEvents =
    onSize !== undefined &&
    (writer.kind === "uiEvent" || writer.kind === "jsEvent");

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
    }),
    [nativeId, viewRef]
  );
  return {
    nativeId,
    viewRef,
    writer,
    reportsLayoutSize: hasSizeReaders || writesOnSizeFromEvents,
    onLayoutSize:
      hasSizeReaders || writesOnSizeFromJS ? onLayoutSize : undefined,
  };
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
  const { nativeId, viewRef, writer, reportsLayoutSize, onLayoutSize } =
    useCanvasRoot({
      children,
      onSize,
      ref,
    });
  return (
    <>
      <SkiaViewNativeComponent
        ref={viewRef}
        collapsable={false}
        nativeID={`${nativeId}`}
        opaque={opaque}
        highBitDepth={highBitDepth}
        reportsLayoutSize={reportsLayoutSize}
        onLayoutSize={onLayoutSize}
        {...androidNativeProps(android)}
        onLayout={onLayout}
        {...viewProps}
      />
      {onSize !== undefined ? (
        <OnSizeWriter
          writer={writer}
          onSize={onSize}
          nativeId={nativeId}
          viewRef={viewRef}
        />
      ) : null}
    </>
  );
};
