import type { WebSocket } from "ws";

// The e2e protocol between this host and the example app's Tests screen, whose
// side is apps/example/src/Tests/serve.ts. The host calls a method of the app;
// the request carries an id, and the app's reply names the request it
// answers. Both are JSON text, so an image travels as a base64 PNG.
export interface Request {
  readonly id: number;
  readonly method: string;
  readonly params: unknown;
}

export type Reply =
  | { readonly id: number; readonly result: unknown }
  | { readonly id: number; readonly error: string };

interface Pending {
  readonly method: string;
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

// Guards against a call that never gets its reply (the app crashed, or threw
// before it could answer): without it the host would await forever and a
// single failing case would stall the whole serial suite.
export const CALL_TIMEOUT_MS = 30 * 1000;

const parseReply = (raw: unknown): Reply | null => {
  try {
    const reply = JSON.parse(String(raw));
    if (typeof reply?.id !== "number") {
      return null;
    }
    return "error" in reply
      ? { id: reply.id, error: String(reply.error) }
      : { id: reply.id, result: reply.result };
  } catch {
    return null;
  }
};

// The calls made to one app over one socket. It listens to the socket once,
// for as long as the socket is open, and hands each reply to the call it
// names. A reply to a call that is no longer awaited (it timed out) is
// dropped, so that it can't be taken as the reply to a later call. The
// channel lives as long as its socket rather than as long as a test file, so
// a late reply to a previous file's call can't match either.
export class Channel {
  private lastId = 0;
  private readonly pending = new Map<number, Pending>();

  constructor(
    private readonly socket: WebSocket,
    private readonly timeoutMs = CALL_TIMEOUT_MS
  ) {
    socket.on("message", this.onMessage);
    socket.on("close", this.onClose);
  }

  call<R>(method: string, params: unknown = {}): Promise<R> {
    const id = ++this.lastId;
    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `${method} timed out after ${this.timeoutMs}ms without a reply from the app`
          )
        );
      }, this.timeoutMs);
      this.pending.set(id, {
        method,
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout,
      });
      const request: Request = { id, method, params };
      this.socket.send(JSON.stringify(request));
    });
  }

  // Fails the calls still awaited and stops listening to the socket.
  close(reason = "The connection to the app closed") {
    this.socket.off("message", this.onMessage);
    this.socket.off("close", this.onClose);
    for (const { method, reject, timeout } of this.pending.values()) {
      clearTimeout(timeout);
      reject(new Error(`${method} failed: ${reason}`));
    }
    this.pending.clear();
  }

  get awaiting() {
    return this.pending.size;
  }

  private readonly onMessage = (raw: unknown) => {
    const reply = parseReply(raw);
    const pending = reply === null ? undefined : this.pending.get(reply.id);
    if (reply === null || pending === undefined) {
      console.warn(
        `e2e: dropped a reply to request ${reply?.id ?? "?"}, which is not awaited`
      );
      return;
    }
    this.pending.delete(reply.id);
    clearTimeout(pending.timeout);
    if ("error" in reply) {
      pending.reject(new Error(reply.error));
    } else {
      pending.resolve(reply.result);
    }
  };

  private readonly onClose = () => this.close();
}
