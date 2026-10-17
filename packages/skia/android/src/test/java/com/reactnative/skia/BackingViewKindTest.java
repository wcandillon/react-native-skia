package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import android.os.Build;

import org.junit.Test;

public class BackingViewKindTest {
    private static final int[] BEFORE_ANDROID_12L = {
        Build.VERSION_CODES.O,
        Build.VERSION_CODES.O_MR1,
        Build.VERSION_CODES.P,
        Build.VERSION_CODES.Q,
        Build.VERSION_CODES.R,
        Build.VERSION_CODES.S,
    };

    private static final int[] FROM_ANDROID_12L = {
        Build.VERSION_CODES.S_V2, Build.VERSION_CODES.TIRAMISU, Build.VERSION_CODES.UPSIDE_DOWN_CAKE,
    };

    @Test
    public void translucentCanvasIsATextureView() {
        for (int sdkInt : BEFORE_ANDROID_12L) {
            assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.forAutoSurfaceType(false, false, false, sdkInt));
        }
        for (int sdkInt : FROM_ANDROID_12L) {
            assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.forAutoSurfaceType(false, true, true, sdkInt));
        }
    }

    @Test
    public void opaqueCanvasIsATextureViewBeforeAndroid12L() {
        for (int sdkInt : BEFORE_ANDROID_12L) {
            assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.forAutoSurfaceType(true, false, false, sdkInt));
        }
    }

    @Test
    public void opaqueCanvasIsASurfaceViewFromAndroid12L() {
        for (int sdkInt : FROM_ANDROID_12L) {
            assertEquals(BackingViewKind.SURFACE_VIEW, BackingViewKind.forAutoSurfaceType(true, false, false, sdkInt));
        }
    }

    @Test
    public void opaqueCanvasAskingForZOrderOnTopIsASurfaceViewBeforeAndroid12L() {
        for (int sdkInt : BEFORE_ANDROID_12L) {
            assertEquals(BackingViewKind.SURFACE_VIEW, BackingViewKind.forAutoSurfaceType(true, true, false, sdkInt));
        }
    }

    @Test
    public void opaqueCanvasAskingForHighBitDepthIsASurfaceViewBeforeAndroid12L() {
        for (int sdkInt : BEFORE_ANDROID_12L) {
            assertEquals(BackingViewKind.SURFACE_VIEW, BackingViewKind.forAutoSurfaceType(true, false, true, sdkInt));
        }
    }
}
