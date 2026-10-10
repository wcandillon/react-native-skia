package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.PixelFormat;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import androidx.annotation.NonNull;

@SuppressLint("ViewConstructor")
public class SkiaSurfaceView extends SurfaceView implements SurfaceHolder.Callback2 {

    SkiaViewAPI mApi;
    private final FirstFrameDrawGate mDrawGate = new FirstFrameDrawGate(new FirstFrameDrawGate.Host() {
        @Override
        public void postDelayed(Runnable action, long delayMillis) {
            SkiaSurfaceView.this.postDelayed(action, delayMillis);
        }

        @Override
        public void removeCallbacks(Runnable action) {
            SkiaSurfaceView.this.removeCallbacks(action);
        }
    });

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
        mDrawGate.onDetachedFromWindow();
        super.onDetachedFromWindow();
        releaseSurface();
    }

    @Override
    public void surfaceCreated(@NonNull SurfaceHolder holder) {
        mDrawGate.onSurfaceCreated();
        mApi.onSurfaceCreated(holder.getSurface(), getWidth(), getHeight());
    }

    @Override
    public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
        mApi.onSurfaceChanged(holder.getSurface(), getWidth(), getHeight());
    }

    @Override
    public void surfaceRedrawNeeded(@NonNull SurfaceHolder holder) {
        // Answered in surfaceRedrawNeededAsync, which SurfaceView calls instead.
    }

    // The draw is reported finished once a frame is in the surface: see
    // FirstFrameDrawGate. GLSurfaceView holds this runnable the same way.
    @Override
    public void surfaceRedrawNeededAsync(@NonNull SurfaceHolder holder, @NonNull Runnable drawingFinished) {
        mDrawGate.onRedrawNeeded(drawingFinished);
    }

    @Override
    public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
        releaseSurface();
    }

    /** A frame was presented into the surface. Main thread. */
    void onFirstFramePresented() {
        mDrawGate.onFirstFramePresented();
    }

    private void releaseSurface() {
        mDrawGate.onSurfaceReleased();
        mApi.onSurfaceDestroyed();
    }
}
