package com.reactnative.skia;

import android.graphics.SurfaceTexture;
import android.view.Surface;

public interface SkiaViewAPI {
    void onSurfaceCreated(Surface surface, int width, int height);

    void onSurfaceChanged(Surface surface, int width, int height);

    void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height);

    void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height);

    /** The TextureView drew the frame it was given (see FrameScheduler.onFrameConsumed). */
    void onSurfaceTextureUpdated();

    void onSurfaceDestroyed();
}
