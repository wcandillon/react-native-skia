import React, { useEffect, useState } from "react";
import {
  AppState,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { SkSurface } from "react-native-skia";
import { Canvas, Circle, Fill, Skia } from "react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { importDevice } from "react-native-webgpu";

// Reproduces wcandillon/react-native-skia#4290: GPU work submitted while the
// app is in the background. Two loops keep submitting without any timer, so
// they go on after the app has left the foreground (React Native pauses its
// timers there) until iOS suspends the process:
//
// - the Skia loop draws into an offscreen surface, flushes it and reads the
//   snapshot back (the readback settles from Skia's readback thread);
// - the WebGPU loop clears a texture on the device imported from Skia and
//   awaits onSubmittedWorkDone (settled from React Native WebGPU's waiter).
//
// A frame callback moves the disc below so a frozen canvas is visible, and the
// banner reads Skia.gpu twice a second. Swipe home for a few seconds and come
// back: with a Dawn that turns a refused command buffer into a device loss,
// "lost" counts up and the loops restart on a replacement device; with the
// hold patch, nothing is lost and the loops simply resume.
//
// The state is also exposed as globalThis.__bgGpu for a driver on the
// debugger (Metro's inspector proxy) to read.

interface LoopState {
  startedAt: number;
  skiaIterations: number;
  skiaErrors: number;
  skiaLastError: string | null;
  skiaPending: boolean;
  webgpuIterations: number;
  webgpuErrors: number;
  webgpuLastError: string | null;
  webgpuLost: string | null;
  webgpuPending: boolean;
  lostCount: number;
  lastLost: string | null;
  foregroundChanges: { t: number; foreground: boolean }[];
  appStateChanges: { t: number; state: string }[];
  // Iterations completed per second since start, to tell held from executed
  // work once the app is back: a held loop shows zeros for the background.
  skiaPerSecond: number[];
  webgpuPerSecond: number[];
}

const newState = (): LoopState => ({
  startedAt: Date.now(),
  skiaIterations: 0,
  skiaErrors: 0,
  skiaLastError: null,
  skiaPending: false,
  webgpuIterations: 0,
  webgpuErrors: 0,
  webgpuLastError: null,
  webgpuLost: null,
  webgpuPending: false,
  lostCount: 0,
  lastLost: null,
  foregroundChanges: [],
  appStateChanges: [],
  skiaPerSecond: [],
  webgpuPerSecond: [],
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const SIZE = 1024;
// Fragment iterations per pixel: tens of milliseconds of GPU time per command
// buffer, so that one is in flight whenever iOS revokes GPU access.
const HEAVY = 300;
// Command buffers queued per iteration: about half a second of GPU work is
// always queued, so some of it is still unscheduled when the app goes to the
// background, the case Apple's guidance (waitUntilScheduled) is about.
const SKIA_BURST = 10;
const WEBGPU_BURST = 20;

const heavyEffect = Skia.RuntimeEffect.Make(`
uniform float t;
half4 main(float2 xy) {
  float v = xy.x * 0.001 + t;
  for (int i = 0; i < ${HEAVY}; i++) {
    v = sin(v * 1.7 + xy.y * 0.0007) + cos(v);
  }
  return half4(half(v * 0.5 + 0.5), 0.3, 0.6, 1);
}`)!;

const heavyWGSL = `
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(p[i], 0, 1);
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  var v = pos.x * 0.001;
  for (var i = 0u; i < ${HEAVY}u; i++) {
    v = sin(v * 1.7 + pos.y * 0.0007) + cos(v);
  }
  return vec4f(v * 0.5 + 0.5, 0.3, 0.6, 1);
}`;

const tick = (state: LoopState, series: number[]) => {
  const second = Math.floor((Date.now() - state.startedAt) / 1000);
  series[second] = (series[second] ?? 0) + 1;
};

const dense = (series: number[]) => Array.from(series, (v) => v ?? 0);

const runSkiaLoop = async (state: LoopState, isActive: () => boolean) => {
  let surface: SkSurface | null = null;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  while (isActive()) {
    try {
      if (surface === null) {
        surface = Skia.Surface.MakeOffscreen(SIZE, SIZE);
        if (surface === null) {
          throw new Error("MakeOffscreen returned null");
        }
      }
      const canvas = surface.getCanvas();
      const i = state.skiaIterations;
      for (let k = 0; k < SKIA_BURST; k++) {
        paint.setShader(heavyEffect.makeShader([(i * SKIA_BURST + k) / 100]));
        canvas.drawRect(Skia.XYWHRect(0, 0, SIZE, SIZE), paint);
        surface.flush();
      }
      // A small region: the readback is the wait, not the work.
      const snapshot = surface.makeImageSnapshot(Skia.XYWHRect(0, 0, 16, 16));
      state.skiaPending = true;
      const raster = await snapshot.makeRasterImage();
      state.skiaPending = false;
      raster.dispose();
      snapshot.dispose();
      state.skiaIterations++;
      tick(state, state.skiaPerSecond);
    } catch (error) {
      state.skiaPending = false;
      state.skiaErrors++;
      state.skiaLastError = describe(error);
      // The surface may belong to a lost device: make a new one next time.
      surface?.dispose();
      surface = null;
      await sleep(250);
    }
  }
  surface?.dispose();
};

const runWebGPULoop = async (state: LoopState, isActive: () => boolean) => {
  let device: GPUDevice | null = null;
  let texture: GPUTexture | null = null;
  let pipeline: GPURenderPipeline | null = null;
  while (isActive()) {
    try {
      if (device === null) {
        const imported = importDevice(Skia.getNativeDevice());
        imported.lost.then((info) => {
          state.webgpuLost = `${info.reason}: ${info.message}`;
          if (device === imported) {
            device = null;
            texture = null;
            pipeline = null;
          }
        });
        device = imported;
        texture = imported.createTexture({
          size: [SIZE, SIZE],
          format: "rgba8unorm",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const module = imported.createShaderModule({ code: heavyWGSL });
        pipeline = imported.createRenderPipeline({
          layout: "auto",
          vertex: { module, entryPoint: "vs" },
          fragment: {
            module,
            entryPoint: "fs",
            targets: [{ format: "rgba8unorm" }],
          },
          primitive: { topology: "triangle-list" },
        });
      }
      const i = state.webgpuIterations;
      for (let k = 0; k < WEBGPU_BURST; k++) {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: texture!.createView(),
              loadOp: "clear",
              storeOp: "store",
              clearValue: { r: ((i + k) % 100) / 100, g: 0.2, b: 0.6, a: 1 },
            },
          ],
        });
        pass.setPipeline(pipeline!);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
      }
      state.webgpuPending = true;
      await device.queue.onSubmittedWorkDone();
      state.webgpuPending = false;
      state.webgpuIterations++;
      tick(state, state.webgpuPerSecond);
    } catch (error) {
      state.webgpuPending = false;
      state.webgpuErrors++;
      state.webgpuLastError = describe(error);
      device = null;
      texture = null;
      pipeline = null;
      await sleep(250);
    }
  }
};

const watchLosses = async (state: LoopState, isActive: () => boolean) => {
  while (isActive()) {
    const info = await Skia.gpu.lost;
    state.lostCount++;
    state.lastLost = JSON.stringify(info);
    console.log(`[bg-gpu] Skia.gpu.lost resolved: ${state.lastLost}`);
  }
};

const snapshot = (state: LoopState) => {
  const { gpu } = Skia;
  return {
    ...state,
    uptime: Date.now() - state.startedAt,
    skiaPerSecond: dense(state.skiaPerSecond),
    webgpuPerSecond: dense(state.webgpuPerSecond),
    gpu: {
      isAvailable: gpu.isAvailable,
      foreground: gpu.foreground,
      error: gpu.error,
      backend: gpu.backend,
    },
  };
};

export type BackgroundGpuSnapshot = ReturnType<typeof snapshot>;

export const BackgroundGpu = () => {
  const { width } = useWindowDimensions();
  const [view, setView] = useState<BackgroundGpuSnapshot | null>(null);
  const frames = useSharedValue(0);
  useFrameCallback(() => {
    frames.value += 1;
  });
  const cx = useDerivedValue(
    () => width / 2 + Math.sin(frames.value / 30) * (width / 2 - 40)
  );

  useEffect(() => {
    const state = newState();
    let active = true;
    const isActive = () => active;
    runSkiaLoop(state, isActive);
    runWebGPULoop(state, isActive);
    watchLosses(state, isActive);
    let { foreground } = Skia.gpu;
    const poll = () => {
      const current = snapshot(state);
      const next = current.gpu.foreground;
      if (next !== foreground) {
        foreground = next;
        state.foregroundChanges.push({ t: current.uptime, foreground });
      }
      setView(current);
    };
    const interval = setInterval(poll, 500);
    const appState = AppState.addEventListener("change", (next) => {
      state.appStateChanges.push({
        t: Date.now() - state.startedAt,
        state: next,
      });
    });
    const driver = {
      snapshot: () => ({ ...snapshot(state), uiFrames: frames.value }),
    };
    (globalThis as unknown as Record<string, unknown>).__bgGpu = driver;
    return () => {
      active = false;
      clearInterval(interval);
      appState.remove();
      delete (globalThis as unknown as Record<string, unknown>).__bgGpu;
    };
  }, [frames]);

  const info = view?.gpu;
  const lost = (view?.lostCount ?? 0) > 0;
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor:
              info?.isAvailable === false ? "#c0392b" : "#1dd1a1",
          },
        ]}
      >
        <Text style={styles.bannerText}>
          {info
            ? `GPU ${info.isAvailable ? "available" : "unavailable"} · ${
                info.foreground ? "foreground" : "background"
              } · lost ${view?.lostCount ?? 0}×`
            : "probing…"}
        </Text>
        {info?.error ? (
          <Text style={styles.bannerText}>{info.error}</Text>
        ) : null}
      </View>
      <Canvas style={styles.canvas}>
        <Fill color={lost ? "#2d1b1b" : "#0b1020"} />
        <Circle cx={cx} cy={60} r={30} color="#feca57" />
      </Canvas>
      <View style={styles.stats}>
        <Text style={styles.stat}>
          Skia offscreen loop: {view?.skiaIterations ?? 0} readbacks,{" "}
          {view?.skiaErrors ?? 0} errors
          {view?.skiaPending ? " (waiting)" : ""}
        </Text>
        {view?.skiaLastError ? (
          <Text style={styles.error}>{view.skiaLastError}</Text>
        ) : null}
        <Text style={styles.stat}>
          WebGPU loop on Skia's device: {view?.webgpuIterations ?? 0} submits,{" "}
          {view?.webgpuErrors ?? 0} errors
          {view?.webgpuPending ? " (waiting)" : ""}
        </Text>
        {view?.webgpuLost ? (
          <Text style={styles.error}>device.lost: {view.webgpuLost}</Text>
        ) : null}
        {view?.lastLost ? (
          <Text style={styles.error}>Skia.gpu.lost: {view.lastLost}</Text>
        ) : null}
        <Text style={styles.hint}>
          Swipe home, wait a few seconds, come back. The loops keep submitting
          GPU work until iOS suspends the app.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
  banner: { padding: 12 },
  bannerText: { color: "white", fontWeight: "600" },
  canvas: { height: 120 },
  stats: { padding: 16, gap: 8 },
  stat: { fontSize: 14, color: "#1c1c1e" },
  error: { fontSize: 12, color: "#c0392b" },
  hint: { fontSize: 12, color: "#6e6e73", marginTop: 8 },
});
