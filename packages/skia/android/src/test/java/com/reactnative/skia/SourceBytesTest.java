package com.reactnative.skia;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

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
}
