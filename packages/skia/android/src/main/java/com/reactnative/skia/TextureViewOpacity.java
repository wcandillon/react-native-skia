package com.reactnative.skia;

import android.os.Build;

import java.util.function.IntSupplier;

/**
 * Whether the TextureView of an opaque canvas is marked opaque. Android 10's
 * UI renderer draws an opaque TextureView with SkBlendMode::kSrc, and on an
 * OpenGL ES 2.0 device that draw shows nothing under a rotated, rounded clip,
 * while a translucent TextureView shows the same frames. An opaque canvas
 * draws opaque pixels, so blending them gives the pixels the opaque view would.
 */
final class TextureViewOpacity {
    private static final int OPENGL_ES_3_0 = 0x30000;

    private TextureViewOpacity() {}

    /** Reads the OpenGL ES version only for an opaque canvas on Android 10, the one case it decides. */
    static boolean marksOpaque(boolean opaque, int sdkInt, IntSupplier glEsVersion) {
        return opaque && (sdkInt != Build.VERSION_CODES.Q || glEsVersion.getAsInt() >= OPENGL_ES_3_0);
    }
}
