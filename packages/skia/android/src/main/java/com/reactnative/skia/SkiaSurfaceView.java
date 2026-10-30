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
    private final SurfaceZOrder mZOrder = new SurfaceZOrder(new SurfaceZOrder.Target() {
        @Override
        public void setZOrderOnTop(boolean onTop) {
            SkiaSurfaceView.this.setZOrderOnTop(onTop);
        }

        @Override
        public void setZOrderMediaOverlay(boolean mediaOverlay) {
            SkiaSurfaceView.this.setZOrderMediaOverlay(mediaOverlay);
        }

        @Override
        public void invalidate() {
            SkiaSurfaceView.this.invalidate();
        }
    });

    public SkiaSurfaceView(Context context, SkiaViewAPI api, boolean zOrderOnTop,
            boolean zOrderMediaOverlay, boolean opaque) {
        super(context);
        mApi = api;
        // Both are read when the surface is created.
        setZOrder(zOrderOnTop, zOrderMediaOverlay);
        setOpaque(opaque);
        getHolder().addCallback(this);
    }

    // The format drives the compositor's opaque flag for this layer. It can
    // change on a live surface: SurfaceView reports it through surfaceChanged.
    public void setOpaque(boolean opaque) {
        getHolder().setFormat(opaque ? PixelFormat.OPAQUE : PixelFormat.TRANSLUCENT);
    }

    // See SurfaceZOrder. Where Android allows it (see BackingViewKind), a live
    // surface takes a changed request with the window's next frame; elsewhere,
    // the request is read when the surface is created.
    public void setZOrder(boolean onTop, boolean mediaOverlay) {
        mZOrder.request(onTop, mediaOverlay);
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
