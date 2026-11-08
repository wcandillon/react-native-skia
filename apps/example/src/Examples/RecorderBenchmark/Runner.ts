import type { RecorderStatsApi } from "react-native-skia";

/**
 * Helpers shared by the benchmark screens: the stats object the library
 * installs when built with RNSKIA_RECORDER_STATS, medians over samples, and
 * how a result is reported (on screen, to the native console and to a file
 * in the app's Documents folder, pulled from the device afterwards).
 */

export const getStats = (): RecorderStatsApi | null =>
  globalThis.__RNSkiaRecorderStats ?? null;

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export interface Summary {
  n: number;
  median: number;
  p90: number;
  mean: number;
  min: number;
  max: number;
}

/** Summarizes samples; `scale` converts their unit (1e-3 for us to ms). */
export const summarize = (samples: number[], scale = 1): Summary | null => {
  if (samples.length === 0) {
    return null;
  }
  const sorted = samples.map((s) => s * scale).sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    n: sorted.length,
    median:
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2,
    p90: at(0.9),
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

export const fmt = (summary: Summary | null | undefined, unit = "ms") =>
  summary
    ? `${summary.median.toFixed(3)}${unit} (n=${summary.n}, p90 ${summary.p90.toFixed(3)}, max ${summary.max.toFixed(3)})`
    : "n/a";

export interface ModeResult {
  mode: string;
  n: number;
  /** Timings in milliseconds. */
  timings: Record<string, Summary | null>;
  counts?: Record<string, number>;
  fps: number | null;
  /** The seconds the frame rate was measured over. */
  fpsSeconds?: number;
  notes: string[];
  profile?: string | null;
}

const results: ModeResult[] = [];

/** Reports a result: native console and the results file. */
export const report = (result: ModeResult) => {
  results.push(result);
  const stats = getStats();
  const line = `RNSKIA_BENCH ${JSON.stringify(result)}`;
  if (stats) {
    stats.log(line);
    stats.writeFile(
      "recorder-benchmark.json",
      JSON.stringify(results, null, 2)
    );
  } else {
    console.warn(line);
  }
};

export const allResults = () => results;

/** The frames a view presented over `seconds`, as a rate. */
export const measureFps = async (nativeId: number, seconds: number) => {
  const stats = getStats();
  if (!stats) {
    await sleep(seconds * 1000);
    return null;
  }
  const f0 = stats.framesPresented(nativeId);
  const t0 = stats.now();
  await sleep(seconds * 1000);
  const frames = stats.framesPresented(nativeId) - f0;
  return frames / ((stats.now() - t0) / 1000);
};

/** How long each phase of a benchmark runs. */
export const SETTLE_MS = 1500;
export const ANIMATION_SECONDS = 5;
export const COMMITS = 30;
/**
 * How many commits the sampling profiler sees: enough for a few seconds of
 * samples whatever the size of the scene.
 */
export const profiledCommits = (n: number) =>
  Math.max(50, Math.round(100000 / n));
