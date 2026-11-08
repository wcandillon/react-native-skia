/**
 * The benchmark counters and timers of the native recorder, installed on the
 * React Native runtime as globalThis.__RNSkiaRecorderStats when the library
 * is built with RNSKIA_RECORDER_STATS (see cpp/api/recorder/RecorderStats.h
 * and the example app's Podfile). Undefined otherwise. For the recorder
 * benchmark (apps/docs/docs/_recorder-benchmark.md), not part of the public
 * API.
 */
export interface RecorderStatsSnapshot {
  /** Since the last reset(). */
  counters: {
    /** Calls of the recorder's JSI host functions. */
    hostCalls: number;
    /** Property probes made while converting props (Convertor.h). */
    hasProperty: number;
    getProperty: number;
    /** Command objects allocated by the recorder. */
    commandAllocs: number;
    /** Shared value conversions registered in Variables. */
    conversions: number;
  };
  /** The same counters, for the probes made while reading shared values. */
  mapperCounters: RecorderStatsSnapshot["counters"];
  /** Samples in microseconds, oldest first, the most recent 4096 at most. */
  timers: {
    /** Recorder::readUpdates, one sample per mapper run. */
    readUpdates: number[];
    /** Recorder::play, one sample per frame, and the shares of it below. */
    play: number[];
    shaders: number[];
    paths: number[];
    paintCopies: number[];
    /** The experimental command buffer, see sksg/CommandBuffer. */
    commandBufferPlay: number[];
    commandBufferPicture: number[];
    commandBufferRebuild: number[];
  };
  /** Samples JS added with addSample(), by name. */
  named: Record<string, number[]>;
  /** Frames presented per view, by native id. */
  frames: Record<string, number>;
}

export interface RecorderStatsApi {
  snapshot(): RecorderStatsSnapshot;
  /** Zeroes the counters and drops the samples. */
  reset(): void;
  /** A sample JS timed, on any runtime. */
  addSample(name: string, micros: number): void;
  /** Frames the view presented since reset(). */
  framesPresented(nativeId: number): number;
  /** A steady clock in milliseconds, the same on every runtime. */
  now(): number;
  /** To the native console (console.log is dropped by release builds). */
  log(message: string): void;
  /** Writes a file into the app's Documents folder; returns its path. */
  writeFile(name: string, text: string): string | null;
  /** Disables the idle timer of the device while a run lasts (iOS). */
  keepAwake(on: boolean): void;
  /** The Hermes sampling profiler, process wide. */
  startProfiler(hz?: number): boolean;
  /** Writes the trace into the Documents folder; null without a profiler. */
  stopProfiler(name: string): string | null;
}

declare global {
  var __RNSkiaRecorderStats: RecorderStatsApi | undefined;
  /**
   * Benchmark hook: when set, the native container reports how long
   * visit() and installRecording() took, in milliseconds, for each commit
   * (see Container.native.ts). Unset outside of the benchmark screens.
   */
  var __RNSkiaCommitTimings:
    ((visitMs: number, installMs: number) => void) | undefined;
}
