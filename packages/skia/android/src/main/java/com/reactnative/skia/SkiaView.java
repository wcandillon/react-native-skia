package com.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.os.Build;
import android.util.Log;
import android.view.Choreographer;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.View;

import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.PointerEvents;
import com.facebook.react.util.RNLog;
import com.facebook.react.views.view.ReactViewGroup;

/**
 * The Android view behind <Canvas> and <SkiaGraphiteView>.
 * It is backed by a TextureView or a SurfaceView, named by the
 * androidBackingView prop and created once, from the props of the first
 * transaction, for the life of the view (see updateView()), that the native
 * side draws into with Graphite, presenting the queued recordings when the
 * backing view can show them (see FrameScheduler).
 *
 * Threading: the view and its surface callbacks are on the main thread. The
 * frames are presented on the present thread (see PresentThread), where the
 * frame scheduler and the Choreographer callback live; a TextureView tells
 * the main thread when it drew a frame (onSurfaceTextureUpdated), which
 * hands it over to the scheduler. The native view is destroyed on the main
 * thread while the present thread may be presenting (see dropInstance): a
 * lock keeps the two apart.
 */
public class SkiaView extends ReactViewGroup implements SkiaViewAPI, Choreographer.FrameCallback {
    private static final String TAG = "SkiaView";

    @DoNotStrip
    private HybridData mHybridData;

    // Excludes dropInstance(), which destroys the native view on the main
    // thread, from a present in flight on the present thread (see
    // presentFrame below). Held for the length of a present.
    private final Object mNativeLock = new Object();

    private final BackingViewProps mProps;

    // The backing view, created by the first prop transaction and kept.
    private View mView;

    private final SurfaceFrameRateVote mFrameRateVote = new SurfaceFrameRateVote(this);
    private final Runnable mOnFrameConsumed = this::onFrameConsumed;
    // A TextureView records its draw on the main thread before the render
    // thread takes the frame, at the sync that ends the traversal: the
    // signal is posted behind the traversal, so that the frame presented on
    // it is taken by the draw after, never by this one.
    private final Runnable mFrameConsumedPosted =
            () -> PresentThread.handler().post(mOnFrameConsumed);
    private final Runnable mCancelFrames = this::cancelFrames;
    // Runs on the present thread: the Choreographer it posts to is that
    // thread's.
    private final FrameScheduler mFrameScheduler = new FrameScheduler(new FrameScheduler.Host() {
        @Override
        public void postFrameCallback() {
            Choreographer.getInstance().postFrameCallback(SkiaView.this);
        }

        @Override
        public int presentFrame() {
            int result;
            synchronized (mNativeLock) {
                if (!hasNativeView()) {
                    return 0;
                }
                result = SkiaView.this.presentFrame();
            }
            // Only a SurfaceView votes (attached in onSurfaceCreated): a
            // TextureView is composited into its window, which votes for it.
            if ((result & FrameScheduler.PRESENTED) != 0) {
                mFrameRateVote.onFramePresented();
            }
            return result;
        }
    });

    public SkiaView(Context context) {
        super(context);
        // ReactViewGroup disables clipChildren (RN overflow is handled with canvas
        // clipping instead). Android copies the parent's clipChildren into each
        // child's RenderNode.clipToBounds, and HWUI treats a damaged node without
        // it as unbounded damage (RenderNode::damageSelf). The TextureView child
        // invalidates on every frame, so without this every non-opaque canvas
        // frame repaints the whole window. Our only child exactly fills this
        // view, so clipping it changes nothing visually.
        setClipChildren(true);
        mProps = new BackingViewProps(Build.VERSION.SDK_INT, context.getApplicationInfo().targetSdkVersion,
                this::warn);
        RNSkiaModule skiaModule = ((ReactContext) context).getNativeModule(RNSkiaModule.class);
        mHybridData = initHybrid(skiaModule.getSkiaManager());
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        // When pointerEvents is "none" or "box-none", make this view completely
        // transparent to touch dispatch so events pass through to views behind it
        if (!PointerEvents.canBeTouchTarget(getPointerEvents())) {
            return false;
        }
        return super.dispatchTouchEvent(ev);
    }

