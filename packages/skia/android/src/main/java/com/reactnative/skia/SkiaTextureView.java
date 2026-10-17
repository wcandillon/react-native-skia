package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.app.ActivityManager;
import android.content.Context;
import android.graphics.SurfaceTexture;
import android.os.Build;
import android.util.Log;
import android.view.TextureView;
import androidx.annotation.NonNull;

@SuppressLint("ViewConstructor")
public class SkiaTextureView extends TextureView implements TextureView.SurfaceTextureListener {

    private static int sDeviceGlEsVersion;

    private String tag = "SkiaTextureView";

    SkiaViewAPI mApi;

    public SkiaTextureView(Context context, SkiaViewAPI api, boolean opaque) {
        super(context);
        mApi = api;
        // An opaque TextureView lets the UI toolkit skip blending it; it can be
        // toggled on a live view.
        setOpaque(opaque);
        setSurfaceTextureListener(this);
    }

    @Override
    public void setOpaque(boolean opaque) {
        super.setOpaque(TextureViewOpacity.marksOpaque(opaque, Build.VERSION.SDK_INT, this::readDeviceGlEsVersion));
    }

    // A device constant that arrives over binder, so it is read once per process.
    private int readDeviceGlEsVersion() {
        if (sDeviceGlEsVersion == 0) {
            ActivityManager activityManager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            sDeviceGlEsVersion = activityManager.getDeviceConfigurationInfo().reqGlEsVersion;
        }
        return sDeviceGlEsVersion;
    }

    @Override
    public void onSurfaceTextureAvailable(@NonNull SurfaceTexture surfaceTexture, int width, int height) {
        Log.i(tag, "onSurfaceTextureAvailable:  " + width + "x" + height);
        mApi.onSurfaceTextureCreated(surfaceTexture, width, height);
    }

    @Override
    public void onSurfaceTextureSizeChanged(@NonNull SurfaceTexture surfaceTexture, int width, int height) {
        Log.i(tag, "onSurfaceTextureSizeChanged:  " + width + "x" + height);
        mApi.onSurfaceTextureChanged(surfaceTexture, width, height);
    }

    @Override
    public boolean onSurfaceTextureDestroyed(@NonNull SurfaceTexture surfaceTexture) {
        mApi.onSurfaceDestroyed();
        return true;
    }

    @Override
    public void onSurfaceTextureUpdated(@NonNull SurfaceTexture surface) {
    }
}