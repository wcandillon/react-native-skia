import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { __experimental } from "react-native-skia";
import type {
  CommandBufferCanvasRef,
  CommandBufferCommit,
} from "react-native-skia";

import {
  ANIMATION_SECONDS,
  COMMITS,
  SETTLE_MS,
  getStats,
  measureFps,
  sleep,
  summarize,
} from "./Runner";
import { Scene, makeScene, useAnimatedValues } from "./Scene";
import type { TransformMode } from "./Scene";
import type { BenchProps } from "./Retained";

export interface CommandBufferBenchProps extends BenchProps {
  mode: "interpreted" | "picture";
  transformMode: TransformMode;
}

const { CommandBufferCanvas } = __experimental;

/**
 * The prototype: the same React tree, compiled in TypeScript into a command
 * buffer at commit time; a mapper writes the shared values into the slots of
 * the buffer on the UI thread and asks the view for a frame; the render
 * thread interprets the buffer on the deferred canvas, or draws it as a
 * picture made again when the buffer changed.
 *
 * Measured: the commit (compile and install), the mapper, the replay (and
 * the share of it spent making the picture again) and the frame rate.
 */
export const CommandBufferBench = ({
  n,
  mode,
  transformMode,
  onDone,
  onStatus,
}: CommandBufferBenchProps) => {
  const { width, height } = useWindowDimensions();
  const nodes = React.useMemo(
    () => makeScene(n, width, height - 160),
    [n, width, height]
  );
  const values = useAnimatedValues(nodes, true);
  const ref = useRef<CommandBufferCanvasRef>(null);
  const [variant, setVariant] = useState(0);
  const commitResolve = useRef<(() => void) | null>(null);
  const commits = useRef<CommandBufferCommit[]>([]);

  const onCommit = useCallback((commit: CommandBufferCommit) => {
    commits.current.push(commit);
    const resolve = commitResolve.current;
    commitResolve.current = null;
    resolve?.();
  }, []);

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
    const name = `commandBuffer-${mode}-${transformMode}`;
    const run = async () => {
      const stats = getStats();
      const notes: string[] = [];
      onStatus(`${name} n=${n}: settling`);
      await sleep(SETTLE_MS);
      if (cancelled) {
        return;
      }
      // The first commit, cold: it made every paint and shader.
      const cold = commits.current[0];
      if (cold) {
        notes.push(
          `first commit: ${cold.compileMs.toFixed(2)}ms compile, ${cold.paintsCreated} paints and ${cold.shadersCreated} shaders made, ${cold.count} floats, ${cold.bindings} bindings`
        );
      }
      onStatus(`${name} n=${n}: ${COMMITS} commits`);
      commits.current = [];
      for (let i = 0; i < COMMITS; i++) {
        await commit();
        await sleep(40);
      }
      const warm = commits.current;
      if (cancelled) {
        return;
      }
      onStatus(`${name} n=${n}: animating ${ANIMATION_SECONDS}s`);
      await sleep(500);
      stats?.reset();
      const nativeId = ref.current?.getNativeId() ?? -1;
      const fps = await measureFps(nativeId, ANIMATION_SECONDS);
      const snapshot = stats?.snapshot();
      if (cancelled) {
        return;
      }
      const us = 1e-3;
      const picture = summarize(
        snapshot?.timers.commandBufferPicture ?? [],
        us
      );
      const rebuild = summarize(
        snapshot?.timers.commandBufferRebuild ?? [],
        us
      );
      onDone({
        mode: name,
        n,
        timings: {
          commitCompile: summarize(warm.map((c) => c.compileMs)),
          commitInstall: summarize(warm.map((c) => c.installMs)),
          commitTotal: summarize(warm.map((c) => c.compileMs + c.installMs)),
          mapper: summarize(snapshot?.named.cbMapper ?? [], us),
          replayInterpreted: summarize(
            snapshot?.timers.commandBufferPlay ?? [],
            us
          ),
          replayPicture: picture,
          replayPictureRebuild: rebuild,
        },
        counts: {
          floats: warm[0]?.count ?? 0,
          bindings: warm[0]?.bindings ?? 0,
          paintsCreatedWarm: warm[0]?.paintsCreated ?? 0,
        },
        fps,
        fpsSeconds: ANIMATION_SECONDS,
        notes,
      });
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CommandBufferCanvas
      ref={ref}
      mode={mode}
      onCommit={onCommit}
      mapperTimer="cbMapper"
      style={styles.canvas}
    >
      <Scene
        nodes={nodes}
        values={values}
        transformMode={transformMode}
        variant={variant}
      />
    </CommandBufferCanvas>
  );
};

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: "#0b1020" },
});
