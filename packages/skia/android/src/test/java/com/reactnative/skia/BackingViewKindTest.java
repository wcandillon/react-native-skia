package com.reactnative.skia;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BackingViewKindTest {
    @Test
    public void textureViewShownAndLaidOutReceivesItsSurfaceBeforeItsFirstDraw() {
        assertTrue(BackingViewKind.TEXTURE_VIEW.receivesSurfaceBeforeFirstDraw(true, 260, 200));
    }

    @Test
    public void textureViewThatIsNotShownKeepsTheLazyPath() {
        assertFalse(BackingViewKind.TEXTURE_VIEW.receivesSurfaceBeforeFirstDraw(false, 260, 200));
    }

    @Test
    public void textureViewWithoutASizeKeepsTheLazyPath() {
        assertFalse(BackingViewKind.TEXTURE_VIEW.receivesSurfaceBeforeFirstDraw(true, 0, 200));
        assertFalse(BackingViewKind.TEXTURE_VIEW.receivesSurfaceBeforeFirstDraw(true, 260, 0));
    }

    @Test
    public void surfaceViewNeverReceivesItsSurfaceBeforeItsFirstDraw() {
        assertFalse(BackingViewKind.SURFACE_VIEW.receivesSurfaceBeforeFirstDraw(true, 260, 200));
        assertFalse(BackingViewKind.SURFACE_VIEW.receivesSurfaceBeforeFirstDraw(false, 260, 200));
    }
}
