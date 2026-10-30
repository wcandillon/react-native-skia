package com.reactnative.skia;

import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;

/**
 * What SkiaView says about props it cannot honour: the options a mounting
 * canvas asks for that its backing view does not take, and a change it
 * ignores once mounted. BackingViewProps decides when each one is said.
 */
final class BackingViewWarnings {
    private BackingViewWarnings() {}

    /** The warnings for the props a canvas mounts with, from its first prop transaction. */
    static List<String> atMount(BackingView backingView, boolean highBitDepth, BackingViewKind.Opacity opacity,
            boolean zOrderOnTop, boolean zOrderMediaOverlay) {
        List<String> warnings = new ArrayList<>();
        if (backingView == BackingView.HARDWARE_BUFFER_VIEW) {
            warnings.add(hardwareBufferViewUnavailable());
            if (opacity == BackingViewKind.Opacity.OPAQUE) {
                warnings.add(opaqueHardwareBufferView());
            }
        }
        if (backingView.kind() != BackingViewKind.SURFACE_VIEW) {
            if (highBitDepth) {
                warnings.add(highBitDepthOnlyOnASurfaceView());
            }
            if (zOrderOnTop || zOrderMediaOverlay) {
                warnings.add(zOrderOnlyOnASurfaceView());
            }
        } else if (highBitDepth && opacity == BackingViewKind.Opacity.TRANSLUCENT) {
            warnings.add(translucentHighBitDepth());
        }
        return warnings;
    }

    /** The warning for a HardwareBufferView, which a TextureView stands in for. */
    static String hardwareBufferViewUnavailable() {
        return "android.backingView: HardwareBufferView is not available in React Native Skia yet,"
                + " the canvas uses a TextureView.";
    }

    /** The warning for a highBitDepth a view other than a SurfaceView is asked for, which it ignores. */
    static String highBitDepthOnlyOnASurfaceView() {
        return "highBitDepth needs a SurfaceView on Android (android.backingView: \"SurfaceView\"),"
                + " the canvas keeps the 8-bit format.";
    }

    /** The warning for opaque: false on a canvas with the 10-bit format, which stays opaque. */
    static String translucentHighBitDepth() {
        return "Ignoring android.opaque: false, a highBitDepth canvas is opaque on Android"
                + " (the 10-bit format only has 2 bits of alpha).";
    }

    /** The warning for opaque: true on a HardwareBufferView, which composites with alpha. */
    static String opaqueHardwareBufferView() {
        return "Ignoring android.opaque: true, a HardwareBufferView canvas composites with alpha.";
    }

    /** The warning for a z-order a view other than a SurfaceView is asked for, which it ignores. */
    static String zOrderOnlyOnASurfaceView() {
        return "android.zOrderOnTop and android.zOrderMediaOverlay only apply to a SurfaceView"
                + " (android.backingView: \"SurfaceView\"), the canvas ignores them.";
    }

    /**
     * The warning for a change of the z-order prop `prop` a mounted canvas does not take, or null for one it
     * takes or already has.
     */
    @Nullable
    static String forZOrderChange(BackingViewKind.ZOrderChange change, String prop) {
        return switch (change) {
            case TAKEN, UNCHANGED -> null;
            case IGNORED_ONCE_MOUNTED -> ignoredChange(prop);
            case IGNORED_BY_THE_VIEW -> zOrderOnlyOnASurfaceView();
        };
    }

    /** The warning for a change of `prop` that a mounted canvas ignores. */
    static String ignoredChange(String prop) {
        return "Ignoring a change of " + prop + " on a mounted canvas: the backing view is chosen when the canvas"
                + " mounts. Remount the canvas (give it a new key) to change it.";
    }
}
