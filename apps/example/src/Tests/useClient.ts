import { useEffect, useState } from "react";
import { Platform } from "react-native";

const { OS } = Platform;
const ANDROID_WS_HOST = "localhost";
const IOS_WS_HOST = "localhost";
const HOST = OS === "android" ? ANDROID_WS_HOST : IOS_WS_HOST;
const PORT = Number(process.env.E2E_PORT ?? 4242);

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
      ws.send(JSON.stringify({ OS }));
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
