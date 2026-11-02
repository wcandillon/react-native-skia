package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.os.Build;

import org.junit.Test;

public class BackingViewKindTest {
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
        assertTrue(BackingViewKind.resolveOpaque(false, true));
        assertTrue(BackingViewKind.resolveOpaque(true, false));
        assertFalse(BackingViewKind.resolveOpaque(false, false));
    }

    @Test
    public void aLayerAboveTheWindowShowsBeforeTheWindowFrameUpToAndroid12() {
        assertTrue(BackingViewKind.showsLayerBeforeWindowFrame(Build.VERSION_CODES.O, true));
        assertTrue(BackingViewKind.showsLayerBeforeWindowFrame(Build.VERSION_CODES.S, true));
        assertFalse(BackingViewKind.showsLayerBeforeWindowFrame(Build.VERSION_CODES.S_V2, true));
    }

    @Test
    public void aLayerBehindTheWindowShowsOnlyThroughTheWindowFrame() {
        assertFalse(BackingViewKind.showsLayerBeforeWindowFrame(Build.VERSION_CODES.R, false));
    }
}
