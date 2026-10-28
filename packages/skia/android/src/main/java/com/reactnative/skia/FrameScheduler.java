package com.reactnative.skia;

import androidx.annotation.Nullable;

/**
 * Decides when a SkiaView presents the recordings queued for it. A SurfaceView
 * presents on the next vsync, when the compositor takes its buffer. A
 * TextureView shows a frame when its window draws, which takes the latest
 * frame presented and lets the others go: it presents one frame at a time,
 * the next once the window drew the previous one (see onFrameConsumed), so
 * that every draw gets a new frame and no frame is made for nothing; a frame
 * for a window resized since the one it shows goes on the spot in either case
 * (see requestFrame). While a replay is in flight it asks for every vsync,
 * each a tick that paces the replays (see RNSkView::presentFrameOnVsync). A
 * frame the window holds until the GPU finishes the one before it is presented
 * a moment later, alone (see onHeldFrameRetry), through the host like every
 * present. Keeps at most one frame callback and one such retry outstanding.
 * Lives on the present thread, whose Choreographer gives the vsync.
 */
final class FrameScheduler {
    // The bits of RNSkPresentFrameResult.h, which RNSkPresentFrameResultTest holds these to.
    /** Host's presents: a frame went to the window. */
    static final int PRESENTED = 1;
    /** Host's presents: a frame is left, more queued, held or declined (no drawable). */
    static final int MORE_QUEUED = 2;
    /** Host's presents and Host.tickOnVsync: a replay is in flight, its frame coming. */
    static final int REPLAY_COMING = 4;
    /** Host's presents: the window holds a frame until the GPU finishes the one before it. */
    static final int HELD_FOR_GPU = 8;

    /** What the scheduler asks of the view. */
    interface Host {
        /** Calls onFrame() on the next Choreographer frame. */
        void postFrameCallback();

        /**
         * Presents what is waiting, for a submitted recording: no vsync asked
         * for it. PRESENTED, MORE_QUEUED, REPLAY_COMING and HELD_FOR_GPU, as
         * they apply.
         */
        int presentFrame();

        /** Presents what is waiting on a vsync, the view's present tick. As presentFrame(). */
        int presentFrameOnVsync();

        /**
         * The TextureView's window drew the frame it was given: the next frame may go to it
         * now, a tick or not. Presents what is waiting, as presentFrame().
         */
        int presentFrameOnWindowDraw();

        /**
         * Presents the frame the window holds for the GPU once the GPU is done, and
         * nothing else: the queued recordings wait for the view's next frame, whose
         * ticks this leaves alone. As presentFrame().
         */
        int presentHeldFrame();

        /**
         * A vsync passed while the window has yet to draw the frame it was
         * given: the view's present tick, and nothing presented.
         * REPLAY_COMING while a replay is in flight.
         */
        int tickOnVsync();

        /** Calls onHeldFrameRetry() on the present thread once delayMillis have passed. */
        void postHeldFrameRetry(long delayMillis);
    }

    // The GPU finishing a frame is no event the view hears, so a held frame is
    // polled for: soon at first, then less often while the GPU stays busy, as
    // the context's readback poller does.
    static final long FIRST_HELD_FRAME_RETRY_DELAY_MILLIS = 1;
    static final long LONGEST_HELD_FRAME_RETRY_DELAY_MILLIS = 4;

    private final Host mHost;
    private boolean mFrameCallbackPosted = false;
    // Whether the frame callback outstanding retries a frame that is left,
    // rather than only ticking for a replay that is coming.
    private boolean mRetryPosted = false;
    private boolean mHeldFrameRetryPosted = false;
    // The delay of the next retry while the window keeps a frame held for the GPU.
    private long mHeldFrameRetryDelayMillis = FIRST_HELD_FRAME_RETRY_DELAY_MILLIS;
    // TextureView: the window has a frame it has not drawn yet.
    private boolean mFrameInWindow = false;

    FrameScheduler(Host host) {
        mHost = host;
    }

    /** A recording was submitted. Without a backing view there is no surface to present on yet. */
    void requestFrame(@Nullable BackingViewKind kind) {
        requestFrame(kind, false);
    }

