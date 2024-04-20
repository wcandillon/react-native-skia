package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.TextureView;

import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements SurfaceHolder.Callback {
    private SurfaceView mSurfaceView;

    private String tag = "SkiaView";

    public SkiaBaseView(Context context) {
        super(context);
        mSurfaceView = new SurfaceView(context);
        mSurfaceView.getHolder().addCallback(this);
        //mSurfaceView.setZOrderOnTop(true); // Make the SurfaceView transparent
        //mSurfaceView.getHolder().setFormat(PixelFormat.TRANSPARENT); // Necessary for transparent background
        addView(mSurfaceView);
    }

    public void destroySurface() {
        Log.i(tag, "destroySurface");
        surfaceDestroyed();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (this.getMeasuredWidth() == 0) {
            Log.i(tag, "Create Surface");
            // Surface creation is handled by the callback, nothing explicit needed here
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        Log.i(tag, "onLayout " + this.getMeasuredWidth() + "/" + this.getMeasuredHeight());
        super.onLayout(changed, left, top, right, bottom);
        mSurfaceView.layout(0, 0, this.getMeasuredWidth(), this.getMeasuredHeight());
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        return true;
    }

    // Implement SurfaceHolder.Callback methods
    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        Log.i(tag, "surfaceCreated");
        surfaceAvailable(holder.getSurface(), mSurfaceView.getWidth(), mSurfaceView.getHeight());
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        Log.i(tag, "surfaceChanged " + width + "/" + height);
        surfaceSizeChanged(width, height);
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        Log.i(tag, "surfaceDestroyed");
        destroySurface();
    }

    protected abstract void surfaceAvailable(Object surface, int width, int height);

    protected abstract void surfaceSizeChanged(int width, int height);

    protected abstract void surfaceDestroyed();

    protected abstract void setMode(String mode);

    protected abstract void setDebugMode(boolean show);

    protected abstract void updateTouchPoints(double[] points);

    protected abstract void registerView(int nativeId);

    protected abstract void unregisterView();
}