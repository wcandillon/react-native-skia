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

  it("rejects without arming its timeout while no app has said hello", async () => {
    global.testConnection = { client: null };
    await expect(new RemoteSurface().screen("GraphiteView")).rejects.toThrow(
      "Client is not connected"
    );
    expect(jest.getTimerCount()).toBe(0);
  });
});
