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
        CREATED,
        CHANGED,
        DESTROYED
    }

    private static final class RecordingHost implements SurfaceHandOver.Host {
        final List<Call> calls = new ArrayList<>();
        final List<Runnable> afterFrameCommit = new ArrayList<>();

        @Override
        public void runAfterWindowFrameCommits(Runnable handOver) {
            afterFrameCommit.add(handOver);
        }

        @Override
        public void handOverSurface() {
            calls.add(Call.CREATED);
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
            for (Runnable handOver : pending) {
                handOver.run();
            }
        }
    }

    private final RecordingHost mHost = new RecordingHost();
    private final SurfaceHandOver mHandOver = new SurfaceHandOver(mHost);

    @Test
    public void defersOnlyWhereTheLayerShowsOutsideTheWindowFrame() {
        assertFalse(SurfaceHandOver.defersToWindowFrame(28, true, true));
        assertTrue(SurfaceHandOver.defersToWindowFrame(29, true, true));
        assertTrue(SurfaceHandOver.defersToWindowFrame(30, true, true));
        assertTrue(SurfaceHandOver.defersToWindowFrame(31, true, true));
        assertFalse(SurfaceHandOver.defersToWindowFrame(32, true, true));
        assertFalse(SurfaceHandOver.defersToWindowFrame(36, true, true));
    }

    @Test
    public void neverDefersWithoutHardwareRendering() {
        assertFalse(SurfaceHandOver.defersToWindowFrame(29, false, true));
    }

    @Test
    public void neverDefersALayerBehindTheWindow() {
        assertFalse(SurfaceHandOver.defersToWindowFrame(29, true, false));
        assertFalse(SurfaceHandOver.defersToWindowFrame(31, true, false));
    }

    @Test
    public void deferredSurfaceIsHandedOverOnceTheWindowFrameCommits() {
        mHandOver.onSurfaceCreated(true);
        assertEquals(Arrays.asList(), mHost.calls);

        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(Call.CREATED), mHost.calls);
    }

    @Test
    public void undeferredSurfaceIsHandedOverAtOnce() {
        mHandOver.onSurfaceCreated(false);
        assertEquals(Arrays.asList(Call.CREATED), mHost.calls);
        assertEquals(0, mHost.afterFrameCommit.size());
    }

    @Test
    public void surfaceReleasedBeforeTheCommitIsNeverHandedOver() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceReleased();
        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(), mHost.calls);
    }

    @Test
    public void surfaceRecreatedBeforeTheCommitIsHandedOverOnce() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceReleased();
        mHandOver.onSurfaceCreated(true);
        mHost.commitWindowFrame();
        assertEquals(Arrays.asList(Call.CREATED), mHost.calls);
    }

    @Test
    public void changesReachTheRendererOnlyForAHandedOverSurface() {
        mHandOver.onSurfaceCreated(true);
        mHandOver.onSurfaceChanged();
        assertEquals(Arrays.asList(), mHost.calls);

        mHost.commitWindowFrame();
        mHandOver.onSurfaceChanged();
        assertEquals(Arrays.asList(Call.CREATED, Call.CHANGED), mHost.calls);
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
