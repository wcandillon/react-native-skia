import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  BlurMask,
  Canvas,
  Circle,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

// index.web.js puts the CanvasKit instance on globalThis.
declare const CanvasKit: {
  HEAPU8: { length: number };
  Malloc: (typedArray: unknown, length: number) => { byteOffset: number };
  Free: (m: unknown) => void;
};

const SIZE = 320;
const GRID = 14; // 196 dots

/**
 * One continuously animated dot. Each frame allocates several short-lived
 * CanvasKit WASM objects per dot — a paint copy per draw command, a
 * pool-paint assign, the gradient shader, and the blur mask filter. These
 * used to leak (~4 MB/s for 196 dots at 60 fps) because nothing disposed
 * them and the JS GC can't see WASM heap pressure; the renderer now disposes
 * them explicitly, so this screen doubles as a live regression check that
 * the malloc high-water mark stays flat.
 */
const Dot = ({
  index,
  clock,
}: {
  index: number;
  clock: SharedValue<number>;
}) => {
  const col = index % GRID;
  const row = Math.floor(index / GRID);
  const cx = (col + 0.5) * (SIZE / GRID);
  const cy = (row + 0.5) * (SIZE / GRID);
  const r = useDerivedValue(
    () => 5 + 4 * Math.sin(Math.PI * 2 * (clock.value + index / (GRID * GRID)))
  );
  return (
    <Circle cx={cx} cy={cy} r={r}>
      <RadialGradient
        c={vec(cx, cy)}
        r={12}
        colors={["#00FFCC", "#00334400"]}
      />
      <BlurMask blur={3} style="normal" />
    </Circle>
  );
};

/** Allocate & free a block; its address tracks the top of the used heap. */
const probe = (size: number) => {
  const m = CanvasKit.Malloc(Uint8Array, size);
  const address = m.byteOffset;
  CanvasKit.Free(m);
  return address;
};

export const WebMemory = () => {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock]);

  const [stats, setStats] = useState("measuring...");
  const [log, setLog] = useState<string[]>([]);
  const [crash, setCrash] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") {
      setStats("web only — CanvasKit heap stats unavailable on native");
      return;
    }
    const t0 = Date.now();
    const onError = (e: ErrorEvent) => {
      setCrash(
        (prev) =>
          prev ??
          `CRASHED after ${Math.round((Date.now() - t0) / 1000)}s: ${String(
            e.message
          ).slice(0, 140)}`
      );
    };
    window.addEventListener("error", onError);
    const id = setInterval(() => {
      const t = Math.round((Date.now() - t0) / 1000);
      const reservedMb = CanvasKit.HEAPU8.length / 1048576;
      let highWater: string;
      try {
        highWater = (probe(4096) / 1048576).toFixed(1) + " MB";
      } catch {
        highWater = "malloc failed (heap exhausted)";
      }
      const line = `t=${String(t).padStart(
        3
      )}s   reserved heap: ${reservedMb.toFixed(
        0
      )} MB   malloc high-water: ${highWater}`;
      setStats(line);
      if (t % 5 === 0) {
        setLog((prev) => [...prev.slice(-19), line]);
      }
    }, 1000);
    return () => {
      clearInterval(id);
      window.removeEventListener("error", onError);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.stats}>{stats}</Text>
      {crash && <Text style={styles.crash}>{crash}</Text>}
      <Text style={styles.description}>
        196 animated dots allocate short-lived CanvasKit WASM objects on every
        frame. This used to leak ~4 MB/s until the page crashed; the renderer
        now disposes them, so the malloc high-water mark should stay flat. If it
        climbs steadily, a disposal regression has been introduced.
      </Text>
      <Canvas style={styles.canvas}>
        {Array.from({ length: GRID * GRID }, (_, i) => (
          <Dot key={i} index={i} clock={clock} />
        ))}
      </Canvas>
      {log.map((line, i) => (
        <Text key={i} style={styles.log}>
          {line}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  stats: {
    color: "#00FF66",
    fontFamily: "monospace",
    fontSize: 16,
  },
  crash: {
    color: "#FF3344",
    fontFamily: "monospace",
    fontSize: 16,
    marginTop: 4,
  },
  description: {
    color: "#888888",
    fontFamily: "monospace",
    fontSize: 12,
    marginVertical: 8,
  },
  canvas: {
    width: SIZE,
    height: SIZE,
    backgroundColor: "#000000",
  },
  log: {
    color: "#557755",
    fontFamily: "monospace",
    fontSize: 12,
  },
});
