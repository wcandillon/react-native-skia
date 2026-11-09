package com.reactnative.skia;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.Log;
import android.view.Surface;
import android.view.TextureView;
import androidx.annotation.NonNull;

@SuppressLint("ViewConstructor")
public class SkiaTextureView extends TextureView implements TextureView.SurfaceTextureListener {

    private String tag = "SkiaTextureView";

    SkiaViewAPI mApi;
    boolean mDebug;

    public SkiaTextureView(Context context, SkiaViewAPI api, boolean debug, boolean opaque) {
        super(context);
        mApi = api;
        mDebug = debug;
        // An opaque TextureView lets the UI toolkit skip blending it; it can be
        // toggled on a live view.
        setOpaque(opaque);
        setSurfaceTextureListener(this);
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        // When the activity stops, Android drops the texture layer of every window
        // sharing its token but keeps the SurfaceTexture, so no destroyed/available
        // callback reaches us. On restart the new layer only latches a frame once one
        // is queued or the view gets onVisibilityChanged(VISIBLE); activity views get
        // the latter from the decor view, a Dialog's (RN Modal) never does, and a
        // static canvas never queues a frame on its own: it stays blank (#2135).
        // Redraw through the size-changed path to queue one.
        SurfaceTexture surfaceTexture = getSurfaceTexture();
        if (visibility == VISIBLE && surfaceTexture != null && getWidth() > 0 && getHeight() > 0) {
            mApi.onSurfaceTextureChanged(surfaceTexture, getWidth(), getHeight());
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
        mApi.onSurfaceDestroyed();
        return true;
    }

    private long _prevTimestamp = 0;
    @Override
    public void onSurfaceTextureUpdated(@NonNull SurfaceTexture surface) {
        if (!mDebug) {
            return;
        }
        long timestamp = surface.getTimestamp();
        long frameDuration = (timestamp - _prevTimestamp)/1000000;
        Log.i("SkiaTextureView", "onSurfaceTextureUpdated "+frameDuration+"ms");
        _prevTimestamp = timestamp;
    }
}