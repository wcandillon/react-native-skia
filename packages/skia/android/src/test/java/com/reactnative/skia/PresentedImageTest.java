package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class PresentedImageTest {
    @Test
    public void aViewTheBitmapsSizeOrLargerDrawsTheBitmap() {
        assertEquals(0, PresentedImage.levelFor(400, 300, 400, 300));
        assertEquals(0, PresentedImage.levelFor(400, 300, 800, 600));
    }

    @Test
    public void aViewMinifyingTheBitmapLessThanTwofoldDrawsTheBitmap() {
        assertEquals(0, PresentedImage.levelFor(399, 399, 200, 200));
    }

    @Test
    public void eachHalvingOfTheViewDrawsTheNextLevel() {
        assertEquals(1, PresentedImage.levelFor(400, 400, 200, 200));
        assertEquals(2, PresentedImage.levelFor(400, 400, 100, 100));
        assertEquals(5, PresentedImage.levelFor(5200, 5200, 120, 120));
    }

    @Test
    public void theSideTheViewMinifiesMostPicksTheLevel() {
        // One-pixel stripes 8000 wide drawn 1152 wide and three times taller than they are.
        assertEquals(2, PresentedImage.levelFor(8000, 16, 1152, 48));
        assertEquals(2, PresentedImage.levelFor(16, 8000, 48, 1152));
    }

    @Test
    public void levelsEndAtOnePixel() {
        assertEquals(2, PresentedImage.levelFor(4, 4, 1, 1));
        assertEquals(0, PresentedImage.levelFor(1, 1, 1, 1));
        assertEquals(12, PresentedImage.levelFor(8000, 2, 1, 1));
    }

    @Test
    public void aViewWithNoSizeDrawsTheBitmap() {
        assertEquals(0, PresentedImage.levelFor(400, 400, 0, 0));
        assertEquals(0, PresentedImage.levelFor(400, 400, 0, 100));
    }
}
