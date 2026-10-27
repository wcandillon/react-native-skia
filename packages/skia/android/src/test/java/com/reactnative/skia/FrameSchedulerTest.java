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
        PRESENT
    }

    private static final class RecordingHost implements FrameScheduler.Host {
        final List<Call> calls = new ArrayList<>();
        // What the next presents report; PRESENTED once these run out.
        final Deque<Integer> results = new ArrayDeque<>();

        @Override
        public void postFrameCallback() {
            calls.add(Call.POST_FRAME_CALLBACK);
        }

        @Override
        public int presentFrame() {
            calls.add(Call.PRESENT);
            return results.isEmpty() ? FrameScheduler.PRESENTED : results.removeFirst();
        }

        List<Call> takeCalls() {
            List<Call> taken = new ArrayList<>(calls);
            calls.clear();
            return taken;
        }
    }

    private static final int PRESENTED = FrameScheduler.PRESENTED;
    private static final int MORE_QUEUED = FrameScheduler.MORE_QUEUED;

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
    public void textureViewFrameIsPresentedOnTheSpotWhileTheWindowHasNone() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void textureViewNextFrameWaitsForTheWindowToDrawThePrevious() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());

        // Nothing was requested since: the window's next draw presents nothing.
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void textureViewLeftoverWaitsForTheWindowToDraw() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync() {
        mHost.results.add(MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT, Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        // Requests meanwhile wait for that vsync.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());

        mScheduler.onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void surfaceViewLeftoverIsPresentedOnTheNextVsync() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(Call.POST_FRAME_CALLBACK, Call.PRESENT, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void frameForAResizedWindowIsPresentedOnTheSpot() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());

        // Also while the TextureView's window has a frame it has not drawn.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT, Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT, Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void requestsWaitingForTheSameFrameArePostedOnce() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.POST_FRAME_CALLBACK, Call.PRESENT), mHost.takeCalls());
    }

    @Test
    public void requestAfterTheFrameRanIsPostedAgain() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT,
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT),
                mHost.takeCalls());
    }

    @Test
    public void withoutABackingViewNothingIsPostedOrPresented() {
        mScheduler.requestFrame(null);
        mScheduler.requestFrame(null, true);
        mScheduler.onFrame(null);
        mScheduler.onFrameConsumed(null);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void cancelDropsOutstandingRequestsAndTheFrameInTheWindow() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.cancel();
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(Call.POST_FRAME_CALLBACK, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mScheduler.cancel();
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.cancel();
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT, Call.PRESENT), mHost.takeCalls());
    }
}
