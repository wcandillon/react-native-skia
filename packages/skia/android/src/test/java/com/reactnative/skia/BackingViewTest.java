package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class BackingViewTest {
    @Test
    public void thePropNamesTheView() {
        assertEquals(BackingView.SURFACE_VIEW, BackingView.fromProp("SurfaceView"));
        assertEquals(BackingView.TEXTURE_VIEW, BackingView.fromProp("TextureView"));
        assertEquals(BackingView.HARDWARE_BUFFER_VIEW, BackingView.fromProp("HardwareBufferView"));
    }

    @Test
    public void aTextureViewIsTheDefault() {
        assertEquals(BackingView.TEXTURE_VIEW, BackingView.fromProp(null));
        assertEquals(BackingView.TEXTURE_VIEW, BackingView.fromProp("auto"));
    }

    @Test
    public void aTextureViewStandsInForAHardwareBufferView() {
        assertEquals(BackingViewKind.SURFACE_VIEW, BackingView.SURFACE_VIEW.kind());
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingView.TEXTURE_VIEW.kind());
        assertEquals(BackingViewKind.TEXTURE_VIEW, BackingView.HARDWARE_BUFFER_VIEW.kind());
    }
}
