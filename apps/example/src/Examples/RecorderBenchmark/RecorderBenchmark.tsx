import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { checkBuffer } from "./BufferCheck";
import { CommandBufferBench } from "./CommandBufferBench";
import { ImmediateBench } from "./Immediate";
import { RetainedBench } from "./Retained";
import { allResults, fmt, getStats, report } from "./Runner";
import type { ModeResult } from "./Runner";
import { ScalarBench } from "./ScalarCalls";

/**
 * The recorder benchmark (apps/docs/docs/_recorder-benchmark.md): the same
 * N node scene drawn through the current recorder, the current immediate
 * mode and the prototype's allocation free paths, with the time of each
 * stage and the frame rate. Pick N and a path, or run every path for every
 * N; results are shown here, logged to the native console and written to
 * recorder-benchmark.json in the app's Documents folder.
 */

const SIZES = [100, 500, 2000] as const;

/**
 * RNSKIA_BENCHMARK_AUTORUN, inlined at bundle time: "everything" runs the
 * buffer check and every path for every N; "all" every path for N=500;
 * "<mode>:<n>" one path (for instance "retained:2000"). Unset, the screen
 * waits for a tap.
 */
const AUTORUN = process.env.RNSKIA_BENCHMARK_AUTORUN;

const MODES = [
  "retained",
  "immediate-alloc",
  "immediate-hoisted",
  "scalar",
  "commandBuffer-interpreted-nested",
  "commandBuffer-picture-nested",
  "commandBuffer-interpreted-derived",
] as const;

type Mode = (typeof MODES)[number];

const MODE_LABELS: Record<Mode, string> = {
  "retained": "Recorder (retained)",
  "immediate-alloc": "Immediate, allocating",
  "immediate-hoisted": "Immediate, hoisted",
  "scalar": "Scalar calls (worklet)",
  "commandBuffer-interpreted-nested": "Command buffer, interpreted",
  "commandBuffer-picture-nested": "Command buffer, picture",
  "commandBuffer-interpreted-derived": "Command buffer, derived transform",
};

interface Run {
  mode: Mode;
  n: number;
  key: number;
}

const formatResult = (result: ModeResult) => {
  const lines = [`## ${result.mode} n=${result.n}`];
  Object.entries(result.timings).forEach(([name, summary]) => {
    lines.push(`${name}: ${fmt(summary)}`);
  });
  if (result.counts) {
    Object.entries(result.counts).forEach(([name, value]) => {
      lines.push(`${name}: ${value}`);
    });
  }
  lines.push(
    `fps: ${result.fps === null ? "n/a" : result.fps.toFixed(1)} over ${result.fpsSeconds ?? 0}s`
  );
  result.notes.forEach((note) => lines.push(`note: ${note}`));
  if (result.profile) {
    lines.push(`profile: ${result.profile}`);
  }
  return lines.join("\n");
};

