package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BackingViewKindTest {
    @Test
    public void onlyASurfaceViewGetsTheTenBitFormat() {
        assertTrue(BackingViewKind.resolveHighBitDepth(BackingViewKind.SURFACE_VIEW, true));
        assertFalse(BackingViewKind.resolveHighBitDepth(BackingViewKind.TEXTURE_VIEW, true));
        assertFalse(BackingViewKind.resolveHighBitDepth(BackingViewKind.SURFACE_VIEW, false));
    }

    @Test
    public void theTenBitFormatMakesTheCanvasOpaque() {
        assertTrue(BackingViewKind.resolveOpaque(BackingView.SURFACE_VIEW, BackingViewKind.Opacity.TRANSLUCENT, true));
        assertTrue(BackingViewKind.resolveOpaque(BackingView.SURFACE_VIEW, BackingViewKind.Opacity.DEFAULT, true));
    }

    @Test
    public void eachViewHasItsOwnOpacityUnlessAskedOtherwise() {
        assertTrue(BackingViewKind.resolveOpaque(BackingView.SURFACE_VIEW, BackingViewKind.Opacity.DEFAULT, false));
        assertFalse(BackingViewKind.resolveOpaque(BackingView.TEXTURE_VIEW, BackingViewKind.Opacity.DEFAULT, false));
        assertFalse(BackingViewKind.resolveOpaque(BackingView.SURFACE_VIEW, BackingViewKind.Opacity.TRANSLUCENT, false));
        assertTrue(BackingViewKind.resolveOpaque(BackingView.SURFACE_VIEW, BackingViewKind.Opacity.OPAQUE, false));
        assertTrue(BackingViewKind.resolveOpaque(BackingView.TEXTURE_VIEW, BackingViewKind.Opacity.OPAQUE, false));
        assertFalse(BackingViewKind.resolveOpaque(BackingView.TEXTURE_VIEW, BackingViewKind.Opacity.TRANSLUCENT, false));
    }

    @Test
    public void aHardwareBufferViewAlwaysCompositesWithAlpha() {
        for (BackingViewKind.Opacity opacity : BackingViewKind.Opacity.values()) {
            assertFalse(opacity.name(), BackingViewKind.resolveOpaque(BackingView.HARDWARE_BUFFER_VIEW, opacity, false));
        }
    }

    @Test
    public void theOpacityPropNamesTheRequest() {
        assertEquals(BackingViewKind.Opacity.OPAQUE, BackingViewKind.Opacity.fromProp("Opaque"));
        assertEquals(BackingViewKind.Opacity.TRANSLUCENT, BackingViewKind.Opacity.fromProp("Translucent"));
        assertEquals(BackingViewKind.Opacity.DEFAULT, BackingViewKind.Opacity.fromProp("Default"));
        assertEquals(BackingViewKind.Opacity.DEFAULT, BackingViewKind.Opacity.fromProp(null));
    }

    @Test
    public void zOrderOnTopMovesALiveSurfaceFromAndroid11ForAnAppTargetingIt() {
        assertFalse(BackingViewKind.zOrderOnTopChangesInPlace(29, 35, false));
        assertTrue(BackingViewKind.zOrderOnTopChangesInPlace(30, 35, false));
        assertFalse(BackingViewKind.zOrderOnTopChangesInPlace(30, 29, false));
    }

    @Test
    public void zOrderOnTopOnAMediaOverlayIsReadAtMountOnAndroid13() {
        assertTrue(BackingViewKind.zOrderOnTopChangesInPlace(32, 35, true));
        assertFalse(BackingViewKind.zOrderOnTopChangesInPlace(33, 35, true));
        assertTrue(BackingViewKind.zOrderOnTopChangesInPlace(33, 35, false));
        assertTrue(BackingViewKind.zOrderOnTopChangesInPlace(34, 35, true));
    }

    @Test
    public void zOrderMediaOverlayMovesALiveSurfaceFromAndroid14() {
        assertFalse(BackingViewKind.zOrderMediaOverlayChangesInPlace(30));
        assertFalse(BackingViewKind.zOrderMediaOverlayChangesInPlace(33));
        assertTrue(BackingViewKind.zOrderMediaOverlayChangesInPlace(34));
    }

    @Test
    public void aMountedSurfaceViewTakesAZOrderChangeWhereItsReleaseMovesTheSurface() {
        assertEquals(BackingViewKind.ZOrderChange.TAKEN,
                BackingViewKind.decideZOrderChange(BackingViewKind.SURFACE_VIEW, true, false, true));
        assertEquals(BackingViewKind.ZOrderChange.IGNORED_ONCE_MOUNTED,
                BackingViewKind.decideZOrderChange(BackingViewKind.SURFACE_VIEW, true, false, false));
        assertEquals(BackingViewKind.ZOrderChange.IGNORED_ONCE_MOUNTED,
                BackingViewKind.decideZOrderChange(BackingViewKind.SURFACE_VIEW, false, true, false));
    }

    @Test
    public void aZOrderTheViewHasIsUnchanged() {
        for (BackingViewKind kind : BackingViewKind.values()) {
            for (boolean changesInPlace : new boolean[] {false, true}) {
                assertEquals(BackingViewKind.ZOrderChange.UNCHANGED,
                        BackingViewKind.decideZOrderChange(kind, false, false, changesInPlace));
            }
        }
        assertEquals(BackingViewKind.ZOrderChange.UNCHANGED,
                BackingViewKind.decideZOrderChange(BackingViewKind.SURFACE_VIEW, true, true, false));
    }

    @Test
    public void anotherMountedViewReportsAZOrderItIsAskedFor() {
        assertEquals(BackingViewKind.ZOrderChange.IGNORED_BY_THE_VIEW,
                BackingViewKind.decideZOrderChange(BackingViewKind.TEXTURE_VIEW, true, false, true));
    }
}
