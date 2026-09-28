import type { Server, WebSocket } from "ws";
import { WebSocketServer } from "ws";

declare global {
  var testServer: Server;
  var testClient: WebSocket;
  var testOS: "ios" | "android" | "web" | "node" | "macos";
  // Whether the connected device is running the Graphite backend (Dawn/WebGPU).
  // Older example-app builds don't send this field, so it defaults to false.
  var testGraphite: boolean;
}

const isOS = (
  os: string
): os is "android" | "ios" | "web" | "node" | "macos" => {
  return ["ios", "android", "web", "node", "macos"].indexOf(os) !== -1;
};

const globalSetup = () => {
  return new Promise<void>((resolve) => {
    if (process.env.E2E !== "true") {
      resolve();
    } else {
      const port = 4242;
      global.testServer = new WebSocketServer({ port });
      console.log(
        `\n\nTest server listening on port ${port} (waiting for the example app to open on E2E tests screen)`
      );
      global.testServer.on("connection", (client) => {
        global.testClient = client;
        client.once("message", (msg) => {
          const obj = JSON.parse(msg.toString("utf8"));
          const { OS, graphite } = obj;
          if (!isOS(OS)) {
            throw new Error("Unknown testing platform: " + OS);
          }
          global.testOS = OS;
          global.testGraphite = graphite === true;
          console.log(
            `${OS} device connected (graphite: ${global.testGraphite})`
          );
          resolve();
        });
      });
    }
  });
};

// eslint-disable-next-line import/no-default-export
export default globalSetup;
