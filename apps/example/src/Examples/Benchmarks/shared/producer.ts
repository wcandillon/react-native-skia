import { useCallback, useEffect } from "react";
import { Skia } from "@shopify/react-native-skia";
import type {
  SkDeferredTargetInfo,
  SkPicture,
} from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { createWorkletRuntime, runOnRuntime } from "react-native-worklets";

import { SkiaViewApi, pixelDensity } from "./api";
import type { Mode } from "./api";
import { drawChart, drawField } from "./scenes";

// Background threads shared by all benchmarks. Reanimated's UI runtime lives
// on the main thread, so these are what actually take the drawing work off
// it. Each runtime is its own thread, hence its own Graphite Recorder.
export const MAX_PRODUCER_THREADS = 4;
export const producerRuntimes = Array.from(
  { length: MAX_PRODUCER_THREADS },
  (_, k) =>
    createWorkletRuntime({
      name:
        k === 0 ? "skia-benchmark-producer" : `skia-benchmark-producer-${k}`,
      // The worker's requestAnimationFrame is a polled timer, not vsync; poll
      // often so a batch can start right after the UI frame that requested it.
      animationQueuePollingRate: 2,
    })
);
export const producerRuntime = producerRuntimes[0];

/** What each slot draws. */
export type Scene =
  { kind: "field"; background?: string } | { kind: "chart"; count: number };

export interface Size {
  width: number;
  height: number;
}

/**
 * Shared state of the producer thread. Views register into a slot (index)
 * with their native id, size in points (picture mode) and target (recording
 * mode); the thread produces one frame per slot per UI frame.
 */
export interface ProducerState {
  mode: SharedValue<Mode>;
  scene: SharedValue<Scene>;
  field: SharedValue<SkPicture | null>;
  ids: SharedValue<number[]>;
  sizes: SharedValue<Size[]>;
  targets: SharedValue<(SkDeferredTargetInfo | null)[]>;
  /** Slots to skip (e.g. list items that are mounted but not visible). */
  disabled: SharedValue<boolean[]>;
  /** Milliseconds the last batch took (the slowest thread's). */
  batchMs: SharedValue<number>;
  /** Batches produced so far. */
  batches: SharedValue<number>;
}

/** Produces the slots owned by `thread`: every `threads`-th slot from it. */
const produceBatch = (
  state: ProducerState,
  t: number,
  thread: number,
  threads: number
) => {
  "worklet";
  const scene = state.scene.value;
  const field = state.field.value;
  if (scene.kind === "field" && !field) {
    return false;
  }
  const ids = state.ids.value;
  const disabled = state.disabled.value;
  const n = ids.length;
  const bg =
    scene.kind === "field" && scene.background
      ? Skia.Color(scene.background)
      : undefined;
  if (state.mode.value === "recording") {
    const targets = state.targets.value;
    for (let i = 0; i < n; i++) {
      const id = ids[i];
      const target = targets[i];
      if (i % threads !== thread || id < 0 || !target || disabled[i]) {
        continue;
      }
      const canvas = Skia.Context.makeDeferredCanvas(target);
      canvas.save();
      canvas.scale(pixelDensity, pixelDensity);
      const w = target.width / pixelDensity;
      const h = target.height / pixelDensity;
      if (scene.kind === "field") {
        drawField(canvas, w, h, t, i, field!, bg);
      } else {
        drawChart(canvas, w, h, t, i, scene.count);
      }
      canvas.restore();
      const recording = Skia.Context.snap();
      SkiaViewApi.setJsiProperty(id, "recording", recording);
      recording.dispose();
    }
  } else {
    const sizes = state.sizes.value;
    for (let i = 0; i < n; i++) {
      const id = ids[i];
      const size = sizes[i];
      if (
        i % threads !== thread ||
        id < 0 ||
        !size ||
        size.width === 0 ||
        disabled[i]
      ) {
        continue;
      }
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(
        Skia.XYWHRect(0, 0, size.width, size.height)
      );
      if (scene.kind === "field") {
        drawField(canvas, size.width, size.height, t, i, field!, bg);
      } else {
        drawChart(canvas, size.width, size.height, t, i, scene.count);
      }
      const picture = recorder.finishRecordingAsPicture();
      recorder.dispose();
      SkiaViewApi.setJsiProperty(id, "picture", picture);
      picture.dispose();
    }
  }
  return true;
};

