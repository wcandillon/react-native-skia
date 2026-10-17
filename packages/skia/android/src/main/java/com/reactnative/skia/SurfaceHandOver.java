package com.reactnative.skia;

/**
 * Decides when a SurfaceView's surface may show its first frame. On Android 10
 * to 12 a layer above the window shows as soon as its surface exists, outside
 * the window frame that lays the canvas out, so a frame presented into it at
 * once shows over the screen that window frame replaces. There a canvas
 * arriving on screen gets its surface at once, so that the surface is set up
 * and its first frame recorded before that window frame, but presents nothing
 * until the frame commits. A view replacing a canvas already on screen
 * presents at once: its layer shows the last frame where the window still
 * shows the old view. Android 12L and later show the layer with the window
 * frame, and a layer behind the window shows only through the hole the window
 * frame punches. Main thread.
 */
final class SurfaceHandOver {
    /** What the hand-over asks of the view. */
    interface Host {
        /** Runs release once a window frame drawn after this call has committed. */
        void runAfterWindowFrameCommits(Runnable release);

        /** Gives the current surface to the renderer. */
        void handOverSurface();

        /** Makes the renderer present nothing until releaseFirstFrame(). */
        void holdFirstFrame();

        /** Lets the renderer present again, at once. */
        void releaseFirstFrame();

        /** Tells the renderer the surface it holds changed. */
        void forwardSurfaceChanged();

        /** Takes the surface back from the renderer. */
        void forwardSurfaceDestroyed();
    }

    private final Host mHost;
    private boolean mReplacesCanvasOnScreen;
    private int mGeneration = 0;
    private boolean mHandedOver = false;
    private boolean mFirstFrameHeld = false;

    SurfaceHandOver(Host host, boolean replacesCanvasOnScreen) {
        mHost = host;
        mReplacesCanvasOnScreen = replacesCanvasOnScreen;
    }

    /**
     * Whether a canvas arriving on screen holds its first frame for its window
     * frame: on Android 10 to 12 (API 29 to 31), for a layer above the window,
     * and only with hardware rendering, which commits frames.
     */
    static boolean defersArrivalToWindowFrame(int sdkInt, boolean hardwareAccelerated, boolean zOrderOnTop) {
        return sdkInt >= 29 && sdkInt <= 31 && hardwareAccelerated && zOrderOnTop;
    }

    void onSurfaceCreated(boolean defersArrivalToWindowFrame) {
        int generation = ++mGeneration;
        boolean arriving = !mReplacesCanvasOnScreen;
        mReplacesCanvasOnScreen = false;
        if (defersArrivalToWindowFrame && arriving) {
            mFirstFrameHeld = true;
            mHost.holdFirstFrame();
            mHost.runAfterWindowFrameCommits(() -> releaseFirstFrame(generation));
        }
        mHandedOver = true;
        mHost.handOverSurface();
    }

    void onSurfaceChanged() {
        if (mHandedOver) {
            mHost.forwardSurfaceChanged();
        }
    }

    /** The surface is gone, or the view left its window. */
    void onSurfaceReleased() {
        mGeneration++;
        if (mHandedOver) {
            mHandedOver = false;
            mHost.forwardSurfaceDestroyed();
        }
        if (mFirstFrameHeld) {
            mFirstFrameHeld = false;
            mHost.releaseFirstFrame();
        }
    }

    private void releaseFirstFrame(int generation) {
        if (generation != mGeneration || !mFirstFrameHeld) {
            return;
        }
        mFirstFrameHeld = false;
        mHost.releaseFirstFrame();
    }
}
