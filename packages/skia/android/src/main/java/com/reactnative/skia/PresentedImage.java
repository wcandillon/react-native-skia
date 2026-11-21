package com.reactnative.skia;

import android.graphics.Bitmap;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * An image's bitmap and the smaller levels of it that views drawing it smaller asked for, each half the one before
 * on every side, down to a pixel (see ImageLevels). Android's renderer samples a bitmap without mipmaps, however the
 * bitmap is marked (its Paint's sampling has no mipmap mode:
 * https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/libs/hwui/hwui/Paint.h), so a view
 * draws the first level it minifies less than twofold (see levelFor), as a GPU's mipmaps would: one image minified
 * many times over aliases. Each level is made from the one above it, off the main thread, one batch at a time, and
 * every view of the image shares them. Main thread.
 */
final class PresentedImage {

    private static final String TAG = "PresentedImage";

    private static final Executor sLevelMaker = Executors.newSingleThreadExecutor(job -> {
        Thread thread = new Thread(job, "RNSkia Levels");
        thread.setDaemon(true);
        return thread;
    });

    // Not createScaledBitmap, which scales an odd side by (n / 2) / n and point-samples the middle of that side.
    private static final ImageLevels.Halving<Bitmap> sHalving = new ImageLevels.Halving<Bitmap>() {
        @Nullable
        @Override
        public Bitmap halve(@NonNull Bitmap bitmap, boolean shown) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && bitmap.getConfig() == Bitmap.Config.HARDWARE) {
                return SkiaPresentedImages.drawHalf(bitmap);
            }
            Bitmap half = Bitmap.createBitmap(Math.max(1, bitmap.getWidth() / 2), Math.max(1, bitmap.getHeight() / 2),
                    Bitmap.Config.ARGB_8888);
            if (!shown) {
                SkiaPresentedImages.halve(bitmap, half, 0);
                return half;
            }
            // AndroidBitmap_unlockPixels marks the pixels changed, which drops the texture a view uploaded: a shown
            // level is halved from copies of a few of its rows at a time.
            for (int halfRow = 0; halfRow < half.getHeight(); halfRow += HALF_ROWS_PER_BAND) {
                int halfRows = Math.min(HALF_ROWS_PER_BAND, half.getHeight() - halfRow);
                Bitmap rows = rowsOf(bitmap, 2 * halfRow, bitmap.getHeight() == 1 ? 1 : 2 * halfRows);
                try {
                    SkiaPresentedImages.halve(rows, half, halfRow);
                } finally {
                    rows.recycle();
                }
            }
            return half;
        }

        @Override
        public boolean isSmallest(@NonNull Bitmap bitmap) {
            return bitmap.getWidth() == 1 && bitmap.getHeight() == 1;
        }

        @Override
        public void prepare(@NonNull Bitmap bitmap) {
            bitmap.prepareToDraw();
        }

        @Override
        public void ranOutOfMemory(@NonNull Bitmap bitmap) {
            Log.w(TAG, "No memory for a level smaller than " + bitmap.getWidth() + "x" + bitmap.getHeight()
                    + ": its views draw that one");
        }
    };

    private static final int HALF_ROWS_PER_BAND = 64;

    // A copy of `count` rows of `bitmap` from `top`, never `bitmap` itself.
    @NonNull
    private static Bitmap rowsOf(@NonNull Bitmap bitmap, int top, int count) {
        Bitmap rows = Bitmap.createBitmap(bitmap, 0, top, bitmap.getWidth(), count);
        return rows != bitmap ? rows : bitmap.copy(Bitmap.Config.ARGB_8888, false);
    }

    private final ImageLevels<Bitmap> mLevels;

    PresentedImage(long id, @NonNull Bitmap bitmap) {
        mLevels = new ImageLevels<>(bitmap, sHalving, sLevelMaker, SkiaPresentedImages::post,
                () -> SkiaPresentedImages.levelMade(id));
    }

    @NonNull
    Bitmap bitmap() {
        return mLevels.image();
    }

    /** See ImageLevels#takeLevel: nothing while the level is on its way, since the bitmap drawn that small aliases. */
    @Nullable
    Bitmap takeLevel(int level) {
        return mLevels.takeLevel(level);
    }

    /** See ImageLevels#request; the image's observers are told once it is made (Observer#onLevelMade). */
    void request(int level) {
        mLevels.request(level);
    }

    /**
     * The level a view of the given size in pixels draws a bitmap of the given size at: the first that the view
     * minifies less than twofold on the side it minifies most. A view the bitmap's size or larger draws the bitmap.
     */
    static int levelFor(int bitmapWidth, int bitmapHeight, int viewWidth, int viewHeight) {
        if (viewWidth <= 0 || viewHeight <= 0) {
            return 0;
        }
        int level = 0;
        int width = bitmapWidth;
        int height = bitmapHeight;
        while ((width > 1 || height > 1) && (width >= 2L * viewWidth || height >= 2L * viewHeight)) {
            width = Math.max(1, width / 2);
            height = Math.max(1, height / 2);
            level++;
        }
        return level;
    }
}
