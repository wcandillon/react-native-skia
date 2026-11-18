package com.reactnative.skia;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The images SkiaImageViews show, by image id, and the views observing each: an image is published once it is drawn,
 * fails when no bitmap could be made for it, and is discarded once JS releases it. Generic over the image so that the
 * bookkeeping runs in JVM tests; SkiaPresentedImages holds the one store, on the main thread.
 */
final class PresentedImageStore<Image> {

    /**
     * A view showing an image, told when its image is published or fails, when a level of it is made, and when a
     * lost GPU device is replaced, which may now make a level it could not make then.
     */
    interface Observer<Image> {
        void onImagePublished(@NonNull Image image);

        void onImageFailed();

        void onLevelMade();

        void onGpuDeviceReplaced();
    }

    /** What an image's observers are told once it is published or fails. */
    private interface Outcome<Image> {
        void tell(@NonNull Observer<Image> observer);
    }

    private final Map<Long, Outcome<Image>> mOutcomes = new HashMap<>();
    private final Map<Long, Set<Observer<Image>>> mObservers = new HashMap<>();

    void publish(long id, @NonNull Image image) {
        settle(id, observer -> observer.onImagePublished(image));
    }

    /** Its observers show nothing, and so does a view that starts to observe it, until it is published again. */
    void fail(long id) {
        settle(id, Observer::onImageFailed);
    }

    /** A view showing the image keeps it, and its levels, until it shows another. */
    void discard(long id) {
        mOutcomes.remove(id);
    }

    void levelMade(long id) {
        for (Observer<Image> observer : observersOf(id)) {
            observer.onLevelMade();
        }
    }

    /** Tells every view observing an image. */
    void gpuDeviceReplaced() {
        for (long id : new ArrayList<>(mObservers.keySet())) {
            for (Observer<Image> observer : observersOf(id)) {
                observer.onGpuDeviceReplaced();
            }
        }
    }

    /**
     * Tells `observer` at once whether the image of `id` is published or failed, nothing while it is on its way,
     * and from then on what happens to it.
     */
    void observe(long id, @NonNull Observer<Image> observer) {
        Set<Observer<Image>> observers = mObservers.get(id);
        if (observers == null) {
            observers = new HashSet<>();
            mObservers.put(id, observers);
        }
        observers.add(observer);
        Outcome<Image> outcome = mOutcomes.get(id);
        if (outcome != null) {
            outcome.tell(observer);
        }
    }

    void unobserve(long id, @NonNull Observer<Image> observer) {
        Set<Observer<Image>> observers = mObservers.get(id);
        if (observers == null) {
            return;
        }
        observers.remove(observer);
        if (observers.isEmpty()) {
            mObservers.remove(id);
        }
    }

    private void settle(long id, @NonNull Outcome<Image> outcome) {
        mOutcomes.put(id, outcome);
        for (Observer<Image> observer : observersOf(id)) {
            outcome.tell(observer);
        }
    }

    // A copy: an observer may stop observing while it is told.
    private List<Observer<Image>> observersOf(long id) {
        Set<Observer<Image>> observers = mObservers.get(id);
        return observers == null ? Collections.emptyList() : new ArrayList<>(observers);
    }
}