export const RecorderBenchmark = () => {
  const [n, setN] = useState<number>(500);
  const [mode, setMode] = useState<Mode>("retained");
  const [run, setRun] = useState<Run | null>(null);
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState<string[]>([]);
  const queue = useRef<Omit<Run, "key">[]>([]);
  const key = useRef(0);

  const append = useCallback((text: string) => {
    setLog((lines) => [text, ...lines]);
  }, []);

  const startNext = useCallback(() => {
    const next = queue.current.shift();
    if (!next) {
      setRun(null);
      setStatus("done");
      const stats = getStats();
      if (stats) {
        stats.log(`RNSKIA_BENCH_DONE ${allResults().length} results`);
        stats.keepAwake(false);
      }
      return;
    }
    key.current++;
    setRun({ ...next, key: key.current });
  }, []);

  const start = useCallback(
    (runs: Omit<Run, "key">[]) => {
      queue.current = runs;
      startNext();
    },
    [startNext]
  );

  const onDone = useCallback(
    (result: ModeResult) => {
      report(result);
      append(formatResult(result));
      // Unmount the finished path before the next one mounts.
      setRun(null);
      setTimeout(startNext, 300);
    },
    [append, startNext]
  );

  const onBufferCheck = useCallback(async () => {
    try {
      const result = await checkBuffer();
      const text = `## buffer check\n${result.lines.join("\n")}`;
      append(text);
      const stats = getStats();
      stats?.log(`RNSKIA_BENCH_BUFFER ${JSON.stringify(result)}`);
      stats?.writeFile(
        "recorder-benchmark-buffer-check.json",
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      append(`buffer check failed: ${String(error)}`);
    }
  }, [append]);

  useEffect(() => {
    const stats = getStats();
    if (!stats) {
      append(
        "__RNSkiaRecorderStats is not installed: the native counters and " +
          "timers need a build with RNSKIA_RECORDER_STATS=1 (see the Podfile)."
      );
    }
  }, [append]);

  // The autorun plan, once the screen has settled.
  useEffect(() => {
    if (!AUTORUN) {
      return undefined;
    }
    const timeout = setTimeout(async () => {
      getStats()?.keepAwake(true);
      if (AUTORUN === "everything") {
        await onBufferCheck();
        start(
          SIZES.flatMap((size) => MODES.map((m) => ({ mode: m, n: size })))
        );
      } else if (AUTORUN === "all") {
        start(MODES.map((m) => ({ mode: m, n: 500 })));
      } else if (AUTORUN === "check") {
        await onBufferCheck();
      } else {
        const [m, size] = AUTORUN.split(":");
        if ((MODES as readonly string[]).includes(m)) {
          start([{ mode: m as Mode, n: Number(size ?? 500) }]);
        } else {
          append(`unknown RNSKIA_BENCHMARK_AUTORUN value: ${AUTORUN}`);
        }
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [append, onBufferCheck, start]);

  const running = run !== null;
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.row}>
          {SIZES.map((size) => (
            <Pressable
              key={size}
              disabled={running}
              onPress={() => setN(size)}
              style={[styles.chip, n === size && styles.chipSelected]}
            >
              <Text style={styles.chipText}>{size}</Text>
            </Pressable>
          ))}
          <Pressable
            disabled={running}
            onPress={() => start([{ mode, n }])}
            style={[styles.button, running && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Run</Text>
          </Pressable>
          <Pressable
            disabled={running}
            onPress={() => start(MODES.map((m) => ({ mode: m, n })))}
            style={[styles.button, running && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>All paths</Text>
          </Pressable>
          <Pressable
            disabled={running}
            onPress={() =>
              start(
                SIZES.flatMap((size) =>
                  MODES.map((m) => ({ mode: m, n: size }))
                )
              )
            }
            style={[styles.button, running && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Everything</Text>
          </Pressable>
          <Pressable
            disabled={running}
            onPress={onBufferCheck}
            style={[styles.button, running && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>Buffer check</Text>
          </Pressable>
        </View>
        <ScrollView horizontal style={styles.modes}>
          {MODES.map((m) => (
            <Pressable
              key={m}
              disabled={running}
              onPress={() => setMode(m)}
              style={[styles.chip, mode === m && styles.chipSelected]}
            >
              <Text style={styles.chipText}>{MODE_LABELS[m]}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.status}>
          {running ? status : `idle (${status})`}
        </Text>
      </View>
      <View style={styles.canvas}>
        {run && run.mode === "retained" && (
          <RetainedBench
            key={run.key}
            n={run.n}
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "immediate-alloc" && (
          <ImmediateBench
            key={run.key}
            n={run.n}
            variant="alloc"
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "immediate-hoisted" && (
          <ImmediateBench
            key={run.key}
            n={run.n}
            variant="hoisted"
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "scalar" && (
          <ScalarBench
            key={run.key}
            n={run.n}
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "commandBuffer-interpreted-nested" && (
          <CommandBufferBench
            key={run.key}
            n={run.n}
            mode="interpreted"
            transformMode="nested"
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "commandBuffer-picture-nested" && (
          <CommandBufferBench
            key={run.key}
            n={run.n}
            mode="picture"
            transformMode="nested"
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
        {run && run.mode === "commandBuffer-interpreted-derived" && (
          <CommandBufferBench
            key={run.key}
            n={run.n}
            mode="interpreted"
            transformMode="derived"
            onDone={onDone}
            onStatus={setStatus}
          />
        )}
      </View>
      <ScrollView style={styles.log}>
        {log.map((entry, i) => (
          <Text key={i} style={styles.logText}>
            {entry}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  controls: { padding: 8, gap: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  modes: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#1f2744",
    marginRight: 6,
  },
  chipSelected: { backgroundColor: "#54a0ff" },
  chipText: { color: "white", fontSize: 12 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#1dd1a1",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#0b1020", fontWeight: "600", fontSize: 12 },
  status: { color: "#86868b", fontSize: 12 },
  canvas: { flex: 1 },
  log: { height: 220, backgroundColor: "#060a16", padding: 8 },
  logText: {
    color: "#cfd8ff",
    fontFamily: "Menlo",
    fontSize: 10,
    marginBottom: 8,
  },
});