    /**
     * A recording was submitted. With forResizedWindow, the window was resized since
     * the frame it shows was made, so it shows that frame stretched to its size, and
     * the recording is for its size: it is presented on the spot, ahead of the vsync
     * or the draw it would otherwise wait for (a TextureView's window takes it in
     * place of the frame it has not drawn yet), so that a window resized on every
     * frame is drawn at the right size on every frame.
     */
    void requestFrame(@Nullable BackingViewKind kind, boolean forResizedWindow) {
        if (kind == null) {
            return;
        }
        if (forResizedWindow) {
            present(kind);
            return;
        }
        // A retry still outstanding presents the new recording along with the
        // leftovers on that vsync.
        if (mRetryPosted) {
            return;
        }
        switch (kind) {
            case SURFACE_VIEW -> postFrameCallback();
            case TEXTURE_VIEW -> {
                if (!mFrameInWindow) {
                    present(kind);
                }
            }
        }
    }

    /** The Choreographer frame asked for with Host.postFrameCallback(). */
    void onFrame(@Nullable BackingViewKind kind) {
        mFrameCallbackPosted = false;
        mRetryPosted = false;
        if (kind == null) {
            return;
        }
        if (kind == BackingViewKind.TEXTURE_VIEW && mFrameInWindow) {
            if ((mHost.tickOnVsync() & REPLAY_COMING) != 0) {
                postFrameCallback();
            }
            return;
        }
        onPresented(kind, mHost.presentFrameOnVsync());
    }

    /**
     * The TextureView drew the frame it was given (or a later one, presented for a
     * resized window): the next frame may go to it, and the recording waiting for
     * that, if any, goes now.
     */
    void onFrameConsumed(@Nullable BackingViewKind kind) {
        mFrameInWindow = false;
        if (kind == null) {
            return;
        }
        onPresented(kind, mHost.presentFrameOnWindowDraw());
    }

    /**
     * The view presented on its own, for a redraw (see RNSkView::redraw): what
     * it left over, queued or held for the GPU, is presented as after a present
     * of this scheduler's, and a frame it put in a TextureView's window waits
     * for the window to draw it.
     */
    void onRedrawn(@Nullable BackingViewKind kind, int result) {
        if (kind == null) {
            return;
        }
        onPresented(kind, result);
    }

    /**
     * The moment after a present that left a frame held for the GPU (see
     * Host.postHeldFrameRetry): presents the held frame once the GPU is done,
     * unless the TextureView's window has a frame it has not drawn yet, whose
     * draw presents it. A retry outstanding when a vsync presented the frame
     * finds none held and presents nothing.
     */
    void onHeldFrameRetry(@Nullable BackingViewKind kind) {
        mHeldFrameRetryPosted = false;
        if (kind == null || (kind == BackingViewKind.TEXTURE_VIEW && mFrameInWindow)) {
            return;
        }
        onPresented(kind, mHost.presentHeldFrame());
    }

    /** The view left its window, or the window lost its surface: the host removed the callbacks. */
    void cancel() {
        mFrameCallbackPosted = false;
        mRetryPosted = false;
        mHeldFrameRetryPosted = false;
        mHeldFrameRetryDelayMillis = FIRST_HELD_FRAME_RETRY_DELAY_MILLIS;
        mFrameInWindow = false;
    }

    private void present(BackingViewKind kind) {
        onPresented(kind, mHost.presentFrame());
    }

    // A frame left over is never presented straight away: a TextureView's
    // waits for the window to draw the frame it has; any other (a
    // SurfaceView's, or one the window could not take or holds) is tried
    // again on the next vsync, and one held for the GPU alone also a moment
    // later. A replay coming keeps the vsync asked for, its tick.
    private void onPresented(BackingViewKind kind, int result) {
        if ((result & PRESENTED) != 0 && kind == BackingViewKind.TEXTURE_VIEW) {
            mFrameInWindow = true;
        }
        if ((result & MORE_QUEUED) != 0 && (kind != BackingViewKind.TEXTURE_VIEW || !mFrameInWindow)) {
            mRetryPosted = true;
            postFrameCallback();
        }
        if ((result & HELD_FOR_GPU) == 0) {
            mHeldFrameRetryDelayMillis = FIRST_HELD_FRAME_RETRY_DELAY_MILLIS;
        } else if (!mHeldFrameRetryPosted) {
            mHeldFrameRetryPosted = true;
            mHost.postHeldFrameRetry(mHeldFrameRetryDelayMillis);
            mHeldFrameRetryDelayMillis =
                    Math.min(mHeldFrameRetryDelayMillis * 2, LONGEST_HELD_FRAME_RETRY_DELAY_MILLIS);
        }
        if ((result & REPLAY_COMING) != 0) {
            postFrameCallback();
        }
    }

    private void postFrameCallback() {
        if (!mFrameCallbackPosted) {
            mFrameCallbackPosted = true;
            mHost.postFrameCallback();
        }
    }
}
