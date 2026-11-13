import type { ComponentRef, ReactElement } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Canvas, Group, Skia, useCanvasRef } from "react-native-skia";
import React, { useEffect, useRef, useState } from "react";
import { PixelRatio, Text, View } from "react-native";

import { parseNode, parseProps } from "./deserialize";
import { forceGpuDeviceLoss, getSharedDevice } from "./GpuDevice";
import { ScreenDoneContext } from "./ScreenDone";
import type { Screen } from "./Screens";
import { Screens } from "./Screens";
import { serve } from "./serve";
import { useClient } from "./useClient";
import { workletSerialization } from "./workletSerialization";

export const CI = process.env.CI === "true";
const s = 3;
const scale = s / PixelRatio.get();
const size = 256 * scale;
const timeToDraw = CI ? 1500 : 500;
const noop = () => {};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// A buffer of the device Skia renders with, mapped as it is made, which tells
// a destroyed device from a lost one (the Gpu spec): Dawn unmaps the buffers
// of a destroyed device, and a loss alone leaves them mapped.
let mappedBuffer: GPUBuffer | null = null;
const mapGpuBuffer = () => {
  mappedBuffer = getSharedDevice().createBuffer({
    size: 4,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
};
const mappedGpuBufferState = () => mappedBuffer?.mapState ?? null;

// Runs a snippet the host sent, with the app's Skia.
const evaluate = (
  { code, ctx }: { code: string; ctx: any },
  assets: TestsProps["assets"],
  setCanvasShown: (canvasShown: boolean) => void
) =>
  eval(
    `(function Main() {
        const __addDisposableResource = (e, o) => { return o; };
        const __disposeResources = () => {};
        return (${code})(this.Skia, this.ctx, this.size, this.scale);
      })`
  ).call({
    Skia,
    // The worklet serializer spec needs app-side worklets (see
    // workletSerialization.ts), and the Gpu spec a way to lose the device, to
    // tell whether it was destroyed and to unmount the harness's canvas; hand
    // them over through the context.
    ctx: {
      ...parseProps(ctx, assets),
      workletSerialization,
      forceGpuDeviceLoss,
      mapGpuBuffer,
      mappedGpuBufferState,
      hideCanvas: () => setCanvasShown(false),
      showCanvas: () => setCanvasShown(true),
    },
    size: size * PixelRatio.get(),
    scale: s,
  });

// The encoded pixels of a native view: React Native WebGPU rasterizes the view
// into a texture of the shared device, and Skia wraps that texture. This is
// the one way to snapshot a view with Skia v3 (see docs/webgpu#view-snapshots).
const encodeView = async (
  view: React.RefObject<ComponentRef<typeof View> | null>
) => {
  const device = getSharedDevice();
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
    const image = Skia.Image.MakeFromGPUTexture(texture);
    try {
      return image.encodeToBase64();
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
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const ref = useCanvasRef();
  const [client, hostname] = useClient();
  const [drawing, setDrawing] = useState<ReactElement | null>(null);
  // The screen shown, the key it is mounted with, and what it calls once it
  // has settled (see useScreenDone). Requested again, a screen that settles is
  // mounted again, so that it settles again; any other keeps its instance and
  // what it shows.
  const [shown, setShown] = useState<{
    readonly screen: Screen;
    readonly key: number;
    readonly done: () => void;
  } | null>(null);
  const screenMounts = useRef(0);
  // The harness's own canvas holds a window on the GPU device: the Gpu spec
  // unmounts it while it loses a device no window holds, and mounts it again
  // after. A drawing mounts it too, as it draws in it.
  const [canvasShown, setCanvasShown] = useState(true);

  useEffect(() => {
    if (client === null) {
      return;
    }
    return serve(client, {
      eval: (params) => evaluate(params, assets, setCanvasShown),
      draw: async (tree) => {
        setDrawing(parseNode(tree, assets));
        setCanvasShown(true);
        await sleep(timeToDraw);
        if (ref.current === null) {
          throw new Error("The canvas is not mounted");
        }
        return ref.current
          .makeImageSnapshot({ x: 0, y: 0, width: size, height: size })
          .encodeToBase64();
      },
      screen: async ({ name }: { name: string }) => {
        const screen = Screens[name];
        if (!screen) {
          throw new Error(`Unknown screen: ${name}`);
        }
        if (screen.snapshot === "onDone") {
          screenMounts.current += 1;
        }
        const key = screenMounts.current;
        const done = new Promise<void>((resolve) =>
          setShown({ screen, key, done: resolve })
        );
        if (screen.snapshot === "onDone") {
          await done;
        }
        await sleep(timeToDraw);
        return encodeView(viewRef);
      },
    });
  }, [assets, client, ref]);

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <Text style={{ color: "black" }}>
        {client === null
          ? `⚪️ Connecting to ${hostname}. Use yarn e2e to run tests.`
          : "🟢 Waiting for the server to send tests"}
      </Text>
      {canvasShown ? (
        <Canvas style={{ width: size, height: size }} ref={ref}>
          <Group transform={[{ scale }]}>{drawing}</Group>
        </Canvas>
      ) : null}
      <View
        style={{ width: size, height: size }}
        ref={viewRef}
        collapsable={false}
      >
        <ScreenDoneContext.Provider value={shown?.done ?? noop}>
          {shown === null
            ? null
            : React.createElement(shown.screen.component, { key: shown.key })}
        </ScreenDoneContext.Provider>
      </View>
    </View>
  );
};
