import { Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const { OS } = Platform;
const ANDROID_WS_HOST = "10.0.2.2";
const IOS_WS_HOST = "localhost";
const HOST = OS === "android" ? ANDROID_WS_HOST : IOS_WS_HOST;
const PORT = 4242;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const arch = (global as any)?.nativeFabricUIManager ? "fabric" : "paper";
// Whether this Skia build runs the Graphite backend. Probed via
// getNativeDevice(), which throws on Ganesh builds — checking navigator.gpu
// would only tell us react-native-webgpu is installed, which can be true on
// a non-Graphite build. Reported to the test server so it can gate
// Graphite-only specs.
const graphite = (() => {
  try {
    return typeof Skia.getNativeDevice() === "bigint";
  } catch {
    return false;
  }
})();

type UseClient = [client: WebSocket | null, hostname: string];
export const useClient = (): UseClient => {
  const [client, setClient] = useState<WebSocket | null>(null);
  const [retry, setRetry] = useState<number>(0);

  useEffect(() => {
    const url = `ws://${HOST}:${PORT}`;
    let it: ReturnType<typeof setTimeout>;
    const ws = new WebSocket(url);
    ws.onopen = () => {
      setClient(ws);
      ws.send(
        JSON.stringify({
          OS,
          arch,
          graphite,
        })
      );
    };
    ws.onclose = () => {
      setClient(null);
    };
    ws.onerror = () => {
      it = setTimeout(() => {
        ws.close();
        // incrementing retry to rerun the effect
        setRetry((r) => r + 1);
      }, 1000);
    };
    return () => {
      ws.close();
      clearTimeout(it);
    };
  }, [retry]);
  return [client, HOST];
};
