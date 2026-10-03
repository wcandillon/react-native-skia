package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.PixelFormat;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import androidx.annotation.NonNull;

@SuppressLint("ViewConstructor")
public class SkiaSurfaceView extends SurfaceView implements SurfaceHolder.Callback {

    SkiaViewAPI mApi;

    public SkiaSurfaceView(Context context, SkiaViewAPI api, boolean zOrderOnTop, boolean opaque) {
        super(context);
        mApi = api;
        // Must be set before the surface is created.
        setZOrderOnTop(zOrderOnTop);
        setOpaque(opaque);
        getHolder().addCallback(this);
    }

    // The format drives the compositor's opaque flag for this layer. It can
    // change on a live surface: SurfaceView reports it through surfaceChanged.
    public void setOpaque(boolean opaque) {
        getHolder().setFormat(opaque ? PixelFormat.OPAQUE : PixelFormat.TRANSLUCENT);
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        mApi.onSurfaceDestroyed();
    }

    @Override
    public void surfaceCreated(@NonNull SurfaceHolder holder) {
        mApi.onSurfaceCreated(holder.getSurface(), getWidth(), getHeight());
    }

    @Override
    public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
        mApi.onSurfaceChanged(holder.getSurface(), getWidth(), getHeight());
    }

    @Override
    public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
        mApi.onSurfaceDestroyed();
    }
}
