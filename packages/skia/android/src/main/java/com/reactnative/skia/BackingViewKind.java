package com.reactnative.skia;

import android.os.Build;

import androidx.annotation.Nullable;

/**
 * The Android view a SkiaView draws into (see BackingView.kind() and
 * SkiaView.updateView()), and the rules the props resolve by.
 */
enum BackingViewKind {
    SURFACE_VIEW,
    TEXTURE_VIEW;

    /**
     * Whether a canvas gets the 10-bit format: only on a SurfaceView, whose
     * layer the compositor shows as is. A TextureView composites through an
     * 8-bit pass anyway.
     */
    static boolean resolveHighBitDepth(BackingViewKind kind, boolean highBitDepth) {
        return highBitDepth && kind == SURFACE_VIEW;
    }

    /** The opacity a canvas asks for: its view's own, opaque, or translucent. */
    enum Opacity {
        DEFAULT,
        OPAQUE,
        TRANSLUCENT;

        /** The androidOpacity prop, for which Fabric hands null or nothing by default. */
        static Opacity fromProp(@Nullable String value) {
            if ("Opaque".equals(value)) {
                return OPAQUE;
            }
            if ("Translucent".equals(value)) {
                return TRANSLUCENT;
            }
            return DEFAULT;
        }
    }

    /**
     * Whether the canvas composites as opaque: what it asks for, on the view
     * it mounted with. A SurfaceView is opaque and a TextureView translucent
     * unless asked otherwise, a HardwareBufferView always composites with
     * alpha, and the 10-bit format only has 2 bits of alpha, so a canvas that
     * gets it is opaque.
     */
    static boolean resolveOpaque(BackingView mounted, Opacity opacity, boolean surfaceHighBitDepth) {
        if (surfaceHighBitDepth) {
            return true;
        }
        return switch (mounted) {
            case SURFACE_VIEW -> opacity != Opacity.TRANSLUCENT;
            case TEXTURE_VIEW -> opacity == Opacity.OPAQUE;
            case HARDWARE_BUFFER_VIEW -> false;
        };
    }

    /**
     * Whether a changed zOrderOnTop moves a mounted SurfaceView: SurfaceView
     * applies it to its live surface from Android 11, for an app targeting it.
     * Before that, the surface reads it when it is created, and so does a media
     * overlay on Android 13, whose SurfaceView moves a surface leaving the top
     * to the default sublayer at once, before setZOrderMediaOverlay() can ask
     * for its own: it would come back among the other SurfaceViews below the
     * window rather than above them.
     */
    static boolean zOrderOnTopChangesInPlace(int sdk, int targetSdk, boolean mediaOverlay) {
        if (sdk < Build.VERSION_CODES.R || targetSdk < Build.VERSION_CODES.R) {
            return false;
        }
        return !(mediaOverlay && sdk == Build.VERSION_CODES.TIRAMISU);
    }

    /**
     * Whether a changed zOrderMediaOverlay moves a mounted SurfaceView: only
     * from Android 14, whose SurfaceView compares the sublayer it is asked for
     * with the one its surface has. Up to Android 13, setZOrderMediaOverlay()
     * only sets the sublayer the next surface is created with.
     */
    static boolean zOrderMediaOverlayChangesInPlace(int sdk) {
        return sdk >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE;
    }

    /** What a mounted canvas does with a changed z-order prop. */
    enum ZOrderChange {
        /** The SurfaceView moves its live surface. */
        TAKEN,
        /** The view already has the z-order asked for. */
        UNCHANGED,
        /** The SurfaceView keeps the z-order its surface was created with, and says so. */
        IGNORED_ONCE_MOUNTED,
        /** Only a SurfaceView has a z-order of its own: a request for one is ignored, and said so. */
        IGNORED_BY_THE_VIEW,
    }

    /**
     * What a mounted canvas of the given kind does with a z-order prop changed
     * to value from current, the one its view has (a view other than a
     * SurfaceView has none), where changesInPlace says whether this Android
     * release moves a live surface for that prop.
     */
    static ZOrderChange decideZOrderChange(BackingViewKind kind, boolean value, boolean current,
            boolean changesInPlace) {
        if (value == current) {
            return ZOrderChange.UNCHANGED;
        }
        return switch (kind) {
            case SURFACE_VIEW -> changesInPlace ? ZOrderChange.TAKEN : ZOrderChange.IGNORED_ONCE_MOUNTED;
            case TEXTURE_VIEW -> ZOrderChange.IGNORED_BY_THE_VIEW;
        };
    }
}
