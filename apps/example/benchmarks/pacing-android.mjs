// Opt-in Android pacing capture. No changes to the existing FPS/cold runner.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config, configPath, fixture } from "./pacing.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PACKAGE = "com.reactnativeskia.example";

export async function measurePacingAndroid({ sh, python, reps, settle, refreshRate, keepTrace }) {
  const adb = (...args) => sh("adb", args);
  const shell = (...args) => adb("shell", ...args);
  const dir = mkdtempSync(join(tmpdir(), "skia-pacing-android-"));
  const serial = (await adb("get-serialno")).trim();
  const remote = `/data/misc/perfetto-traces/skia-pacing-${Date.now()}.pftrace`;
  const trace = join(dir, "pacing.pftrace");
  const previous = {};
  let tracer;
  let complete = false;
  let cancelled = false;
  let cancelWait;
  const interrupt = () => {
    cancelled = true;
    cancelWait?.(new Error("Android pacing interrupted"));
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  const settings = ["peak_refresh_rate", "min_refresh_rate"];
  const snapshot = async () => {
    const power = (await shell("settings", "get", "global", "low_power")).trim();
    const thermal = (await shell("dumpsys", "thermalservice")).match(/Thermal Status: (\d+)/)?.[1];
    const period = Number((await shell("dumpsys", "SurfaceFlinger", "--latency")).trim().split("\n")[0]);
    if (!["0", "1"].includes(power) || thermal === undefined || !(period > 0)) throw new Error("Missing Android power/thermal/display metadata");
    if (Math.abs(1e9 / period - refreshRate) > 1) throw new Error(`Display is ${1e9 / period}Hz, requested ${refreshRate}Hz`);
    return { lowPower: power === "1", thermal: Number(thermal), periodNs: period };
  };
  const stopTrace = async () => {
    if (!tracer) return;
    // Only signal the PID returned by our own Perfetto invocation, and only
    // while it is still Perfetto. Never stop unrelated recording sessions.
    const name = await shell("ps", "-p", String(tracer), "-o", "NAME").catch(() => "");
    if (name.includes("perfetto")) await shell("kill", "-TERM", String(tracer));
    for (let i = 0; i < 40; i++) {
      const alive = await shell("ps", "-p", String(tracer), "-o", "NAME").catch(() => "");
      if (!alive.includes("perfetto")) { tracer = undefined; return; }
      await sleep(250);
    }
    throw new Error("Perfetto did not finish flushing");
  };
  try {
    if ((await shell("getprop", "ro.kernel.qemu")).trim() === "1") throw new Error("Pacing requires a real Android device");
    const sdk = Number((await shell("getprop", "ro.build.version.sdk")).trim());
    if (sdk < 33) throw new Error("Android SurfaceView pacing test requires API 33+");
    const pkg = await shell("dumpsys", "package", PACKAGE);
    if (/flags=\[[^\]]*DEBUGGABLE/.test(pkg)) throw new Error("Installed benchmark must be native Release");
    for (const key of settings) previous[key] = (await shell("settings", "get", "system", key)).trim();
    previous.stay = (await shell("settings", "get", "global", "stay_on_while_plugged_in")).trim();
    await shell("settings", "put", "system", "min_refresh_rate", String(refreshRate));
    await shell("settings", "put", "system", "peak_refresh_rate", String(refreshRate));
    await shell("svc", "power", "stayon", "true");
    await shell("input", "keyevent", "KEYCODE_WAKEUP");
    await shell("wm", "dismiss-keyguard");
    const activity = (await shell("cmd", "package", "resolve-activity", "--brief", "-c", "android.intent.category.LAUNCHER", PACKAGE)).trim().split("\n").at(-1);
    const launch = async () => {
      await shell("am", "force-stop", PACKAGE);
      await shell("am", "start", "-W", "-n", activity);
    };
    await launch();
    await sleep(12000); // Warm native/GPU setup outside the accepted capture.
    if (cancelled) throw new Error("Android pacing interrupted");
    await shell("am", "force-stop", PACKAGE);
    const before = await snapshot();
    const perRep = config.counts.length * (config.loadSettleMs + (config.warmups + config.bursts) * (config.burstMs + config.idleMs)) + config.loadSettleMs + config.continuousMs + config.idleMs;
    const timeoutMs = Math.ceil(settle * 1000 + reps * perRep + 60000);
    const traceConfig = `buffers { size_kb: 65536 fill_policy: DISCARD }\n` +
      `data_sources { config { name: "android.surfaceflinger.frame" } }\n` +
      `data_sources { config { name: "android.log" android_log_config { log_ids: LID_DEFAULT filter_tags: "ReactNativeJS" } } }\n` +
      `duration_ms: ${timeoutMs + 5000}\n`;
    const started = await sh("adb", ["shell", "perfetto", "--background-wait", "--txt", "-c", "-", "-o", remote], { input: traceConfig });
    tracer = Number(started.trim().split("\n").find((line) => /^\d+$/.test(line)));
    if (!Number.isInteger(tracer) || tracer <= 0) throw new Error("Perfetto returned no recorder PID");
    await launch();
    const pid = Number((await shell("pidof", PACKAGE)).trim());
    if (!Number.isInteger(pid) || pid <= 0) throw new Error("No benchmark process after launch");
    console.log(`[bench] Android SurfaceView pacing; PID ${pid}, ${refreshRate}Hz; leave foreground`);
    // Logcat arrival only bounds collection. Every reported time comes from
    // Perfetto's synchronized event clock, never this host-side monitor.
    await new Promise((resolve, reject) => {
      const monitor = spawn("adb", ["-s", serial, "logcat", "--pid", String(pid), "-T", "1", "-v", "raw", "ReactNativeJS:E", "*:S"]);
      let pending = "", settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true; clearTimeout(timer); monitor.kill();
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(() => finish(new Error("Timed out waiting for pacing completion")), timeoutMs);
      cancelWait = finish;
      if (cancelled) finish(new Error("Android pacing interrupted"));
      monitor.on("error", finish);
      monitor.on("exit", () => { if (!settled) finish(new Error("Benchmark log monitor exited early")); });
      monitor.stdout.on("data", (chunk) => {
        pending += chunk;
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        for (const line of lines) {
          const payload = line.split("[bench-pacing] ")[1];
          if (!payload) continue;
          if (payload.startsWith("failed:")) { finish(new Error(payload)); return; }
          try {
            const event = JSON.parse(payload);
            if (event.fixture === fixture && event.event === "done") finish();
          } catch { /* Non-marker log messages cannot complete the capture. */ }
        }
      });
    });
    const after = await snapshot();
    if (before.lowPower !== after.lowPower) throw new Error("Power mode changed during capture");
    await sleep(2000);
    await stopTrace();
    await adb("pull", remote, trace);
    const data = JSON.parse(await sh(python, [join(here, "pacing-android.py"), trace, PACKAGE, String(pid), fixture, configPath, String(reps), String(refreshRate)]));
    if (cancelled) throw new Error("Android pacing interrupted");
    data.lowPowerMode = before.lowPower;
    data.thermal = [...new Set([before.thermal, after.thermal])].map(String);
    data.thermalCoverage = "Android thermal status endpoints";
    data.deviceState = { before, after };
    data.traceRequested = true; data.traceRecorded = true;
    complete = true;
    return { device: `${(await shell("getprop", "ro.product.model")).trim()} (Android ${(await shell("getprop", "ro.build.version.release")).trim()}, API ${sdk})`,
      deviceId: createHash("sha256").update(serial).digest("hex"), ...data };
  } finally {
    await stopTrace().catch((error) => console.warn(error.message));
    await shell("am", "force-stop", PACKAGE).catch((error) => console.warn(error.message));
    for (const key of settings) if (previous[key] !== undefined) {
      await shell("settings", previous[key] === "null" ? "delete" : "put", "system", key,
        ...(previous[key] === "null" ? [] : [previous[key]])).catch((error) => console.warn(error.message));
    }
    if (previous.stay !== undefined) await shell("settings", previous.stay === "null" ? "delete" : "put", "global", "stay_on_while_plugged_in",
      ...(previous.stay === "null" ? [] : [previous.stay])).catch((error) => console.warn(error.message));
    if (complete && !keepTrace) {
      await shell("rm", "-f", remote);
      rmSync(dir, { recursive: true, force: true });
    } else console.log(`[bench] Android pacing trace retained: ${trace}`);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}
