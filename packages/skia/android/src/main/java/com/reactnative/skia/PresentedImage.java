package com.reactnative.skia;

import android.graphics.Bitmap;
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
 * many times over aliases. Levels are made off the main thread, one batch at a time, and every view of the image
 * shares them. Main thread.
 */
final class PresentedImage {

    private static final String TAG = "PresentedImage";

    private static final Executor sLevelMaker = Executors.newSingleThreadExecutor(job -> {
        Thread thread = new Thread(job, "RNSkia Levels");
        thread.setDaemon(true);
        return thread;
    });

    private static final ImageLevels.Halving<Bitmap> sBitmapHalving = new ImageLevels.Halving<Bitmap>() {
        // A box filter, native and across cores: createScaledBitmap would scale an odd side by (n / 2) / n, moving
        // the samples off the blocks' corners onto pixel centers, which point-samples the middle of that side.
        @NonNull
        @Override
        public Bitmap halve(@NonNull Bitmap bitmap, boolean shown) {
            Bitmap half = Bitmap.createBitmap(Math.max(1, bitmap.getWidth() / 2), Math.max(1, bitmap.getHeight() / 2),
                    Bitmap.Config.ARGB_8888);
            if (!shown) {
                SkiaPresentedImages.halve(bitmap, half);
                return half;
            }
            // Reading pixels natively marks them changed, which throws away the texture a view drawing the level
            // uploaded (AndroidBitmap_unlockPixels): a level a view took is halved from a copy, which Java reads
            // without that.
            Bitmap copy = bitmap.copy(Bitmap.Config.ARGB_8888, false);
            if (copy == null) {
                throw new OutOfMemoryError("no memory to copy a level of " + bitmap.getWidth() + "x"
                        + bitmap.getHeight());
            }
            try {
                SkiaPresentedImages.halve(copy, half);
            } finally {
                copy.recycle();
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

    private final ImageLevels<Bitmap> mLevels;

    PresentedImage(long id, @NonNull Bitmap bitmap) {
        mLevels = new ImageLevels<>(bitmap, sBitmapHalving, sLevelMaker, SkiaPresentedImages::post,
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
