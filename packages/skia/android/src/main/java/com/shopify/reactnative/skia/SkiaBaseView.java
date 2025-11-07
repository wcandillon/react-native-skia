package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.Surface;
import android.view.View;

import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements SkiaViewAPI {
    private View mView;
    private Bitmap mFirstFrameBitmap;
    private boolean mFirstFrameReady = false;
    private boolean mSurfaceReady = false;
    private final Paint mPaint = new Paint();

    private final boolean debug = false;
    private final String tag = "SkiaView";

    public SkiaBaseView(Context context) {
        super(context);
        mPaint.setAntiAlias(false);
        mPaint.setFilterBitmap(false);
        setWillNotDraw(false); // Enable onDraw for first frame rendering
        mView = new SkiaTextureView(context, this, debug);
        addView(mView);
    }

    public void setOpaque(boolean value) {
        if (value && mView instanceof SkiaTextureView) {
            removeView(mView);
            mView = new SkiaSurfaceView(getContext(), this, debug);
            addView(mView);
        } else if (!value && mView instanceof SkiaSurfaceView) {
            removeView(mView);
            mView = new SkiaTextureView(getContext(), this, debug);
            addView(mView);
        }
    }

    void dropInstance() {
        unregisterView();
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
        mView.layout(0, 0, right - left, bottom - top);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        // Draw first frame bitmap if available and surface not ready
        if (!mSurfaceReady && mFirstFrameReady && mFirstFrameBitmap != null) {
            canvas.drawBitmap(mFirstFrameBitmap, 0, 0, mPaint);
        }
    }

    public void setFirstFrameBitmap(Bitmap bitmap) {
        if (debug) {
            Log.d(tag, "Setting first frame bitmap: " + (bitmap != null));
        }

        // Clean up old bitmap if exists
        if (mFirstFrameBitmap != null && !mFirstFrameBitmap.isRecycled()) {
            mFirstFrameBitmap.recycle();
        }

        mFirstFrameBitmap = bitmap;
        mFirstFrameReady = (bitmap != null);

        // Request redraw to show the bitmap
        if (mFirstFrameReady && !mSurfaceReady) {
            postInvalidate();
        }
    }

    @Override
    public void onSurfaceCreated(Surface surface, int width, int height) {
        mSurfaceReady = true;
        surfaceAvailable(surface, width, height, true);

        // Clear first frame bitmap once surface is ready
        clearFirstFrame();
    }

    @Override
    public void onSurfaceChanged(Surface surface, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, true);
    }

    @Override
    public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {
        mSurfaceReady = true;
        surfaceAvailable(surface, width, height, false);

        // Clear first frame bitmap once surface is ready
        clearFirstFrame();
    }

    @Override
    public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(surface, width, height, false);
    }

    @Override
    public void onSurfaceDestroyed() {
        mSurfaceReady = false;
        surfaceDestroyed();
    }

    private void clearFirstFrame() {
        if (mFirstFrameBitmap != null && !mFirstFrameBitmap.isRecycled()) {
            mFirstFrameBitmap.recycle();
            mFirstFrameBitmap = null;
        }
        mFirstFrameReady = false;
    }

    protected abstract void surfaceAvailable(Object surface, int width, int height, boolean opaque);

    protected abstract void surfaceSizeChanged(Object surface, int width, int height, boolean opaque);

    protected abstract void surfaceDestroyed();

    protected abstract void setDebugMode(boolean show);

    protected abstract void registerView(int nativeId);

    protected abstract void unregisterView();
}