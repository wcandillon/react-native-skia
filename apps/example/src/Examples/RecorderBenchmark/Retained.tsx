import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { Canvas, useCanvasRef } from "react-native-skia";

import {
  ANIMATION_SECONDS,
  COMMITS,
  SETTLE_MS,
  getStats,
  measureFps,
  profiledCommits,
  sleep,
  summarize,
} from "./Runner";
import type { ModeResult } from "./Runner";
import { Scene, makeScene, useAnimatedValues } from "./Scene";

export interface BenchProps {
  n: number;
  onDone: (result: ModeResult) => void;
  onStatus: (status: string) => void;
}

/**
 * The current recorder: <Canvas> records the scene graph into the native
 * recorder on every commit, the mapper reads the shared values into it on
 * the UI thread, and the render thread pool replays it.
 *
 * Measured: the commit (visit and installRecording, through the
 * __RNSkiaCommitTimings hook), the JSI calls, property probes and
 * allocations of one commit (the native counters), the mapper
 * (readUpdates) and the replay (play, with its shader, path and paint copy
 * shares) while the scene animates, and the frame rate. A Hermes sampling
 * profile of a loop of commits is written to the Documents folder.
 */
export const RetainedBench = ({ n, onDone, onStatus }: BenchProps) => {
  const { width, height } = useWindowDimensions();
  const nodes = React.useMemo(
    () => makeScene(n, width, height - 160),
    [n, width, height]
  );
  const values = useAnimatedValues(nodes, true);
  const ref = useCanvasRef();
  const [variant, setVariant] = useState(0);
  const commitResolve = useRef<(() => void) | null>(null);

  // A commit of the whole scene: the variant flips one static node.
  const commit = useCallback(
    () =>
      new Promise<void>((resolve) => {
        commitResolve.current = resolve;
        setVariant((v) => (v === 0 ? 1 : 0));
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const stats = getStats();
      const notes: string[] = [];
      if (!stats) {
        notes.push(
          "__RNSkiaRecorderStats is missing: rebuild with RNSKIA_RECORDER_STATS=1"
        );
      }
      onStatus(`retained n=${n}: settling`);
      await sleep(SETTLE_MS);
      if (cancelled) {
        return;
      }
      // 1. Commit time.
      onStatus(`retained n=${n}: ${COMMITS} commits`);
      const visitMs: number[] = [];
      const installMs: number[] = [];
      globalThis.__RNSkiaCommitTimings = (visit, install) => {
        visitMs.push(visit);
        installMs.push(install);
        const resolve = commitResolve.current;
        commitResolve.current = null;
        resolve?.();
      };
      for (let i = 0; i < COMMITS; i++) {
        await commit();
        await sleep(40);
      }
      // 2. The counters of one commit, three times.
      const counts: Record<string, number[]> = {};
      if (stats) {
        for (let i = 0; i < 3; i++) {
          stats.reset();
          await commit();
          // The mapper's first run reads every shared value right after
          // the commit: give it a frame so that its probes are in too.
          await sleep(40);
          const { counters, mapperCounters, timers } = stats.snapshot();
          Object.entries(counters).forEach(([key, value]) => {
            (counts[key] ??= []).push(value);
          });
          // The animation goes on meanwhile: the mapper ran once per
          // readUpdates sample, so its counters are given per run.
          const runs = Math.max(1, timers.readUpdates.length);
          Object.entries(mapperCounters).forEach(([key, value]) => {
            (counts[`mapper.${key}`] ??= []).push(value / runs);
          });
        }
      }
      // 3. A sampling profile of a loop of commits.
      let profile: string | null = null;
      if (stats) {
        const profiled = profiledCommits(n);
        onStatus(`retained n=${n}: profiling ${profiled} commits`);
        if (stats.startProfiler(1000)) {
          for (let i = 0; i < profiled; i++) {
            await commit();
          }
          profile = stats.stopProfiler(`profile-retained-${n}.cpuprofile`);
        } else {
          notes.push("the Hermes sampling profiler is not available");
        }
      }
      globalThis.__RNSkiaCommitTimings = undefined;
      if (cancelled) {
        return;
      }
      // 4. The animation: mapper, replay and frame rate.
      onStatus(`retained n=${n}: animating ${ANIMATION_SECONDS}s`);
      await sleep(500);
      stats?.reset();
      const nativeId = ref.current?.getNativeId() ?? -1;
      const fps = await measureFps(nativeId, ANIMATION_SECONDS);
      const snapshot = stats?.snapshot();
      if (cancelled) {
        return;
      }
      const us = 1e-3;
      onDone({
        mode: "retained",
        n,
        timings: {
          commitVisit: summarize(visitMs),
          commitInstall: summarize(installMs),
          commitTotal: summarize(visitMs.map((v, i) => v + installMs[i])),
          mapperReadUpdates: summarize(snapshot?.timers.readUpdates ?? [], us),
          replayPlay: summarize(snapshot?.timers.play ?? [], us),
          replayShaders: summarize(snapshot?.timers.shaders ?? [], us),
          replayPaths: summarize(snapshot?.timers.paths ?? [], us),
          replayPaintCopies: summarize(snapshot?.timers.paintCopies ?? [], us),
        },
        counts: Object.fromEntries(
          Object.entries(counts).map(([key, samples]) => [
            key,
            summarize(samples)?.median ?? 0,
          ])
        ),
        fps,
        fpsSeconds: ANIMATION_SECONDS,
        notes,
        profile,
      });
    };
    run();
    return () => {
      cancelled = true;
      globalThis.__RNSkiaCommitTimings = undefined;
    };
    // Runs once per mount: the screen remounts it for every run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Canvas ref={ref} style={styles.canvas}>
      <Scene
        nodes={nodes}
        values={values}
        transformMode="derived"
        variant={variant}
      />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#0b1020" },
});
