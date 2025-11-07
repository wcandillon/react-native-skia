package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.Bitmap;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;

public class SkiaPictureView extends SkiaBaseView {
    @DoNotStrip
    private HybridData mHybridData;

    public SkiaPictureView(Context context) {
        super(context);
        RNSkiaModule skiaModule = ((ReactContext) context).getNativeModule(RNSkiaModule.class);
        mHybridData = initHybrid(skiaModule.getSkiaManager());

        // Request first frame rendering after initialization
        requestFirstFrame();
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        mHybridData.resetNative();
    }

    private native HybridData initHybrid(SkiaManager skiaManager);

    protected native void surfaceAvailable(Object surface, int width, int height, boolean opaque);

    protected native void surfaceSizeChanged(Object surface, int width, int height, boolean opaque);

    protected native void surfaceDestroyed();

    protected native void setBgColor(int color);

    protected native void setDebugMode(boolean show);

    protected native void registerView(int nativeId);

    protected native void unregisterView();

    // Native method to render first frame to bitmap
    protected native Object renderFirstFrame(int width, int height);

    // Request first frame rendering
    public void requestFirstFrame() {
        // Post to get layout dimensions
        post(new Runnable() {
            @Override
            public void run() {
                int width = getWidth();
                int height = getHeight();
                if (width > 0 && height > 0) {
                    Object result = renderFirstFrame(width, height);
                    if (result instanceof Bitmap) {
                        Bitmap firstFrame = (Bitmap) result;
                        setFirstFrameBitmap(firstFrame);
                    }
                } else {
                    // If view not laid out yet, try again later
                    postDelayed(this, 10);
                }
            }
        });
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        // Request first frame after layout if dimensions changed
        if (changed && (right - left) > 0 && (bottom - top) > 0) {
            requestFirstFrame();
        }
    }
}
