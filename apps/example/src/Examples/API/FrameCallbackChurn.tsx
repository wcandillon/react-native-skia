import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";
import type { SkSize } from "@shopify/react-native-skia";
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

/**
 * Frame callback churn.
 *
 * `<Canvas />` drives `onSize` from a Reanimated frame callback. Reanimated's
 * `useFrameCallback` has deps `[callback, autostart]`, so if the callback is not
 * memoized its identity changes on every render and the effect tears down and
 * re-registers the callback every single time:
 *
 *   cleanup:  unregisterFrameCallback(oldId)   -> scheduleOnUI
 *   setup:    registerFrameCallback(callback)  -> scheduleOnUI (+ new shareable)
 *             setActive(isActive)              -> scheduleOnUI
 *
 * That is three UI-thread hops and a freshly serialized worklet closure per
 * `<Canvas />` per render. Reanimated's UI-side registry also stops and restarts
 * its rAF loop each time, because `manageStateFrameCallback` bumps `nextCallId`
 * whenever `activeFrameCallbacks` empties, which makes the in-flight `loop` bail
 * on its next tick.
 *
 * Reanimated hands out frame callback ids from a single monotonically
 * increasing counter, so the highest id present in the UI-thread registry is a
 * direct measure of how many registrations have happened. This screen samples
 * that from the UI thread and reports the rate: **new registrations / second**.
 *
 *   - 0/s  while the tree re-renders  -> callbacks are stable (fixed)
 *   - ~1/s per re-rendering <Canvas /> -> churn (the bug)
 *
 * The "reference churner" toggle mounts a component that deliberately uses the
 * unmemoized pattern, so you can see what the bug looks like on this same meter
 * even after `<Canvas />` itself is fixed.
 */

// ---------------------------------------------------------------------------
// A component that reproduces the unmemoized pattern on purpose, as a control.
// ---------------------------------------------------------------------------

const ReferenceChurner = ({ renders }: { renders: number }) => {
  // Inline arrow: the Babel plugin rebuilds this closure on every render, so
  // `useFrameCallback`'s effect re-runs and re-registers every render.
  const fc = useFrameCallback(() => {
    "worklet";
  }, true);
  return (
    <Text style={styles.mono}>
      reference churner callbackId: {fc.callbackId} (render {renders})
    </Text>
  );
};

// ---------------------------------------------------------------------------

export const FrameCallbackChurn = () => {
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const [renders, setRenders] = useState(0);
  const [driving, setDriving] = useState(true);
  const [mountCanvas, setMountCanvas] = useState(true);
  const [useOnSize, setUseOnSize] = useState(true);
  const [showChurner, setShowChurner] = useState(false);

  const [registered, setRegistered] = useState(0);
  const [maxId, setMaxId] = useState(0);
  const [rate, setRate] = useState(0);

  // One render per frame. Any frequently re-rendering parent does the same
  // thing: a chat, a list, a progress bar, a gesture-driven layout.
  useEffect(() => {
    if (!driving) {
      return;
    }
    let raf = 0;
    const tick = () => {
      setRenders((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [driving]);

  const report = useCallback((count: number, highest: number) => {
    setRegistered(count);
    setMaxId(highest);
  }, []);

  const frames = useSharedValue(0);
  const lastSampleId = useSharedValue(-1);
  const lastSampleAt = useSharedValue(0);

  // This probe is itself memoized, so it registers exactly once and does not
  // pollute the measurement.
  const probe = useCallback(
    (info: { timestamp: number }) => {
      "worklet";
      frames.value += 1;
      if (frames.value % 30 !== 0) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registry = (global as any)._frameCallbackRegistry;
      if (!registry) {
        return;
      }
      let highest = -1;
      let count = 0;
      registry.frameCallbackRegistry.forEach((_: unknown, id: number) => {
        count += 1;
        if (id > highest) {
          highest = id;
        }
      });
      if (lastSampleId.value >= 0) {
        const elapsed = (info.timestamp - lastSampleAt.value) / 1000;
        if (elapsed > 0) {
          runOnJS(setRate)(
            Math.round((highest - lastSampleId.value) / elapsed)
          );
        }
      }
      lastSampleId.value = highest;
      lastSampleAt.value = info.timestamp;
      runOnJS(report)(count, highest);
    },
    [frames, lastSampleId, lastSampleAt, report]
  );
  useFrameCallback(probe, true);

  const churning = rate > 0;
  const verdict = useMemo(() => {
    if (!driving) {
      return "not re-rendering — turn the driver on";
    }
    return churning
      ? `⚠️ ${rate} new frame-callback registrations / second`
      : "✅ no churn: frame callbacks are stable across renders";
  }, [churning, driving, rate]);

  return (
    <View style={styles.container}>
      <View style={[styles.banner, churning && styles.bannerBad]}>
        <Text style={styles.bannerText}>{verdict}</Text>
        <Text style={styles.mono}>
          renders {renders} · registered {registered} · highest id {maxId}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Re-render every frame</Text>
        <Switch value={driving} onValueChange={setDriving} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Mount &lt;Canvas /&gt;</Text>
        <Switch value={mountCanvas} onValueChange={setMountCanvas} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Pass onSize= to the Canvas</Text>
        <Switch value={useOnSize} onValueChange={setUseOnSize} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Mount reference churner (control)</Text>
        <Switch value={showChurner} onValueChange={setShowChurner} />
      </View>

      {showChurner ? <ReferenceChurner renders={renders} /> : null}

      {mountCanvas ? (
        <Canvas
          style={styles.canvas}
          onSize={useOnSize ? size : undefined}
          testID="churn-canvas"
        >
          <Fill color="#111827" />
          <Circle cx={60} cy={60} r={40} color="#22d3ee" />
        </Canvas>
      ) : (
        <View style={[styles.canvas, styles.placeholder]}>
          <Text style={styles.placeholderText}>no canvas</Text>
        </View>
      )}

      <Text style={styles.hint}>
        With the Canvas mounted and the tree re-rendering, the registration rate
        should stay at 0/s. Flip on the reference churner to see what an
        unmemoized frame callback looks like on this meter — the rate jumps to
        roughly one registration per render, and its callbackId climbs by one
        every frame.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  banner: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    marginBottom: 12,
  },
  bannerBad: { backgroundColor: "#fee2e2" },
  bannerText: { fontWeight: "700", marginBottom: 4 },
  mono: { fontFamily: "Courier", fontSize: 12, color: "#374151" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: { flex: 1, paddingRight: 12 },
  canvas: { height: 120, marginTop: 12, borderRadius: 8, overflow: "hidden" },
  placeholder: {
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#6b7280" },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 12 },
});
