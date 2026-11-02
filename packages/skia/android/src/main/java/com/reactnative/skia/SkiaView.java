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
import androidx.annotation.RequiresApi;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.PointerEvents;
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

    // Props. opaque is applied in place, unless the buffer format implies it
    // (see setOpaque), and so are the z-order props where Android allows it
    // (see takesZOrder); the others are read once, when the backing view is
    // created (see updateView()).
    private BackingViewKind mBackingView = BackingViewKind.TEXTURE_VIEW;
    private boolean mOpaque = false;
    private boolean mZOrderOnTop = false;
    private boolean mZOrderMediaOverlay = false;
    private boolean mHighBitDepth = false;

    // The backing view, created by the first prop transaction and kept, with
    // the kind and the buffer format it was created with. The kind is null
    // until then: it is what tells a mounted canvas apart. Written on the
    // main thread, read on the present thread (see doFrame).
    private View mView;
    @Nullable
    private volatile BackingViewKind mKind = null;
    private boolean mSurfaceHighBitDepth = false;

    // What lets go of the presents held for the window frame that lays the
    // canvas out (see holdPresentsForWindowFrame), null while none are held.
    // Main thread.
    @Nullable
    private Runnable mHeldPresentsRelease = null;
    // Set while SurfaceView recreates the surface under a canvas on screen
    // (see updateView), whose window frame is not the one laying it out.
    private boolean mRecreatingSurfaceInPlace = false;

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

    // The backing view is created from the props of the first transaction and
    // kept (see updateView()). React calls a setter again only when its prop
    // changed, so a call on a mounted canvas is a change: the setters below
    // apply it in place where the view can take it, else they ignore it and
    // say so (a canvas that needs another backing view is remounted, with a
    // new key). The JS side warns about the same changes in development
    // (see views/android.ts), mirroring these rules.

    public void setBackingView(@Nullable String value) {
        if (mKind != null) {
            warnIgnoredOnceMounted("android.backingView");
            return;
        }
        mBackingView = BackingViewKind.fromBackingView(value);
    }

    public void setOpaque(boolean value) {
        // The 10-bit format only has 2 bits of alpha: a canvas that got it is
        // opaque whatever the prop says (see BackingViewKind.resolveOpaque).
        if (mKind != null && mSurfaceHighBitDepth) {
            warnIgnoredOnceMounted("android.opaque (a highBitDepth canvas is opaque)");
            return;
        }
        mOpaque = value;
    }

    public void setZOrderOnTop(boolean value) {
        if (takesZOrder("android.zOrderOnTop")) {
            mZOrderOnTop = value;
            applyZOrder();
        }
    }

    public void setZOrderMediaOverlay(boolean value) {
        if (takesZOrder("android.zOrderMediaOverlay")) {
            mZOrderMediaOverlay = value;
            applyZOrder();
        }
    }

    // Whether a z-order prop is taken. Before the backing view exists it is
    // read when the view is created. After that only a SurfaceView has a
    // z-order of its own (elsewhere the prop never applied, and the change is
    // moot), and SurfaceView moves a live surface since Android 11, for an app
    // targeting it; before that, the surface reads it when it is created.
    private boolean takesZOrder(String prop) {
        if (mKind == null) {
            return true;
        }
        if (mKind != BackingViewKind.SURFACE_VIEW) {
            return false;
        }
        boolean inPlace = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                && getContext().getApplicationInfo().targetSdkVersion >= Build.VERSION_CODES.R;
        if (!inPlace) {
            warnIgnoredOnceMounted(prop);
        }
        return inPlace;
    }

    private void applyZOrder() {
        if (mKind == BackingViewKind.SURFACE_VIEW) {
            ((SkiaSurfaceView) mView).setZOrder(mZOrderOnTop, mZOrderMediaOverlay);
        }
    }

    public void setHighBitDepth(boolean value) {
        if (mKind == null) {
            mHighBitDepth = value;
            return;
        }
        // Ignored, and said so, when it would change the buffer format.
        if (BackingViewKind.resolveHighBitDepth(mKind, value) != mSurfaceHighBitDepth) {
            warnIgnoredOnceMounted("highBitDepth");
        }
    }

    private void warnIgnoredOnceMounted(String prop) {
        Log.w(TAG, "Ignoring a change of " + prop + " on a mounted canvas: the backing view"
                + " is chosen when the canvas mounts. Remount the canvas (give it a new key)"
                + " to change it.");
    }

    // Apply the complete prop transaction once, after every prop has arrived.
    // The first one creates the backing view, which is then kept: a
    // SurfaceView must know its buffer format before it attaches (and its
    // z-order, before Android 11), and keeping a canvas on screen while its
    // backing view is replaced takes hold-and-retire logic specific to each
    // Android release (see PRs #4189 and #4192), which this view does not
    // carry. A canvas that needs another backing view is remounted instead,
    // and is off screen for a frame or two until the new view draws its first
    // frame. Later transactions apply the opacity in place: the surface's
    // pixel format on a SurfaceView, the view's opacity on a TextureView (the
    // setters decide what else is taken).
    void updateView() {
        BackingViewKind kind = mKind;
        if (kind != null) {
            boolean opaque = BackingViewKind.resolveOpaque(mOpaque, mSurfaceHighBitDepth);
            switch (kind) {
                case SURFACE_VIEW -> {
                    mRecreatingSurfaceInPlace = true;
                    ((SkiaSurfaceView) mView).setOpaque(opaque);
                    mRecreatingSurfaceInPlace = false;
                }
                case TEXTURE_VIEW -> ((SkiaTextureView) mView).setOpaque(opaque);
            }
            return;
        }
        kind = mBackingView;
        mKind = kind;
        mSurfaceHighBitDepth = BackingViewKind.resolveHighBitDepth(kind, mHighBitDepth);
        if (mHighBitDepth && !mSurfaceHighBitDepth) {
            Log.w(TAG, "highBitDepth needs a SurfaceView on Android, keeping the 8-bit format");
        }
        boolean opaque = BackingViewKind.resolveOpaque(mOpaque, mSurfaceHighBitDepth);
        // The surface will have this format: a frame recorded before it
        // exists, or while it is away, is recorded for it.
        if (hasNativeView()) {
            setSurfaceHighBitDepth(mSurfaceHighBitDepth);
        }
        mView = switch (kind) {
            case SURFACE_VIEW -> new SkiaSurfaceView(getContext(), this, mZOrderOnTop,
                    mZOrderMediaOverlay, opaque);
            case TEXTURE_VIEW -> new SkiaTextureView(getContext(), this, opaque);
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
        mFrameScheduler.requestFrame(mKind, forResizedWindow);
    }

    @Override
    public void doFrame(long frameTimeNanos) {
        mFrameScheduler.onFrame(mKind);
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
        mFrameScheduler.onFrameConsumed(mKind);
    }

    // Drops the frame callback, the frame the window took and the scheduler's
    // requests, on the present thread, where they live.
    private void cancelFrames() {
        Choreographer.getInstance().removeFrameCallback(this);
        PresentThread.handler().removeCallbacks(mOnFrameConsumed);
        mFrameScheduler.cancel();
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
        // The frame-commit callback arrives in Android 10, and only
        // hardware-rendered frames commit: before it, a canvas presents at once.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && isHardwareAccelerated()
                && !mRecreatingSurfaceInPlace
                && BackingViewKind.showsLayerBeforeWindowFrame(Build.VERSION.SDK_INT, mZOrderOnTop)) {
            holdPresentsForWindowFrame();
        }
        surfaceAvailable(surface, width, height, true, mSurfaceHighBitDepth);
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(TAG, "onSurfaceChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        surfaceSizeChanged(surface, width, height, true, mSurfaceHighBitDepth);
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
        // A surface recreated in place takes over what this one waited for.
        if (!mRecreatingSurfaceInPlace) {
            releaseHeldPresents();
        }
    }

    // Presents nothing until the window frame that lays the canvas out has
    // committed, and asks for that frame, since a surface can arrive outside
    // a traversal (a visibility change). Each hold has a callback of its own,
    // so one left from an earlier surface lets go of nothing.
    @RequiresApi(Build.VERSION_CODES.Q)
    private void holdPresentsForWindowFrame() {
        Runnable release = new Runnable() {
            @Override
            public void run() {
                if (mHeldPresentsRelease == this) {
                    releaseHeldPresents();
                }
            }
        };
        mHeldPresentsRelease = release;
        holdPresents();
        getViewTreeObserver().registerFrameCommitCallback(release);
        invalidate();
    }

    // The window frame committed, or the surface is gone: what the window
    // declined meanwhile is asked for again (see releasePresents).
    private void releaseHeldPresents() {
        if (mHeldPresentsRelease == null) {
            return;
        }
        mHeldPresentsRelease = null;
        if (hasNativeView()) {
            releasePresents();
        }
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

    /** Declines every present until releasePresents(). Main thread. */
    private native void holdPresents();

    /**
     * Lets go of holdPresents(): what the window declined meanwhile is asked
     * for again on the present thread, with or without a window. Main thread.
     */
    private native void releasePresents();
}
