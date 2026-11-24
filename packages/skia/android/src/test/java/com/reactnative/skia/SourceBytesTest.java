package com.reactnative.skia;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.Test;

public class SourceBytesTest {
    @Test
    public void aStreamIsReadToTheEnd() throws IOException {
        byte[] bytes = new byte[10000];
        Arrays.fill(bytes, (byte) 7);
        assertArrayEquals(bytes, SourceBytes.read(new ByteArrayInputStream(bytes)));
    }

    @Test
    public void aResourceStreamIsClosedOnceRead() throws IOException {
        TrackedStream stream = new TrackedStream(new byte[] { 1, 2, 3 }, false);
        assertArrayEquals(new byte[] { 1, 2, 3 }, SourceBytes.readAndClose(stream));
        assertTrue(stream.closed);
    }

    @Test
    public void aStreamThatFailsMidReadGivesNullAndIsClosed() {
        TrackedStream stream = new TrackedStream(new byte[] { 1, 2, 3 }, true);
        assertNull(SourceBytes.orNull(() -> SourceBytes.readAndClose(stream)));
        assertTrue(stream.closed);
    }

    @Test
    public void aLoadThatThrowsGivesNull() {
        // e.g. Resources.NotFoundException from openRawResource for a color drawable
        assertNull(SourceBytes.orNull(() -> {
            throw new IllegalStateException("not a file resource");
        }));
        assertNull(SourceBytes.orNull(() -> {
            throw new Exception("Invalid URI scheme");
        }));
    }

    @Test
    public void runningOutOfMemoryOnALoadGivesNull() {
        assertNull(SourceBytes.orNull(() -> {
            throw new OutOfMemoryError("large download");
        }));
    }

    @Test
    public void anUnreachableUrlGivesNull() throws Exception {
        int port;
        try (ServerSocket server = new ServerSocket(0, 50, InetAddress.getLoopbackAddress())) {
            port = server.getLocalPort();
        }
        URL url = new URL("http://127.0.0.1:" + port + "/cat.png");
        assertNull(SourceBytes.orNull(() -> SourceBytes.fromUrl(url)));
    }

    @Test
    public void aUrlIsLoadedOverOneConnection() throws Exception {
        byte[] body = "not really a png".getBytes(StandardCharsets.US_ASCII);
        AtomicInteger connections = new AtomicInteger();
        try (ServerSocket server = new ServerSocket(0, 50, InetAddress.getLoopbackAddress())) {
            Thread acceptor = new Thread(() -> {
                while (!server.isClosed()) {
                    try {
                        Socket socket = server.accept();
                        connections.incrementAndGet();
                        Thread handler = new Thread(() -> respond(socket, body));
                        handler.setDaemon(true);
                        handler.start();
                    } catch (IOException e) {
                        return;
                    }
                }
            });
            acceptor.setDaemon(true);
            acceptor.start();

            URL url = new URL("http://127.0.0.1:" + server.getLocalPort() + "/cat.png");
            assertArrayEquals(body, SourceBytes.fromUrl(url));
            assertEquals(1, connections.get());
        }
    }

    private static void respond(Socket socket, byte[] body) {
        try (Socket s = socket) {
            InputStream in = s.getInputStream();
            int matched = 0;
            int c;
            while (matched < 4 && (c = in.read()) != -1) {
                matched = (c == "\r\n\r\n".charAt(matched)) ? matched + 1 : (c == '\r' ? 1 : 0);
            }
            if (matched < 4) {
                return;
            }
            OutputStream out = s.getOutputStream();
            out.write(("HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: " + body.length
                    + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            out.write(body);
            out.flush();
        } catch (IOException e) {
            // the client went away
        }
    }

    private static final class TrackedStream extends InputStream {
        private final ByteArrayInputStream bytes;
        private final boolean failAfterFirstRead;
        private int reads;
        boolean closed;

        TrackedStream(byte[] bytes, boolean failAfterFirstRead) {
            this.bytes = new ByteArrayInputStream(bytes);
            this.failAfterFirstRead = failAfterFirstRead;
        }

        @Override
        public int read() throws IOException {
            byte[] one = new byte[1];
            return read(one, 0, 1) == -1 ? -1 : one[0] & 0xff;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (failAfterFirstRead && reads++ > 0) {
                throw new IOException("connection reset");
            }
            return bytes.read(b, off, len);
        }

        @Override
        public void close() {
            closed = true;
        }
    }
}
