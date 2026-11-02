package com.reactnative.skia;

import android.graphics.PixelFormat;
import android.os.Build;

import java.util.ArrayList;
import java.util.function.IntConsumer;

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
 * pending draw only through that report. A first frame is reported for the
 * surface it went into, and one reported for a surface released since opens
 * nothing.
 *
 * A change of the surface's format replaces the surface while its last frame
 * stays on screen: from Android 12 SurfaceView keeps the layer, which shows
 * the old buffers until new ones replace them, and before it SurfaceView
 * keeps the old layer until the new surface's draw is reported. So the hole
 * stays open through a surface replaced by changeFormat(), and the new
 * surface's draw report still waits for its own first frame. Before Android
 * 12 a draw reported ahead of that frame removes the old layer, so the hole
 * closes until the frame lands; and SurfaceView keeps one old layer, so a
 * format change reports the draws still held before it replaces the surface
 * again, which would otherwise leave the layer holding the last frame on
 * screen. Main thread, but for currentSurface().
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

    /** What the surface's layer shows; the view opens its hole over a frame only. */
    private enum FrameState {
        /** No frame. */
        NONE,
        /** The last frame of a surface a format change replaced, until the new surface's first. */
        REPLACED,
        /** A frame presented into the current surface. */
        PRESENTED,
    }

    private final Host mHost;
    private final boolean mWindowWaitBoundedByPlatform;
    private final boolean mDrawReportRemovesReplacedLayer;
    private final Runnable mFirstFrameDeadline = this::onFirstFrameDeadline;
    private FrameState mFrameState = FrameState.NONE;
    private int mFormat = PixelFormat.UNKNOWN;
    private boolean mChangingFormat = false;
    private boolean mDeadlinePosted = false;
    // The surfaces released so far: written on the main thread, read on the
    // thread that presents (see currentSurface).
    private volatile int mSurfacesReleased = 0;
    private final ArrayList<Runnable> mPendingDrawsFinished = new ArrayList<>();

    FirstFrameDrawGate(Host host, int sdkInt) {
        mHost = host;
        mWindowWaitBoundedByPlatform = sdkInt >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE;
        mDrawReportRemovesReplacedLayer = sdkInt < Build.VERSION_CODES.S;
    }

    /** Whether the surface's layer shows a frame: the view opens its hole only then. */
    boolean hasFrame() {
        return mFrameState != FrameState.NONE;
    }

    /**
     * Asks setFormat for format unless it was asked for last: SurfaceView
     * replaces the surface inside it, and the replaced one's frame stays shown.
     */
    void changeFormat(int format, IntConsumer setFormat) {
        if (format == mFormat) {
            return;
        }
        mFormat = format;
        if (mDrawReportRemovesReplacedLayer) {
            reportPendingDraws();
        }
        mChangingFormat = true;
        try {
            setFormat.accept(format);
        } finally {
            mChangingFormat = false;
        }
    }

    /** A new surface: nothing has been presented into it yet. */
    void onSurfaceCreated() {
        applyFrameState(mChangingFormat ? resolveReplacedFrameState() : FrameState.NONE);
    }

    /** The window asks to be told once the surface has drawn. */
    void onRedrawNeeded(Runnable drawingFinished) {
        if (mFrameState == FrameState.PRESENTED) {
            drawingFinished.run();
            return;
        }
        mPendingDrawsFinished.add(drawingFinished);
        if (!mWindowWaitBoundedByPlatform && !mDeadlinePosted) {
            mDeadlinePosted = true;
            mHost.postDelayed(mFirstFrameDeadline, FIRST_FRAME_WAIT_MILLIS);
        }
    }

    /**
     * The surface a frame presented now goes into, to hand to
     * onFirstFramePresented. The thread that presented reads it while the
     * native side holds the window, and onSurfaceReleased counts a surface
     * only once the native side has let go of it, so a frame never names a
     * surface created after the one it went into. Any thread.
     */
    int currentSurface() {
        return mSurfacesReleased;
    }

    /** A first frame was presented into the surface currentSurface() named. */
    void onFirstFramePresented(int surface) {
        if (surface != mSurfacesReleased) {
            return;
        }
        applyFrameState(FrameState.PRESENTED);
        cancelDeadline();
        reportPendingDraws();
    }

    /**
     * The surface is gone, so it has nothing left to draw. releaseNative lets
     * the native side go of it, waiting for a present in flight, and the
     * surface is counted released only once it has returned (see
     * currentSurface).
     */
    void onSurfaceReleased(Runnable releaseNative) {
        releaseNative.run();
        mSurfacesReleased++;
        applyFrameState(mChangingFormat ? resolveReplacedFrameState() : FrameState.NONE);
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

    // A surface a format change replaces leaves its frame on screen, if it had one.
    private FrameState resolveReplacedFrameState() {
        return switch (mFrameState) {
            case NONE -> FrameState.NONE;
            case REPLACED, PRESENTED -> FrameState.REPLACED;
        };
    }

    private void applyFrameState(FrameState frameState) {
        boolean hadFrame = hasFrame();
        mFrameState = frameState;
        if (hadFrame != hasFrame()) {
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
        if (mDrawReportRemovesReplacedLayer && mFrameState == FrameState.REPLACED) {
            applyFrameState(FrameState.NONE);
        }
        ArrayList<Runnable> pending = new ArrayList<>(mPendingDrawsFinished);
        mPendingDrawsFinished.clear();
        for (Runnable drawingFinished : pending) {
            drawingFinished.run();
        }
    }
}
