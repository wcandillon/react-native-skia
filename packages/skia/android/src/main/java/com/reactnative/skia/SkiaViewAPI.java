package com.reactnative.skia;

import android.graphics.SurfaceTexture;
import android.view.Surface;

public interface SkiaViewAPI {
    /** What a backing view the canvas no longer draws into reports to: nothing. */
    SkiaViewAPI DETACHED = new SkiaViewAPI() {
        @Override
        public void onSurfaceCreated(Surface surface, int width, int height) {}

        @Override
        public void onSurfaceChanged(Surface surface, int width, int height) {}

        @Override
        public void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height) {}

        @Override
        public void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height) {}

        @Override
        public void onSurfaceDestroyed() {}
    };

    void onSurfaceCreated(Surface surface, int width, int height);

    void onSurfaceChanged(Surface surface, int width, int height);

    void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height);

    void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height);

    void onSurfaceDestroyed();
}
