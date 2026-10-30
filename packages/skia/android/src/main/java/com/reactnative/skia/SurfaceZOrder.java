package com.reactnative.skia;

/**
 * The z-order a SkiaSurfaceView asks of its SurfaceView, which starts as
 * neither on top nor a media overlay. Only a change is asked for: SkiaView
 * hands over the z-order with every prop transaction, and asking again is not
 * a no-op, since on Android 13 setZOrderOnTop(false) moves a live surface to
 * the default sublayer at once, below the other SurfaceViews, whatever
 * zOrderMediaOverlay asked for.
 */
final class SurfaceZOrder {
    /** The SurfaceView the z-order is asked of. */
    interface Target {
        void setZOrderOnTop(boolean onTop);

        void setZOrderMediaOverlay(boolean mediaOverlay);

        /** Schedules the window frame a live surface takes a changed z-order with. */
        void invalidate();
    }

    private final Target mTarget;
    private boolean mOnTop = false;
    private boolean mMediaOverlay = false;

    SurfaceZOrder(Target target) {
        mTarget = target;
    }

    /**
     * Asks for the sublayer the surface is composited at, relative to the
     * window: above it (on top), or below it, above the other SurfaceViews
     * there (media overlay) or among them (the default). setZOrderOnTop(false)
     * resets the request to the default, so it goes first.
     */
    void request(boolean onTop, boolean mediaOverlay) {
        if (onTop == mOnTop && mediaOverlay == mMediaOverlay) {
            return;
        }
        mOnTop = onTop;
        mMediaOverlay = mediaOverlay;
        mTarget.setZOrderOnTop(onTop);
        if (!onTop) {
            mTarget.setZOrderMediaOverlay(mediaOverlay);
        }
        mTarget.invalidate();
    }
}