/**
 * Creates the producer state for `n` slots and runs the producer loop on the
 * background thread while the component is mounted. `frameTick` is the UI
 * frame counter the loop paces itself on (one batch per UI frame, never more
 * than one in flight). With `threads` > 1 the slots are split round-robin
 * across that many producer threads, each running its own loop.
 */
export const useProducer = (
  n: number,
  frameTick: SharedValue<number>,
  initialMode: Mode,
  initialScene: Scene,
  highPriority = true,
  threads = 1
) => {
  const mode = useSharedValue<Mode>(initialMode);
  const scene = useSharedValue<Scene>(initialScene);
  const field = useSharedValue<SkPicture | null>(null);
  const ids = useSharedValue<number[]>(new Array(n).fill(-1));
  const sizes = useSharedValue<Size[]>(
    new Array(n).fill({ width: 0, height: 0 })
  );
  const targets = useSharedValue<(SkDeferredTargetInfo | null)[]>(
    new Array(n).fill(null)
  );
  const disabled = useSharedValue<boolean[]>(new Array(n).fill(false));
  const batchMs = useSharedValue(0);
  // One per thread: written by that thread only.
  const threadMs0 = useSharedValue(0);
  const threadMs1 = useSharedValue(0);
  const threadMs2 = useSharedValue(0);
  const threadMs3 = useSharedValue(0);
  const batches = useSharedValue(0);
  const running = useSharedValue(true);
  const priority = useSharedValue(highPriority);

  useEffect(() => {
    priority.value = highPriority;
  }, [highPriority, priority]);

  useEffect(() => {
    running.value = true;
    const count = Math.max(1, Math.min(threads, MAX_PRODUCER_THREADS));
    const threadMs = [threadMs0, threadMs1, threadMs2, threadMs3].slice(
      0,
      count
    );
    for (let k = 0; k < count; k++) {
      runOnRuntime(producerRuntimes[k], (thread: number) => {
        "worklet";
        const state: ProducerState = {
          mode,
          scene,
          field,
          ids,
          sizes,
          targets,
          disabled,
          batchMs,
          batches,
        };
        let lastTick = -1;
        let appliedPriority: boolean | null = null;
        const loop = () => {
          if (!running.value) {
            return;
          }
          if (appliedPriority !== priority.value) {
            appliedPriority = priority.value;
            Skia.Context.setThreadPriority(appliedPriority ? "high" : "normal");
          }
          const tick = frameTick.value;
          if (tick !== lastTick) {
            lastTick = tick;
            const start = Date.now();
            if (produceBatch(state, start, thread, count)) {
              threadMs[thread].value = Date.now() - start;
              let slowest = 0;
              for (let j = 0; j < count; j++) {
                slowest = Math.max(slowest, threadMs[j].value);
              }
              batchMs.value = slowest;
              if (thread === 0) {
                batches.value = batches.value + 1;
              }
            }
          }
          requestAnimationFrame(loop);
        };
        loop();
      })(k);
    }
    return () => {
      running.value = false;
    };
  }, [
    batchMs,
    batches,
    disabled,
    field,
    frameTick,
    ids,
    mode,
    priority,
    running,
    scene,
    sizes,
    targets,
    threadMs0,
    threadMs1,
    threadMs2,
    threadMs3,
    threads,
  ]);

  const setId = useCallback(
    (index: number, id: number) => {
      ids.modify((value) => {
        "worklet";
        value[index] = id;
        return value;
      });
    },
    [ids]
  );
  const setSize = useCallback(
    (index: number, width: number, height: number) => {
      sizes.modify((value) => {
        "worklet";
        value[index] = { width, height };
        return value;
      });
    },
    [sizes]
  );
  const setTarget = useCallback(
    (index: number, target: SkDeferredTargetInfo | null) => {
      targets.modify((value) => {
        "worklet";
        value[index] = target;
        return value;
      });
    },
    [targets]
  );

  /** Marks which slots the producer should draw (all by default). */
  const setEnabled = useCallback(
    (enabled: boolean[]) => {
      // A plain array: it is copied to the UI runtime, unlike a function.
      disabled.value = enabled.map((v) => !v);
    },
    [disabled]
  );

  return {
    mode,
    scene,
    field,
    ids,
    sizes,
    targets,
    disabled,
    batchMs,
    batches,
    setId,
    setSize,
    setTarget,
    setEnabled,
  };
};

export type Producer = ReturnType<typeof useProducer>;