    // The props go through BackingViewProps, which says what the backing view
    // does not take of them (a canvas that needs another backing view is
    // remounted, with a new key).

    public void setBackingView(@Nullable String value) {
        mProps.setBackingView(value);
    }

    public void setOpacity(@Nullable String value) {
        mProps.setOpacity(value);
    }

    public void setZOrderOnTop(boolean value) {
        mProps.setZOrderOnTop(value);
    }

    public void setZOrderMediaOverlay(boolean value) {
        mProps.setZOrderMediaOverlay(value);
    }

    public void setHighBitDepth(boolean value) {
        mProps.setHighBitDepth(value);
    }

    // RNLog writes the warning to logcat and, in development, to the JS
    // console and LogBox; it names the view, as React Native's own views do.
    private void warn(String message) {
        RNLog.w((ReactContext) getContext(), TAG + ": " + message);
    }

    // Apply the complete prop transaction once, after every prop has arrived.
    // The first one creates the backing view, which is then kept: a
    // SurfaceView must know its buffer format before it attaches (and its
    // z-order, where Android does not move a live surface), and keeping a
    // canvas on screen while its backing view is replaced takes
    // hold-and-retire logic specific to each Android release (see PRs #4189
    // and #4192), which this view does not carry. A canvas that needs another
    // backing view is remounted instead, and is off screen for a frame or two
    // until the new view draws its first frame. Later transactions apply the
    // opacity in place: the surface's pixel format on a SurfaceView, the
    // view's opacity on a TextureView; and a SurfaceView's z-order as
    // BackingViewProps took it, once per transaction so that a change of both
    // z-order props moves the surface once.
    void updateView() {
        BackingViewKind kind = mProps.kind();
        if (kind != null) {
            switch (kind) {
                case SURFACE_VIEW -> {
                    SkiaSurfaceView surfaceView = (SkiaSurfaceView) mView;
                    surfaceView.setOpaque(mProps.isOpaque());
                    surfaceView.setZOrder(mProps.zOrderOnTop(), mProps.zOrderMediaOverlay());
                }
                case TEXTURE_VIEW -> ((SkiaTextureView) mView).setOpaque(mProps.isOpaque());
            }
            return;
        }
        kind = mProps.mount();
        // The surface will have this format: a frame recorded before it
        // exists, or while it is away, is recorded for it.
        if (hasNativeView()) {
            setSurfaceHighBitDepth(mProps.surfaceHighBitDepth());
        }
        mView = switch (kind) {
            case SURFACE_VIEW -> new SkiaSurfaceView(getContext(), this, mProps.zOrderOnTop(),
                    mProps.zOrderMediaOverlay(), mProps.isOpaque());
            case TEXTURE_VIEW -> new SkiaTextureView(getContext(), this, mProps.isOpaque());
        };
        addView(mView);
        // React Native sizes native children explicitly through onLayout, so
        // the requestLayout triggered by addView is ignored; size the new
        // child ourselves or it stays 0x0 and never gets a surface.
        if (getWidth() > 0 || getHeight() > 0) {
            mView.layout(0, 0, getWidth(), getHeight());
        }
    }

    // React drops the view for good: it is never recycled (ReactViewManager
    // only sets up recycling for its exact class). The native view behind it
    // would otherwise live on until this object is finalized, which the
    // garbage collector may never get to: the GPU memory the view holds (its
    // Graphite recorder and resource cache, the queued and last presented
    // recordings, the swapchain) is invisible to it. Destroy it now, its
    // destructors release all of that. The backing view may still call back
    // after this, it leaves the window around the same time: see hasNativeView().
    void dropInstance() {
        // A present in flight finishes first; none starts after.
        synchronized (mNativeLock) {
            if (!hasNativeView()) {
                return;
            }
            unregisterView();
            mHybridData.resetNative();
        }
    }

    // Whether the native view still exists. It is destroyed in dropInstance(),
    // and no native method may be called after that: on the main thread, where
    // dropInstance() runs, or under mNativeLock elsewhere.
    private boolean hasNativeView() {
        return mHybridData.isValid();
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        // The backing view gets this exact size, and so does its surface: tell
        // the native side now, so that a frame recorded before the surface
        // exists (the first one usually is) already has the right size.
        if (hasNativeView()) {
            setLayoutSize(right - left, bottom - top);
        }
        if (mView != null) {
            mView.layout(0, 0, right - left, bottom - top);
        }
    }

