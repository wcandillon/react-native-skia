package com.reactnative.skia;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;

/** Reads the bytes of an image, font or data source. */
final class SourceBytes {
    private SourceBytes() {
    }

    /** Loads the bytes of a source; may throw. */
    interface Loader {
        byte[] load() throws Exception;
    }

    // A failed load must return null so the JS side rejects (Skia.Data.fromURI,
    // useImage, useData, useFonts). Anything thrown from getJniStreamFromSource
    // reaches the native loader thread, where nothing catches it and the app
    // ends. OutOfMemoryError is included for large downloads.
    static byte[] orNull(Loader loader) {
        try {
            return loader.load();
        } catch (Exception | OutOfMemoryError e) {
            e.printStackTrace();
            return null;
        }
    }

    // Reads a resource stream and closes it.
    static byte[] readAndClose(InputStream is) throws IOException {
        try (InputStream in = is) {
            return read(in);
        }
    }

    static byte[] read(InputStream is) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[4 * 0x400];
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toByteArray();
    }

    // One request per load: the body is read from the connection that was
    // opened, and that connection's stream is closed once it is read.
    static byte[] fromUrl(URL url) throws IOException {
        URLConnection connection = url.openConnection();
        try (InputStream is = new BufferedInputStream(connection.getInputStream(), 8192)) {
            return read(is);
        }
    }
}
