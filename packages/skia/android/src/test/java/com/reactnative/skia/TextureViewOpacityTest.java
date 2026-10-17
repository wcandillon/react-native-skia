package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntSupplier;
import org.junit.Test;

public class TextureViewOpacityTest {
    private static final int ANDROID_10 = 29;
    private static final int OPENGL_ES_2_0 = 0x20000;
    private static final int[] SDK_INTS = {26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36};
    private static final int[] OPENGL_ES_3_VERSIONS = {0x30000, 0x30001, 0x30002};
    private static final IntSupplier UNREADABLE_GL_ES_VERSION = () -> {
        throw new AssertionError("the OpenGL ES version was read");
    };

    @Test
    public void aTranslucentCanvasIsNeverMarkedOpaque() {
        for (int sdkInt : SDK_INTS) {
            assertFalse("API " + sdkInt + " on OpenGL ES 2.0", TextureViewOpacity.marksOpaque(false, sdkInt, () -> OPENGL_ES_2_0));
            for (int glEsVersion : OPENGL_ES_3_VERSIONS) {
                assertFalse("API " + sdkInt + " on " + Integer.toHexString(glEsVersion), TextureViewOpacity.marksOpaque(false, sdkInt, () -> glEsVersion));
            }
        }
    }

    @Test
    public void anOpaqueCanvasIsMarkedOpaqueWithOpenGlEs3() {
        for (int sdkInt : SDK_INTS) {
            for (int glEsVersion : OPENGL_ES_3_VERSIONS) {
                assertTrue("API " + sdkInt + " on " + Integer.toHexString(glEsVersion), TextureViewOpacity.marksOpaque(true, sdkInt, () -> glEsVersion));
            }
        }
    }

    @Test
    public void anOpaqueCanvasStaysTranslucentOnAndroid10WithOpenGlEs2() {
        assertFalse(TextureViewOpacity.marksOpaque(true, ANDROID_10, () -> OPENGL_ES_2_0));
    }

    @Test
    public void anOpaqueCanvasIsMarkedOpaqueWithOpenGlEs2OnEveryOtherRelease() {
        for (int sdkInt : SDK_INTS) {
            if (sdkInt == ANDROID_10) {
                continue;
            }
            assertTrue("API " + sdkInt, TextureViewOpacity.marksOpaque(true, sdkInt, () -> OPENGL_ES_2_0));
        }
    }

    @Test
    public void theOpenGlEsVersionIsReadOnlyForAnOpaqueCanvasOnAndroid10() {
        for (int sdkInt : SDK_INTS) {
            TextureViewOpacity.marksOpaque(false, sdkInt, UNREADABLE_GL_ES_VERSION);
            if (sdkInt != ANDROID_10) {
                TextureViewOpacity.marksOpaque(true, sdkInt, UNREADABLE_GL_ES_VERSION);
            }
        }
        AtomicInteger reads = new AtomicInteger();
        TextureViewOpacity.marksOpaque(true, ANDROID_10, () -> {
            reads.incrementAndGet();
            return OPENGL_ES_2_0;
        });
        assertEquals(1, reads.get());
    }
}
