/* global HTMLCanvasElement */
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import type {
  SkCanvas,
  SkGraphiteContext,
  SkGraphiteRecording,
  SkImage,
  SkPicture,
  SkRect,
} from "../skia/types";
import { JsiSkPictureRecorder } from "../skia/web/JsiSkPictureRecorder";
import { Platform } from "../Platform";
import type {
  ISkiaViewApiWeb,
  SkiaGraphiteViewHandle,
} from "../specs/NativeSkiaModule.web";

import type { SkiaGraphiteViewNativeProps } from "./types";
import { useSkiaWebRenderer } from "./SkiaWebRenderer";
import type { Renderer } from "./SkiaWebRenderer";

// The web has no Graphite: a recording is an SkPicture, painted through the
// WebGL context the page shares (see SkiaWebRenderer) by the same renderer
// as SkiaPictureView. Frames keep their native semantics, presented in
// submission order and never dropped, with one difference: the surface
// starts cleared on every frame, so a recording draws the whole frame rather
// than a delta.

export interface SkiaGraphiteViewRef {
  /**
   * The recording side of the view. Call it once the view is mounted.
   */
  getContext(): SkGraphiteContext;
  getNativeId(): number;
}

export interface SkiaGraphiteViewProps extends SkiaGraphiteViewNativeProps {
  ref?: React.Ref<SkiaGraphiteViewRef>;
}

/**
 * A frame recorded on the web. The view holds it while it is queued or on
 * screen: disposing it then only marks it, the picture is deleted once the
 * view lets go of it.
 */
class WebGraphiteRecording implements SkGraphiteRecording {
  readonly __typename__ = "GraphiteRecording" as const;
  private holds = 0;
  private disposed = false;

  constructor(readonly picture: SkPicture) {}

  retain() {
    this.holds++;
  }

