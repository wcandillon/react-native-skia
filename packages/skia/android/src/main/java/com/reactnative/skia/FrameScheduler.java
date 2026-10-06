package com.reactnative.skia;

import androidx.annotation.Nullable;

/**
 * Decides when a SkiaView presents the recordings queued for it: a SurfaceView
 * on the next vsync, a TextureView behind the draw its window has pending, so
 * that the window has taken the previous frame by then. Keeps at most one
 * frame callback and one posted present outstanding. Main thread.
 */
final class FrameScheduler {
    /** What the scheduler asks of the view. */
    interface Host {
        /** Calls onFrame() on the next Choreographer frame. */
        void postFrameCallback();

        /** Calls onPosted() from the main looper, behind any draw the window has pending. */
        void postBehindPendingDraw();

        /** Presents the queued recordings, returning whether any are left. */
        boolean presentFrame();
    }

    private final Host mHost;
    private boolean mFrameCallbackPosted = false;
    private boolean mPresentPosted = false;

    FrameScheduler(Host host) {
        mHost = host;
    }

    /** A recording was submitted. Without a backing view there is no surface to present on yet. */
    void requestFrame(@Nullable BackingViewKind kind) {
        if (kind == null) {
            return;
        }
        // A frame callback still outstanding (a retry, see presentOrRetry) presents
        // the new recording along with the leftovers on that vsync.
        if (mFrameCallbackPosted) {
            return;
        }
        if (presentsOnVsync(kind)) {
            postFrameCallback();
        } else {
            postBehindPendingDraw();
        }
    }

    /** The Choreographer frame asked for with Host.postFrameCallback(). */
    void onFrame(@Nullable BackingViewKind kind) {
        mFrameCallbackPosted = false;
        if (kind == null) {
            return;
        }
        if (presentsOnVsync(kind)) {
            presentOrRetry();
        } else {
            postBehindPendingDraw();
        }
    }

    /** The message posted with Host.postBehindPendingDraw(). */
    void onPosted() {
        mPresentPosted = false;
        presentOrRetry();
    }

    /** The view left its window, and the host removed both callbacks. */
    void cancel() {
        mFrameCallbackPosted = false;
        mPresentPosted = false;
    }

    // The compositor takes a SurfaceView's buffer at the vsync. A TextureView's frame
    // shows when its window draws, and its buffer queue replaces a frame not drawn yet.
    private static boolean presentsOnVsync(BackingViewKind kind) {
        return switch (kind) {
            case SURFACE_VIEW -> true;
            case TEXTURE_VIEW -> false;
        };
    }

    // Recordings left over (the present failed, or more were submitted meanwhile)
    // are tried again on the next vsync, never straight away.
    private void presentOrRetry() {
        if (mHost.presentFrame()) {
            postFrameCallback();
        }
    }

    private void postFrameCallback() {
        if (!mFrameCallbackPosted) {
            mFrameCallbackPosted = true;
            mHost.postFrameCallback();
        }
    }

    private void postBehindPendingDraw() {
        if (!mPresentPosted) {
            mPresentPosted = true;
            mHost.postBehindPendingDraw();
        }
    }
}
