package com.reactnative.skia;

import android.graphics.SurfaceTexture;
import android.view.Surface;

public interface SkiaViewAPI {
    void onSurfaceCreated(Surface surface, int width, int height);

    void onSurfaceChanged(Surface surface, int width, int height);

    void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height);

    void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height);

    /** The TextureView drew the frame it was given (see rnsurface::FrameScheduler::onFrameConsumed). */
    void onSurfaceTextureUpdated();

    /**
     * The TextureView lets go of its SurfaceTexture: whether it may release it now, else
     * the view does (see TextureView.SurfaceTextureListener.onSurfaceTextureDestroyed).
     */
    boolean onSurfaceTextureDestroyed(SurfaceTexture surface);

    /**
     * The SurfaceView's surface is about to be destroyed. Called once more as
     * the view leaves the window, after the surface went with it.
     */
    void onSurfaceDestroyed();
}