    // Frames --------------------------------------------------------------

    /**
     * Runs a task on the present thread, never on the spot (the native side
     * posts with locks held). Any thread; called from native.
     */
    @DoNotStrip
    public void runOnPresentThread(Runnable task) {
        PresentThread.handler().post(task);
    }

    /**
     * A recording was submitted. With forResizedWindow, it is for a window
     * resized since the frame it shows was made (see
     * FrameScheduler.requestFrame). Present thread; called from native.
     */
    @DoNotStrip
    public void scheduleFrame(boolean forResizedWindow) {
        mFrameScheduler.requestFrame(mProps.kind(), forResizedWindow);
    }

    @Override
    public void doFrame(long frameTimeNanos) {
        mFrameScheduler.onFrame(mProps.kind());
    }

    /**
     * The TextureView drew the frame it was given: the next one can go to it
     * (see FrameScheduler.onFrameConsumed). Main thread, from the backing view.
     */
    @Override
    public void onSurfaceTextureUpdated() {
        post(mFrameConsumedPosted);
    }

    private void onFrameConsumed() {
        mFrameScheduler.onFrameConsumed(mProps.kind());
    }

    // Drops the frame callback, the frame the window took and the scheduler's
    // requests, on the present thread, where they live.
    private void cancelFrames() {
        Choreographer.getInstance().removeFrameCallback(this);
        PresentThread.handler().removeCallbacks(mOnFrameConsumed);
        mFrameScheduler.cancel();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        mProps.onAttachedToWindow();
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        removeCallbacks(mFrameConsumedPosted);
        PresentThread.handler().post(mCancelFrames);
    }

    // A no-op for a dropped view (see dropInstance), which every mounted view
    // is eventually.
    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        synchronized (mNativeLock) {
            mHybridData.resetNative();
        }
    }

    // Surfaces ------------------------------------------------------------

    // SurfaceView callbacks: the native side receives an android.view.Surface.

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        mFrameRateVote.attach(surface);
        if (!hasNativeView()) {
            return;
        }
        surfaceAvailable(surface, width, height, true, mProps.surfaceHighBitDepth());
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(TAG, "onSurfaceChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        surfaceSizeChanged(surface, width, height, true, mProps.surfaceHighBitDepth());
    }

    // TextureView callbacks: the native side receives the SurfaceTexture and
    // creates the Surface it draws into. The 10-bit format is never used here.

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        if (!hasNativeView()) {
            return;
        }
        surfaceAvailable(surface, width, height, false, false);
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(TAG, "onSurfaceTextureSizeChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        surfaceSizeChanged(surface, width, height, false, false);
    }

    // Main thread, before the platform destroys the surface: the native side
    // waits for a present in flight on the present thread, then lets go of
    // the window, so that nothing touches it once this returns.
    @Override
    public void onSurfaceDestroyed() {
        // The surface is still valid here, so the vote can be taken back.
        mFrameRateVote.detach();
        // Whatever the window had not drawn goes with it.
        PresentThread.handler().post(mCancelFrames);
        if (!hasNativeView()) {
            return;
        }
        surfaceDestroyed();
    }

    // Native ---------------------------------------------------------------

    private native HybridData initHybrid(SkiaManager skiaManager);

    // isSurface tells the native side whether `surface` is an
    // android.view.Surface (SurfaceView) or a SurfaceTexture (TextureView).
    private native void surfaceAvailable(Object surface, int width, int height, boolean isSurface, boolean highBitDepth);

    private native void surfaceSizeChanged(Object surface, int width, int height, boolean isSurface, boolean highBitDepth);

    private native void surfaceDestroyed();

    private native void setLayoutSize(int width, int height);

    private native void setSurfaceHighBitDepth(boolean highBitDepth);

    native void registerView(int nativeId);

    private native void unregisterView();

    /**
     * Presents the queued recordings: FrameScheduler.PRESENTED when a frame
     * went to the window, FrameScheduler.MORE_QUEUED when recordings are left.
     * Present thread, under mNativeLock.
     */
    private native int presentFrame();
}
