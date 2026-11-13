import { EventEmitter } from "events";

import type { WebSocket } from "ws";

import { RemoteSurface } from "./setup";

class FakeSocket extends EventEmitter {
  readonly sent: string[] = [];
  send(body: string) {
    this.sent.push(body);
  }
}

const asWebSocket = (socket: FakeSocket) => socket as unknown as WebSocket;

// What the example app's Tests screen sends back for an eval.
const reply = (request: string, result: unknown) =>
  Buffer.from(JSON.stringify({ $$id: JSON.parse(request).$$id, result }));

describe("RemoteSurface", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("times out on the socket it sent the eval to when another app says hello meanwhile", async () => {
    const first = new FakeSocket();
    const second = new FakeSocket();
    global.testConnection = { client: asWebSocket(first) };
    const response = new RemoteSurface().screen("GraphiteView");
    global.testConnection.client = asWebSocket(second);
    jest.advanceTimersByTime(30 * 1000);
    await expect(response).rejects.toThrow("eval timed out");
    expect(first.sent).toHaveLength(1);
    expect(first.listenerCount("message")).toBe(0);
    expect(second.listenerCount("message")).toBe(0);
  });

  it("drops a reply that comes after its request timed out", async () => {
    const socket = new FakeSocket();
    global.testConnection = { client: asWebSocket(socket) };
    const surface = new RemoteSurface();
    const first = surface.eval(() => "first");
    const timedOut = await expect(first).rejects.toThrow("eval timed out");
    await jest.advanceTimersByTimeAsync(30 * 1000);
    await timedOut;
    const second = surface.eval(() => "second");
    await Promise.resolve();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const [firstRequest, secondRequest] = socket.sent;
    socket.emit("message", reply(firstRequest, "first"));
    socket.emit("message", reply(secondRequest, "second"));
    await expect(second).resolves.toBe("second");
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(socket.listenerCount("message")).toBe(0);
  });

  it("rejects with the error the device reports for its request", async () => {
    const socket = new FakeSocket();
    global.testConnection = { client: asWebSocket(socket) };
    const response = new RemoteSurface().eval(() => {
      throw new Error("boom");
    });
    await Promise.resolve();
    const { $$id } = JSON.parse(socket.sent[0]);
    socket.emit(
      "message",
      Buffer.from(JSON.stringify({ $$id, $$error: "boom" }))
    );
    await expect(response).rejects.toThrow("boom");
  });

  it("rejects without arming its timeout while no app has said hello", async () => {
    global.testConnection = { client: null };
    await expect(new RemoteSurface().screen("GraphiteView")).rejects.toThrow(
      "Client is not connected"
    );
    expect(jest.getTimerCount()).toBe(0);
  });
});
