package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.TextureView;

import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements TextureView.SurfaceTextureListener {
    private TextureView mTexture;

    private String tag = "SkiaView";

    private boolean isDropped = false;

    public SkiaBaseView(Context context) {
        super(context);
        mTexture = new TextureView(context);
        mTexture.setSurfaceTextureListener(this);
        mTexture.setOpaque(false);
        addView(mTexture);
    }

    private void createSurfaceTexture() {
        // This API Level is >= 26, we created our own SurfaceTexture to have a faster time to first frame
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            Log.i(tag, "Create SurfaceTexture");
            SurfaceTexture surface = new SurfaceTexture(false);
            mTexture.setSurfaceTexture(surface);
            this.onSurfaceTextureAvailable(surface, this.getMeasuredWidth(), this.getMeasuredHeight());
        }
    }

    void dropInstance() {
        isDropped = true;
        unregisterView();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (this.getMeasuredWidth() == 0) {
            createSurfaceTexture();
        }
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        Log.i(tag, "onLayout " + this.getMeasuredWidth() + "/" + this.getMeasuredHeight());
        super.onLayout(changed, left, top, right, bottom);
        mTexture.layout(0, 0, this.getMeasuredWidth(), this.getMeasuredHeight());
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surfaceTexture, int width, int height) {
        Log.i(tag, "onSurfaceTextureAvailable " + width + "/" + height);
        surfaceAvailable(new Surface(surfaceTexture), width, height);
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surfaceTexture, int width, int height) {
        if (isDropped) {
            return;
        }
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(width, height);
    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        Log.i(tag, "onSurfaceTextureDestroyed");
        // https://developer.android.com/reference/android/view/TextureView.SurfaceTextureListener#onSurfaceTextureDestroyed(android.graphics.SurfaceTexture)
        surfaceDestroyed();
        // Because of React Native Screens (which dettach the view), we always keep the surface alive.
        // If not, Texture view will recreate the texture surface by itself and
        // we will lose the fast first time to frame.
        // We only delete the surface when the view is dropped (destroySurface invoked by SkiaBaseViewManager);
        if (!isDropped) {
            createSurfaceTexture();
        }
        return false;
    }

    //private long _prevTimestamp = 0;
    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surface) {
//        long timestamp = surface.getTimestamp();
//        long frameDuration = (timestamp - _prevTimestamp)/1000000;
//        Log.i(tag, "onSurfaceTextureUpdated "+frameDuration+"ms");
//        _prevTimestamp = timestamp;
     }

    protected abstract void surfaceAvailable(Object surface, int width, int height);

    protected abstract void surfaceSizeChanged(int width, int height);

    protected abstract void surfaceDestroyed();

    protected abstract void setMode(String mode);

    protected abstract void setDebugMode(boolean show);

    protected abstract void registerView(int nativeId);

    protected abstract void unregisterView();
}