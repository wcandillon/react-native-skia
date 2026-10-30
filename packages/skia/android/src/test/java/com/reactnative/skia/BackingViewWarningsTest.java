package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Arrays;

import org.junit.Test;

public class BackingViewWarningsTest {
    @Test
    public void aCanvasEachViewTakesAsItAsksWarnsAboutNothing() {
        assertEquals(Arrays.asList(),
                BackingViewWarnings.atMount(BackingView.TEXTURE_VIEW, false, BackingViewKind.Opacity.DEFAULT, false,
                        false));
        assertEquals(Arrays.asList(),
                BackingViewWarnings.atMount(BackingView.TEXTURE_VIEW, false, BackingViewKind.Opacity.OPAQUE, false,
                        false));
        assertEquals(Arrays.asList(),
                BackingViewWarnings.atMount(BackingView.SURFACE_VIEW, true, BackingViewKind.Opacity.DEFAULT, true,
                        true));
    }

    @Test
    public void aHardwareBufferViewWarnsThatATextureViewStandsIn() {
        assertEquals(Arrays.asList(BackingViewWarnings.hardwareBufferViewUnavailable()),
                BackingViewWarnings.atMount(BackingView.HARDWARE_BUFFER_VIEW, false,
                        BackingViewKind.Opacity.DEFAULT, false, false));
    }

    @Test
    public void highBitDepthWarnsOnEveryViewButASurfaceView() {
        assertEquals(Arrays.asList(BackingViewWarnings.highBitDepthOnlyOnASurfaceView()),
                BackingViewWarnings.atMount(BackingView.TEXTURE_VIEW, true, BackingViewKind.Opacity.DEFAULT, false,
                        false));
        assertEquals(Arrays.asList(BackingViewWarnings.hardwareBufferViewUnavailable(),
                BackingViewWarnings.highBitDepthOnlyOnASurfaceView()),
                BackingViewWarnings.atMount(BackingView.HARDWARE_BUFFER_VIEW, true, BackingViewKind.Opacity.DEFAULT,
                        false, false));
    }

    @Test
    public void theZOrderWarnsOnEveryViewButASurfaceView() {
        assertEquals(Arrays.asList(BackingViewWarnings.zOrderOnlyOnASurfaceView()),
                BackingViewWarnings.atMount(BackingView.TEXTURE_VIEW, false, BackingViewKind.Opacity.DEFAULT, true,
                        false));
        assertEquals(Arrays.asList(BackingViewWarnings.zOrderOnlyOnASurfaceView()),
                BackingViewWarnings.atMount(BackingView.TEXTURE_VIEW, false, BackingViewKind.Opacity.DEFAULT, false,
                        true));
        assertEquals(Arrays.asList(BackingViewWarnings.hardwareBufferViewUnavailable(),
                BackingViewWarnings.zOrderOnlyOnASurfaceView()),
                BackingViewWarnings.atMount(BackingView.HARDWARE_BUFFER_VIEW, false, BackingViewKind.Opacity.DEFAULT,
                        true, true));
    }

    @Test
    public void anOpaqueHardwareBufferViewWarnsThatItCompositesWithAlpha() {
        assertEquals(Arrays.asList(BackingViewWarnings.hardwareBufferViewUnavailable(),
                BackingViewWarnings.opaqueHardwareBufferView()),
                BackingViewWarnings.atMount(BackingView.HARDWARE_BUFFER_VIEW, false, BackingViewKind.Opacity.OPAQUE,
                        false, false));
    }

    @Test
    public void aTranslucentHighBitDepthSurfaceViewWarnsThatItIsOpaque() {
        assertEquals(Arrays.asList(BackingViewWarnings.translucentHighBitDepth()),
                BackingViewWarnings.atMount(BackingView.SURFACE_VIEW, true, BackingViewKind.Opacity.TRANSLUCENT,
                        false, false));
    }

    @Test
    public void aZOrderChangeWarnsOnlyWhenTheCanvasDoesNotTakeIt() {
        String prop = "android.zOrderMediaOverlay";
        assertNull(BackingViewWarnings.forZOrderChange(BackingViewKind.ZOrderChange.TAKEN, prop));
        assertNull(BackingViewWarnings.forZOrderChange(BackingViewKind.ZOrderChange.UNCHANGED, prop));
        assertEquals(BackingViewWarnings.ignoredChange(prop),
                BackingViewWarnings.forZOrderChange(BackingViewKind.ZOrderChange.IGNORED_ONCE_MOUNTED, prop));
        assertEquals(BackingViewWarnings.zOrderOnlyOnASurfaceView(),
                BackingViewWarnings.forZOrderChange(BackingViewKind.ZOrderChange.IGNORED_BY_THE_VIEW, prop));
    }

    // The text each warning shows in logcat and, in a development build, in the JS console and LogBox.
    @Test
    public void eachWarningSaysWhatTheCanvasDoesInstead() {
        assertEquals("android.backingView: HardwareBufferView is not available in React Native Skia yet,"
                + " the canvas uses a TextureView.", BackingViewWarnings.hardwareBufferViewUnavailable());
        assertEquals("highBitDepth needs a SurfaceView on Android (android.backingView: \"SurfaceView\"),"
                + " the canvas keeps the 8-bit format.", BackingViewWarnings.highBitDepthOnlyOnASurfaceView());
        assertEquals("Ignoring android.opaque: false, a highBitDepth canvas is opaque on Android"
                + " (the 10-bit format only has 2 bits of alpha).", BackingViewWarnings.translucentHighBitDepth());
        assertEquals("Ignoring android.opaque: true, a HardwareBufferView canvas composites with alpha.",
                BackingViewWarnings.opaqueHardwareBufferView());
        assertEquals("android.zOrderOnTop and android.zOrderMediaOverlay only apply to a SurfaceView"
                + " (android.backingView: \"SurfaceView\"), the canvas ignores them.",
                BackingViewWarnings.zOrderOnlyOnASurfaceView());
        assertEquals("Ignoring a change of android.zOrderMediaOverlay on a mounted canvas: the backing view is"
                + " chosen when the canvas mounts. Remount the canvas (give it a new key) to change it.",
                BackingViewWarnings.ignoredChange("android.zOrderMediaOverlay"));
    }
}
