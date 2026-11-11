// Opt-in pacing modes. Existing throughput/cold plans stay unchanged.
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "../src/Examples/Benchmark");
export const configPath = join(source, "pacing-config.json");
export const config = JSON.parse(readFileSync(configPath, "utf8"));
const nativeDir = join(here, "native");
export const nativeHash = createHash("sha256").update(readFileSync(join(nativeDir, "BenchPacing.mm"))).digest("hex");
// Baked into markers too: --no-build must not silently measure another plan.
const fingerprint = createHash("sha256");
for (const file of [configPath, join(source, "pacing.tsx"), fileURLToPath(import.meta.url),
  join(here, "pacing-ios.py"), join(here, "trace_ios.py"),
  join(here, "pacing-android.py"), join(here, "pacing-android.mjs"), join(here, "pacing_common.py"),
  join(nativeDir, "BenchPacing.mm"), join(nativeDir, "BenchPacing.podspec"),
  join(here, "../ios/Podfile")]) fingerprint.update(readFileSync(file));
export const fixture = fingerprint.digest("hex");
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export async function measurePacing({ device, app, sh, reps, settle, refreshRate, keepTrace, collectTrace = keepTrace }) {
  const dir = mkdtempSync(join(tmpdir(), "skia-pacing-"));
  let complete = false;
  let traceError;
  try {
    const plist = join(app, "Info.plist");
    const get = async (key) => (await sh("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plist])).trim();
    const bundleId = await get("CFBundleIdentifier");
    const label = await get("CFBundleDisplayName").catch(() => get("CFBundleName"));
    const launch = async () => {
      const json = join(dir, "launch.json");
      await sh("xcrun", ["devicectl", "device", "process", "launch", "--device", device.id,
        "--terminate-existing", "--json-output", json, bundleId]);
      const pid = JSON.parse(readFileSync(json, "utf8")).result?.process?.processIdentifier;
      if (!Number.isInteger(pid)) throw new Error("Pacing launch returned no process ID");
      return pid;
    };
    console.log("[bench] pacing warm-up launch");
    await launch();
    await sleep(12);
    const pid = await launch();
    const launchedAt = Date.now();
    const perRepMs = config.counts.length * (config.loadSettleMs +
      (config.warmups + config.bursts) * (config.burstMs + config.idleMs)) +
      config.loadSettleMs + config.continuousMs + config.idleMs;
    const seconds = Math.ceil(settle + reps * perRepMs / 1000 + 15);
    console.log(`[bench] observing drawable pacing (${seconds}s); leave app foreground`);
    const trace = join(dir, "pacing.trace");
    let recorded = false;
    if (collectTrace) {
      await sleep(2);
      await sh("xcrun", ["devicectl", "device", "info", "lockState", "--device", device.id]);
      try {
        await sh("xcrun", ["xctrace", "record", "--template", "Logging", "--instrument", "Display", "--instrument", "Thermal State",
          "--device", device.udid, "--attach", String(pid), "--time-limit", `${seconds}s`, "--output", trace]);
        recorded = true;
      } catch (error) {
        traceError = error.message;
        console.warn(`[bench] optional Instruments recording failed: ${traceError}`);
      }
    }
    // Host timing only bounds collection. Actual UI windows and frame times
    // come from the native buffer; a missing/incomplete file never passes.
    await sleep(Math.max(0, seconds - (Date.now() - launchedAt) / 1000));
    const feedback = join(dir, "drawables.json");
    await sh("xcrun", ["devicectl", "device", "copy", "from", "--device", device.id,
      "--domain-type", "appDataContainer", "--domain-identifier", bundleId,
      "--source", "Documents/skia-benchmark-pacing.json", "--destination", feedback]);
    const data = JSON.parse(await sh("python3", [join(here, "pacing-ios.py"), feedback,
      fixture, configPath, String(reps), String(refreshRate), String(pid), nativeHash,
      ...(recorded ? ["--trace", trace, "--process", `${label} (${pid})`] : [])]));
    data.traceRequested = !!collectTrace;
    data.traceRecorded = recorded;
    if (traceError) data.traceDiagnostics = { available: false, error: traceError };
    complete = true;
    return { device: device.label, deviceId: createHash("sha256").update(device.udid).digest("hex"), ...data };
  } finally {
    if (complete && !keepTrace && !traceError) rmSync(dir, { recursive: true, force: true });
    else console.log(`[bench] pacing capture retained: ${dir}`);
  }
}

const percentile = (values, q) => {
  if (!values.length) throw new Error("Missing pacing intervals");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)];
};
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function pacingSummary(result) {
  const trials = new Map();
  for (const run of result.runs.filter((r) => !r.warmup)) {
    if (run.intervalsMs.some((v) => !Number.isFinite(v) || v <= 0)) throw new Error("Invalid pacing interval");
    const key = `${run.kind}/${run.count}/${run.rep}`;
    const trial = trials.get(key) ?? { kind: run.kind, count: run.count, intervals: [], first: [], windows: 0, longWindows: 0, dropped: 0, uiMax: 0 };
    trial.intervals.push(...run.intervalsMs);
    trial.first.push(run.firstPresentationMs);
    trial.windows++;
    trial.longWindows += run.longGaps > 0 ? 1 : 0;
    trial.dropped += run.droppedDrawables ?? 0;
    trial.uiMax = Math.max(trial.uiMax, run.uiMaxGapMs);
    trials.set(key, trial);
  }
  const groups = new Map();
  for (const trial of trials.values()) {
    const key = `${trial.kind}/${trial.count}`;
    const group = groups.get(key) ?? [];
    group.push(trial);
    groups.set(key, group);
  }
  return [...groups.values()].map((trials) => ({
    kind: trials[0].kind, count: trials[0].count, trials: trials.length,
    windows: trials.reduce((sum, t) => sum + t.windows, 0),
    longWindows: trials.reduce((sum, t) => sum + t.longWindows, 0),
    droppedDrawables: trials.reduce((sum, t) => sum + t.dropped, 0),
    p99Ms: median(trials.map((t) => percentile(t.intervals, 0.99))),
    firstPresentationMs: median(trials.map((t) => median(t.first))),
    maxMs: Math.max(...trials.map((t) => Math.max(...t.intervals))),
    uiMaxMs: median(trials.map((t) => t.uiMax)),
  }));
}

