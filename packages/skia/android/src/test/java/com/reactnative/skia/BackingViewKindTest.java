package com.reactnative.skia;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.os.Build;

import org.junit.Test;

public class BackingViewKindTest {
    @Test
    public void surfaceViewShownAndLaidOutIsRetiredWhenReplacedOnAndroid10() {
        assertTrue(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.Q, true, 260, 200));
    }

    @Test
    public void surfaceViewIsRemovedWhenReplacedFromAndroid11() {
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.R, true, 260, 200));
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.UPSIDE_DOWN_CAKE, true, 260, 200));
    }

    @Test
    public void surfaceViewIsRemovedWhenReplacedBeforeAndroid10() {
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.O, true, 260, 200));
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.P, true, 260, 200));
    }

    @Test
    public void surfaceViewThatIsNotShownIsRemovedWhenReplaced() {
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.Q, false, 260, 200));
    }

    @Test
    public void surfaceViewWithoutASizeIsRemovedWhenReplaced() {
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.Q, true, 0, 200));
        assertFalse(BackingViewKind.SURFACE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.Q, true, 260, 0));
    }

    @Test
    public void textureViewIsRemovedWhenReplaced() {
        assertFalse(BackingViewKind.TEXTURE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.P, true, 260, 200));
        assertFalse(BackingViewKind.TEXTURE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.Q, true, 260, 200));
        assertFalse(BackingViewKind.TEXTURE_VIEW.retiresWhenReplaced(Build.VERSION_CODES.R, true, 260, 200));
    }

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
