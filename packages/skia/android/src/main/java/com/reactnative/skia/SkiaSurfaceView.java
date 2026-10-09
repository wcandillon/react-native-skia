package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

@SuppressLint("ViewConstructor")
public class SkiaSurfaceView extends SurfaceView implements SurfaceHolder.Callback {

    SkiaViewAPI mApi;
    private final boolean mZOrderOnTop;
    private final SurfaceHandOver mHandOver;

    public SkiaSurfaceView(Context context, SkiaViewAPI api, boolean zOrderOnTop, boolean opaque,
            boolean replacesCanvasOnScreen) {
        super(context);
        mApi = api;
        mZOrderOnTop = zOrderOnTop;
        mHandOver = new SurfaceHandOver(new SurfaceHandOver.Host() {
            // Only reached on API 29 and later, see SurfaceHandOver.defersArrivalToWindowFrame.
            @Override
            @RequiresApi(Build.VERSION_CODES.Q)
            public void runAfterWindowFrameCommits(Runnable handOver) {
                getViewTreeObserver().registerFrameCommitCallback(handOver);
                invalidate();
            }

            @Override
            public void handOverSurface() {
                mApi.onSurfaceCreated(getHolder().getSurface(), getWidth(), getHeight());
            }

            @Override
            public void forwardSurfaceChanged() {
                mApi.onSurfaceChanged(getHolder().getSurface(), getWidth(), getHeight());
            }

            @Override
            public void forwardSurfaceDestroyed() {
                mApi.onSurfaceDestroyed();
            }
        }, replacesCanvasOnScreen);
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
        mHandOver.onSurfaceReleased();
    }

    @Override
    public void surfaceCreated(@NonNull SurfaceHolder holder) {
        mHandOver.onSurfaceCreated(SurfaceHandOver.defersArrivalToWindowFrame(
                Build.VERSION.SDK_INT, isHardwareAccelerated(), mZOrderOnTop));
    }

    @Override
    public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
        mHandOver.onSurfaceChanged();
    }

    @Override
    public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
        mHandOver.onSurfaceReleased();
    }
}
