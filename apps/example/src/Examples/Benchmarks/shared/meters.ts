import { useEffect, useRef, useState } from "react";
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { SkiaViewApi, percentile, round } from "./api";

export const LONG_FRAME_MS = 25;

export interface UIStats {
  /** UI-thread frames per second over the last second. */
  fps: number;
  /** Longest gap between two UI frames in the last second, ms. */
  worst: number;
  /** UI frames in the last second that took longer than LONG_FRAME_MS. */
  long: number;
}

/**
 * Measures the UI thread (the main thread) from a Reanimated frame callback:
 * the gap between consecutive frames says how long the main thread was busy.
 * Also exposes the frame counter the producer thread paces itself on.
 */
export const useUIThreadMeter = () => {
  const frameTick = useSharedValue(0);
  const [stats, setStats] = useState<UIStats>({ fps: 0, worst: 0, long: 0 });
  const lastFrame = useSharedValue(0);
  const windowStart = useSharedValue(0);
  const frames = useSharedValue(0);
  const worst = useSharedValue(0);
  const longFrames = useSharedValue(0);
  useFrameCallback((frame) => {
    "worklet";
    frameTick.value = frameTick.value + 1;
    const now = frame.timestamp;
    if (windowStart.value === 0) {
      windowStart.value = now;
    }
    if (lastFrame.value > 0) {
      const gap = now - lastFrame.value;
      frames.value += 1;
      if (gap > worst.value) {
        worst.value = gap;
      }
      if (gap > LONG_FRAME_MS) {
        longFrames.value += 1;
      }
    }
    lastFrame.value = now;
    const elapsed = now - windowStart.value;
    if (elapsed >= 1000) {
      runOnJS(setStats)({
        fps: Math.round((frames.value * 1000) / elapsed),
        worst: Math.round(worst.value),
        long: longFrames.value,
      });
      windowStart.value = now;
      frames.value = 0;
      worst.value = 0;
      longFrames.value = 0;
    }
  });
  return { stats, frameTick };
};

export interface ContentStats {
  /** Frames presented per second per view (average over active views). */
  fps: number;
  /** Views that presented at least once in the last second. */
  active: number;
}

/**
 * Polls the views' presentation counters once a second: how many frames per
 * second actually reach the screen, per view.
 */
export const useContentMeter = (
  ids: { readonly value: number[] },
  disabled?: SharedValue<boolean[]>
) => {
  const [stats, setStats] = useState<ContentStats>({ fps: 0, active: 0 });
  const last = useRef<{ counts: Map<number, number>; at: number }>({
    counts: new Map(),
    at: 0,
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const now = SkiaViewApi.now();
      const counts = new Map<number, number>();
      let delta = 0;
      let active = 0;
      const skip = disabled?.value;
      const all = ids.value;
      for (let i = 0; i < all.length; i++) {
        const id = all[i];
        if (id < 0) {
          continue;
        }
        // Counters are tracked for every view so that a view that just
        // became visible (list scrolling) has a previous value to compare
        // with; only visible views contribute to the rate.
        const { presented } = SkiaViewApi.getPresentStats(id);
        counts.set(id, presented);
        const previous = last.current.counts.get(id);
        if (
          previous !== undefined &&
          presented > previous &&
          !(skip && skip[i])
        ) {
          delta += presented - previous;
          active += 1;
        }
      }
      const dt = last.current.at > 0 ? (now - last.current.at) / 1000 : 0;
      last.current = { counts, at: now };
      if (dt > 0) {
        setStats({
          fps: active > 0 ? round(delta / dt / active, 0) : 0,
          active,
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ids]);
  return stats;
};

export interface PacingStats {
  samples: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  stddevMs: number;
  /** Histogram of intervals: <8, 8-12, 12-20, 20-33, >33 ms. */
  histogram: number[];
}

/** Interval statistics of a view's most recent presents. */
export const pacingOf = (nativeId: number): PacingStats => {
  const { timestamps } = SkiaViewApi.getPresentStats(nativeId);
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }
  const histogram = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const v of intervals) {
    sum += v;
    // eslint-disable-next-line no-nested-ternary
    const bin = v < 8 ? 0 : v < 12 ? 1 : v < 20 ? 2 : v < 33 ? 3 : 4;
    histogram[bin] += 1;
  }
  const mean = intervals.length > 0 ? sum / intervals.length : 0;
  let variance = 0;
  for (const v of intervals) {
    variance += (v - mean) * (v - mean);
  }
  return {
    samples: intervals.length,
    meanMs: round(mean, 2),
    p95Ms: round(percentile(intervals, 95), 2),
    maxMs: round(intervals.length > 0 ? Math.max(...intervals) : 0, 2),
    stddevMs: round(
      intervals.length > 0 ? Math.sqrt(variance / intervals.length) : 0,
      2
    ),
    histogram,
  };
};
