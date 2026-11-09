// Opt-in iOS pacing mode. Existing throughput/cold plans stay unchanged.
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "../src/Examples/Benchmark");
export const configPath = join(source, "pacing-config.json");
export const config = JSON.parse(readFileSync(configPath, "utf8"));
// Baked into markers too: --no-build must not silently measure another plan.
const fingerprint = createHash("sha256");
for (const file of [configPath, join(source, "pacing.tsx"), fileURLToPath(import.meta.url),
  join(here, "pacing-ios.py"), join(here, "trace_ios.py")]) fingerprint.update(readFileSync(file));
export const fixture = fingerprint.digest("hex");
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export async function measurePacing({ device, app, sh, reps, settle, refreshRate, keepTrace }) {
  const dir = mkdtempSync(join(tmpdir(), "skia-pacing-"));
  let complete = false;
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
    // CoreDevice can return a PID before Instruments discovers the process.
    // This is before the >=10s device settle, never inside measured windows.
    await sleep(2);
    await sh("xcrun", ["devicectl", "device", "info", "lockState", "--device", device.id]);
    const perRepMs = config.counts.length * (config.loadSettleMs +
      (config.warmups + config.bursts) * (config.burstMs + config.idleMs)) +
      config.loadSettleMs + config.continuousMs + config.idleMs;
    const seconds = Math.ceil(settle + reps * perRepMs / 1000 + 15);
    const trace = join(dir, "pacing.trace");
    console.log(`[bench] recording pacing (${seconds}s); leave app foreground`);
    // Both streams share Instruments' device clock. UI markers distinguish
    // actual animation windows from idle; host timers only bound the recording.
    // Display has the same compositor table without full Metal API tracing,
    // whose overhead can change the scheduling race this workload exercises.
    await sh("xcrun", ["xctrace", "record", "--template", "Logging", "--instrument", "Display", "--instrument", "Thermal State",
      "--device", device.udid, "--attach", String(pid), "--time-limit", `${seconds}s`, "--output", trace]);
    const data = JSON.parse(await sh("python3", [join(here, "pacing-ios.py"), trace, `${label} (${pid})`,
      fixture, configPath, String(reps), String(refreshRate)]));
    complete = true;
    return { device: device.label, deviceId: createHash("sha256").update(device.udid).digest("hex"), ...data };
  } finally {
    if (complete && !keepTrace) rmSync(dir, { recursive: true, force: true });
    else console.log(`[bench] pacing trace retained: ${dir}`);
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
    const trial = trials.get(key) ?? { kind: run.kind, count: run.count, intervals: [], first: [], windows: 0, longWindows: 0, uiMax: 0 };
    trial.intervals.push(...run.intervalsMs);
    trial.first.push(run.firstSurfaceMs);
    trial.windows++;
    trial.longWindows += run.longGaps > 0 ? 1 : 0;
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
    p99Ms: median(trials.map((t) => percentile(t.intervals, 0.99))),
    firstSurfaceMs: median(trials.map((t) => median(t.first))),
    maxMs: Math.max(...trials.map((t) => Math.max(...t.intervals))),
    uiMaxMs: median(trials.map((t) => t.uiMax)),
  }));
}

export function reportPacing(result, previous) {
  if (previous && ["mode", "platform", "device", "deviceId", "fixture", "refreshRate", "plan"].some((key) => previous[key] !== result[key])) {
    throw new Error("Pacing comparison requires the same mode, device, display rate, fixture and plan");
  }
  const rows = pacingSummary(result);
  const before = previous ? new Map(pacingSummary(previous).map((r) => [`${r.kind}/${r.count}`, r])) : null;
  const ms = (v) => v.toFixed(2);
  const windows = (r) => `${r.longWindows}/${r.windows}`;
  const lines = [
    `# React Native Skia displayed-frame pacing: ${result.label}`,
    "", `${result.device}; ${result.refreshRate}Hz; ${result.skia}; ${result.date}.`,
    "Intervals are between compositor-displayed app surfaces for UI-marked animations plus their bounded display-drain tail, not native handoffs or JS/UI FPS. Warmups and gaps between windows are excluded. No interval is added for idle after the last surface.",
    "Long gap: >1.5 display periods. Windows = bursts or continuous controls with at least one long gap / measured windows. p99 = median of per-trial p99s; max = worst observed interval. Lower is better.", "",
    "First surface = median of per-trial median times from UI animation start to the first displayed app surface; not input latency or proof of the surface's animation value. Reported separately from inter-frame jitter.", "",
  ];
  if (previous) {
    lines.push(`Compared with ${previous.label} (${previous.skia}). A p99 increase >25% and >a quarter display period is flagged; max/gap counts remain visible for rarer outliers.`, "",
      "| Kind | Circles | Long-gap windows before | after | p99 before, ms | after | First surface before, ms | after | Max before, ms | after | |",
      "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
    for (const row of rows) {
      const old = before.get(`${row.kind}/${row.count}`);
      if (!old) throw new Error("Missing baseline pacing workload");
      const significant = Math.abs(row.p99Ms - old.p99Ms) > 1000 / result.refreshRate / 4;
      const verdict = significant && row.p99Ms > old.p99Ms * 1.25 ? "regression" :
        significant && row.p99Ms < old.p99Ms * 0.75 ? "improvement" : "";
      lines.push(`| ${row.kind} | ${row.count} | ${windows(old)} | ${windows(row)} | ${ms(old.p99Ms)} | ${ms(row.p99Ms)} | ${ms(old.firstSurfaceMs)} | ${ms(row.firstSurfaceMs)} | ${ms(old.maxMs)} | ${ms(row.maxMs)} | ${verdict} |`);
    }
  } else {
    lines.push("| Kind | Circles | Trials | Long-gap windows | p99, ms | First surface, ms | Max, ms | UI max, ms |",
      "|---|---:|---:|---:|---:|---:|---:|---:|",
      ...rows.map((r) => `| ${r.kind} | ${r.count} | ${r.trials} | ${windows(r)} | ${ms(r.p99Ms)} | ${ms(r.firstSurfaceMs)} | ${ms(r.maxMs)} | ${ms(r.uiMaxMs)} |`));
  }
  return lines.join("\n");
}
