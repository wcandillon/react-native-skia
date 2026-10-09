package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class OutgoingViewHoldTest {
    private static final class RecordingHost implements OutgoingViewHold.Host<String> {
        final List<String> removed = new ArrayList<>();
        final List<Runnable> afterFrameCommit = new ArrayList<>();
        final List<Runnable> delayed = new ArrayList<>();
        final List<Long> delays = new ArrayList<>();

        @Override
        public void removeView(String view) {
            removed.add(view);
        }

        @Override
        public void runAfterWindowFrameCommits(Runnable action) {
            afterFrameCommit.add(action);
        }

        @Override
        public void postDelayed(Runnable action, long delayMillis) {
            delayed.add(action);
            delays.add(delayMillis);
        }

        @Override
        public void removeCallbacks(Runnable action) {
            delayed.remove(action);
        }

        void commitWindowFrame() {
            List<Runnable> pending = new ArrayList<>(afterFrameCommit);
            afterFrameCommit.clear();
            for (Runnable action : pending) {
                action.run();
            }
        }

        void elapse() {
            List<Runnable> due = new ArrayList<>(delayed);
            delayed.clear();
            for (Runnable action : due) {
                action.run();
            }
        }
    }

    private final RecordingHost mHost = new RecordingHost();
    private final OutgoingViewHold<String> mHold = new OutgoingViewHold<>(mHost);

    @Test
    public void heldViewLeavesOnceAWindowFrameAfterTheFirstFrameHasCommitted() {
        mHold.hold("texture");
        mHold.onFirstFramePresented();
        assertEquals(Arrays.asList(), mHost.removed);
        assertSame("texture", mHold.held());

        mHost.commitWindowFrame();
        assertEquals(Arrays.asList("texture"), mHost.removed);
        assertNull(mHold.held());
    }

    @Test
    public void heldViewStaysWhileNoFirstFrameHasBeenPresented() {
        mHold.hold("texture");
        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(), mHost.removed);
        assertSame("texture", mHold.held());
    }

    @Test
    public void releaseRemovesTheHeldViewAtOnce() {
        mHold.hold("texture");
        mHold.release();
        assertEquals(Arrays.asList("texture"), mHost.removed);
        assertNull(mHold.held());
    }

    @Test
    public void holdingAnotherViewRemovesTheFirstAtOnce() {
        mHold.hold("first");
        mHold.hold("second");
        assertEquals(Arrays.asList("first"), mHost.removed);
        assertSame("second", mHold.held());
    }

    @Test
    public void aCommitScheduledForAReplacedViewLeavesTheNewOneHeld() {
        mHold.hold("first");
        mHold.onFirstFramePresented();
        mHold.hold("second");
        mHost.commitWindowFrame();
        assertEquals(Arrays.asList("first"), mHost.removed);
        assertSame("second", mHold.held());
    }

    @Test
    public void eachViewIsRemovedOnce() {
        mHold.hold("texture");
        mHold.onFirstFramePresented();
        mHold.onFirstFramePresented();
        mHost.commitWindowFrame();
        mHold.release();
        mHost.elapse();
        assertEquals(Arrays.asList("texture"), mHost.removed);
    }

    @Test
    public void nothingHeldMeansNothingScheduledOrRemoved() {
        mHold.onFirstFramePresented();
        mHold.release();
        assertEquals(0, mHost.afterFrameCommit.size());
        assertEquals(0, mHost.delayed.size());
        assertEquals(Arrays.asList(), mHost.removed);
        assertNull(mHold.held());
    }

    @Test
    public void aFirstFrameThatNeverComesIsWaitedForOnlyUntilTheDeadline() {
        mHold.hold("texture");
        assertEquals(Arrays.asList(Long.valueOf(FirstFrameDrawGate.FIRST_FRAME_WAIT_MILLIS)), mHost.delays);

        mHost.elapse();
        assertEquals(Arrays.asList("texture"), mHost.removed);
        assertNull(mHold.held());
    }

    @Test
    public void theFirstFrameCancelsTheDeadline() {
        mHold.hold("texture");
        mHold.onFirstFramePresented();
        assertEquals(0, mHost.delayed.size());
    }

    @Test
    public void releasingCancelsTheDeadline() {
        mHold.hold("texture");
        mHold.release();
        assertEquals(0, mHost.delayed.size());
    }

    @Test
    public void holdingAnotherViewRestartsTheDeadline() {
        mHold.hold("first");
        mHold.hold("second");
        assertEquals(1, mHost.delayed.size());
        assertEquals(Arrays.asList("first"), mHost.removed);

        mHost.elapse();
        assertEquals(Arrays.asList("first", "second"), mHost.removed);
    }
}
