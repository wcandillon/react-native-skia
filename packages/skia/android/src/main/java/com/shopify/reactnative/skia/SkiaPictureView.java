package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.SurfaceTexture;
import android.view.Surface;

import com.facebook.jni.HybridData;
import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactContext;

public class SkiaPictureView extends SkiaBaseView {
    @DoNotStrip
    private HybridData mHybridData;
    private Paint paint = new Paint();

    private boolean androidWarmup = false;

    public SkiaPictureView(Context context) {
        super(context);
        RNSkiaModule skiaModule = ((ReactContext) context).getNativeModule(RNSkiaModule.class);
        mHybridData = initHybrid(skiaModule.getSkiaManager());
    }

    public void setAndroidWarmup(boolean androidWarmup) {
        this.androidWarmup = androidWarmup;
        setWillNotDraw(!androidWarmup);
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        mHybridData.resetNative();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        // Skip the warming up feature if it is disabled or already cleared.
        if (!androidWarmup) {
            return;
        }

        // Get the view dimensions
        int width = getWidth();
        int height = getHeight();

        if (width > 0 && height > 0) {
            // Get the bitmap data from native
            int[] pixels = getBitmap(width, height);

            if (pixels != null && pixels.length == width * height) {
                // Create bitmap from pixels
                Bitmap bitmap = Bitmap.createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888);

                // Draw the bitmap on the canvas
                paint.setFilterBitmap(true);
                canvas.drawBitmap(bitmap, 0, 0, paint);
                // Let GC release the bitmap; recycling immediately breaks hardware-accelerated draws.
            }
        }
    }

    private native HybridData initHybrid(SkiaManager skiaManager);

    protected native void surfaceAvailable(Object surface, int width, int height, boolean opaque, boolean highBitDepth);

    protected native void surfaceSizeChanged(Object surface, int width, int height, boolean opaque, boolean highBitDepth);

    protected native void surfaceDestroyed();

    protected native void setBgColor(int color);

    protected native void setDebugMode(boolean show);

    protected native void registerView(int nativeId);

    protected native void unregisterView();

    protected native int[] getBitmap(int width, int height);

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        super.onSurfaceTextureCreated(surface, width, height);
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        super.onSurfaceTextureChanged(surface, width, height);
    }

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        super.onSurfaceCreated(surface, width, height);
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        super.onSurfaceChanged(surface, width, height);
    }
}
