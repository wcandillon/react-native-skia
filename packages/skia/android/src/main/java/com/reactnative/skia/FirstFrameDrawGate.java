package com.reactnative.skia;

import android.os.Build;

import java.util.ArrayList;

/**
 * Holds a SurfaceView's draw reports, and its hole, until a frame is
 * presented into its surface. The window punches the hole a surface behind it
 * shows through once the draw is reported finished, so a report sent before
 * the first frame would open the hole on an empty surface, which shows black.
 * From Android 14 the platform bounds the window's wait for that report
 * itself, so the report waits for the frame however long it takes. Before it,
 * a first frame that does not come within FIRST_FRAME_WAIT_MILLIS is not
 * waited for: the reports go out, and the view keeps the hole closed until
 * hasFrame(). A SurfaceView counts its draw as reported once, for its later
 * surfaces too, so the view keeps their holes closed the same way. Leaving
 * the window reports what is held, because Android 13 settles a SurfaceView's
 * pending draw only through that report. Main thread.
 */
final class FirstFrameDrawGate {
    /**
     * How long a window waits for the first frame before Android 14, the bound
     * Android 14 puts on the SurfaceSyncGroup a window waits for
     * (TRANSACTION_READY_TIMEOUT). Android 12L reports the draw through
     * ViewRootImpl.drawPending and Android 13 through a SurfaceSyncer, neither
     * of them bounded, so there a present that fails, or a canvas that never
     * presents, would otherwise hold the window's draw report for good.
     */
    static final long FIRST_FRAME_WAIT_MILLIS = 1000;

    /** What the gate asks of the view that owns it. */
    interface Host {
        /** Runs action on the main thread after delayMillis, unless removed. */
        void postDelayed(Runnable action, long delayMillis);

        /** Removes an action posted with postDelayed. */
        void removeCallbacks(Runnable action);

        /** hasFrame() changed: the view redraws, opening or closing its hole. */
        void invalidate();
    }

    private final Host mHost;
    private final boolean mWindowWaitBoundedByPlatform;
    private final Runnable mFirstFrameDeadline = this::onFirstFrameDeadline;
    private boolean mFramePresented = false;
    private boolean mDeadlinePosted = false;
    private final ArrayList<Runnable> mPendingDrawsFinished = new ArrayList<>();

    FirstFrameDrawGate(Host host, int sdkInt) {
        mHost = host;
        mWindowWaitBoundedByPlatform = sdkInt >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE;
    }

    /** Whether a frame has been presented into the current surface: the view opens its hole only then. */
    boolean hasFrame() {
        return mFramePresented;
    }

    /** A new surface: nothing has been presented into it yet. */
    void onSurfaceCreated() {
        setFramePresented(false);
    }

    /** The window asks to be told once the surface has drawn. */
    void onRedrawNeeded(Runnable drawingFinished) {
        if (mFramePresented) {
            drawingFinished.run();
            return;
        }
        mPendingDrawsFinished.add(drawingFinished);
        if (!mWindowWaitBoundedByPlatform && !mDeadlinePosted) {
            mDeadlinePosted = true;
            mHost.postDelayed(mFirstFrameDeadline, FIRST_FRAME_WAIT_MILLIS);
        }
    }

    /** A frame was presented into the surface. */
    void onFirstFramePresented() {
        setFramePresented(true);
        cancelDeadline();
        reportPendingDraws();
    }

    /** The surface is gone, so it has nothing left to draw. */
    void onSurfaceReleased() {
        setFramePresented(false);
        cancelDeadline();
        reportPendingDraws();
    }

    /** The view is leaving its window, which must hear about every draw it waits for. */
    void onDetachedFromWindow() {
        cancelDeadline();
        reportPendingDraws();
    }

    private void onFirstFrameDeadline() {
        mDeadlinePosted = false;
        reportPendingDraws();
    }

    private void setFramePresented(boolean framePresented) {
        if (mFramePresented != framePresented) {
            mFramePresented = framePresented;
            mHost.invalidate();
        }
    }

    private void cancelDeadline() {
        if (mDeadlinePosted) {
            mDeadlinePosted = false;
            mHost.removeCallbacks(mFirstFrameDeadline);
        }
    }

    private void reportPendingDraws() {
        if (mPendingDrawsFinished.isEmpty()) {
            return;
        }
        ArrayList<Runnable> pending = new ArrayList<>(mPendingDrawsFinished);
        mPendingDrawsFinished.clear();
        for (Runnable drawingFinished : pending) {
            drawingFinished.run();
        }
    }
}
