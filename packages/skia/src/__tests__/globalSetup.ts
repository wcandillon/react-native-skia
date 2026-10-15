import { execFileSync } from "child_process";

import type { Server, WebSocket } from "ws";
import { WebSocketServer } from "ws";

declare global {
  var testServer: Server;
  // Each test file keeps a global's first value, so the client is a property.
  var testConnection: { client: WebSocket | null };
  var testOS: "ios" | "android" | "web" | "node" | "macos";
}

const isOS = (
  os: string
): os is "android" | "ios" | "web" | "node" | "macos" => {
  return ["ios", "android", "web", "node", "macos"].indexOf(os) !== -1;
};

// Map the device's own localhost:<port> onto this machine, the same way the
// React Native CLI does for Metro on 8081. With it an Android emulator and a
// phone both reach the test server at "localhost" (useClient), without a
// per-platform host. Best effort: no adb, no device, or several devices
// attached just leaves the connection to whatever host the app uses.
const reversePort = (port: number) => {
  try {
    execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
      stdio: "ignore",
    });
  } catch {
    // Not an Android run, or adb is unavailable: iOS needs no reverse.
  }
};

// How long the server waits for the example app before failing the run.
// Without it a crashed or never-launched app leaves jest waiting here until
// the CI job times out. Generous because on a cold CI runner the first
// connection also waits for Metro to build the app's bundle.
const connectTimeoutSeconds = Number(process.env.E2E_CONNECT_TIMEOUT ?? 600);

export const testPort = () => Number(process.env.E2E_PORT ?? 4242);

const globalSetup = () => {
  return new Promise<void>((resolve, reject) => {
    if (process.env.E2E !== "true") {
      resolve();
      return;
    }
    const port = testPort();
    reversePort(port);
    global.testConnection = { client: null };
    global.testServer = new WebSocketServer({ port });
    console.log(
      `\n\nTest server listening on port ${port} (waiting for the example app to open on E2E tests screen)`
    );
    const deadline = setTimeout(() => {
      global.testServer.close();
      reject(
        new Error(
          `No device connected to the test server on port ${port} within ${connectTimeoutSeconds}s. Is the example app running on the Tests screen (CI=true), and can it reach the port?`
        )
      );
    }, connectTimeoutSeconds * 1000);
    global.testServer.on("connection", (client) => {
      client.once("message", (msg) => {
        clearTimeout(deadline);
        const obj = JSON.parse(msg.toString("utf8"));
        const { OS } = obj;
        if (!isOS(OS)) {
          throw new Error("Unknown testing platform: " + OS);
        }
        // Only a socket that says hello is the app's, and the latest one wins.
        global.testConnection.client = client;
        global.testOS = OS;
        console.log(`${OS} device connected`);
        resolve();
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default globalSetup;
