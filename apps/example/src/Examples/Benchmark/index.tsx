// The performance benchmark: runs a plan of scenes, one at a time, and logs
// one `[bench]` line per event for benchmarks/run.mjs, which pairs them with
// presented frames counted by the system compositor and CPU samples.
//
//   [bench] start scene=<s> rep=<n>    a scene mounted (pose follows)
//   [bench] pose scene=<s>             the scene sits at t=0: screenshot it
//   [bench] tick scene=<s> js=<n> ui=<n>   one per second, frames per thread
//   [bench] cool ms=<n>                no canvas, the device idles
//   [bench] done
//
// Thread FPS only says the JS and UI threads are free: Skia renders on its
// own threads, so what reaches the screen comes from the runner.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Easing,
  cancelAnimation,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Fill } from "react-native-skia";

import { BAKED_PLAN, type Scene } from "./plan";
import { BenchScene } from "./scenes";

// 3 s settle (pose at 2.5 s, rotation from 3.5 s) + 25 s measured.
const SCENE_MS = 28_000;
const POSE_MS = 2_500;
const ANIMATE_MS = 3_500;

export const Benchmark = () => {
  const plan = BAKED_PLAN;
  const runs = useRef(
    Array.from({ length: plan.reps }, (_, rep) =>
      plan.scenes.map((scene) => ({ scene, rep: rep + 1 }))
    ).flat()
  ).current;
  const [index, setIndex] = useState(0);
  const [cooling, setCooling] = useState(false);
  const done = index >= runs.length;
  const run = done ? null : runs[index];
  const scene: Scene | null = run?.scene ?? null;

  const t = useSharedValue(0);
  const uiFrames = useSharedValue(0);
  const jsFrames = useRef(0);

  useFrameCallback(() => {
    "worklet";
    uiFrames.value += 1;
  }, true);

  useEffect(() => {
    let alive = true;
    const loop = () => {
      jsFrames.current += 1;
      if (alive) {
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
    return () => {
      alive = false;
    };
  }, []);

  // A scene: frozen at t=0 for the pose, then rotating until the next one.
  useEffect(() => {
    if (run === null || cooling) {
      return;
    }
    console.log(`[bench] start scene=${run.scene} rep=${run.rep}`);
    cancelAnimation(t);
    t.value = 0;
    jsFrames.current = 0;
    uiFrames.value = 0;
    const timers = [
      setTimeout(() => console.log(`[bench] pose scene=${run.scene}`), POSE_MS),
      setTimeout(() => {
        t.value = withRepeat(
          withTiming(Math.PI * 2, { duration: 4000, easing: Easing.linear }),
          -1,
          false
        );
      }, ANIMATE_MS),
      setInterval(() => {
        console.log(
          `[bench] tick scene=${run.scene} js=${jsFrames.current} ui=${uiFrames.value}`
        );
        jsFrames.current = 0;
        uiFrames.value = 0;
      }, 1000),
      setTimeout(() => {
        if (plan.gapMs > 0 && index < runs.length - 1) {
          setCooling(true);
        } else {
          setIndex((i) => i + 1);
        }
      }, SCENE_MS),
    ];
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      cancelAnimation(t);
    };
  }, [run, cooling, index, plan.gapMs, runs.length, t, uiFrames]);

  // The gap: no canvas, the same idle time before every scene.
  useEffect(() => {
    if (!cooling) {
      return;
    }
    console.log(`[bench] cool ms=${plan.gapMs}`);
    const timer = setTimeout(() => {
      setCooling(false);
      setIndex((i) => i + 1);
    }, plan.gapMs);
    return () => clearTimeout(timer);
  }, [cooling, plan.gapMs]);

  useEffect(() => {
    if (done) {
      console.log("[bench] done");
    }
  }, [done]);

  if (done || cooling || scene === null) {
    return (
      <View style={styles.root}>
        <Text style={styles.label}>{done ? "bench done" : "cooling"}</Text>
      </View>
    );
  }
  const view = plan.backing === "texture" ? "TextureView" : "SurfaceView";
  return (
    <View style={styles.root}>
      <Canvas
        // A fresh canvas per run, like a screen that mounts one.
        key={index}
        style={StyleSheet.absoluteFill}
        android={{ backingView: view, opaque: true }}
      >
        <Fill color="#101014" />
        <BenchScene scene={scene} t={t} />
      </Canvas>
      <Text style={styles.label}>{`${scene} · ${run!.rep}/${plan.reps}`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#101014" },
  label: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    color: "#ffffff88",
    fontSize: 12,
  },
});
