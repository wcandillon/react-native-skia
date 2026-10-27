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
 * (see requestFrame). Keeps at most one frame callback outstanding. Lives on
 * the present thread, whose Choreographer gives the vsync.
 */
final class FrameScheduler {
    /** Host.presentFrame: a frame went to the window. */
    static final int PRESENTED = 1;
    /** Host.presentFrame: recordings are left, more queued or declined (no drawable). */
    static final int MORE_QUEUED = 2;

    /** What the scheduler asks of the view. */
    interface Host {
        /** Calls onFrame() on the next Choreographer frame. */
        void postFrameCallback();

        /** Presents the queued recordings: PRESENTED and MORE_QUEUED, as they apply. */
        int presentFrame();
    }

    private final Host mHost;
    private boolean mFrameCallbackPosted = false;
    // TextureView: the window has a frame it has not drawn yet, and a request
    // arrived while it had.
    private boolean mFrameInWindow = false;
    private boolean mRequested = false;

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
        // A frame callback still outstanding (a retry, see present) presents
        // the new recording along with the leftovers on that vsync.
        if (mFrameCallbackPosted) {
            return;
        }
        switch (kind) {
            case SURFACE_VIEW -> postFrameCallback();
            case TEXTURE_VIEW -> {
                if (mFrameInWindow) {
                    mRequested = true;
                } else {
                    present(kind);
                }
            }
        }
    }

    /** The Choreographer frame asked for with Host.postFrameCallback(). */
    void onFrame(@Nullable BackingViewKind kind) {
        mFrameCallbackPosted = false;
        if (kind == null) {
            return;
        }
        present(kind);
    }

    /**
     * The TextureView drew the frame it was given (or a later one, presented for a
     * resized window): the recording waiting for that, if any, goes to it now.
     */
    void onFrameConsumed(@Nullable BackingViewKind kind) {
        mFrameInWindow = false;
        if (kind == null || !mRequested) {
            return;
        }
        present(kind);
    }

    /** The view left its window, or the window lost its surface: the host removed the callbacks. */
    void cancel() {
        mFrameCallbackPosted = false;
        mFrameInWindow = false;
        mRequested = false;
    }

    // Recordings left over are never presented straight away: a TextureView's
    // wait for the window to draw the frame just presented; the others (a
    // SurfaceView's, or any the window could not take, no drawable) are tried
    // again on the next vsync.
    private void present(BackingViewKind kind) {
        mRequested = false;
        final int result = mHost.presentFrame();
        final boolean inWindow =
                (result & PRESENTED) != 0 && kind == BackingViewKind.TEXTURE_VIEW;
        if (inWindow) {
            mFrameInWindow = true;
        }
        if ((result & MORE_QUEUED) == 0) {
            return;
        }
        if (inWindow) {
            mRequested = true;
        } else {
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
