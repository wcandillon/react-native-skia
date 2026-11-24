package com.reactnative.skia;

import static org.junit.Assert.assertEquals;

import androidx.annotation.NonNull;

import org.junit.Test;

import java.util.ArrayList;
import java.util.List;

public class PresentedImageStoreTest {

    /** Writes down what it is told, in order. */
    private static final class RecordingObserver implements PresentedImageStore.Observer<String> {
        final List<String> told = new ArrayList<>();

        @Override
        public void onImagePublished(@NonNull String image) {
            told.add("published " + image);
        }

        @Override
        public void onImageFailed() {
            told.add("failed");
        }

        @Override
        public void onLevelMade() {
            told.add("level");
        }

        @Override
        public void onGpuDeviceReplaced() {
            told.add("device replaced");
        }
    }

    @Test
    public void aPublishedImageReachesItsObserversAndTheViewsThatObserveItLater() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver early = new RecordingObserver();
        store.observe(1, early);
        assertEquals(List.of(), early.told);
        store.publish(1, "a");
        assertEquals(List.of("published a"), early.told);
        RecordingObserver late = new RecordingObserver();
        store.observe(1, late);
        assertEquals(List.of("published a"), late.told);
    }

    @Test
    public void aFailedImageClearsItsObservers() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver observer = new RecordingObserver();
        store.observe(1, observer);
        store.publish(1, "a");
        store.fail(1);
        assertEquals(List.of("published a", "failed"), observer.told);
    }

    @Test
    public void aViewThatStartsToObserveAFailedImageIsToldItFailed() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        store.publish(1, "a");
        store.fail(1);
        RecordingObserver late = new RecordingObserver();
        store.observe(1, late);
        assertEquals(List.of("failed"), late.told);
    }

    @Test
    public void aFailureIsForgottenOnceTheImageIsPublishedAgainOrDiscarded() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        store.fail(1);
        store.publish(1, "a");
        RecordingObserver afterPublish = new RecordingObserver();
        store.observe(1, afterPublish);
        assertEquals(List.of("published a"), afterPublish.told);
        store.fail(2);
        store.discard(2);
        RecordingObserver afterDiscard = new RecordingObserver();
        store.observe(2, afterDiscard);
        assertEquals(List.of(), afterDiscard.told);
    }

    @Test
    public void aDiscardedImageIsForgottenWhileItsObserversKeepWhatTheyShow() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver observer = new RecordingObserver();
        store.observe(1, observer);
        store.publish(1, "a");
        store.discard(1);
        assertEquals(List.of("published a"), observer.told);
        RecordingObserver late = new RecordingObserver();
        store.observe(1, late);
        assertEquals(List.of(), late.told);
    }

    @Test
    public void eachImageTellsOnlyItsOwnObservers() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver first = new RecordingObserver();
        RecordingObserver second = new RecordingObserver();
        store.observe(1, first);
        store.observe(2, second);
        store.publish(1, "a");
        store.levelMade(1);
        store.fail(2);
        assertEquals(List.of("published a", "level"), first.told);
        assertEquals(List.of("failed"), second.told);
    }

    @Test
    public void anObserverObservingTwiceIsToldOfEachLaterChangeOnce() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver observer = new RecordingObserver();
        store.observe(1, observer);
        store.observe(1, observer);
        store.publish(1, "a");
        store.levelMade(1);
        assertEquals(List.of("published a", "level"), observer.told);
    }

    @Test
    public void anObserverThatStopsObservingIsToldNothingMore() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver observer = new RecordingObserver();
        store.observe(1, observer);
        store.unobserve(1, observer);
        store.publish(1, "a");
        store.fail(1);
        assertEquals(List.of(), observer.told);
    }

    // Each stops observing as it is told, so whichever the store tells first leaves before the other is told.
    @Test
    public void observersMayStopObservingWhileTheyAreTold() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        List<String> told = new ArrayList<>();
        for (String name : List.of("first", "second")) {
            store.observe(1, new PresentedImageStore.Observer<String>() {
                @Override
                public void onImagePublished(@NonNull String image) {
                    told.add(name + " published " + image);
                    store.unobserve(1, this);
                }

                @Override
                public void onImageFailed() {}

                @Override
                public void onLevelMade() {}

                @Override
                public void onGpuDeviceReplaced() {}
            });
        }
        store.publish(1, "a");
        told.sort(null);
        assertEquals(List.of("first published a", "second published a"), told);
    }

    @Test
    public void aReplacedGpuDeviceReachesEveryObserverOnceWhateverItsImage() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver published = new RecordingObserver();
        RecordingObserver failed = new RecordingObserver();
        RecordingObserver waiting = new RecordingObserver();
        RecordingObserver gone = new RecordingObserver();
        store.publish(1, "a");
        store.observe(1, published);
        store.fail(2);
        store.observe(2, failed);
        store.observe(3, waiting);
        store.observe(4, gone);
        store.unobserve(4, gone);
        store.gpuDeviceReplaced();
        assertEquals(List.of("published a", "device replaced"), published.told);
        assertEquals(List.of("failed", "device replaced"), failed.told);
        assertEquals(List.of("device replaced"), waiting.told);
        assertEquals(List.of(), gone.told);
    }

    @Test
    public void unobservingTwiceOrAnIdNeverObservedChangesNothing() {
        PresentedImageStore<String> store = new PresentedImageStore<>();
        RecordingObserver observer = new RecordingObserver();
        store.observe(1, observer);
        store.unobserve(1, observer);
        store.unobserve(1, observer);
        store.unobserve(2, observer);
        store.discard(3);
        store.fail(3);
        store.publish(1, "a");
        assertEquals(List.of(), observer.told);
        store.observe(1, observer);
        assertEquals(List.of("published a"), observer.told);
    }
}
