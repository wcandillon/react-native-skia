package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class SurfaceZOrderTest {
    private final List<String> mAsked = new ArrayList<>();
    private final SurfaceZOrder mZOrder = new SurfaceZOrder(new SurfaceZOrder.Target() {
        @Override
        public void setZOrderOnTop(boolean onTop) {
            mAsked.add("onTop " + onTop);
        }

        @Override
        public void setZOrderMediaOverlay(boolean mediaOverlay) {
            mAsked.add("mediaOverlay " + mediaOverlay);
        }

        @Override
        public void invalidate() {
            mAsked.add("invalidate");
        }
    });

    @Test
    public void theDefaultIsNotAskedFor() {
        mZOrder.request(false, false);
        assertEquals(Arrays.asList(), mAsked);
    }

    @Test
    public void anUnchangedZOrderIsNotAskedForAgain() {
        mZOrder.request(false, true);
        mAsked.clear();

        mZOrder.request(false, true);
        assertEquals(Arrays.asList(), mAsked);
    }

    @Test
    public void aMediaOverlayIsAskedForAfterTheTopIsLeft() {
        mZOrder.request(false, true);
        assertEquals(Arrays.asList("onTop false", "mediaOverlay true", "invalidate"), mAsked);
    }

    @Test
    public void onTopIsAskedForWithoutTheMediaOverlay() {
        mZOrder.request(true, true);
        assertEquals(Arrays.asList("onTop true", "invalidate"), mAsked);
    }

    @Test
    public void leavingTheTopAsksForTheMediaOverlayAgain() {
        mZOrder.request(false, true);
        mZOrder.request(true, true);
        mAsked.clear();

        mZOrder.request(false, true);
        assertEquals(Arrays.asList("onTop false", "mediaOverlay true", "invalidate"), mAsked);
    }
}
