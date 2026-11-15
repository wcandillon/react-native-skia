import { EventEmitter } from "events";

import type { WebSocket } from "ws";

import type { Request } from "./e2e/setup/Channel";
import { CALL_TIMEOUT_MS, Channel } from "./e2e/setup/Channel";

class FakeSocket extends EventEmitter {
  readonly sent: Request[] = [];
  send(body: string) {
    this.sent.push(JSON.parse(body));
  }
  // What the example app sends back (apps/example/src/Tests/serve.ts).
  reply(request: Request, answer: { result: unknown } | { error: string }) {
    this.emit(
      "message",
      Buffer.from(JSON.stringify({ id: request.id, ...answer }))
    );
  }
}

const open = () => {
  const socket = new FakeSocket();
  const channel = new Channel(socket as unknown as WebSocket);
  return { socket, channel };
};

describe("Channel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("sends a call as a request with its own id", () => {
    const { socket, channel } = open();
    channel.call("draw", { type: "Fill" }).catch(() => {});
    channel.call("screen", { name: "GraphiteView" }).catch(() => {});
    expect(socket.sent).toEqual([
      { id: 1, method: "draw", params: { type: "Fill" } },
      { id: 2, method: "screen", params: { name: "GraphiteView" } },
    ]);
    channel.close();
  });

  it("hands each reply to the call it names, in whatever order they come", async () => {
    const { socket, channel } = open();
    const first = channel.call("eval");
    const second = channel.call("eval");
    socket.reply(socket.sent[1], { result: "second" });
    socket.reply(socket.sent[0], { result: "first" });
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(channel.awaiting).toBe(0);
  });

  it("rejects with the error the app reports for its call", async () => {
    const { socket, channel } = open();
    const response = channel.call("eval");
    socket.reply(socket.sent[0], { error: "boom" });
    await expect(response).rejects.toThrow("boom");
  });

  it("drops a reply that comes after its call timed out", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { socket, channel } = open();
    const first = channel.call("eval");
    jest.advanceTimersByTime(CALL_TIMEOUT_MS);
    await expect(first).rejects.toThrow("eval timed out");
    const second = channel.call("eval");
    socket.reply(socket.sent[0], { result: "first" });
    socket.reply(socket.sent[1], { result: "second" });
    await expect(second).resolves.toBe("second");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("drops a reply it can't read", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { socket, channel } = open();
    const response = channel.call("eval");
    socket.emit("message", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    socket.reply(socket.sent[0], { result: 42 });
    await expect(response).resolves.toBe(42);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("fails the calls it awaits as soon as the socket closes", async () => {
    const { socket, channel } = open();
    const response = channel.call("screen");
    socket.emit("close");
    await expect(response).rejects.toThrow("screen failed");
    expect(jest.getTimerCount()).toBe(0);
    expect(socket.listenerCount("message")).toBe(0);
    expect(socket.listenerCount("close")).toBe(0);
  });

  it("listens to its socket once, however many calls it awaits", () => {
    const { socket, channel } = open();
    for (let i = 0; i < 3; i++) {
      channel.call("eval").catch(() => {});
    }
    expect(socket.listenerCount("message")).toBe(1);
    channel.close();
  });
});
