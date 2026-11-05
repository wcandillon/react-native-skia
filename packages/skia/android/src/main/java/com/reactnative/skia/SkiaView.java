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

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

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
 * window belongs to the present thread (see PresentThread), where the frames
 * are presented, the frame scheduler and the Choreographer callback live, and
 * the native view is destroyed (see dropInstance): the surface callbacks post
 * the attach, the resize and the detach there, so that the main thread never
 * waits for a present in flight. A present holds the window for as long as
 * Graphite takes to replay the frame, which includes compiling the pipelines
 * it needs, seconds on a slow GPU, and a main thread made to wait for that is
 * an ANR (#4394). A TextureView tells the main thread when it drew a frame
 * (onSurfaceTextureUpdated), which hands it over to the scheduler, and leaves
 * its SurfaceTexture to the present thread, which releases it once the window
 * let go of it (see onSurfaceTextureDestroyed). A SurfaceView's surface is
 * the platform's, which destroys it as soon as surfaceDestroyed returns, so
 * there the main thread waits for the detach, for the length of a present at
 * most (see onSurfaceDestroyed).
 */
public class SkiaView extends ReactViewGroup implements SkiaViewAPI, Choreographer.FrameCallback {
    private static final String TAG = "SkiaView";

    // How long the main thread waits for the present thread to let go of a
    // SurfaceView's surface (see onSurfaceDestroyed): longer than a present
    // (a few milliseconds, behind the presents of the other canvases), shorter
    // than a pipeline compile on a slow GPU, well under the 5 seconds at which
    // Android reports an ANR.
    private static final long SURFACE_DETACH_TIMEOUT_MS = 200;

    @DoNotStrip
    private HybridData mHybridData;

    // Set by dropInstance(), on the main thread: no native method is called
    // from there after that. The native view itself goes on the present
    // thread, where the hybrid data says whether it is still there.
    private boolean mDropped = false;

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
            // The native view is destroyed on this thread (see dropInstance).
            if (!mHybridData.isValid()) {
                return 0;
            }
            int result = SkiaView.this.presentFrame();
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
                case SURFACE_VIEW -> ((SkiaSurfaceView) mView).setOpaque(opaque);
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
        if (mDropped) {
            return;
        }
        mDropped = true;
        // The registry's entry goes now: a successor may take this view's id,
        // on this thread, before the present thread gets to the drop.
        unregisterView();
        // The native view and its window go on the present thread, after the
        // present in flight, if any: nothing waits for it here.
        PresentThread.handler().post(mHybridData::resetNative);
    }

    // Whether the native view still exists, for the main thread: it is dropped
    // there (see dropInstance), and no native method is called from there
    // after that. The present thread, where it is destroyed, asks the hybrid
    // data instead (see presentFrame).
    private boolean hasNativeView() {
        return !mDropped;
    }

    // Runs the task on the present thread, if the native view is still there by
    // then. Main thread; the task calls native methods.
    private void postToNativeView(Runnable task) {
        PresentThread.handler().post(() -> {
            if (mHybridData.isValid()) {
                task.run();
            }
        });
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

    // Surfaces ------------------------------------------------------------

    // The callbacks come on the main thread, and post to the present thread,
    // which owns the window (see the class comment): the attach, the resize
    // and the detach run there in the order they came, behind the present in
    // flight, if any.

    // SurfaceView callbacks: the native side receives an android.view.Surface.

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        mFrameRateVote.attach(surface);
        if (!hasNativeView()) {
            return;
        }
        boolean highBitDepth = mSurfaceHighBitDepth;
        postToNativeView(() -> surfaceAvailable(surface, width, height, true, highBitDepth));
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(TAG, "onSurfaceChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        boolean highBitDepth = mSurfaceHighBitDepth;
        postToNativeView(() -> surfaceSizeChanged(surface, width, height, true, highBitDepth));
    }

    // Main thread, before the platform destroys a SurfaceView's surface, which
    // it does as soon as this returns: the window is detached on the present
    // thread, and the main thread waits for that, for the length of a present
    // at most. Past that, the present in flight is waiting on a pipeline
    // compile (seconds on a slow GPU, see #4394): the main thread gives the
    // surface up rather than hang, and the present thread skips the present
    // onto it when it gets there (see RNSkWindowSurface::abandon), as a
    // frame presented onto a window that is gone loses the GPU device.
    @Override
    public void onSurfaceDestroyed() {
        // The surface is still valid here, so the vote can be taken back.
        mFrameRateVote.detach();
        CountDownLatch detached = new CountDownLatch(1);
        PresentThread.handler().post(() -> {
            // Whatever the window had not drawn goes with it.
            cancelFrames();
            // A dropped native view let go of the window with itself.
            if (mHybridData.isValid()) {
                surfaceDestroyed();
            }
            detached.countDown();
        });
        boolean detachedInTime = false;
        try {
            detachedInTime = detached.await(SURFACE_DETACH_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (!detachedInTime && hasNativeView()) {
            surfaceAbandoned();
        }
    }

    // TextureView callbacks: the native side receives the SurfaceTexture and
    // creates the Surface it draws into. The 10-bit format is never used here.

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        if (!hasNativeView()) {
            return;
        }
        postToNativeView(() -> surfaceAvailable(surface, width, height, false, false));
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(TAG, "onSurfaceTextureSizeChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        postToNativeView(() -> surfaceSizeChanged(surface, width, height, false, false));
    }

    // Main thread, as the TextureView lets go of its SurfaceTexture. The window
    // over it is detached on the present thread, and the SurfaceTexture
    // released there once it is: returning false leaves the release to this
    // view (see TextureView.SurfaceTextureListener), so the main thread waits
    // for nothing, and the SurfaceTexture outlives the present in flight.
    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        PresentThread.handler().post(() -> {
            // Whatever the window had not drawn goes with it.
            cancelFrames();
            // A dropped native view let go of the window with itself.
            if (mHybridData.isValid()) {
                surfaceDestroyed();
            }
            surfaceTexture.release();
        });
        return false;
    }

    // Native ---------------------------------------------------------------

    private native HybridData initHybrid(SkiaManager skiaManager);

    // isSurface tells the native side whether `surface` is an
    // android.view.Surface (SurfaceView) or a SurfaceTexture (TextureView).
    private native void surfaceAvailable(Object surface, int width, int height, boolean isSurface, boolean highBitDepth);

    private native void surfaceSizeChanged(Object surface, int width, int height, boolean isSurface, boolean highBitDepth);

    private native void surfaceDestroyed();

    private native void surfaceAbandoned();

    private native void setLayoutSize(int width, int height);

    private native void setSurfaceHighBitDepth(boolean highBitDepth);

    native void registerView(int nativeId);

    private native void unregisterView();

    /**
     * Presents the queued recordings: FrameScheduler.PRESENTED when a frame
     * went to the window, FrameScheduler.MORE_QUEUED when recordings are left.
     * Present thread.
     */
    private native int presentFrame();
}
