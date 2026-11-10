// Short animations separated by real idle periods: an empty presentation
// queue must not be confused with the end of an animation. The example-only
// observer records drawable presentation feedback, not CPU handoff timestamps.
import React, { memo, useEffect, useMemo, useState } from "react";
import { NativeModules, StyleSheet, Text, View } from "react-native";
import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { Canvas, Circle, Fill, Group } from "react-native-skia";

import type { Plan } from "./plan";
import config from "./pacing-config.json";

const CANVAS_TEST_ID = "skia-benchmark-pacing";
type PresentationObserver = {
  start: (fixture: string, testId: string, session: string) => Promise<boolean>;
  finish: (session: string) => Promise<string>;
  abort: (session: string) => void;
};

const Scene = memo(
  ({ count, t }: { count: number; t: SharedValue<number> }) => {
    const circles = useMemo(
      () =>
        Array.from({ length: count }, (_, i) => ({
          x: 12 + ((i * 73) % 600),
          y: 12 + ((i * 137) % 800),
          r: 2 + (i % 4),
          color: ["#80cbc4", "#ce93d8", "#ffcc80"][i % 3],
        })),
      [count]
    );
    const transform = useDerivedValue(() => [
      { translateX: -180 * t.value },
      { translateY: -240 * t.value },
      { scale: 1 + 2 * t.value },
    ]);
    return (
      <Canvas testID={CANVAS_TEST_ID} style={StyleSheet.absoluteFill}>
        <Fill color="#20242c" />
        <Group transform={transform}>
          {circles.map((circle, i) => (
            <Circle
              key={i}
              cx={circle.x}
              cy={circle.y}
              r={circle.r}
              color={circle.color}
            />
          ))}
        </Group>
      </Canvas>
    );
  }
);

type NativeLogger = (message: string, level: number) => void;

// Capture RN's native host function, not console.error (which Worklets sends
// back to RN). It is transferable and called synchronously on UI. RCTLog
// writes public os_log text; Worklets' basic NSLog logger is privacy-redacted.
// Only boundaries are logged; no per-frame bridge or logging is involved.
const emit = (logger: NativeLogger, row: object) => {
  "worklet";
  logger(`[bench-pacing] ${JSON.stringify(row)}`, 3);
};

export const PacingBenchmark = ({ plan }: { plan: Plan }) => {
  const [count, setCount] = useState(config.counts[0]);
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  const active = useSharedValue(false);
  const last = useSharedValue(0);
  const uiMax = useSharedValue(0);
  const uiSamples = useSharedValue(0);

  // Progress drives this observer. Counters read in the callback are not
  // mapper inputs, so updating them cannot schedule another animation frame.
  useAnimatedReaction(
    () => t.value,
    () => {
      if (!active.value) return;
      const now = performance.now();
      if (last.value > 0) uiMax.value = Math.max(uiMax.value, now - last.value);
      last.value = now;
      uiSamples.value++;
    }
  );

  useEffect(() => {
    const logger = (
      global as typeof globalThis & { nativeLoggingHook?: NativeLogger }
    ).nativeLoggingHook;
    if (typeof logger !== "function")
      throw new Error("Pacing benchmark requires RN's native logging hook");
    const observer: PresentationObserver | undefined =
      NativeModules.BenchPacing;
    const session = `pacing-${Date.now()}-${Math.random()}`;
    let alive = true;
    let id = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });
    const animate = (
      rep: number,
      n: number,
      kind: "burst" | "continuous",
      warmup: boolean
    ) =>
      new Promise<void>((resolve, reject) => {
        const complete = (finished: boolean) =>
          finished
            ? resolve()
            : reject(new Error("Pacing animation cancelled"));
        const marker = {
          id: ++id,
          rep,
          count: n,
          kind,
          warmup,
          fixture: plan.pacingFixture,
          session,
        };
        scheduleOnUI(() => {
          "worklet";
          last.value = 0;
          uiMax.value = 0;
          uiSamples.value = 0;
          active.value = true;
          emit(logger, { event: "begin", ...marker });
          t.value = withTiming(
            t.value < 0.5 ? 1 : 0,
            {
              duration: kind === "burst" ? config.burstMs : config.continuousMs,
              easing: Easing.inOut(Easing.quad),
            },
            (finished) => {
              active.value = false;
              emit(logger, {
                event: "end",
                ...marker,
                finished: !!finished,
                uiMaxGapMs: uiMax.value,
                uiSamples: uiSamples.value,
              });
              scheduleOnRN(complete, !!finished);
            }
          );
        });
      });

    const run = async () => {
      if (!observer)
        throw new Error("BenchPacing is missing; run pod install and rebuild");
      await observer.start(plan.pacingFixture, CANVAS_TEST_ID, session);
      if (!alive) return;
      // The runner attaches before the first marker. All later attribution
      // uses device timestamps in the trace, never host-side sleep estimates.
      await wait(plan.settleMs);
      for (let rep = 1; rep <= plan.reps && alive; rep++) {
        for (const n of config.counts) {
          if (!alive) return;
          setCount(n);
          await wait(config.loadSettleMs);
          for (let i = 0; i < config.warmups + config.bursts && alive; i++) {
            await animate(rep, n, "burst", i < config.warmups);
            await wait(config.idleMs);
          }
        }
        if (!alive) return;
        setCount(1024);
        await wait(config.loadSettleMs);
        await animate(rep, 1024, "continuous", false);
        await wait(config.idleMs);
      }
      if (!alive) return;
      await new Promise<void>((resolve) => {
        scheduleOnUI(() => {
          "worklet";
          emit(logger, {
            event: "done",
            samples: id,
            fixture: plan.pacingFixture,
            session,
          });
          scheduleOnRN(resolve);
        });
      });
      // Cross the bridge only after measurement; native waits for every
      // attached drawable callback before atomically saving its result.
      await observer.finish(session);
      if (!alive) return;
      setDone(true);
    };
    void run().catch((error: Error) => {
      observer?.abort(session);
      if (alive) logger(`[bench-pacing] failed: ${error.message}`, 3);
    });
    return () => {
      alive = false;
      observer?.abort(session);
      timers.forEach(clearTimeout);
      scheduleOnUI(() => {
        "worklet";
        cancelAnimation(t);
      });
    };
  }, [plan, t, active, last, uiMax, uiSamples]);

  // No changing labels or other animated views during measurement: the app's
  // displayed surfaces should come from this Canvas, not unrelated UIKit work.
  return (
    <View style={styles.root}>
      <Scene count={count} t={t} />
      {done && <Text style={styles.label}>bench done</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#20242c" },
  label: { position: "absolute", top: 60, color: "white" },
});
