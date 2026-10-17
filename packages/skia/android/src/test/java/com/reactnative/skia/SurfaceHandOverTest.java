package com.reactnative.skia;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class SurfaceHandOverTest {
    private enum Call {
        HELD,
        CREATED,
        RELEASED,
        CHANGED,
        DESTROYED
    }

    private static final class RecordingHost implements SurfaceHandOver.Host {
        final List<Call> calls = new ArrayList<>();
        final List<Runnable> afterFrameCommit = new ArrayList<>();

        @Override
        public void runAfterWindowFrameCommits(Runnable release) {
            afterFrameCommit.add(release);
        }

        @Override
        public void handOverSurface() {
            calls.add(Call.CREATED);
        }

        @Override
        public void holdFirstFrame() {
            calls.add(Call.HELD);
        }

        @Override
        public void releaseFirstFrame() {
            calls.add(Call.RELEASED);
        }

        @Override
        public void forwardSurfaceChanged() {
            calls.add(Call.CHANGED);
        }

        @Override
        public void forwardSurfaceDestroyed() {
            calls.add(Call.DESTROYED);
        }

        void commitWindowFrame() {
            List<Runnable> pending = new ArrayList<>(afterFrameCommit);
            afterFrameCommit.clear();
            for (Runnable release : pending) {
                release.run();
            }
        }

        void commitWindowFrameRegisteredFirst() {
            afterFrameCommit.remove(0).run();
        }
    }

    private final RecordingHost mHost = new RecordingHost();
    private final SurfaceHandOver mHandOver = new SurfaceHandOver(mHost, false);

    @Test
    public void defersArrivalOnlyWhereTheLayerShowsAheadOfTheWindowFrame() {
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(28, true, true));
        assertTrue(SurfaceHandOver.defersArrivalToWindowFrame(29, true, true));
        assertTrue(SurfaceHandOver.defersArrivalToWindowFrame(30, true, true));
        assertTrue(SurfaceHandOver.defersArrivalToWindowFrame(31, true, true));
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(32, true, true));
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(36, true, true));
    }

    @Test
    public void neverDefersWithoutHardwareRendering() {
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(29, false, true));
    }

    @Test
    public void neverDefersALayerBehindTheWindow() {
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(29, true, false));
        assertFalse(SurfaceHandOver.defersArrivalToWindowFrame(31, true, false));
    }

    @Test
    public void deferredSurfaceIsHandedOverAtOnceWithItsFirstFrameHeldUntilTheWindowFrameCommits() {
        mHandOver.onSurfaceCreated(true);
        assertEquals(Arrays.asList(Call.HELD, Call.CREATED), mHost.calls);

        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(Call.HELD, Call.CREATED, Call.RELEASED), mHost.calls);
    }

    @Test
    public void undeferredSurfaceIsHandedOverAtOnceAndHoldsNothing() {
        mHandOver.onSurfaceCreated(false);
        assertEquals(Arrays.asList(Call.CREATED), mHost.calls);
        assertEquals(0, mHost.afterFrameCommit.size());
    }

    @Test
    public void surfaceReleasedBeforeTheCommitLetsGoOfItsHoldOnce() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceReleased();
        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(Call.HELD, Call.CREATED, Call.DESTROYED, Call.RELEASED), mHost.calls);
    }

    @Test
    public void surfaceRecreatedBeforeTheCommitIsReleasedOnceByItsOwnCommit() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceReleased();
        mHandOver.onSurfaceCreated(true);
        mHost.commitWindowFrame();
        assertEquals(
                Arrays.asList(Call.HELD, Call.CREATED, Call.DESTROYED, Call.RELEASED, Call.HELD, Call.CREATED,
                        Call.RELEASED),
                mHost.calls);
    }

    @Test
    public void commitAwaitedByAReleasedSurfaceLeavesTheNextSurfaceHeld() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceReleased();
        mHandOver.onSurfaceCreated(true);
        mHost.commitWindowFrameRegisteredFirst();
        assertEquals(Arrays.asList(Call.HELD, Call.CREATED, Call.DESTROYED, Call.RELEASED, Call.HELD, Call.CREATED),
                mHost.calls);
    }

    @Test
    public void changesReachTheRendererForAHandedOverSurfaceWhileItsFirstFrameIsHeld() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceChanged();
        assertEquals(Arrays.asList(Call.HELD, Call.CREATED, Call.CHANGED), mHost.calls);
    }

    @Test
    public void firstSurfaceReplacingACanvasOnScreenHoldsNothing() {
        SurfaceHandOver replacing = new SurfaceHandOver(mHost, true);
        replacing.onSurfaceCreated(true);
        assertEquals(Arrays.asList(Call.CREATED), mHost.calls);
        assertEquals(0, mHost.afterFrameCommit.size());
    }

    @Test
    public void laterSurfaceOfAReplacingViewHoldsItsFirstFrameForTheWindowFrame() {
        SurfaceHandOver replacing = new SurfaceHandOver(mHost, true);
        replacing.onSurfaceCreated(true);
        replacing.onSurfaceReleased();
        replacing.onSurfaceCreated(true);
        assertEquals(Arrays.asList(Call.CREATED, Call.DESTROYED, Call.HELD, Call.CREATED), mHost.calls);

        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(Call.CREATED, Call.DESTROYED, Call.HELD, Call.CREATED, Call.RELEASED),
                mHost.calls);
    }

    @Test
    public void releaseDestroysOnlyAHandedOverSurfaceAndOnlyOnce() {
        mHandOver.onSurfaceReleased();
        assertEquals(Arrays.asList(), mHost.calls);

        mHandOver.onSurfaceCreated(false);
        mHandOver.onSurfaceReleased();
        mHandOver.onSurfaceReleased();
        assertEquals(Arrays.asList(Call.CREATED, Call.DESTROYED), mHost.calls);
    }
}
