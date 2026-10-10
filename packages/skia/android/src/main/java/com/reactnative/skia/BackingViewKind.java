package com.reactnative.skia;

import android.os.Build;

import androidx.annotation.Nullable;

/** The Android view a SkiaView draws into, see SkiaView.updateView(). */
enum BackingViewKind {
    SURFACE_VIEW,
    TEXTURE_VIEW;

    /**
     * The kind the androidSurfaceType prop asks for, or null for "auto", which
     * leaves the choice to the opaque prop.
     */
    @Nullable
    static BackingViewKind fromSurfaceType(@Nullable String surfaceType) {
        if ("SurfaceView".equals(surfaceType)) {
            return SURFACE_VIEW;
        }
        if ("TextureView".equals(surfaceType)) {
            return TEXTURE_VIEW;
        }
        return null;
    }

    /**
     * Whether a new view of this kind is given its surface, with the last frame
     * presented into it, before its first draw. A TextureView makes its
     * SurfaceTexture in its first draw and shows a frame presented then only in
     * the next one, so it would draw empty once. One that is not shown or not
     * laid out keeps the lazy path: a texture handed to it would hold its
     * buffers with no draw to show them.
     */
    boolean receivesSurfaceBeforeFirstDraw(boolean shown, int width, int height) {
        return switch (this) {
            case SURFACE_VIEW -> false;
            case TEXTURE_VIEW -> shown && width > 0 && height > 0;
        };
    }

    /**
     * Whether a view of this kind, replaced on screen, stays attached and
     * undrawn rather than being removed, so that it leaves the screen with the
     * window frame that covers it. Android 10 removes a detached SurfaceView's
     * layer at once, ahead of that frame, and hides the layer of one the
     * window stops drawing in step with the frame (SurfaceView.positionLost).
     * Android 11 releases a detached SurfaceView in step with the frame, and
     * Android 9 and earlier hide nothing in positionLost. A view that is not
     * shown or not laid out has nothing on screen to keep.
     */
    boolean retiresWhenReplaced(int sdkInt, boolean shown, int width, int height) {
        return switch (this) {
            case SURFACE_VIEW -> sdkInt == Build.VERSION_CODES.Q && shown && width > 0 && height > 0;
            case TEXTURE_VIEW -> false;
        };
    }
}
