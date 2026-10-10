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
     * The kind "auto" picks: a SurfaceView for an opaque canvas and a
     * TextureView otherwise. Before Android 11 an opaque canvas gets a
     * TextureView too, unless it asks for zOrderOnTop or highBitDepth, which
     * only a SurfaceView offers: those releases destroy a SurfaceView's layer
     * as soon as the view leaves its window (SurfaceView.onDetachedFromWindow),
     * ahead of the window frame that stops showing it, so an opaque canvas
     * leaving the screen leaves a black hole for a frame. Android 11 hands the
     * removal to the render thread, which applies it with that frame.
     */
    static BackingViewKind forAutoSurfaceType(boolean opaque, boolean zOrderOnTop, boolean highBitDepth, int sdkInt) {
        if (!opaque) {
            return TEXTURE_VIEW;
        }
        if (sdkInt < Build.VERSION_CODES.R && !zOrderOnTop && !highBitDepth) {
            return TEXTURE_VIEW;
        }
        return SURFACE_VIEW;
    }
}