export function reportPacing(result, previous) {
  const android = result.platform === "android";
  if (result.measurement !== (android ? "android-surfaceflinger-present-fence-v1" : "metal-drawable-presentedTime-v2")) {
    throw new Error("Pacing verdicts require platform presentation feedback; rerun legacy results");
  }
  if (previous && ["mode", "platform", "device", "deviceId", "fixture", "refreshRate", "plan", "measurement", "nativeHash", "traceRequested", "traceRecorded", "lowPowerMode"].some((key) => previous[key] !== result[key])) {
    throw new Error("Pacing comparison requires the same mode, device, display rate, fixture, native implementation, power mode, trace setting and plan");
  }
  const rows = pacingSummary(result);
  const before = previous ? new Map(pacingSummary(previous).map((r) => [`${r.kind}/${r.count}`, r])) : null;
  const ms = (v) => v.toFixed(2);
  const windows = (r) => `${r.longWindows}/${r.windows}`;
  const lines = [
    `# React Native Skia displayed-frame pacing: ${result.label}`,
    "", `${result.device}; ${result.refreshRate}Hz; ${result.skia}; ${result.date}.`,
    `Thermal: ${(result.thermal ?? []).join(", ") || "unavailable"} (${result.thermalCoverage ?? "unspecified"}); Low Power Mode: ${result.lowPowerMode ? "on" : "off"}; Trace requested/recorded: ${result.traceRequested ? "yes" : "no"}/${result.traceRecorded ? "yes" : "no"}.`, "",
    android
      ? "Intervals use SurfaceFlinger PresentFenceSignaled events for exactly one app SurfaceView layer and synchronous UI markers in Perfetto's clock. No app-window fallback, CPU handoffs, host/logcat arrival timestamps or average FPS. Warmups/idle excluded; bounded display-drain tail included, without a synthetic gap after the last presentation."
      : "Intervals use MTLDrawable.presentedTime feedback for the tagged benchmark Canvas and UI-marked animations plus their bounded display-drain tail, not CPU handoffs, callback arrival or Instruments swap counts. Warmups and gaps between windows are excluded. No interval is added for idle after the last presentation.",
    "Long gap: >1.5 display periods. Windows = bursts or continuous controls with at least one long gap / measured windows. p99 = median of per-trial p99s; max = worst observed interval. Lower is better.", "",
    android
      ? `Perfetto is attached identically to both Android runs. Missing markers, ambiguous layers, stale fixture/session/PID, Debug JS and event/log errors or data loss fail measurement. Scoped derived-GPU-lane depth-limit diagnostics are retained in androidCapture.traceStats, not used for verdicts. Unshown/dropped buffer totals are not inferred from successful fences. Measured queued buffers without matching presentation feedback: ${result.runs.filter(r => !r.warmup).reduce((sum, r) => sum + (r.unmatchedQueuedBuffers ?? 0), 0)}.`
      : "Instruments may omit swap events: its intervals are saved separately as traceDiagnostics, never used for pacing verdicts. Missing native callbacks, overflow and stale capture identities fail measurement.", "",
    ...(android ? [] : [`Measured dropped/unshown drawables (zero presentedTime): ${rows.reduce((sum, r) => sum + r.droppedDrawables, 0)}. Counted separately; presentation intervals use successful feedback only.`, ""]),
    "First presentation = median of per-trial median times from UI animation start to the first drawable presentation; not input latency or proof of its animation value. Reported separately from inter-frame jitter.", "",
  ];
  if (previous) {
    lines.push(`Compared with ${previous.label} (${previous.skia}). A p99 increase >25% and >a quarter display period is flagged; max/gap counts remain visible for rarer outliers.`, "",
      "| Kind | Circles | Long-gap windows before | after | p99 before, ms | after | First presentation before, ms | after | Max before, ms | after | |",
      "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
    for (const row of rows) {
      const old = before.get(`${row.kind}/${row.count}`);
      if (!old) throw new Error("Missing baseline pacing workload");
      const significant = Math.abs(row.p99Ms - old.p99Ms) > 1000 / result.refreshRate / 4;
      const verdict = significant && row.p99Ms > old.p99Ms * 1.25 ? "regression" :
        significant && row.p99Ms < old.p99Ms * 0.75 ? "improvement" : "";
      lines.push(`| ${row.kind} | ${row.count} | ${windows(old)} | ${windows(row)} | ${ms(old.p99Ms)} | ${ms(row.p99Ms)} | ${ms(old.firstPresentationMs)} | ${ms(row.firstPresentationMs)} | ${ms(old.maxMs)} | ${ms(row.maxMs)} | ${verdict} |`);
    }
  } else {
    lines.push("| Kind | Circles | Trials | Long-gap windows | p99, ms | First presentation, ms | Max, ms | UI max, ms |",
      "|---|---:|---:|---:|---:|---:|---:|---:|",
      ...rows.map((r) => `| ${r.kind} | ${r.count} | ${r.trials} | ${windows(r)} | ${ms(r.p99Ms)} | ${ms(r.firstPresentationMs)} | ${ms(r.maxMs)} | ${ms(r.uiMaxMs)} |`));
  }
  return lines.join("\n");
}
