package com.reactnative.skia;

import android.graphics.SurfaceTexture;
import android.view.Surface;

public interface SkiaViewAPI {
    void onSurfaceCreated(Surface surface, int width, int height);

    void onSurfaceChanged(Surface surface, int width, int height);

    void onSurfaceTextureCreated(SurfaceTexture surface, int width, int height);

    void onSurfaceTextureChanged(SurfaceTexture surface, int width, int height);

    void onSurfaceDestroyed();

    /** Presents nothing until releaseFirstFrame(): the surface's layer shows before the window frame that lays it out. */
    void holdFirstFrame();

    /** The window frame that lays the surface out has committed, or the surface is gone: present again. */
    void releaseFirstFrame();
}
