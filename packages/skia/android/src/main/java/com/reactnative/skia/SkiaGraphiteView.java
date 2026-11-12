package com.reactnative.skia;

import android.content.Context;
import android.view.Choreographer;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;

/**
 * Presents Graphite recordings: JS records frames through the context
 * returned by SkiaViewApi.makeGraphiteContext, the view replays them on the
 * Choreographer. Requires the Graphite backend.
 */
public class SkiaGraphiteView extends SkiaBaseView implements Choreographer.FrameCallback {
    @DoNotStrip
    private HybridData mHybridData;

    private boolean mFramePending = false;

    public SkiaGraphiteView(Context context) {
        super(context);
        RNSkiaModule skiaModule = ((ReactContext) context).getNativeModule(RNSkiaModule.class);
        mHybridData = initHybrid(skiaModule.getSkiaManager());
    }

    /**
     * Presents the queued recordings on the next vsync. Main thread; called
     * from native when a recording is submitted.
     */
    @DoNotStrip
    public void scheduleFrame() {
        if (!mFramePending) {
            mFramePending = true;
            Choreographer.getInstance().postFrameCallback(this);
        }
    }

    @Override
    public void doFrame(long frameTimeNanos) {
        mFramePending = false;
        if (presentFrame()) {
            scheduleFrame();
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        Choreographer.getInstance().removeFrameCallback(this);
        mFramePending = false;
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        mHybridData.resetNative();
    }

    private native HybridData initHybrid(SkiaManager skiaManager);

    protected native void surfaceAvailable(Object surface, int width, int height, float pixelDensity, boolean isSurface, boolean highBitDepth);

    protected native void surfaceSizeChanged(Object surface, int width, int height, float pixelDensity, boolean isSurface, boolean highBitDepth);

    protected native void setPixelDensity(float pixelDensity);

    protected native void surfaceDestroyed();

    protected native void setDebugMode(boolean show);

    protected native void registerView(int nativeId);

    protected native void unregisterView();

    protected native int[] getBitmap(int width, int height);

    /** Choreographer tick: returns whether more recordings are waiting. */
    private native boolean presentFrame();
}
