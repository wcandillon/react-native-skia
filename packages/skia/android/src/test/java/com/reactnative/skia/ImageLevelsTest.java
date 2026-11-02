package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;

import androidx.annotation.NonNull;

import org.junit.Test;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.Executor;

public class ImageLevelsTest {
    private static final class Size {
        final int width;
        final int height;

        Size(int width, int height) {
            this.width = width;
            this.height = height;
        }
    }

    // Runs its jobs only when a test says so, in the order they came.
    private static final class ManualExecutor implements Executor {
        private final Deque<Runnable> mJobs = new ArrayDeque<>();

        @Override
        public void execute(@NonNull Runnable job) {
            mJobs.add(job);
        }

        int pending() {
            return mJobs.size();
        }

        void runNext() {
            mJobs.removeFirst().run();
        }
    }

    private static final class SizeHalving implements ImageLevels.Halving<Size> {
        final List<Size> prepared = new ArrayList<>();
        final List<Size> ranOutOfMemoryBelow = new ArrayList<>();
        // Whether each level halved was one a view took.
        final List<Boolean> halvedShown = new ArrayList<>();
        int halvingsWithMemory = Integer.MAX_VALUE;

        @NonNull
        @Override
        public Size halve(@NonNull Size level, boolean shown) {
            halvedShown.add(shown);
            if (halvingsWithMemory-- <= 0) {
                throw new OutOfMemoryError("no memory for a level");
            }
            return new Size(Math.max(1, level.width / 2), Math.max(1, level.height / 2));
        }

        @Override
        public boolean isSmallest(@NonNull Size level) {
            return level.width == 1 && level.height == 1;
        }

        @Override
        public void prepare(@NonNull Size level) {
            prepared.add(level);
        }

        @Override
        public void ranOutOfMemory(@NonNull Size level) {
            ranOutOfMemoryBelow.add(level);
        }
    }

    private final ManualExecutor mMaker = new ManualExecutor();
    private final ManualExecutor mMainThread = new ManualExecutor();
    private final SizeHalving mHalving = new SizeHalving();
    private int mBatchesMade = 0;

    private ImageLevels<Size> levelsOf(Size image) {
        return new ImageLevels<>(image, mHalving, mMaker, mMainThread, () -> mBatchesMade++);
    }

    // The maker's job, then the main thread's post of what it made.
    private void makeBatch() {
        mMaker.runNext();
        mMainThread.runNext();
    }

    @Test
    public void aLevelIsNothingToDrawUntilItIsMade() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        levels.request(2);
        assertNull(levels.takeLevel(2));
        makeBatch();
        assertEquals(100, levels.takeLevel(2).width);
        assertEquals(200, levels.takeLevel(1).width);
        assertEquals(1, mBatchesMade);
    }

    @Test
    public void theImageIsItsOwnFirstLevel() {
        Size image = new Size(400, 400);
        ImageLevels<Size> levels = levelsOf(image);
        levels.request(0);
        assertSame(image, levels.takeLevel(0));
        assertEquals(0, mMaker.pending());
    }

    @Test
    public void levelsAskedForWhileABatchIsOnItsWayStartNoOtherJob() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        levels.request(2);
        levels.request(1);
        levels.request(2);
        assertEquals(1, mMaker.pending());
        makeBatch();
        assertEquals(0, mMaker.pending());
        assertEquals(1, mBatchesMade);
    }

    @Test
    public void aDeeperLevelAskedForDuringABatchIsMadeByTheNextOne() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        levels.request(1);
        levels.request(3);
        makeBatch();
        assertEquals(200, levels.takeLevel(1).width);
        assertNull(levels.takeLevel(3));
        assertEquals(1, mMaker.pending());
        makeBatch();
        assertEquals(50, levels.takeLevel(3).width);
        assertEquals(2, mBatchesMade);
    }

    @Test
    public void aBatchHalvesALevelAViewTookAsShownAndAnyOtherAsNot() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        levels.request(2);
        makeBatch();
        levels.takeLevel(2);
        levels.request(4);
        makeBatch();
        assertEquals(Arrays.asList(false, false, true, false), mHalving.halvedShown);
    }

    @Test
    public void aBatchCopiesTheLevelAViewTookAsTheBatchBeforeItWasPosted() {
        final List<ImageLevels<Size>> view = new ArrayList<>();
        ImageLevels<Size> levels = new ImageLevels<>(new Size(400, 400), mHalving, mMaker, mMainThread,
                () -> view.get(0).takeLevel(2));
        view.add(levels);
        levels.request(2);
        levels.request(4);
        makeBatch();
        makeBatch();
        assertEquals(Arrays.asList(false, false, true, false), mHalving.halvedShown);
    }

    @Test
    public void eachBatchPreparesTheLevelTheDeepestViewAskedFor() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        levels.request(3);
        makeBatch();
        assertEquals(1, mHalving.prepared.size());
        assertSame(levels.takeLevel(3), mHalving.prepared.get(0));
    }

    @Test
    public void noMemoryForALevelLeavesTheDeepestMadeToEveryDeeperOne() {
        ImageLevels<Size> levels = levelsOf(new Size(400, 400));
        mHalving.halvingsWithMemory = 1;
        levels.request(3);
        makeBatch();
        assertEquals(200, levels.takeLevel(3).width);
        assertEquals(200, mHalving.ranOutOfMemoryBelow.get(0).width);
        assertEquals(1, mBatchesMade);
        levels.request(4);
        assertEquals(0, mMaker.pending());
    }

    @Test
    public void noMemoryForTheFirstLevelLeavesTheImage() {
        Size image = new Size(400, 400);
        ImageLevels<Size> levels = levelsOf(image);
        mHalving.halvingsWithMemory = 0;
        levels.request(2);
        makeBatch();
        assertSame(image, levels.takeLevel(2));
        assertEquals(0, mHalving.prepared.size());
    }

    @Test
    public void levelsEndAtTheSmallest() {
        ImageLevels<Size> levels = levelsOf(new Size(4, 2));
        levels.request(5);
        makeBatch();
        assertEquals(1, levels.takeLevel(5).width);
        assertEquals(1, levels.takeLevel(5).height);
        assertEquals(0, mMaker.pending());
        levels.request(6);
        assertEquals(0, mMaker.pending());
    }
}
