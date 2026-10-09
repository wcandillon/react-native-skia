package com.reactnative.skia;

/**
 * Decides when a SurfaceView's surface reaches the renderer. On Android 10 to
 * 12 a layer above the window shows as soon as its surface exists, outside the
 * window frame that lays the canvas out, so a frame presented into it at once
 * shows over the screen that window frame replaces. There the surface is handed
 * over once that window frame commits. Android 12L and later show the layer
 * with the window frame, and a layer behind the window shows only through the
 * hole the window frame punches. A surface released or recreated before its
 * commit is never handed over. Main thread.
 */
final class SurfaceHandOver {
    /** What the hand-over asks of the view. */
    interface Host {
        /** Runs handOver once a window frame drawn after this call has committed. */
        void runAfterWindowFrameCommits(Runnable handOver);

        /** Gives the current surface to the renderer. */
        void handOverSurface();

        /** Tells the renderer the surface it holds changed. */
        void forwardSurfaceChanged();

        /** Takes the surface back from the renderer. */
        void forwardSurfaceDestroyed();
    }

    private final Host mHost;
    private int mGeneration = 0;
    private boolean mHandedOver = false;

    SurfaceHandOver(Host host) {
        mHost = host;
    }

    /**
     * Whether a new surface waits for the window frame: on Android 10 to 12
     * (API 29 to 31), for a layer above the window, and only with hardware
     * rendering, which commits frames.
     */
    static boolean defersToWindowFrame(int sdkInt, boolean hardwareAccelerated, boolean zOrderOnTop) {
        return sdkInt >= 29 && sdkInt <= 31 && hardwareAccelerated && zOrderOnTop;
    }

    void onSurfaceCreated(boolean defersToWindowFrame) {
        int generation = ++mGeneration;
        if (defersToWindowFrame) {
            mHost.runAfterWindowFrameCommits(() -> handOver(generation));
        } else {
            handOver(generation);
        }
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
    }

    private void handOver(int generation) {
        if (generation != mGeneration) {
            return;
        }
        mHandedOver = true;
        mHost.handOverSurface();
    }
}
