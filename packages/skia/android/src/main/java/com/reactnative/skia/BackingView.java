package com.reactnative.skia;

import androidx.annotation.Nullable;

/**
 * The view the androidBackingView prop names. A HardwareBufferView (a plain
 * view drawing each frame's AHardwareBuffer inline, as React Native WebGPU's
 * does) is not available here yet: a TextureView, which composites the same
 * way, stands in for it, with a warning (see BackingViewWarnings).
 */
enum BackingView {
    TEXTURE_VIEW,
    SURFACE_VIEW,
    HARDWARE_BUFFER_VIEW;

    /** The prop, for which Fabric hands null or nothing by default: a TextureView. */
    static BackingView fromProp(@Nullable String value) {
        if ("SurfaceView".equals(value)) {
            return SURFACE_VIEW;
        }
        if ("HardwareBufferView".equals(value)) {
            return HARDWARE_BUFFER_VIEW;
        }
        return TEXTURE_VIEW;
    }

    /** The Android view the canvas draws into. */
    BackingViewKind kind() {
        return switch (this) {
            case SURFACE_VIEW -> BackingViewKind.SURFACE_VIEW;
            case TEXTURE_VIEW, HARDWARE_BUFFER_VIEW -> BackingViewKind.TEXTURE_VIEW;
        };
    }
}
