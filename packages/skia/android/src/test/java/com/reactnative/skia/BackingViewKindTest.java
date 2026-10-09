package com.reactnative.skia;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BackingViewKindTest {
    @Test
    public void surfaceViewKeepsAnOutgoingTextureViewOnScreenUntilItsFirstFrame() {
        assertTrue(BackingViewKind.SURFACE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.TEXTURE_VIEW, true, 260, 200));
    }

    @Test
    public void nothingIsKeptForACanvasThatIsNotShown() {
        assertFalse(BackingViewKind.SURFACE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.TEXTURE_VIEW, false, 260, 200));
    }

    @Test
    public void nothingIsKeptForACanvasWithoutASize() {
        assertFalse(BackingViewKind.SURFACE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.TEXTURE_VIEW, true, 0, 200));
        assertFalse(BackingViewKind.SURFACE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.TEXTURE_VIEW, true, 260, 0));
    }

    @Test
    public void anOutgoingSurfaceViewIsNotKept() {
        assertFalse(BackingViewKind.SURFACE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.SURFACE_VIEW, true, 260, 200));
    }

    @Test
    public void textureViewKeepsNothing() {
        assertFalse(BackingViewKind.TEXTURE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.SURFACE_VIEW, true, 260, 200));
        assertFalse(BackingViewKind.TEXTURE_VIEW.keepsOutgoingUntilFirstFrame(BackingViewKind.TEXTURE_VIEW, true, 260, 200));
    }
}
