package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class FirstFrameDrawGateTest {
    private static final class ManualClock implements FirstFrameDrawGate.Host {
        final List<Runnable> posted = new ArrayList<>();
        final List<Long> delays = new ArrayList<>();

        @Override
        public void postDelayed(Runnable action, long delayMillis) {
            posted.add(action);
            delays.add(delayMillis);
        }

        @Override
        public void removeCallbacks(Runnable action) {
            posted.remove(action);
        }

        void elapse() {
            List<Runnable> due = new ArrayList<>(posted);
            posted.clear();
            for (Runnable action : due) {
                action.run();
            }
        }
    }

    private final List<String> mReported = new ArrayList<>();
    private final ManualClock mClock = new ManualClock();
    private final FirstFrameDrawGate mGate = new FirstFrameDrawGate(mClock);

    private Runnable draw(String name) {
        return () -> mReported.add(name);
    }

    @Test
    public void drawRequestedBeforeTheFirstFrameIsReportedWithIt() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("first"));
        assertEquals(Arrays.asList(), mReported);

        mGate.onFirstFramePresented();
        assertEquals(Arrays.asList("first"), mReported);
    }

    @Test
    public void drawRequestedAfterTheFirstFrameIsReportedAtOnce() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented();
        mGate.onRedrawNeeded(draw("resize"));
        assertEquals(Arrays.asList("resize"), mReported);
        assertEquals(0, mClock.posted.size());
    }

    @Test
    public void newSurfaceWaitsForItsOwnFirstFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented();
        mGate.onSurfaceReleased();
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("second surface"));
        assertEquals(Arrays.asList(), mReported);

        mGate.onFirstFramePresented();
        assertEquals(Arrays.asList("second surface"), mReported);
    }

    @Test
    public void surfaceReleasedBeforeItsFirstFrameReportsItsPendingDraws() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("a"));
        mGate.onRedrawNeeded(draw("b"));
        mGate.onSurfaceReleased();
        assertEquals(Arrays.asList("a", "b"), mReported);
        assertEquals(0, mClock.posted.size());
    }

    @Test
    public void detachingDropsPendingDrawsWithoutReportingThem() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("dropped"));
        mGate.onDetachedFromWindow();
        mGate.onSurfaceReleased();
        mGate.onFirstFramePresented();
        mClock.elapse();
        assertEquals(Arrays.asList(), mReported);
    }

    @Test
    public void eachDrawIsReportedOnce() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("once"));
        mGate.onFirstFramePresented();
        mGate.onFirstFramePresented();
        mGate.onSurfaceReleased();
        mClock.elapse();
        assertEquals(Arrays.asList("once"), mReported);
    }

    @Test
    public void aFirstFrameThatNeverComesIsWaitedForOnlyUntilTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("held"));
        assertEquals(Arrays.asList(Long.valueOf(FirstFrameDrawGate.FIRST_FRAME_WAIT_MILLIS)), mClock.delays);

        mClock.elapse();
        assertEquals(Arrays.asList("held"), mReported);
    }

    @Test
    public void oneDeadlineCoversEveryDrawWaitingForTheSameFrame() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("a"));
        mGate.onRedrawNeeded(draw("b"));
        assertEquals(1, mClock.posted.size());

        mClock.elapse();
        assertEquals(Arrays.asList("a", "b"), mReported);
    }

    @Test
    public void theFirstFrameCancelsTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("framed"));
        mGate.onFirstFramePresented();
        assertEquals(0, mClock.posted.size());
        assertEquals(Arrays.asList("framed"), mReported);
    }

    @Test
    public void detachingCancelsTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("dropped"));
        mGate.onDetachedFromWindow();
        assertEquals(0, mClock.posted.size());
    }

    @Test
    public void aDrawAfterTheDeadlineWaitsForTheFirstFrameAgain() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("first"));
        mClock.elapse();
        mGate.onRedrawNeeded(draw("resize"));
        assertEquals(Arrays.asList("first"), mReported);
        assertEquals(1, mClock.posted.size());

        mGate.onFirstFramePresented();
        assertEquals(Arrays.asList("first", "resize"), mReported);
    }
}