  release() {
    this.holds--;
    if (this.disposed && this.holds === 0) {
      this.picture.dispose();
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.holds === 0) {
      this.picture.dispose();
    }
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

interface RecordingTarget {
  getSize(): { width: number; height: number };
  submit(recording: WebGraphiteRecording): void;
}

class WebGraphiteContext implements SkGraphiteContext {
  readonly __typename__ = "GraphiteContext" as const;
  private recorder: JsiSkPictureRecorder | null = null;

  constructor(private readonly target: RecordingTarget) {}

  get width() {
    return this.target.getSize().width;
  }

  get height() {
    return this.target.getSize().height;
  }

  beginRecording(): SkCanvas {
    if (this.recorder) {
      throw new Error(
        "SkiaGraphiteView: a recording is already open, call finishRecording() first."
      );
    }
    const { width, height } = this.target.getSize();
    if (width <= 0 || height <= 0) {
      throw new Error("SkiaGraphiteView: the view has no size yet.");
    }
    this.recorder = new JsiSkPictureRecorder(
      CanvasKit,
      new CanvasKit.PictureRecorder()
    );
    return this.recorder.beginRecording({ x: 0, y: 0, width, height });
  }

  finishRecording(): SkGraphiteRecording {
    if (!this.recorder) {
      throw new Error(
        "SkiaGraphiteView: no recording is open, call beginRecording() first."
      );
    }
    const picture = this.recorder.finishRecordingAsPicture();
    this.recorder.dispose();
    this.recorder = null;
    return new WebGraphiteRecording(picture);
  }

  submit(recording: SkGraphiteRecording) {
    if (!(recording instanceof WebGraphiteRecording)) {
      throw new Error(
        "SkiaGraphiteView: submit() expects a recording from finishRecording()."
      );
    }
    this.target.submit(recording);
  }

  dispose() {}

  [Symbol.dispose]() {}
}

export const SkiaGraphiteView = (props: SkiaGraphiteViewProps) => {
  const { ref, onLayout } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Recordings submitted since the last frame, in order, and the frame on
  // screen, replayed when the surface is recreated.
  const queueRef = useRef<WebGraphiteRecording[]>([]);
  const shownRef = useRef<WebGraphiteRecording[]>([]);
  const flushScheduledRef = useRef(false);
  const nativeId = useMemo(
    () =>
      props.nativeID !== undefined
        ? Number(props.nativeID)
        : (global.SkiaViewApi as ISkiaViewApiWeb).allocateNativeId(),
    [props.nativeID]
  );

  // Presents what was submitted since the last frame. A frame that cannot be
  // painted yet (unmeasured canvas, lost context) stays queued for the next
  // opportunity.
  const present = useCallback((renderer: Renderer) => {
    const frame = queueRef.current;
    if (frame.length === 0) {
      return;
    }
    queueRef.current = [];
    if (!renderer.draw(frame.map((recording) => recording.picture))) {
      queueRef.current = frame;
      return;
    }
    const previous = shownRef.current;
    shownRef.current = frame;
    previous.forEach((recording) => recording.release());
  }, []);

  const paint = useCallback(
    (renderer: Renderer) => {
      if (queueRef.current.length > 0) {
        present(renderer);
      } else if (shownRef.current.length > 0) {
        renderer.draw(shownRef.current.map((recording) => recording.picture));
      }
    },
    [present]
  );
  const rendererRef = useSkiaWebRenderer(canvasRef, {
    paint,
    onLayout,
  });

  const flush = useCallback(() => {
    flushScheduledRef.current = false;
    if (rendererRef.current) {
      present(rendererRef.current);
    }
  }, [present, rendererRef]);

  // Frames are presented from a microtask rather than an animation frame:
  // the browser composites once per frame either way, and painting right
  // away keeps a frame recorded inside an animation callback from slipping
  // to the next one (see SkiaPictureView.web).
  const submit = useCallback(
    (recording: WebGraphiteRecording) => {
      recording.retain();
      queueRef.current.push(recording);
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        queueMicrotask(flush);
      }
    },
    [flush]
  );

  const getSize = useCallback(
    () => ({
      width: canvasRef.current?.clientWidth || 0,
      height: canvasRef.current?.clientHeight || 0,
    }),
    []
  );

  const getContext = useCallback(
    (): SkGraphiteContext => new WebGraphiteContext({ getSize, submit }),
    [getSize, submit]
  );

  const redraw = useCallback(() => {
    if (rendererRef.current) {
      paint(rendererRef.current);
    }
  }, [paint, rendererRef]);

  const makeImageSnapshot = useCallback(
    (rect?: SkRect): SkImage | null => {
      const frame =
        queueRef.current.length > 0 ? queueRef.current : shownRef.current;
      if (!rendererRef.current || frame.length === 0) {
        return null;
      }
      return rendererRef.current.makeImageSnapshot(
        frame.map((recording) => recording.picture),
        rect
      );
    },
    [rendererRef]
  );

  const measure = useCallback(
    (
      callback: (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => void
    ) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const parentElement = canvasRef.current.offsetParent as HTMLElement;
        const parentRect = parentElement?.getBoundingClientRect() || {
          left: 0,
          top: 0,
        };
        callback(
          rect.left - parentRect.left,
          rect.top - parentRect.top,
          rect.width,
          rect.height,
          rect.left + window.scrollX,
          rect.top + window.scrollY
        );
      }
    },
    []
  );

  const measureInWindow = useCallback(
    (
      callback: (x: number, y: number, width: number, height: number) => void
    ) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        callback(rect.left, rect.top, rect.width, rect.height);
      }
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      getContext,
      getNativeId: () => nativeId,
    }),
    [getContext, nativeId]
  );

  useEffect(() => {
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    api.registerView(`${nativeId}`, {
      getContext,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
    } as SkiaGraphiteViewHandle);
    return () => {
      api.unregisterView(`${nativeId}`);
    };
  }, [
    getContext,
    getSize,
    redraw,
    makeImageSnapshot,
    measure,
    measureInWindow,
    nativeId,
  ]);

  // Let go of the recordings the view holds.
  useEffect(
    () => () => {
      queueRef.current.forEach((recording) => recording.release());
      queueRef.current = [];
      shownRef.current.forEach((recording) => recording.release());
      shownRef.current = [];
    },
    []
  );

  const {
    debug: _debug,
    opaque: _opaque,
    highBitDepth: _highBitDepth,
    ref: _ref,
    onLayout: _onLayout,
    nativeID: _nativeID,
    // Deprecated, kept out of the DOM.
    __destroyWebGLContextAfterRender: _destroyWebGLContextAfterRender,
    ...viewProps
  } = props;
  return (
    <Platform.View nativeID={`${nativeId}`} {...viewProps}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Platform.View>
  );
};
