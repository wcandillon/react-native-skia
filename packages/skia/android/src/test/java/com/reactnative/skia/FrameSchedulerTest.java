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
        PRESENT_ON_REQUEST,
        PRESENT_ON_VSYNC,
        PRESENT_ON_WINDOW_DRAW,
        PRESENT_HELD_FRAME,
        TICK,
        POST_HELD_FRAME_RETRY
    }

    private static final class RecordingHost implements FrameScheduler.Host {
        final List<Call> calls = new ArrayList<>();
        // What the next presents report; PRESENTED once these run out.
        final Deque<Integer> results = new ArrayDeque<>();
        // What the next ticks report; nothing once these run out.
        final Deque<Integer> tickResults = new ArrayDeque<>();
        // The delays the held frame retries were posted with.
        final List<Long> heldFrameRetryDelays = new ArrayList<>();

        @Override
        public void postFrameCallback() {
            calls.add(Call.POST_FRAME_CALLBACK);
        }

        @Override
        public int presentFrame() {
            calls.add(Call.PRESENT_ON_REQUEST);
            return results.isEmpty() ? FrameScheduler.PRESENTED : results.removeFirst();
        }

        @Override
        public int presentFrameOnVsync() {
            calls.add(Call.PRESENT_ON_VSYNC);
            return results.isEmpty() ? FrameScheduler.PRESENTED : results.removeFirst();
        }

        @Override
        public int presentFrameOnWindowDraw() {
            calls.add(Call.PRESENT_ON_WINDOW_DRAW);
            return results.isEmpty() ? FrameScheduler.PRESENTED : results.removeFirst();
        }

        @Override
        public int presentHeldFrame() {
            calls.add(Call.PRESENT_HELD_FRAME);
            return results.isEmpty() ? FrameScheduler.PRESENTED : results.removeFirst();
        }

        @Override
        public int tickOnVsync() {
            calls.add(Call.TICK);
            return tickResults.isEmpty() ? 0 : tickResults.removeFirst();
        }

        @Override
        public void postHeldFrameRetry(long delayMillis) {
            calls.add(Call.POST_HELD_FRAME_RETRY);
            heldFrameRetryDelays.add(delayMillis);
        }

        List<Call> takeCalls() {
            List<Call> taken = new ArrayList<>(calls);
            calls.clear();
            return taken;
        }
    }

    private static final int PRESENTED = FrameScheduler.PRESENTED;
    private static final int MORE_QUEUED = FrameScheduler.MORE_QUEUED;
    private static final int REPLAY_COMING = FrameScheduler.REPLAY_COMING;
    private static final int HELD_FOR_GPU = FrameScheduler.HELD_FOR_GPU;

    private final RecordingHost mHost = new RecordingHost();
    private final FrameScheduler mScheduler = new FrameScheduler(mHost);

    // The next vsync's Choreographer frame.
    private void onFrame(BackingViewKind kind) {
        mScheduler.onFrame(kind);
    }

    @Test
    public void surfaceViewFrameIsPresentedOnTheNextVsync() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameIsPresentedOnTheSpotWhileTheWindowHasNone() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());
    }

    @Test
    public void textureViewNextFrameWaitsForTheWindowToDrawThePrevious() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    // The window takes one frame a draw: the view hears of each draw, so that the next frame goes to the window as soon
    // as it is replayed rather than at a vsync's tick, which none brings while the window has no frame to draw.
    @Test
    public void textureViewWindowDrawLetsTheNextFrameGoWithNothingWaiting() {
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mHost.takeCalls();

        mHost.results.add(0);
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());

        // The window has no frame to draw: the next request goes on the spot.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());
    }

    @Test
    public void textureViewLeftoverWaitsForTheWindowToDraw() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameTheWindowCouldNotTakeIsTriedOnTheNextVsync() {
        mHost.results.add(MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        // Requests meanwhile wait for that vsync.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());

        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameHeldForTheGpuIsNotInTheWindow() {
        mHost.results.add(MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.PRESENT_ON_VSYNC),
                mHost.takeCalls());

        // The held frame went to the window at that vsync: the next waits for its draw.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    // The GPU finishing the frame before a held one is no event the view hears: the scheduler presents the held frame
    // a moment later, alone, through the host like any present, so that the platform view sees it go.
    @Test
    public void frameHeldForTheGpuIsTriedAgainSoonThroughTheHost() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_HELD_FRAME_RETRY),
                mHost.takeCalls());

        mScheduler.onHeldFrameRetry(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_HELD_FRAME), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameTheRetryPresentedWaitsForTheWindowToDrawIt() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.POST_HELD_FRAME_RETRY),
                mHost.takeCalls());

        mScheduler.onHeldFrameRetry(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_HELD_FRAME), mHost.takeCalls());

        // The retried frame is in the window: the vsync only ticks, and no frame replaces it before the window draws it.
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.TICK), mHost.takeCalls());
    }

    @Test
    public void heldFrameRetryOutstandingIsPostedOnce() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_HELD_FRAME_RETRY,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());
    }

    @Test
    public void textureViewRetryPresentsNothingOnceTheVsyncPresentedTheFrame() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.PRESENT_ON_WINDOW_DRAW,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_HELD_FRAME_RETRY,
                        Call.PRESENT_ON_VSYNC),
                mHost.takeCalls());

        mScheduler.onHeldFrameRetry(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    // A retry still outstanding once the vsync presented the held frame comes between the view's frames: it presents a
    // held frame alone, so a recording submitted since waits for the vsync like any SurfaceView frame.
    @Test
    public void surfaceViewRetryOnceTheVsyncPresentedTheHeldFrameLeavesTheNextFrameToTheVsync() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.POST_HELD_FRAME_RETRY,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mHost.results.add(MORE_QUEUED);
        mScheduler.onHeldFrameRetry(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_HELD_FRAME), mHost.takeCalls());

        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    // A redraw presents outside the scheduler: a frame it leaves held for the GPU is presented a moment later, as one a
    // present of the scheduler's leaves, and on the next vsync.
    @Test
    public void surfaceViewFrameARedrawHeldForTheGpuIsTriedAgainSoon() {
        mScheduler.onRedrawn(BackingViewKind.SURFACE_VIEW, MORE_QUEUED | HELD_FOR_GPU);
        assertEquals(Arrays.asList(Call.POST_FRAME_CALLBACK, Call.POST_HELD_FRAME_RETRY), mHost.takeCalls());

        mScheduler.onHeldFrameRetry(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_HELD_FRAME), mHost.takeCalls());
    }

    @Test
    public void textureViewFrameARedrawPresentedWaitsForTheWindowToDrawIt() {
        mScheduler.onRedrawn(BackingViewKind.TEXTURE_VIEW, PRESENTED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(), mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    @Test
    public void redrawWithoutABackingViewSchedulesNothing() {
        mScheduler.onRedrawn(null, MORE_QUEUED | HELD_FOR_GPU);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void cancelForgetsTheHeldFrameRetry() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mHost.takeCalls();
        mScheduler.cancel();

        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.POST_HELD_FRAME_RETRY),
                mHost.takeCalls());
    }

    @Test
    public void heldFrameRetriesBackOffWhileTheGpuStaysBusyAndStartSoonForTheNextFrame() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(PRESENTED);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        for (int retry = 0; retry < 4; retry++) {
            mScheduler.onHeldFrameRetry(BackingViewKind.SURFACE_VIEW);
        }
        assertEquals(Arrays.asList(1L, 2L, 4L, 4L), mHost.heldFrameRetryDelays);

        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(1L, 2L, 4L, 4L, 1L), mHost.heldFrameRetryDelays);
    }

    @Test
    public void cancelStartsTheNextHeldFrameRetrySoon() {
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.onHeldFrameRetry(BackingViewKind.TEXTURE_VIEW);
        mScheduler.cancel();

        mHost.results.add(MORE_QUEUED | HELD_FOR_GPU);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(1L, 2L, 1L), mHost.heldFrameRetryDelays);
    }

    @Test
    public void heldFrameRetryWithoutABackingViewPresentsNothing() {
        mScheduler.onHeldFrameRetry(null);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void surfaceViewLeftoverIsPresentedOnTheNextVsync() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(Call.POST_FRAME_CALLBACK, Call.PRESENT_ON_VSYNC, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    @Test
    public void aReplayComingKeepsTheVsyncTicking() {
        mHost.results.add(REPLAY_COMING);
        mHost.results.add(REPLAY_COMING);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC),
                mHost.takeCalls());
    }

    @Test
    public void textureViewVsyncOnlyTicksWhileItsWindowHasAFrameToDraw() {
        mHost.results.add(PRESENTED | REPLAY_COMING);
        mHost.tickResults.add(REPLAY_COMING);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.TICK, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mHost.results.add(REPLAY_COMING);
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());

        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    @Test
    public void textureViewTickWithoutAReplayComingAsksForNoMoreVsyncs() {
        mHost.results.add(PRESENTED | REPLAY_COMING);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.TICK),
                mHost.takeCalls());
    }

    @Test
    public void textureViewRequestWhileTheVsyncOnlyTicksIsPresentedOnTheSpot() {
        mHost.results.add(REPLAY_COMING);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());

        // The window has that frame now: the vsync only ticks.
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.TICK), mHost.takeCalls());
    }

    @Test
    public void textureViewLeftoverWithAReplayComingTicksUntilTheWindowDraws() {
        mHost.results.add(PRESENTED | MORE_QUEUED | REPLAY_COMING);
        mHost.tickResults.add(REPLAY_COMING);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        onFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(
                Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK, Call.TICK, Call.POST_FRAME_CALLBACK),
                mHost.takeCalls());

        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    @Test
    public void frameForAResizedWindowIsPresentedOnTheSpot() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());

        // Also while the TextureView's window has a frame it has not drawn.
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST, Call.PRESENT_ON_REQUEST), mHost.takeCalls());
    }

    @Test
    public void leftoverOfAFrameForAResizedWindowWaitsLikeAnyOther() {
        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST, Call.POST_FRAME_CALLBACK), mHost.takeCalls());

        mHost.results.add(PRESENTED | MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW, true);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());
        mScheduler.onFrameConsumed(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_WINDOW_DRAW), mHost.takeCalls());
    }

    @Test
    public void requestsWaitingForTheSameFrameArePostedOnce() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(Arrays.asList(Call.POST_FRAME_CALLBACK, Call.PRESENT_ON_VSYNC), mHost.takeCalls());
    }

    @Test
    public void requestAfterTheFrameRanIsPostedAgain() {
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        mScheduler.requestFrame(BackingViewKind.SURFACE_VIEW);
        onFrame(BackingViewKind.SURFACE_VIEW);
        assertEquals(
                Arrays.asList(
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC,
                        Call.POST_FRAME_CALLBACK,
                        Call.PRESENT_ON_VSYNC),
                mHost.takeCalls());
    }

    @Test
    public void withoutABackingViewNothingIsPostedOrPresented() {
        mScheduler.requestFrame(null);
        mScheduler.requestFrame(null, true);
        onFrame(null);
        mScheduler.onFrameConsumed(null);
        assertEquals(Arrays.asList(), mHost.takeCalls());
    }

    @Test
    public void aRetryEndsWithItsVsyncEvenWithoutABackingView() {
        mHost.results.add(MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        onFrame(null);
        mHost.takeCalls();

        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());
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
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST, Call.PRESENT_ON_REQUEST), mHost.takeCalls());
    }

    @Test
    public void cancelDropsAnOutstandingRetry() {
        mHost.results.add(MORE_QUEUED);
        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        mScheduler.cancel();
        mHost.takeCalls();

        mScheduler.requestFrame(BackingViewKind.TEXTURE_VIEW);
        assertEquals(Arrays.asList(Call.PRESENT_ON_REQUEST), mHost.takeCalls());
    }
}
