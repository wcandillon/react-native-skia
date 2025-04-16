/* eslint-disable no-eval */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Canvas,
  Group,
  makeImageFromView,
  Skia,
  useCanvasRef,
} from "@shopify/react-native-skia";
import type { RefObject } from "react";
import React, { useEffect, useRef, useState } from "react";
import { PixelRatio, Text, View } from "react-native";

import type { SerializedNode } from "./deserialize";
import { parseNode, parseProps } from "./deserialize";
import { Screens } from "./Screens";
import { useClient } from "./useClient";

export const CI = process.env.CI === "true";
const s = 3;
const scale = s / PixelRatio.get();
const size = 256 * scale;
const timeToDraw = CI ? 1500 : 500;

interface TestsProps {
  assets: { [key: string]: any };
}

export const Tests = ({ assets }: TestsProps) => {
  const viewRef = useRef<View>(null);
  const ref = useCanvasRef();
  const [client, hostname] = useClient();
  const [drawing, setDrawing] = useState<any>(null);
  const [screen, setScreen] = useState<any>(null);
  useEffect(() => {
    if (client !== null) {
      client.onmessage = (e) => {
        const tree: any = JSON.parse(e.data);
        if (tree.code) {
          client.send(
            JSON.stringify(
              eval(
                `(function Main() {
                  return (${tree.code})(this.Skia, this.ctx, this.size, this.scale);
                })`
              ).call({
                Skia,
                ctx: parseProps(tree.ctx, assets),
                size: size * PixelRatio.get(),
                scale: s,
              })
            )
          );
        } else if (typeof tree.screen === "string") {
          const Screen = Screens[tree.screen];
          if (!Screen) {
            throw new Error(`Unknown screen: ${tree.screen}`);
          }
          setScreen(React.createElement(Screen));
        } else {
          const node = parseNode(tree, assets);
          setDrawing(node as SerializedNode);
        }
      };
      return () => {
        client.close();
      };
    }
    return;
  }, [assets, client]);
  useEffect(() => {
    if (drawing) {
      const it = setTimeout(() => {
        if (ref.current) {
          ref.current
            .makeImageSnapshotAsync({
              x: 0,
              y: 0,
              width: size,
              height: size,
            })
            .then((image) => {
              if (image && client) {
                const data = image.encodeToBytes();
                client.send(data);
              }
            })
            .catch((e) => {
              console.error(e);
            });
        }
      }, timeToDraw);
      return () => {
        clearTimeout(it);
      };
    }
    return;
  }, [client, drawing, ref]);
  useEffect(() => {
    if (screen) {
      const it = setTimeout(async () => {
        const image = await makeImageFromView(viewRef as RefObject<View>);
        if (image && client) {
          const data = image.encodeToBytes();
          client.send(data);
        }
      }, timeToDraw);
      return () => {
        clearTimeout(it);
      };
    }
    return;
  }, [client, screen]);
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <Text style={{ color: "black" }}>
        {client === null
          ? `⚪️ Connecting to ${hostname}. Use yarn e2e to run tests.`
          : "🟢 Waiting for the server to send tests"}
      </Text>
      <Canvas style={{ width: size, height: size }} ref={ref}>
        <Group transform={[{ scale }]}>{drawing}</Group>
      </Canvas>
      <View
        style={{ width: size, height: size }}
        ref={viewRef}
        collapsable={false}
      >
        {screen}
      </View>
    </View>
  );
};
