package com.reactnative.skia;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Process;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The thread every canvas presents on: one for the process, started on first
 * use and never stopped. Presenting a frame (replaying its recordings on the
 * GPU and handing the buffer to the compositor, or to the window for a
 * TextureView) costs a few milliseconds of CPU on a Vulkan window, which this
 * thread takes off the main thread; one thread serves every canvas, as
 * presents serialize on the GPU context anyway. It is a looper thread, so
 * that each canvas's frame scheduler (rnsurface::FrameScheduler, on the
 * native side) runs on it as it would on the main thread, with the
 * Choreographer of this thread for its vsync (see SkiaView for how a
 * TextureView's frame, replayed here as soon as it is queued, still waits
 * for its window's pending draw before it is handed over).
 */
final class PresentThread {
    private static final Object sLock = new Object();
    private static Handler sHandler;

    // Whether the thread is known to be held up: a main-thread wait for a task
    // posted here timed out (see SkiaView.onSurfaceDestroyed), and that task
    // has not run since. The present in flight is then waiting on a pipeline
    // compile (seconds on a slow GPU, see #4394), and no other wait for the
    // thread is worth making until it drains: each would time out in turn,
    // and the main thread would pay the timeout once per canvas. The task
    // waited for clears the flag when the thread gets to it, or the wait does
    // when the task got there first (see SkiaView.onSurfaceDestroyed): the
    // flag never outlives the task.
    private static final AtomicBoolean sHeldUp = new AtomicBoolean(false);

    private PresentThread() {
    }

    /** The handler of the thread, started on first use. Any thread. */
    static Handler handler() {
        synchronized (sLock) {
            if (sHandler == null) {
                // The priority of the UI toolkit's own render thread.
                HandlerThread thread = new HandlerThread("RNSkia Present",
                        Process.THREAD_PRIORITY_DISPLAY);
                thread.start();
                sHandler = new Handler(thread.getLooper());
            }
            return sHandler;
        }
    }

    /**
     * Whether a wait for this thread timed out and the thread has not run
     * the task waited for since. Any thread.
     */
    static boolean isHeldUp() {
        return sHeldUp.get();
    }

    /**
     * Records a wait for this thread that timed out (true, from the waiting
     * thread) or the thread getting to the task waited for (false, from this
     * thread).
     */
    static void setHeldUp(boolean heldUp) {
        sHeldUp.set(heldUp);
    }
}
