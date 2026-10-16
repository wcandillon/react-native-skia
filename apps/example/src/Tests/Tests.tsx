/* eslint-disable @typescript-eslint/no-explicit-any */
import { Canvas, Group, Skia, useCanvasRef } from "react-native-skia";
import { importDevice } from "react-native-webgpu";
import React, { useEffect, useRef, useState } from "react";
import { PixelRatio, Text, View } from "react-native";

import type { SerializedNode } from "./deserialize";
import { parseNode, parseProps } from "./deserialize";
import { Screens } from "./Screens";
import { useClient } from "./useClient";
import { workletSerialization } from "./workletSerialization";

export const CI = process.env.CI === "true";
const s = 3;
const scale = s / PixelRatio.get();
const size = 256 * scale;
const timeToDraw = CI ? 1500 : 500;

// Report a failure back to the host as { $$error: message } so the matching
// test can `.rejects` instead of hanging on a missing reply, and so the throw
// is not surfaced as an unhandled exception that could break the socket for
// subsequent tests.
const errorEnvelope = (error: unknown) =>
  JSON.stringify({
    $$error: error instanceof Error ? error.message : String(error),
  });

// The encoded pixels of a native view: React Native WebGPU rasterizes the view
// into a texture of the shared device, and Skia wraps that texture. This is
// the one way to snapshot a view with Skia v3 (see docs/webgpu#view-snapshots).
let sharedDevice: GPUDevice | null = null;
const encodeView = async (view: React.RefObject<View | null>) => {
  if (sharedDevice === null) {
    sharedDevice = importDevice(Skia.getNativeDevice());
  }
  const device = sharedDevice;
  const pixels = Math.round(size * PixelRatio.get());
  const texture = device.createTexture({
    size: [pixels, pixels],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING,
  });
  try {
    // Skia wraps textures as premultiplied images.
    await device.queue.drawElementImageToTexture(
      { source: view },
      { texture, premultipliedAlpha: true }
    );
    const image = Skia.Image.MakeImageFromGPUTexture(texture);
    try {
      return image.encodeToBytes();
    } finally {
      image.dispose();
    }
  } finally {
    texture.destroy();
  }
};

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
      // Define the message handler as a separate function
      const handleMessage = (e: MessageEvent) => {
        const tree: any = JSON.parse(e.data);
        if (tree.code) {
          try {
            const result = eval(
              `(function Main() {
                  const __addDisposableResource = (e, o) => { return o; };
                  const __disposeResources = () => {};
                  return (${tree.code})(this.Skia, this.ctx, this.size, this.scale);
                })`
            ).call({
              Skia,
              // The worklet serializer spec needs app-side worklets (see
              // workletSerialization.ts); hand them over through the context.
              ctx: { ...parseProps(tree.ctx, assets), workletSerialization },
              size: size * PixelRatio.get(),
              scale: s,
            });
            if (result instanceof Promise) {
              result
                .then((r) => client.send(JSON.stringify(r)))
                .catch((error) => client.send(errorEnvelope(error)));
            } else {
              client.send(JSON.stringify(result));
            }
          } catch (error) {
            client.send(errorEnvelope(error));
          }
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

      // Use addEventListener instead of onmessage
      client.addEventListener("message", handleMessage);

      // Clean up: remove the specific event listener
      return () => {
        client.removeEventListener("message", handleMessage);
      };
    }
    return;
  }, [assets, client]);

  useEffect(() => {
    if (drawing && client) {
      const it = setTimeout(() => {
        if (ref.current) {
          try {
            const image = ref.current.makeImageSnapshot({
              x: 0,
              y: 0,
              width: size,
              height: size,
            });
            client.send(image.encodeToBytes());
          } catch (e) {
            console.error(e);
            client.send(errorEnvelope(e));
          }
        }
      }, timeToDraw);
      return () => {
        clearTimeout(it);
      };
    }
    return;
  }, [client, drawing, ref]);

  useEffect(() => {
    if (screen && client) {
      const it = setTimeout(async () => {
        try {
          client.send(await encodeView(viewRef));
        } catch (e) {
          console.error(e);
          client.send(errorEnvelope(e));
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
