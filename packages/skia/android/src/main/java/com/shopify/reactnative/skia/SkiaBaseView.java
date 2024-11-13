package com.shopify.reactnative.skia;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.Surface;
import android.view.TextureView;

import com.facebook.react.views.view.ReactViewGroup;

public abstract class SkiaBaseView extends ReactViewGroup implements TextureView.SurfaceTextureListener {
    private TextureView mTexture;

    private String tag = "SkiaView";

    public SkiaBaseView(Context context) {
        super(context);
        mTexture = new TextureView(context);
        mTexture.setSurfaceTextureListener(this);
        mTexture.setOpaque(false);
        addView(mTexture);
    }

    void dropInstance() {
        unregisterView();
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
        Log.i(tag, "onSurfaceTextureSizeChanged " + width + "/" + height);
        surfaceSizeChanged(width, height);
    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        Log.i(tag, "onSurfaceTextureDestroyed");
        // https://developer.android.com/reference/android/view/TextureView.SurfaceTextureListener#onSurfaceTextureDestroyed(android.graphics.SurfaceTexture)
        surfaceDestroyed();
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