import { useEffect, useState } from "react";
import { Platform } from "react-native";

const { OS } = Platform;
const ANDROID_WS_HOST = "10.0.2.2";
const IOS_WS_HOST = "localhost";
const HOST = OS === "android" ? ANDROID_WS_HOST : IOS_WS_HOST;
const PORT = 4242;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const arch = (global as any)?.nativeFabricUIManager ? "fabric" : "paper";

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
      }, 500);
    };
    return () => {
      ws.close();
      clearTimeout(it);
    };
  }, [retry]);
  return [client, HOST];
};
