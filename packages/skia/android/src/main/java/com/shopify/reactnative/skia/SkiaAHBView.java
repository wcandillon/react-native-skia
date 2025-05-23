package com.shopify.reactnative.skia;


import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.PixelFormat;
import android.hardware.HardwareBuffer;
import android.media.Image;
import android.media.ImageReader;
import android.os.Build;
import android.util.Log;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

@SuppressLint("ViewConstructor")
@RequiresApi(api = Build.VERSION_CODES.Q)
public class SkiaAHBView extends View implements ImageReader.OnImageAvailableListener {

    private ImageReader mReader;

    private Bitmap mBitmap = null;

    private final Matrix matrix = new Matrix();

    SkiaViewAPI mApi;
    public SkiaAHBView(Context context, SkiaViewAPI api) {
        super(context);
        mApi = api;
    }

    private ImageReader createReader() {
        ImageReader reader = ImageReader.newInstance(getWidth(), getHeight(), PixelFormat.RGBA_8888, 2, HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE |
                HardwareBuffer.USAGE_GPU_COLOR_OUTPUT);
        reader.setOnImageAvailableListener(this, null);
        return reader;
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        int width = getWidth();
        int height = getHeight();
        if (mReader == null) {
            mReader = createReader();
            mApi.onSurfaceCreated(mReader.getSurface(), width, height);
        } else {
            mReader = createReader();
            mApi.onSurfaceChanged(mReader.getSurface(), width, height);
        }
    }

    @Override
    public void onImageAvailable(ImageReader reader) {
        try (Image image = reader.acquireLatestImage()) {
            if (image != null) {
                HardwareBuffer hb = image.getHardwareBuffer();
                if (mDebug) {
                    textureUpdated(image.getTimestamp());
                }
                if (hb != null) {
                    Bitmap bitmap = Bitmap.wrapHardwareBuffer(hb, null);
                    if (bitmap != null) {
                        mBitmap = bitmap;
                        hb.close();
                        invalidate();
                    }
                }
            }
        }
    }

    @Override
    protected void onDraw(@NonNull Canvas canvas) {
        super.onDraw(canvas);
        if (mBitmap != null) {
            float viewWidth = getWidth();
            float viewHeight = getHeight();
            float bitmapWidth = mBitmap.getWidth();
            float bitmapHeight = mBitmap.getHeight();

            // Calculate the scale factors
            float scaleX = viewWidth / bitmapWidth;
            float scaleY = viewHeight / bitmapHeight;

            // Reset the matrix and apply scaling
            matrix.reset();
            matrix.setScale(scaleX, scaleY);

            canvas.drawBitmap(mBitmap, matrix, null);
        }
    }

    private long _prevTimestamp = 0;
    public void textureUpdated(long ts) {
        long frameDuration = (ts - _prevTimestamp)/1000000;
        Log.i("SkiaAHBView", "onSurfaceTextureUpdated "+frameDuration+"ms");
        _prevTimestamp = ts;
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        mApi.onSurfaceDestroyed();
    }
}