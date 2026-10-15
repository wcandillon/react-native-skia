import type { AddressInfo } from "net";

import { WebSocket } from "ws";

import globalSetup from "./globalSetup";
import globalTeardown from "./globalTeardown";

jest.mock("child_process", () => ({ execFileSync: jest.fn() }));

const { execFileSync } = jest.requireMock<{ execFileSync: jest.Mock }>(
  "child_process"
);

// What the example app does (apps/example/src/Tests/useClient.ts).
const openSocket = (port: number) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });

const sayHello = (socket: WebSocket) =>
  socket.send(JSON.stringify({ OS: "android" }));

const closed = (socket: WebSocket) =>
  new Promise<void>((resolve) => socket.once("close", () => resolve()));

const harnessClient = () => {
  const { client } = global.testConnection;
  if (client === null) {
    throw new Error("no app said hello");
  }
  return client;
};

const receiverOf = (message: string, sockets: Record<string, WebSocket>) => {
  const received = Promise.race(
    Object.entries(sockets).map(
      ([name, socket]) =>
        new Promise<string>((resolve) =>
          socket.once("message", (data) => {
            if (data.toString() === message) {
              resolve(name);
            }
          })
        )
    )
  );
  harnessClient().send(message);
  return received;
};

const restoreEnvironment = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

describe("e2e test server", () => {
  const sockets: WebSocket[] = [];
  const { E2E, E2E_PORT } = process.env;
  let running = false;

  const connect = async (port: number) => {
    const socket = await openSocket(port);
    sockets.push(socket);
    return socket;
  };

  const start = () => {
    running = true;
    const ready = globalSetup();
    const { port } = global.testServer.address() as AddressInfo;
    return { ready, port };
  };

  const stop = () => {
    if (running) {
      running = false;
      globalTeardown();
    }
  };

  beforeEach(() => {
    process.env.E2E = "true";
    process.env.E2E_PORT = "0";
    jest.spyOn(console, "log").mockImplementation(() => {});
    execFileSync.mockClear();
  });

  afterEach(() => {
    stop();
    sockets.splice(0).forEach((socket) => socket.terminate());
    restoreEnvironment("E2E", E2E);
    restoreEnvironment("E2E_PORT", E2E_PORT);
    jest.restoreAllMocks();
  });

  it("talks to the app that said hello, not to a connection that never did", async () => {
    const { ready, port } = start();
    const app = await connect(port);
    sayHello(app);
    await ready;
    const silent = await connect(port);
    expect(await receiverOf("ping", { app, silent })).toBe("app");
  });

  it("moves to the socket that says hello next", async () => {
    const { ready, port } = start();
    const first = await connect(port);
    sayHello(first);
    await ready;
    const helloHandled = new Promise<void>((resolve) =>
      global.testServer.once("connection", (socket) =>
        socket.once("message", () => resolve())
      )
    );
    const second = await connect(port);
    sayHello(second);
    await helloHandled;
    expect(await receiverOf("ping", { first, second })).toBe("second");
  });

  it("closes every socket it accepted when the run ends", async () => {
    const { ready, port } = start();
    const app = await connect(port);
    sayHello(app);
    await ready;
    const silent = await connect(port);
    const bothClosed = Promise.all([closed(app), closed(silent)]);
    stop();
    await bothClosed;
  });

  it("removes the port mapping it made when the run ends", async () => {
    const { ready, port } = start();
    sayHello(await connect(port));
    await ready;
    stop();
    const [mapping, removal] = execFileSync.mock.calls.map(([, args]) => args);
    expect(mapping).toEqual(["reverse", "tcp:0", "tcp:0"]);
    expect(removal).toEqual(["reverse", "--remove", "tcp:0"]);
  });
});
