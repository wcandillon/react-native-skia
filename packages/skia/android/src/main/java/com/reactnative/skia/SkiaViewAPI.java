package com.reactnative.skia;

import android.graphics.SurfaceTexture;
import android.view.Surface;

public interface SkiaViewAPI {
    void onSurfaceCreated(Surface surface, int width, int height);

    void onSurfaceChanged(Surface surface, int width, int height);

    void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height);

    void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height);

    /** The window drew the frame last presented into the SurfaceTexture. */
    void onSurfaceTextureUpdated();

    void onSurfaceDestroyed();
}
