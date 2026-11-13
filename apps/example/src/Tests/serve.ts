// The app's side of the e2e protocol, whose host side is
// packages/skia/src/renderer/__tests__/e2e/setup/Channel.ts. The host calls a
// method: { id, method, params }. The app answers with what the method
// resolves to, { id, result }, or with what it throws, { id, error }, so that
// the matching test can `.rejects` instead of waiting for a reply that never
// comes, and so that the throw is not an unhandled exception that could break
// the socket for the cases after it. Both are JSON text.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Methods = Record<string, (params: any) => unknown>;

const answer = async (methods: Methods, method: string, params: unknown) => {
  const fn = methods[method];
  if (fn === undefined) {
    throw new Error(`Unknown method: ${method}`);
  }
  const result = await fn(params);
  // JSON.stringify returns undefined for a result JSON cannot carry:
  // undefined, a function, a symbol.
  if (JSON.stringify(result) === undefined) {
    throw new Error(`The result has no JSON form: ${typeof result}`);
  }
  return result;
};

// Answers the host's calls on the socket until the returned function is
// called.
export const serve = (socket: WebSocket, methods: Methods) => {
  const onMessage = async (e: MessageEvent) => {
    const { id, method, params } = JSON.parse(e.data);
    let reply: string;
    try {
      reply = JSON.stringify({
        id,
        result: await answer(methods, method, params),
      });
    } catch (error) {
      reply = JSON.stringify({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // The host may be gone by now (the run ended, or the app reconnected).
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(reply);
    }
  };
  socket.addEventListener("message", onMessage);
  return () => socket.removeEventListener("message", onMessage);
};
