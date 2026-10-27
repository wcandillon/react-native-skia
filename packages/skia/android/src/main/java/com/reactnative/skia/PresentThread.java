package com.reactnative.skia;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Process;

/**
 * The thread every canvas presents on: one for the process, started on first
 * use and never stopped. Presenting a frame (replaying its recordings on the
 * GPU and handing the buffer to the compositor, or to the window for a
 * TextureView) costs a few milliseconds of CPU on a Vulkan window, which this
 * thread takes off the main thread; one thread serves every canvas, as
 * presents serialize on the GPU context anyway. It is a looper thread, so
 * that each canvas's FrameScheduler runs on it as it would on the main
 * thread, with the Choreographer of this thread for its vsync (see
 * SkiaView for how a TextureView's present still waits for its window's
 * pending draw).
 */
final class PresentThread {
    private static final Object sLock = new Object();
    private static Handler sHandler;

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
}
