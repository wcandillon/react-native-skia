package com.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.os.Build;
import android.util.Log;
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
 * backing view can show them (see rnsurface::FrameScheduler, on the native
 * side).
 *
 * Threading: the view and its surface callbacks are on the main thread. The
 * window belongs to the present thread (see PresentThread, owned by the
 * native side), where the frames are presented, the frame scheduler
 * (rnsurface::FrameScheduler) and its vsync (AChoreographer) live, and the
 * native view is destroyed (see dropInstance): the surface callbacks post
 * the attach, the resize and the detach there, so that the main thread
 * never waits for a present in flight. A present holds the window for as
 * long as Graphite takes to replay the frame, which includes compiling the
 * pipelines it needs, seconds on a slow GPU, and a main thread made to wait
 * for that is an ANR (#4394). A TextureView tells the main thread when it
 * drew a frame (onSurfaceTextureUpdated), which hands it over to the
 * scheduler, and leaves its SurfaceTexture to the present thread, which
 * releases it once the window let go of it (see onSurfaceTextureDestroyed).
 * A SurfaceView's surface is
 * the platform's, which destroys it as soon as surfaceDestroyed returns, so
 * there the main thread waits for the detach, for the length of a present at
 * most (see onSurfaceDestroyed).
 */
public class SkiaView extends ReactViewGroup implements SkiaViewAPI {
    private static final String TAG = "SkiaView";

    // How long the main thread waits for the present thread to let go of a
    // SurfaceView's surface (see onSurfaceDestroyed): longer than a present
    // (a few milliseconds, behind the presents of the other canvases), shorter
    // than a pipeline compile on a slow GPU, well under the 5 seconds at which
    // Android reports an ANR, and paid once per hold-up, however many canvases
    // go (see PresentThread.postAndWait).
    private static final long SURFACE_DETACH_TIMEOUT_MS = 200;

    @DoNotStrip
    private HybridData mHybridData;

    // Set by dropInstance(), on the main thread: no native method is called
    // from there after that, but for surfaceAbandoned, under the hybrid data's
    // lock (see onSurfaceDestroyed). The native view itself goes on the
    // present thread, where the hybrid data says whether it is still there.
    private boolean mDropped = false;

    // Whether a SurfaceView's surface is attached, for the main thread: set as
    // the attach is posted (see onSurfaceCreated), cleared as the detach is
    // (see onSurfaceDestroyed, which the backing view calls twice per surface).
    private boolean mSurfaceAttached = false;

    // The backing view's surface, by number: one more each time a surface
    // goes (see onSurfaceDestroyed, onSurfaceTextureDestroyed). A posted
    // attach or resize carries the number of the surface it is for and is
    // skipped on the present thread when that surface went meanwhile (see
    // postForSurface): an attach run after the platform destroyed the surface
    // would put a window over a surface that is gone, and ask for a frame
    // onto it. Written on the main thread, read on the present thread.
    private volatile int mSurfaceGeneration = 0;

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
            () -> PresentThread.post(mOnFrameConsumed);
    private final Runnable mCancelFrames = this::cancelFrames;

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
        if (mDropped) {
            return;
        }
        mDropped = true;
        // The registry's entry goes now: a successor may take this view's id,
        // on this thread, before the present thread gets to the drop.
        unregisterView();
        // The native view and its window go on the present thread, after the
        // present in flight, if any: nothing waits for it here.
        PresentThread.post(mHybridData::resetNative);
    }

    // Whether the native view still exists, for the main thread: it is dropped
    // there (see dropInstance), and no native method is called from there
    // after that, but for the one onSurfaceDestroyed makes under the hybrid
    // data's lock. The present thread, where it is destroyed, asks the hybrid
    // data instead (see presentFrame).
    private boolean hasNativeView() {
        return !mDropped;
    }

    // Runs the task on the present thread, if the native view is still there by
    // then. Main thread; the task calls native methods.
    private void postToNativeView(Runnable task) {
        PresentThread.post(() -> {
            if (mHybridData.isValid()) {
                task.run();
            }
        });
    }

    // Runs the task on the present thread, if the native view is still there
    // by then and the backing view's surface is still the one the task is for
    // (see mSurfaceGeneration). Main thread; the task calls native methods.
    private void postForSurface(Runnable task) {
        int generation = mSurfaceGeneration;
        postToNativeView(() -> {
            if (generation == mSurfaceGeneration) {
                task.run();
            }
        });
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        // The backing view gets this exact size, and so does its surface: tell
        // the native side now, so that a frame recorded before the surface
        // exists (the first one usually is) already has the right size. The
        // density goes along: after a display density change, React Native
        // lays the view out again, and its frames follow the density from
        // that layout on, never drawing at one density into a size made for
        // another.
        if (hasNativeView()) {
            setLayoutSize(right - left, bottom - top,
                    getResources().getDisplayMetrics().density);
        }
        if (mView != null) {
            mView.layout(0, 0, right - left, bottom - top);
        }
    }

    // Frames --------------------------------------------------------------

    /**
     * A frame went to the window. Only a SurfaceView votes (attached in
     * onSurfaceCreated): a TextureView is composited into its window, which
     * votes for it. Present thread; called from native.
     */
    @DoNotStrip
    public void onFramePresented() {
        mFrameRateVote.onFramePresented();
    }

    /**
     * The TextureView drew the frame it was given: the next one can go to it
     * (see rnsurface::FrameScheduler::onFrameConsumed). Main thread, from the
     * backing view.
     */
    @Override
    public void onSurfaceTextureUpdated() {
        post(mFrameConsumedPosted);
    }

    private void onFrameConsumed() {
        if (mHybridData.isValid()) {
            frameConsumed();
        }
    }

    // Drops the frame the window took and the scheduler's requests, on the
    // present thread, where they live. A frame-consumed signal still on its
    // way finds a scheduler that asked for nothing, and does nothing; a
    // vsync still on its way (AChoreographer has no cancel) is dropped by
    // the native host, or serves a request made since.
    private void cancelFrames() {
        if (mHybridData.isValid()) {
            cancelScheduledFrames();
        }
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
        PresentThread.post(mCancelFrames);
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
        mSurfaceAttached = true;
        boolean highBitDepth = mProps.surfaceHighBitDepth();
        postForSurface(() -> surfaceAvailable(surface, width, height, true, highBitDepth));
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(TAG, "onSurfaceChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        boolean highBitDepth = mProps.surfaceHighBitDepth();
        postForSurface(() -> surfaceSizeChanged(surface, width, height, true, highBitDepth));
    }

    // Main thread, before the platform destroys a SurfaceView's surface, which
    // it does as soon as this returns: the window is detached on the present
    // thread, and the main thread waits for that, for the length of a present
    // at most. Past that, the present in flight is waiting on a pipeline
    // compile (seconds on a slow GPU, see #4394): the main thread gives the
    // surface up rather than hang, and the present thread skips the present
    // onto it when it gets there, as a frame presented onto a window that is
    // gone loses the GPU device. The surface is given up before the detach is
    // posted, not once the wait has timed out (see RNSkWindowSurface::abandon):
    // the present thread checks and then presents, and a flag set after its
    // check would miss the present. A frame skipped onto a surface that is
    // about to be destroyed is nothing lost, and the detach takes the flag
    // down again. The wait is paid once per hold-up, not once per canvas: a
    // wait that timed out marks the present thread held up until the detach
    // it posted runs, and the canvases that go meanwhile give their surface
    // up without waiting (see PresentThread.postAndWait).
    @Override
    public void onSurfaceDestroyed() {
        // The surface is still valid here, so the vote can be taken back.
        mFrameRateVote.detach();
        // SurfaceView reports surfaceDestroyed from its own onDetachedFromWindow,
        // and SkiaSurfaceView calls this once more after that, a safety net for
        // the paths where it does not: nothing is attached by then.
        if (!mSurfaceAttached) {
            return;
        }
        mSurfaceAttached = false;
        // An attach or a resize still posted for this surface is stale now.
        mSurfaceGeneration++;
        // The native view may be dropped (see dropInstance), and destroyed on
        // the present thread at any moment: resetNative is synchronized on the
        // hybrid data, so the check and the call are too, as fbjni asks.
        synchronized (mHybridData) {
            if (mHybridData.isValid()) {
                surfaceAbandoned();
            }
        }
        // The bound, and the held-up mark it leaves when it runs out, are the
        // thread's (see PresentThread.postAndWait).
        PresentThread.postAndWait(() -> {
            // Whatever the window had not drawn goes with it.
            cancelFrames();
            // A dropped native view let go of the window with itself.
            if (mHybridData.isValid()) {
                surfaceDestroyed();
            }
        }, SURFACE_DETACH_TIMEOUT_MS);
    }

    // TextureView callbacks: the native side receives the SurfaceTexture and
    // creates the Surface it draws into. The 10-bit format is never used here.

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        if (!hasNativeView()) {
            return;
        }
        postForSurface(() -> surfaceAvailable(surface, width, height, false, false));
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(TAG, "onSurfaceTextureSizeChanged " + width + "/" + height);
        if (!hasNativeView()) {
            return;
        }
        postForSurface(() -> surfaceSizeChanged(surface, width, height, false, false));
    }

    // Main thread, as the TextureView lets go of its SurfaceTexture. The window
    // over it is detached on the present thread, and the SurfaceTexture
    // released there once it is: returning false leaves the release to this
    // view (see TextureView.SurfaceTextureListener), so the main thread waits
    // for nothing, and the SurfaceTexture outlives the present in flight.
    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        // An attach or a resize still posted for this SurfaceTexture is stale:
        // the window over it goes below, and the SurfaceTexture with it.
        mSurfaceGeneration++;
        PresentThread.post(() -> {
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

    private native void setLayoutSize(int width, int height, float pixelDensity);

    private native void setSurfaceHighBitDepth(boolean highBitDepth);

    private native void registerView(int nativeId);

    // Binds the view to its id, for the view manager. Main thread; a dropped
    // view is left alone, like every other native call made from there (see
    // hasNativeView).
    void bindNativeId(int nativeId) {
        if (!hasNativeView()) {
            return;
        }
        registerView(nativeId);
    }

    private native void unregisterView();

    // The TextureView drew the frame it was given. Present thread.
    private native void frameConsumed();

    // The scheduler forgets what it asked for (see cancelFrames). Present thread.
    private native void cancelScheduledFrames();
}
