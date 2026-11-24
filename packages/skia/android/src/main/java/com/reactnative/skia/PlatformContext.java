package com.reactnative.skia;

import android.content.ComponentCallbacks;
import android.content.res.Configuration;
import android.os.Handler;
import android.os.Looper;
import android.os.MessageQueue;
import android.os.ParcelFileDescriptor;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;

import java.io.File;
import java.net.URI;

public class PlatformContext implements LifecycleEventListener {
    @DoNotStrip
    private final HybridData mHybridData;

    private final ReactContext mContext;

    private final String TAG = "PlatformContext";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // The native side's main-thread queue signals its tasks on this
    // descriptor, one for the process, so queuing one from another thread
    // calls no Java there.
    private static ParcelFileDescriptor sMainThreadWakeup;

    // The display density can change while the app runs (display size
    // setting, foldables): the native side follows it.
    private final ComponentCallbacks mComponentCallbacks = new ComponentCallbacks() {
        @Override
        public void onConfigurationChanged(Configuration newConfig) {
            updatePixelDensity();
        }

        @Override
        public void onLowMemory() {
        }
    };

    public PlatformContext(ReactContext reactContext) {
        listenForMainThreadTasks();
        mContext = reactContext;
        // Before the GPU is first asked for: where Dawn keeps what it
        // compiled, for the next launch to find (see DawnContext).
        setCacheDirectoryNative(new File(reactContext.getCacheDir(), "rnskia").getAbsolutePath());
        mHybridData = initHybrid(reactContext.getResources().getDisplayMetrics().density);
        // Skia.gpu.foreground follows the host activity: resumed, or not.
        setForegroundNative(reactContext.getLifecycleState() == LifecycleState.RESUMED);
        reactContext.addLifecycleEventListener(this);
        reactContext.getApplicationContext().registerComponentCallbacks(mComponentCallbacks);
    }

    /** Stops following the host activity; the manager is going away. */
    public void destroy() {
        mContext.removeLifecycleEventListener(this);
        mContext.getApplicationContext().unregisterComponentCallbacks(mComponentCallbacks);
    }

    @Override
    public void onHostResume() {
        setForegroundNative(true);
        // The density may have changed while the app was in the background.
        updatePixelDensity();
    }

    @Override
    public void onHostPause() {
        setForegroundNative(false);
    }

    @Override
    public void onHostDestroy() {
    }

    private void updatePixelDensity() {
        setPixelDensityNative(mContext.getResources().getDisplayMetrics().density);
    }

    private static synchronized void listenForMainThreadTasks() {
        if (sMainThreadWakeup != null) {
            return;
        }
        ParcelFileDescriptor wakeup = ParcelFileDescriptor.adoptFd(duplicateMainThreadWakeup());
        Looper.getMainLooper().getQueue().addOnFileDescriptorEventListener(
                wakeup.getFileDescriptor(),
                MessageQueue.OnFileDescriptorEventListener.EVENT_INPUT,
                (descriptor, events) -> {
                    runMainThreadTasks();
                    return MessageQueue.OnFileDescriptorEventListener.EVENT_INPUT;
                });
        sMainThreadWakeup = wakeup;
    }

    @DoNotStrip
    public byte[] getJniStreamFromSource(String sourceUri) {
        // Returns null on any failure so the load rejects instead of ending the app
        return SourceBytes.orNull(() -> loadSource(sourceUri));
    }

    private byte[] loadSource(String sourceUri) throws Exception {
        // First try loading the input as a resource directly
        int resourceId = mContext.getResources().getIdentifier(sourceUri, "drawable", mContext.getPackageName());

        // Test to see if we have a raw resource (for SVG)
        if (resourceId == 0) {
            resourceId = mContext.getResources().getIdentifier(sourceUri, "raw", mContext.getPackageName());
        }

        if (resourceId != 0) {
            return SourceBytes.readAndClose(mContext.getResources().openRawResource(resourceId));
        }

        // We should try to open a connection and return a stream to download this
        // object
        URI uri = new URI(sourceUri);

        if (uri.getScheme() == null)
            throw new Exception("Invalid URI scheme");

        // TODO: Base64??

        return SourceBytes.fromUrl(uri.toURL());
    }

    @Override
    protected void finalize() throws Throwable {
        mHybridData.resetNative();
        super.finalize();
    }

    @DoNotStrip
    public void raise(final String message) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                mContext.handleException(new Exception(message));
            }
        });
    }

    // Private c++ native methods
    private native HybridData initHybrid(float pixelDensity);

    // The display density changed (JniPlatformContext::setPixelDensity).
    private native void setPixelDensityNative(float pixelDensity);

    private static native int duplicateMainThreadWakeup();

    private static native void runMainThreadTasks();

    // Whether the app is in the foreground (DawnContext::setForeground).
    private static native void setForegroundNative(boolean foreground);

    // Where Dawn's blob cache keeps its entries (DawnContext::setCacheDirectory).
    private static native void setCacheDirectoryNative(String directory);
}
