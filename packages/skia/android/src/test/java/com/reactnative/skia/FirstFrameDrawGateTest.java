package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.graphics.PixelFormat;
import android.os.Build;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class FirstFrameDrawGateTest {
    private static final class RecordingHost implements FirstFrameDrawGate.Host {
        final List<Runnable> posted = new ArrayList<>();
        final List<Long> delays = new ArrayList<>();
        int invalidations = 0;

        @Override
        public void postDelayed(Runnable action, long delayMillis) {
            posted.add(action);
            delays.add(delayMillis);
        }

        @Override
        public void removeCallbacks(Runnable action) {
            posted.remove(action);
        }

        @Override
        public void invalidate() {
            invalidations++;
        }

        void elapse() {
            List<Runnable> due = new ArrayList<>(posted);
            posted.clear();
            for (Runnable action : due) {
                action.run();
            }
        }
    }

    private static final Runnable NO_NATIVE_WORK = () -> {};

    private final List<String> mReported = new ArrayList<>();
    private final RecordingHost mHost = new RecordingHost();
    private final FirstFrameDrawGate mGate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.TIRAMISU);
    private int mFormat = PixelFormat.OPAQUE;

    private Runnable draw(String name) {
        return () -> mReported.add(name);
    }

    // Each call asks for the other format, so SurfaceView runs replacement.
    private void changeFormat(FirstFrameDrawGate gate, Runnable replacement) {
        mFormat = mFormat == PixelFormat.OPAQUE ? PixelFormat.TRANSLUCENT : PixelFormat.OPAQUE;
        gate.changeFormat(mFormat, format -> replacement.run());
    }

    private void replaceSurfaceInPlace() {
        replaceSurfaceInPlace(mGate);
    }

    private void replaceSurfaceInPlace(FirstFrameDrawGate gate) {
        changeFormat(gate, () -> {
            gate.onSurfaceReleased(NO_NATIVE_WORK);
            gate.onSurfaceCreated();
        });
    }

    @Test
    public void drawRequestedBeforeTheFirstFrameIsReportedWithIt() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("first"));
        assertEquals(Arrays.asList(), mReported);

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertEquals(Arrays.asList("first"), mReported);
    }

    @Test
    public void drawRequestedAfterTheFirstFrameIsReportedAtOnce() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onRedrawNeeded(draw("resize"));
        assertEquals(Arrays.asList("resize"), mReported);
        assertEquals(0, mHost.posted.size());
    }

    @Test
    public void newSurfaceWaitsForItsOwnFirstFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("second surface"));
        assertEquals(Arrays.asList(), mReported);

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertEquals(Arrays.asList("second surface"), mReported);
    }

    @Test
    public void aFirstFrameOfAReleasedSurfaceLeavesTheNextSurfaceWaiting() {
        mGate.onSurfaceCreated();
        int released = mGate.currentSurface();
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("second surface"));

        mGate.onFirstFramePresented(released);
        assertEquals(Arrays.asList(), mReported);
        assertFalse(mGate.hasFrame());
    }

    @Test
    public void surfaceReleasedBeforeItsFirstFrameReportsItsPendingDraws() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("a"));
        mGate.onRedrawNeeded(draw("b"));
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        assertEquals(Arrays.asList("a", "b"), mReported);
        assertEquals(0, mHost.posted.size());
    }

    @Test
    public void detachingReportsPendingDrawsOnce() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("held"));
        mGate.onDetachedFromWindow();
        assertEquals(Arrays.asList("held"), mReported);

        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        mGate.onFirstFramePresented(mGate.currentSurface());
        mHost.elapse();
        assertEquals(Arrays.asList("held"), mReported);
    }

    @Test
    public void eachDrawIsReportedOnce() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("once"));
        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        mHost.elapse();
        assertEquals(Arrays.asList("once"), mReported);
    }

    @Test
    public void aFirstFrameThatNeverComesIsWaitedForOnlyUntilTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("held"));
        assertEquals(Arrays.asList(Long.valueOf(FirstFrameDrawGate.FIRST_FRAME_WAIT_MILLIS)), mHost.delays);

        mHost.elapse();
        assertEquals(Arrays.asList("held"), mReported);
    }

    @Test
    public void oneDeadlineCoversEveryDrawWaitingForTheSameFrame() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("a"));
        mGate.onRedrawNeeded(draw("b"));
        assertEquals(1, mHost.posted.size());

        mHost.elapse();
        assertEquals(Arrays.asList("a", "b"), mReported);
    }

    @Test
    public void theFirstFrameCancelsTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("framed"));
        mGate.onFirstFramePresented(mGate.currentSurface());
        assertEquals(0, mHost.posted.size());
        assertEquals(Arrays.asList("framed"), mReported);
    }

    @Test
    public void detachingCancelsTheDeadline() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("held"));
        mGate.onDetachedFromWindow();
        assertEquals(0, mHost.posted.size());
    }

    @Test
    public void fromAndroid14ADrawWaitsForTheFirstFrameWithNoDeadline() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.UPSIDE_DOWN_CAKE);
        gate.onSurfaceCreated();
        gate.onRedrawNeeded(draw("held"));
        assertEquals(0, mHost.posted.size());

        mHost.elapse();
        assertEquals(Arrays.asList(), mReported);

        gate.onFirstFramePresented(gate.currentSurface());
        assertEquals(Arrays.asList("held"), mReported);
    }

    @Test
    public void aDrawAfterTheDeadlineWaitsForTheFirstFrameAgain() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("first"));
        mHost.elapse();
        mGate.onRedrawNeeded(draw("resize"));
        assertEquals(Arrays.asList("first"), mReported);
        assertEquals(1, mHost.posted.size());

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertEquals(Arrays.asList("first", "resize"), mReported);
    }

    @Test
    public void theHoleOpensWithTheFirstFrame() {
        mGate.onSurfaceCreated();
        assertFalse(mGate.hasFrame());

        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onFirstFramePresented(mGate.currentSurface());
        assertTrue(mGate.hasFrame());
        assertEquals(1, mHost.invalidations);
    }

    @Test
    public void aFirstFrameLaterThanTheDeadlineKeepsTheHoleClosedUntilItLands() {
        mGate.onSurfaceCreated();
        mGate.onRedrawNeeded(draw("held"));
        mHost.elapse();
        assertEquals(Arrays.asList("held"), mReported);
        assertFalse(mGate.hasFrame());
        assertEquals(0, mHost.invalidations);

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertTrue(mGate.hasFrame());
        assertEquals(1, mHost.invalidations);
    }

    @Test
    public void aNewSurfaceKeepsTheHoleClosedUntilItsOwnFirstFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        assertFalse(mGate.hasFrame());

        mGate.onSurfaceCreated();
        assertFalse(mGate.hasFrame());

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertTrue(mGate.hasFrame());
        assertEquals(3, mHost.invalidations);
    }

    @Test
    public void aSurfaceCountsAsReleasedOnlyOnceTheNativeSideLetGoOfIt() {
        mGate.onSurfaceCreated();
        int created = mGate.currentSurface();
        int[] seenWhileReleasing = new int[1];

        mGate.onSurfaceReleased(() -> seenWhileReleasing[0] = mGate.currentSurface());

        assertEquals(created, seenWhileReleasing[0]);
        assertEquals(created + 1, mGate.currentSurface());
    }

    @Test
    public void aFormatChangeKeepsTheHoleOpenOverTheLastFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        int invalidationsBefore = mHost.invalidations;

        replaceSurfaceInPlace();

        assertTrue(mGate.hasFrame());
        assertEquals(invalidationsBefore, mHost.invalidations);
    }

    @Test
    public void theSurfaceAFormatChangeMakesReportsItsDrawWithItsOwnFirstFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        int replaced = mGate.currentSurface();
        replaceSurfaceInPlace();
        mGate.onRedrawNeeded(draw("new format"));

        mGate.onFirstFramePresented(replaced);
        assertEquals(Arrays.asList(), mReported);

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertEquals(Arrays.asList("new format"), mReported);
        assertTrue(mGate.hasFrame());
    }

    @Test
    public void aFormatChangeBeforeTheFirstFrameKeepsTheHoleClosed() {
        mGate.onSurfaceCreated();
        replaceSurfaceInPlace();
        assertFalse(mGate.hasFrame());

        mGate.onFirstFramePresented(mGate.currentSurface());
        assertTrue(mGate.hasFrame());
    }

    @Test
    public void aSurfaceReleasedOutsideAFormatChangeClosesTheHoleThatOneKeptOpen() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        replaceSurfaceInPlace();
        mGate.onSurfaceReleased(NO_NATIVE_WORK);
        assertFalse(mGate.hasFrame());
    }

    @Test
    public void aSurfaceCreatedOutsideAFormatChangeOpensNoHoleBeforeItsFirstFrame() {
        mGate.onSurfaceCreated();
        mGate.onFirstFramePresented(mGate.currentSurface());
        changeFormat(mGate, () -> mGate.onSurfaceReleased(NO_NATIVE_WORK));
        mGate.onSurfaceCreated();
        assertFalse(mGate.hasFrame());
    }

    @Test
    public void beforeAndroid12AFormatChangeWhoseFirstFrameMissesTheDeadlineClosesTheHole() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.R);
        gate.onSurfaceCreated();
        gate.onFirstFramePresented(gate.currentSurface());
        replaceSurfaceInPlace(gate);
        gate.onRedrawNeeded(draw("new format"));

        mHost.elapse();
        assertEquals(Arrays.asList("new format"), mReported);
        assertFalse(gate.hasFrame());

        gate.onFirstFramePresented(gate.currentSurface());
        assertTrue(gate.hasFrame());
    }

    @Test
    public void fromAndroid12AFormatChangeKeepsTheHoleOpenPastTheDeadline() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.S);
        gate.onSurfaceCreated();
        gate.onFirstFramePresented(gate.currentSurface());
        replaceSurfaceInPlace(gate);
        gate.onRedrawNeeded(draw("new format"));

        mHost.elapse();
        assertEquals(Arrays.asList("new format"), mReported);
        assertTrue(gate.hasFrame());
    }

    @Test
    public void beforeAndroid12ASecondFormatChangeReportsTheHeldDrawBeforeReplacingTheSurface() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.R);
        gate.onSurfaceCreated();
        gate.onFirstFramePresented(gate.currentSurface());
        replaceSurfaceInPlace(gate);
        gate.onRedrawNeeded(draw("first new format"));
        List<String> reportedBeforeTheReplacement = new ArrayList<>();

        changeFormat(gate, () -> {
            reportedBeforeTheReplacement.addAll(mReported);
            gate.onSurfaceReleased(NO_NATIVE_WORK);
            gate.onSurfaceCreated();
        });

        assertEquals(Arrays.asList("first new format"), reportedBeforeTheReplacement);
        assertFalse(gate.hasFrame());

        gate.onFirstFramePresented(gate.currentSurface());
        assertTrue(gate.hasFrame());
    }

    @Test
    public void fromAndroid12ASecondFormatChangeKeepsTheHoleOpenOverTheLastFrame() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.S);
        gate.onSurfaceCreated();
        gate.onFirstFramePresented(gate.currentSurface());
        replaceSurfaceInPlace(gate);
        gate.onRedrawNeeded(draw("first new format"));
        List<String> reportedBeforeTheReplacement = new ArrayList<>();

        changeFormat(gate, () -> {
            reportedBeforeTheReplacement.addAll(mReported);
            gate.onSurfaceReleased(NO_NATIVE_WORK);
            gate.onSurfaceCreated();
        });

        assertEquals(Arrays.asList(), reportedBeforeTheReplacement);
        assertEquals(Arrays.asList("first new format"), mReported);
        assertTrue(gate.hasFrame());
    }

    @Test
    public void theFormatAskedForLastReplacesNothing() {
        FirstFrameDrawGate gate = new FirstFrameDrawGate(mHost, Build.VERSION_CODES.R);
        List<Integer> asked = new ArrayList<>();
        gate.changeFormat(PixelFormat.TRANSLUCENT, asked::add);
        gate.onSurfaceCreated();
        gate.onRedrawNeeded(draw("held"));

        gate.changeFormat(PixelFormat.TRANSLUCENT, asked::add);

        assertEquals(Arrays.asList(PixelFormat.TRANSLUCENT), asked);
        assertEquals(Arrays.asList(), mReported);
    }
}
