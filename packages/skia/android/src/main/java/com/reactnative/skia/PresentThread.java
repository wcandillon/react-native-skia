package com.reactnative.skia;

import com.facebook.proguard.annotations.DoNotStrip;

/**
 * The thread every canvas presents on: one for the process, owned by the
 * native side (rnsurface::RenderThread, see RNSkPresentThread.h), started on
 * first use and never stopped. Presenting a frame (replaying its recordings
 * on the GPU and handing the buffer to the compositor, or to the window for a
 * TextureView) costs a few milliseconds of CPU on a Vulkan window, which this
 * thread takes off the main thread; one thread serves every canvas, as
 * presents serialize on the GPU context anyway. Its vsync is the
 * AChoreographer of its looper, which the native frame scheduler asks for
 * (see SkiaView for how a TextureView's present still waits for its window's
 * pending draw). The Java view only posts here: the surface callbacks, and
 * the drop of the native view.
 */
final class PresentThread {
    private PresentThread() {
    }

    /** Runs the task on the present thread, after those posted before. Any thread. */
    static void post(Runnable task) {
        postNative(task);
    }

    /**
     * Posts the task and waits for it to run, up to {@code timeoutMs}: true
     * when it ran in time. A wait that times out marks the thread held up
     * until that task runs (the present in flight is waiting on a pipeline
     * compile, seconds on a slow GPU, see #4394), and a wait made meanwhile
     * posts its task and returns false at once: the bound is paid once per
     * hold-up, however many canvases go, and the mark never outlives its
     * task. Any thread but the present thread.
     */
    static boolean postAndWait(Runnable task, long timeoutMs) {
        return postAndWaitNative(task, timeoutMs);
    }

    @DoNotStrip
    private static native void postNative(Runnable task);

    @DoNotStrip
    private static native boolean postAndWaitNative(Runnable task, long timeoutMs);
}
