/* global HTMLCanvasElement */
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { ViewProps } from "react-native";

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
  SkiaWebViewHandle,
} from "../specs/NativeSkiaModule.web";

import { SkiaViewNativeId } from "./SkiaViewNativeId";
import { useSkiaWebRenderer } from "./SkiaWebRenderer";
import type { Renderer, WebFrame } from "./SkiaWebRenderer";

// The web has no Graphite: the view paints pictures on a WebGL canvas (with
// context-loss recovery and the destroy-context-after-render mode). It shows
// one of two kinds of content. The picture of a <Canvas> or a
// <SkiaPictureView> is a whole frame: the latest one wins. The recordings
// submitted through the view's context (SkiaGraphiteView) keep their native
// semantics, presented in submission order and never dropped, with one
// difference: the surface starts cleared on every frame, so a recording draws
// the whole frame rather than a delta.

export interface SkiaViewHandle extends SkiaWebViewHandle {
  /** The canvas element, for Reanimated's measure(). */
  readonly canvasRef: () => HTMLCanvasElement | null;
}

export interface SkiaViewProps extends ViewProps {
  ref?: React.Ref<SkiaViewHandle>;
  __destroyWebGLContextAfterRender?: boolean;
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

export const SkiaView = (props: SkiaViewProps) => {
  const { ref, onLayout } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The picture of a <Canvas> or a <SkiaPictureView>: a whole frame.
  const pictureRef = useRef<SkPicture | null>(null);
  // Recordings submitted since the last frame, in order, and the frame on
  // screen, replayed when the surface is recreated.
  const queueRef = useRef<WebGraphiteRecording[]>([]);
  const shownRef = useRef<WebGraphiteRecording[]>([]);
  const flushScheduledRef = useRef(false);
  const nativeId = useMemo(
    () =>
      props.nativeID !== undefined
        ? Number(props.nativeID)
        : SkiaViewNativeId.current++,
    [props.nativeID]
  );

  const isStatic = props.__destroyWebGLContextAfterRender === true;

  // Presents the recordings submitted since the last frame. A frame that
  // cannot be painted yet (unmeasured canvas, lost context) stays queued for
  // the next opportunity.
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

  // Paints what the view holds: pending recordings first, else the picture,
  // else the frame on screen again (the surface was recreated).
  const paint = useCallback(
    (renderer: Renderer) => {
      if (queueRef.current.length > 0) {
        present(renderer);
      } else if (pictureRef.current) {
        renderer.draw([pictureRef.current]);
      } else if (shownRef.current.length > 0) {
        renderer.draw(shownRef.current.map((recording) => recording.picture));
      }
    },
    [present]
  );
  const rendererRef = useSkiaWebRenderer(canvasRef, isStatic, {
    paint,
    onLayout,
  });

  // Draws are flushed from a microtask rather than an animation frame: the
  // browser composites once per frame either way, and painting right away
  // keeps a frame produced inside an animation callback (the Reanimated
  // mapper, a frame loop) from slipping to the next one. Deferring to the
  // next animation frame would alternate between "flush pending in this
  // frame" and "flush scheduled for the next frame", halving the effective
  // frame rate. Without a renderer yet (an unmeasured canvas), the content
  // stays held and is painted by the renderer once it exists, so it is
  // never lost.
  const flush = useCallback(() => {
    flushScheduledRef.current = false;
    if (rendererRef.current) {
      paint(rendererRef.current);
    }
  }, [paint, rendererRef]);

  const redraw = useCallback(() => {
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true;
      queueMicrotask(flush);
    }
  }, [flush]);

  const setPicture = useCallback(
    (picture: SkPicture) => {
      pictureRef.current = picture;
      redraw();
    },
    [redraw]
  );

  const submit = useCallback(
    (recording: WebGraphiteRecording) => {
      recording.retain();
      queueRef.current.push(recording);
      redraw();
    },
    [redraw]
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

  const makeImageSnapshot = useCallback(
    (rect?: SkRect): SkImage | null => {
      const renderer = rendererRef.current;
      if (!renderer) {
        return null;
      }
      let frame: WebFrame;
      if (queueRef.current.length > 0) {
        frame = queueRef.current.map((recording) => recording.picture);
      } else if (pictureRef.current) {
        frame = [pictureRef.current];
      } else {
        frame = shownRef.current.map((recording) => recording.picture);
      }
      if (frame.length === 0) {
        return null;
      }
      return renderer.makeImageSnapshot(frame, rect);
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
          // x, y are relative to the parent
          rect.left - parentRect.left,
          rect.top - parentRect.top,
          rect.width,
          rect.height,
          // pageX, pageY are absolute screen coordinates
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

  // No flush cancellation is needed on unmount: a microtask queued before
  // unmount runs within the same task, and flush no-ops once the
  // layout-effect cleanup has nulled rendererRef.

  useImperativeHandle(
    ref,
    () => ({
      setPicture,
      getContext,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
      get canvasRef() {
        return () => canvasRef.current;
      },
    }),
    [
      setPicture,
      getContext,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
    ]
  );

  useEffect(() => {
    const api = global.SkiaViewApi as ISkiaViewApiWeb;
    api.registerView(`${nativeId}`, {
      setPicture,
      getContext,
      getSize,
      redraw,
      makeImageSnapshot,
      measure,
      measureInWindow,
    });
    return () => {
      // Views must be removed on unmount: the handle's closures capture the
      // canvas element, so a stale entry retains the whole detached DOM tree.
      api.unregisterView(`${nativeId}`);
    };
  }, [
    setPicture,
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
    ref: _ref,
    onLayout: _onLayout,
    nativeID: _nativeID,
    __destroyWebGLContextAfterRender: _isStatic,
    ...viewProps
  } = props;
  return (
    <Platform.View nativeID={`${nativeId}`} {...viewProps}>
      <canvas
        // A canvas element is bound to one context kind for life (WebGL for
        // the live renderer, 2D for the static one), so switching renderers
        // needs a fresh element.
        key={isStatic ? "static" : "webgl"}
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Platform.View>
  );
};
