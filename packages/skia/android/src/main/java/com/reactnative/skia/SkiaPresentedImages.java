package com.reactnative.skia;

import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.proguard.annotations.DoNotStrip;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The images SkiaImageViews show, by image id: one bitmap per image however many
 * views show it (see cpp/rnskia/RNSkPresentedImages.h), and the smaller levels
 * of it views drawing it smaller asked for (see PresentedImage). Native
 * publishes a bitmap once the image is read back and discards it once JS
 * releases the image; both are posted to the main thread, where the views read
 * the store.
 */
final class SkiaPresentedImages {

    /** A view showing an image, told when its bitmap is published and when a level of it is made. Main thread. */
    interface Observer {
        void onImagePublished(@NonNull PresentedImage image);

        void onLevelMade();
    }

    private static final Handler sMainHandler = new Handler(Looper.getMainLooper());
    private static final Map<Long, PresentedImage> sImages = new HashMap<>();
    private static final Map<Long, Set<Observer>> sObservers = new HashMap<>();

    private SkiaPresentedImages() {}

    /**
     * A bitmap for premultiplied 8-bit RGBA pixels, which native writes into
     * its memory, then readies for drawing. Any thread.
     */
    @DoNotStrip
    static Bitmap makeBitmap(int width, int height) {
        return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
    }

    /**
     * Writes the level below `bitmap` into `half`, floor(width / 2) by floor(height / 2) and at least one: each pixel
     * the mean of the two by two block it covers, an odd side's last row or column left out. Throws OutOfMemoryError
     * when there is no memory to lock either bitmap's pixels, IllegalStateException when they cannot be locked
     * otherwise, and IllegalArgumentException when the two are not RGBA_8888 bitmaps of those sizes. Any thread.
     */
    static native void halve(@NonNull Bitmap bitmap, @NonNull Bitmap half);

    /**
     * Runs on the main thread, after the publish and discard requests made before it. Any thread, the view's
     * attachment to a window notwithstanding.
     */
    static void post(Runnable action) {
        sMainHandler.post(action);
    }

    /** Any thread. */
    @DoNotStrip
    static void publish(long id, Bitmap bitmap) {
        sMainHandler.post(() -> {
            PresentedImage image = new PresentedImage(id, bitmap);
            sImages.put(id, image);
            for (Observer observer : observersOf(id)) {
                observer.onImagePublished(image);
            }
        });
    }

    /** A level of the image of `id` was made (see PresentedImage#request). Main thread. */
    static void levelMade(long id) {
        for (Observer observer : observersOf(id)) {
            observer.onLevelMade();
        }
    }

    /** Any thread. A view showing the image keeps it, and its levels, until it shows another. */
    @DoNotStrip
    static void discard(long id) {
        sMainHandler.post(() -> sImages.remove(id));
    }

    /** The image of `id` if it is published yet; `observer` is told when it is, and of its levels. Main thread. */
    @Nullable
    static PresentedImage observe(long id, Observer observer) {
        Set<Observer> observers = sObservers.get(id);
        if (observers == null) {
            observers = new HashSet<>();
            sObservers.put(id, observers);
        }
        observers.add(observer);
        return sImages.get(id);
    }

    // A copy: an observer may stop observing while it is told.
    private static List<Observer> observersOf(long id) {
        Set<Observer> observers = sObservers.get(id);
        return observers == null ? Collections.emptyList() : new ArrayList<>(observers);
    }

    /** Main thread. */
    static void unobserve(long id, Observer observer) {
        Set<Observer> observers = sObservers.get(id);
        if (observers == null) {
            return;
        }
        observers.remove(observer);
        if (observers.isEmpty()) {
            sObservers.remove(id);
        }
    }
}
