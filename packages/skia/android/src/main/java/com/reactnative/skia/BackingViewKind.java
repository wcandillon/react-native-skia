package com.reactnative.skia;

import android.os.Build;

import androidx.annotation.Nullable;

/**
 * The Android view a SkiaView draws into, see SkiaView.updateView(), and the
 * rules the props resolve by. The JS side (views/android.ts) mirrors the ones
 * it warns about in development.
 */
enum BackingViewKind {
    SURFACE_VIEW,
    TEXTURE_VIEW;

    /**
     * The kind the androidBackingView prop names. "HardwareBufferView" (a plain
     * view drawing each frame's AHardwareBuffer inline, as React Native WebGPU's
     * does) is not available here yet: it falls back to a TextureView, which
     * composites the same way, and the JS side warns about it in development.
     * The default is a TextureView.
     */
    static BackingViewKind fromBackingView(@Nullable String backingView) {
        return "SurfaceView".equals(backingView) ? SURFACE_VIEW : TEXTURE_VIEW;
    }

    /**
     * Whether a canvas gets the 10-bit format: only on a SurfaceView, whose
     * layer the compositor shows as is. A TextureView composites through an
     * 8-bit pass anyway.
     */
    static boolean resolveHighBitDepth(BackingViewKind kind, boolean highBitDepth) {
        return highBitDepth && kind == SURFACE_VIEW;
    }

    /**
     * Whether the canvas composites as opaque: what the prop asks for, except
     * that the 10-bit format only has 2 bits of alpha, so a canvas that gets it
     * is opaque, and that an Android 10 TextureView blends: that release draws
     * an opaque TextureView with SkBlendMode::kSrc, and when such a draw needs
     * a copy of the destination, the copy splits the render pass and its Skia
     * (m75) can clear the stencil, the draw's clip with it, at the start of the
     * next one (fixed in Skia m77,
     * https://skia-review.googlesource.com/c/skia/+/223970).
     */
    static boolean resolveOpaque(BackingViewKind kind, boolean opaque, boolean surfaceHighBitDepth, int sdkInt) {
        if (kind == TEXTURE_VIEW && sdkInt == Build.VERSION_CODES.Q) {
            return false;
        }
        return opaque || surfaceHighBitDepth;
    }
}
