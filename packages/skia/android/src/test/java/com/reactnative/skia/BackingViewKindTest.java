package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.os.Build;

import org.junit.Test;

public class BackingViewKindTest {
    // The opacity rule turns on Android 10 alone: the releases beside it, the minSdk and any later release stand for all.
    private static final int[] RELEASES = {
            Build.VERSION_CODES.O, Build.VERSION_CODES.P, Build.VERSION_CODES.Q, Build.VERSION_CODES.R, Integer.MAX_VALUE};

    @Test
    public void theBackingViewPropNamesTheKind() {
        assertEquals(BackingViewKind.SURFACE_VIEW, BackingViewKind.fromBackingView("SurfaceView"));
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.fromBackingView("TextureView"));
    }

    @Test
    public void aTextureViewIsTheDefault() {
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.fromBackingView(null));
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.fromBackingView("auto"));
    }

    @Test
    public void aHardwareBufferViewFallsBackToATextureView() {
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingViewKind.fromBackingView("HardwareBufferView"));
    }

    @Test
    public void onlyASurfaceViewGetsTheTenBitFormat() {
        assertTrue(BackingViewKind.resolveHighBitDepth(BackingViewKind.SURFACE_VIEW, true));
        assertFalse(BackingViewKind.resolveHighBitDepth(BackingViewKind.TEXTURE_VIEW, true));
        assertFalse(BackingViewKind.resolveHighBitDepth(BackingViewKind.SURFACE_VIEW, false));
    }

    @Test
    public void theTenBitFormatMakesTheCanvasOpaque() {
        for (int sdkInt : RELEASES) {
            assertTrue("API " + sdkInt, BackingViewKind.resolveOpaque(BackingViewKind.SURFACE_VIEW, false, true, sdkInt));
        }
    }

    @Test
    public void anOpaqueSurfaceViewIsOpaqueOnEveryRelease() {
        for (int sdkInt : RELEASES) {
            assertTrue("API " + sdkInt, BackingViewKind.resolveOpaque(BackingViewKind.SURFACE_VIEW, true, false, sdkInt));
        }
    }

    @Test
    public void anOpaqueTextureViewIsOpaqueOnEveryReleaseButAndroid10() {
        for (int sdkInt : RELEASES) {
            if (sdkInt != Build.VERSION_CODES.Q) {
                assertTrue("API " + sdkInt, BackingViewKind.resolveOpaque(BackingViewKind.TEXTURE_VIEW, true, false, sdkInt));
            }
        }
    }

    @Test
    public void anOpaqueTextureViewBlendsOnAndroid10() {
        assertFalse(BackingViewKind.resolveOpaque(BackingViewKind.TEXTURE_VIEW, true, false, Build.VERSION_CODES.Q));
    }

    @Test
    public void aTranslucentCanvasIsNeverOpaque() {
        for (BackingViewKind kind : BackingViewKind.values()) {
            for (int sdkInt : RELEASES) {
                assertFalse(kind + " on API " + sdkInt, BackingViewKind.resolveOpaque(kind, false, false, sdkInt));
            }
        }
    }
}
