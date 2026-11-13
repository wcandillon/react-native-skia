import { EventEmitter } from "events";

import type { WebSocket } from "ws";

import { CALL_TIMEOUT_MS, Channel } from "./e2e/setup/Channel";
import { RemoteSurface } from "./setup";

class FakeSocket extends EventEmitter {
  readonly sent: string[] = [];
  send(body: string) {
    this.sent.push(body);
  }
}

const channelOn = (socket: FakeSocket) =>
  new Channel(socket as unknown as WebSocket);

describe("RemoteSurface", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends a screen request by name", async () => {
    const socket = new FakeSocket();
    const channel = channelOn(socket);
    global.testConnection = { channel };
    const response = new RemoteSurface().screen("GraphiteView");
    await Promise.resolve();
    expect(JSON.parse(socket.sent[0])).toEqual({
      id: 1,
      method: "screen",
      params: { name: "GraphiteView" },
    });
    channel.close();
    await expect(response).rejects.toThrow("screen failed");
  });

  it("times out on the socket it sent the call to when another app says hello meanwhile", async () => {
    const first = new FakeSocket();
    const second = new FakeSocket();
    global.testConnection = { channel: channelOn(first) };
    const response = new RemoteSurface().screen("GraphiteView");
    global.testConnection.channel = channelOn(second);
    jest.advanceTimersByTime(CALL_TIMEOUT_MS);
    await expect(response).rejects.toThrow("screen timed out");
    expect(first.sent).toHaveLength(1);
    expect(second.sent).toHaveLength(0);
  });

  it("rejects without arming its timeout while no app has said hello", async () => {
    global.testConnection = { channel: null };
    await expect(new RemoteSurface().screen("GraphiteView")).rejects.toThrow(
      "Client is not connected"
    );
    expect(jest.getTimerCount()).toBe(0);
  });
});
