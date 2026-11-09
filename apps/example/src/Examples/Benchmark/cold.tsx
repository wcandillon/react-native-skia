// Cold mode of the benchmark (mode=cold, see plan.ts): what the first draw
// of a canvas costs the UI thread. On a fresh install nothing is cached, so
// the first present of a scene waits for its pipelines to compile; where the
// view presents on the main thread, that wait freezes every animation of the
// app (https://github.com/wcandillon/react-native-skia/issues/4384).
//
// After `settle` seconds with no canvas, each scene of the plan mounts for
// MEASURE_MS (its first draw in this process), unmounts, and mounts again
// (the pipelines are compiled by then). For each mount the screen logs the
// longest gap between two frames of the UI thread, from a frame callback
// that runs on the main thread on iOS:
//
//   [bench] cold-start settle=<ms>
//   [bench] mount scene=<s> kind=first|warm gap=<ms>
//   [bench] done
//
// The scenes run in the plan's order in one process, so a later scene finds
// the pipelines it shares with an earlier one compiled: the first scene of
// the plan is the only one entirely cold. The order is the same on every
// run, which is what a comparison needs. benchmarks/run.mjs installs the app
// again before every rep.
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Canvas, Fill } from "react-native-skia";

import type { Plan, Scene } from "./plan";
import { BenchScene } from "./scenes";

const MEASURE_MS = 5_000;
const PAUSE_MS = 1_000;

// React Native's console.log does not reach the system log in an iOS Release
// build; console.error does (RCTLog, os_log at the error level).
const emit = (line: string) =>
  Platform.OS === "ios" ? console.error(line) : console.log(line);

type Step = { scene: Scene; kind: "first" | "warm" } | null;

export const ColdMount = ({ plan }: { plan: Plan }) => {
  const [step, setStep] = useState<Step>(null);
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  const longest = useSharedValue(0);

  useFrameCallback((frame) => {
    "worklet";
    const gap = frame.timeSincePreviousFrame;
    if (gap !== null && gap > longest.value) {
      longest.value = gap;
    }
  }, true);

  useEffect(() => {
    emit(`[bench] cold-start settle=${plan.settleMs}`);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = plan.settleMs;
    for (const scene of plan.scenes) {
      for (const kind of ["first", "warm"] as const) {
        timers.push(
          setTimeout(() => {
            longest.value = 0;
            setStep({ scene, kind });
          }, at)
        );
        at += MEASURE_MS;
        timers.push(
          setTimeout(() => {
            emit(
              `[bench] mount scene=${scene} kind=${kind} gap=${Math.round(
                longest.value
              )}`
            );
            setStep(null);
          }, at)
        );
        at += PAUSE_MS;
      }
    }
    timers.push(
      setTimeout(() => {
        emit("[bench] done");
        setDone(true);
      }, at)
    );
    return () => timers.forEach(clearTimeout);
  }, [plan, longest]);

  const view = plan.backing === "texture" ? "TextureView" : "SurfaceView";
  let label = "cold: no canvas";
  if (done) {
    label = "bench done";
  } else if (step !== null) {
    label = `cold: ${step.scene} (${step.kind} mount)`;
  }
  return (
    <View style={styles.root}>
      {step !== null && (
        <Canvas
          key={`${step.scene}-${step.kind}`}
          style={StyleSheet.absoluteFill}
          android={{ backingView: view, opaque: true }}
        >
          <Fill color="#101014" />
          <BenchScene scene={step.scene} t={t} />
        </Canvas>
      )}
      <Text style={styles.label}>{label}</Text>
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
