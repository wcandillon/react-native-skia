package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.TextureView;
import androidx.annotation.NonNull;

@SuppressLint("ViewConstructor")
public class SkiaTextureView extends TextureView implements TextureView.SurfaceTextureListener {

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
    protected void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        // When the activity stops, Android drops the texture layer of every window
        // sharing its token but keeps the SurfaceTexture (and the buffer it holds),
        // so no destroyed/available callback reaches us. On restart the new layer
        // only latches that buffer once a frame is queued or the view gets
        // onVisibilityChanged(VISIBLE); activity views get the latter from the decor
        // view, a Dialog's (RN Modal) never does, and a static canvas never queues a
        // frame on its own: it stays blank (#2135). Run the same latch ourselves: it
        // marks the layer for update and invalidates, so the next draw rebinds the
        // retained buffer without any GPU or JS work.
        if (visibility == VISIBLE) {
            onVisibilityChanged(this, VISIBLE);
        }
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
        return mApi.onSurfaceTextureDestroyed(surfaceTexture);
    }

    @Override
    public void onSurfaceTextureUpdated(@NonNull SurfaceTexture surface) {
        mApi.onSurfaceTextureUpdated();
    }
}