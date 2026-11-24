package com.reactnative.skia;

import android.graphics.Bitmap;
import android.graphics.ColorSpace;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import com.facebook.proguard.annotations.DoNotStrip;

/**
 * The images SkiaImageViews show, by image id: one bitmap per image however many
 * views show it (see cpp/rnskia/RNSkPresentedImages.h), and the smaller levels
 * of it views drawing it smaller asked for (see PresentedImage). Native
 * publishes a bitmap once the image is drawn, fails an image no bitmap
 * could be made for, and discards it once JS releases the image; each is posted
 * to the main thread, where the views read the store (see PresentedImageStore).
 */
final class SkiaPresentedImages {

    private static final Handler sMainHandler = new Handler(Looper.getMainLooper());
    private static final PresentedImageStore<PresentedImage> sStore = new PresentedImageStore<>();

    private SkiaPresentedImages() {}

    /**
     * A bitmap for premultiplied 8-bit RGBA pixels, which native copies a readback into before Android 13; null when
     * there is no memory for it, so that the image shows nothing rather than end the app. Any thread.
     */
    @DoNotStrip
    @Nullable
    static Bitmap makeBitmap(int width, int height) {
        try {
            return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        } catch (OutOfMemoryError error) {
            return null;
        }
    }

    /**
     * A hardware bitmap of a buffer the GPU drew an image into from Android 13, in sRGB as the GPU drew it; null
     * when Android cannot wrap it. Any thread.
     */
    @DoNotStrip
    @Nullable
    @RequiresApi(Build.VERSION_CODES.Q)
    static Bitmap wrapHardwareBuffer(@NonNull HardwareBuffer buffer) {
        try {
            return Bitmap.wrapHardwareBuffer(buffer, ColorSpace.get(ColorSpace.Named.SRGB));
        } finally {
            // The bitmap holds a reference of its own.
            buffer.close();
        }
    }

    /**
     * Halves `rows` into the rows of `half` from `halfRow`, each pixel the mean of the 2x2 block it covers, as a mipmap
     * level is made.
     */
    static native void halve(@NonNull Bitmap rows, @NonNull Bitmap half, int halfRow);

    /** The level below a hardware bitmap, made as halve makes one, on the GPU; null when it cannot be now. */
    @Nullable
    @RequiresApi(Build.VERSION_CODES.S)
    static Bitmap drawHalf(@NonNull Bitmap bitmap) {
        try (HardwareBuffer buffer = bitmap.getHardwareBuffer()) {
            return drawHalfOf(buffer);
        }
    }

    @Nullable
    private static native Bitmap drawHalfOf(@NonNull HardwareBuffer buffer);

    /**
     * Runs on the main thread, after the publish, fail and discard requests made before it. Any thread, the view's
     * attachment to a window notwithstanding.
     */
    static void post(Runnable action) {
        sMainHandler.post(action);
    }

    /** Any thread. */
    @DoNotStrip
    static void publish(long id, Bitmap bitmap) {
        sMainHandler.post(() -> sStore.publish(id, new PresentedImage(id, bitmap)));
    }

    /** Any thread. See PresentedImageStore#fail. */
    @DoNotStrip
    static void fail(long id) {
        sMainHandler.post(() -> sStore.fail(id));
    }

    /** Any thread. See PresentedImageStore#discard. */
    @DoNotStrip
    static void discard(long id) {
        sMainHandler.post(() -> sStore.discard(id));
    }

    /** A level of the image of `id` was made (see PresentedImage#request). Main thread. */
    static void levelMade(long id) {
        sStore.levelMade(id);
    }

    /** Any thread. See PresentedImageStore#gpuDeviceReplaced. */
    @DoNotStrip
    static void gpuDeviceReplaced() {
        sMainHandler.post(sStore::gpuDeviceReplaced);
    }

    /** Main thread. See PresentedImageStore#observe. */
    static void observe(long id, @NonNull PresentedImageStore.Observer<PresentedImage> observer) {
        sStore.observe(id, observer);
    }

    /** Main thread. */
    static void unobserve(long id, @NonNull PresentedImageStore.Observer<PresentedImage> observer) {
        sStore.unobserve(id, observer);
    }
}
