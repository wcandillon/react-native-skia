package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;

import org.junit.Test;

public class FrameSchedulerTest {
    private enum Call {
        POST_FRAME_CALLBACK,
        POST_BEHIND_PENDING_DRAW,
        PRESENT
    }

    private static final class RecordingHost implements FrameScheduler.Host {
        final List<Call> calls = new ArrayList<>();
        final Deque<Boolean> leftOverAfterPresent = new ArrayDeque<>();

        @Override
        public void postFrameCallback() {
            calls.add(Call.POST_FRAME_CALLBACK);
        }

        @Override
        public void postBehindPendingDraw() {
            calls.add(Call.POST_BEHIND_PENDING_DRAW);
        }

        @Override
        public boolean presentFrame() {
            calls.add(Call.PRESENT);
            return !leftOverAfterPresent.isEmpty() && leftOverAfterPresent.removeFirst();
        }

        List<Call> takeCalls() {
            List<Call> taken = new ArrayList<>(calls);
            calls.clear();
            return taken;
        }
    }

    private final RecordingHost mHost = new RecordingHost();
    private final FrameScheduler mScheduler = new FrameScheduler(mHost);

    @Test
    public void surfaceViewFrameIsPresentedOnTheNextVsync() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameIsPresentedBehindThePendingDraw() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.POST_BEHIND_PENDING_DRAW), mHost.takeCalls());

        mScheduler.onPosted();
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void textureViewIsNeverPresentedInsideAChoreographerFrame() {
        mScheduler.onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.POST_BEHIND_PENDING_DRAW), mHost.takeCalls());
    }

    @Test
    public void textureViewLeftoverIsPresentedBehindTheDrawOfTheNextVsync() {
        mHost.leftOverAfterPresent.add(true);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.onPosted();
        assertEquals(
                Arrays.asList(Call.POST_BEHIND_PENDING_DRAW, Call.PRESENT, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mScheduler.onFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.onPosted();
        assertEquals(Arrays.asList(Call.POST_BEHIND_PENDING_DRAW, Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void surfaceViewLeftoverIsPresentedOnTheNextVsync() {
        mHost.leftOverAfterPresent.add(true);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(Call.POST_FRAME_CALLBACK, Call.PRESENT, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void requestsWaitingForTheSameFrameArePostedOnce() {
        for (BackingViewKind kind : BackingViewKind.values()) {
            mScheduler.requestFrame(kind);
            mScheduler.requestFrame(kind);
        }
        assertEquals(
                Arrays.asList(Call.POST_FRAME_CALLBACK, Call.POST_BEHIND_PENDING_DRAW),
                mHost.takeCalls());
    }

    @Test
    public void requestAfterTheFrameRanIsPostedAgain() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.onPosted();
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT,
                        Call.POST_BEHIND_PENDING_DRAW,
                        Call.PRESENT,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_BEHIND_PENDING_DRAW),
                mHost.takeCalls());
    }

    @Test
    public void withoutABackingViewNothingIsPostedOrPresented() {
        mScheduler.requestFrame(null);
        mScheduler.onFrame(null);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void cancelDropsOutstandingRequests() {
        for (BackingViewKind kind : BackingViewKind.values()) {
            mScheduler.requestFrame(kind);
        }
        mScheduler.cancel();
        for (BackingViewKind kind : BackingViewKind.values()) {
            mScheduler.requestFrame(kind);
        }
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_BEHIND_PENDING_DRAW,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_BEHIND_PENDING_DRAW),
                mHost.takeCalls());
    }
}
