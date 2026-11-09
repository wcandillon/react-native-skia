package com.reactnative.skia;

import android.os.Handler;
import android.os.Looper;
import android.os.MessageQueue;
import android.os.ParcelFileDescriptor;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.common.LifecycleState;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLConnection;

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

    public PlatformContext(ReactContext reactContext) {
        listenForMainThreadTasks();
        mContext = reactContext;
        // Before the GPU is first asked for: where Dawn keeps what it
        // compiled, for the next launch to find (see DawnContext).
        setCacheDirectoryNative(new File(reactContext.getCacheDir(), "rnskia").getAbsolutePath());
        // Before the first canvas: where the windows let go of a lost GPU
        // device's surfaces before it is destroyed (see DawnContext).
        setPresentThreadNative();
        mHybridData = initHybrid(reactContext.getResources().getDisplayMetrics().density);
        // Skia.gpu.foreground follows the host activity: resumed, or not.
        setForegroundNative(reactContext.getLifecycleState() == LifecycleState.RESUMED);
        reactContext.addLifecycleEventListener(this);
    }

    /** Stops following the host activity; the manager is going away. */
    public void destroy() {
        mContext.removeLifecycleEventListener(this);
    }

    @Override
    public void onHostResume() {
        setForegroundNative(true);
    }

    @Override
    public void onHostPause() {
        setForegroundNative(false);
    }

    @Override
    public void onHostDestroy() {
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

    private byte[] getStreamAsBytes(InputStream is) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[4 * 0x400];
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toByteArray();
    }

    @DoNotStrip
    public byte[] getJniStreamFromSource(String sourceUri) throws IOException {
        // First try loading the input as a resource directly
        int resourceId = mContext.getResources().getIdentifier(sourceUri, "drawable", mContext.getPackageName());

        // Test to see if we have a raw resource (for SVG)
        if (resourceId == 0) {
            resourceId = mContext.getResources().getIdentifier(sourceUri, "raw", mContext.getPackageName());
        }

        if (resourceId != 0) {
            // We can just return the input stream directly
            return getStreamAsBytes(mContext.getResources().openRawResource(resourceId));
        }

        // We should try to open a connection and return a stream to download this
        // object
        URI uri = null;
        try {
            uri = new URI(sourceUri);

            String scheme = uri.getScheme();

            if (scheme == null)
                throw new Exception("Invalid URI scheme");

            // TODO: Base64??

            URL url = uri.toURL();
            URLConnection connection = url.openConnection();
            connection.connect();

            BufferedInputStream b = new BufferedInputStream(url.openStream(), 8192);
            return getStreamAsBytes(b);

        } catch (URISyntaxException e) {
            e.printStackTrace();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
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

    private static native int duplicateMainThreadWakeup();

    private static native void runMainThreadTasks();

    // Whether the app is in the foreground (DawnContext::setForeground).
    private static native void setForegroundNative(boolean foreground);

    // Where Dawn's blob cache keeps its entries (DawnContext::setCacheDirectory).
    private static native void setCacheDirectoryNative(String directory);

    // The thread every canvas presents on, PresentThread
    // (DawnContext::setPresentThread).
    private static native void setPresentThreadNative();
}
