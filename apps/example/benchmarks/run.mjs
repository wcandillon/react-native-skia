#!/usr/bin/env node
// Performance regression benchmark for React Native Skia, on a real device.
//
//   node benchmarks/run.mjs --platform android|ios [--scenes shapes,paths]
//        [--reps 2] [--gap 20] [--backing surface|texture] [--label main]
//        [--no-build] [--compare benchmarks/results/<file>.json]
//
// Builds a Release example app whose bundle carries the run plan (SKIA_BENCH,
// see src/Examples/Benchmark/plan.ts), installs it, launches it, and measures
// each scene of the plan while the app runs it on its own:
//
// - Present FPS: frames the system compositor showed for the canvas, the only
//   throughput number (Skia renders off the JS and UI threads, so their FPS
//   says nothing about it). Android: a perfetto trace of SurfaceFlinger's
//   frame events (present-frames-android.py). iOS: a Metal System Trace's
//   displayed surfaces (present-frames-ios.py).
// - Android only: JS/UI thread FPS from the app's [bench] ticks, per-thread
//   CPU, and the thermal status. React Native's console.log does not reach
//   the host in an iOS Release build, so on iOS the runner follows the plan's
//   fixed schedule instead of the app's log lines.
//
// Results go to benchmarks/results/ (git-ignored) as JSON plus a Markdown
// table; --compare prints the change against an earlier result and flags
// scenes that lost more than 10% of their present FPS. See README.md for
// device preparation: a run on an emulator or a simulator measures their
// software renderers, not React Native Skia.
import { execFile, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const exampleDir = dirname(here);
const resultsDir = join(here, "results");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const arg = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback;
};
const PLATFORM = arg("platform", "android");
const ALL_SCENES = ["shapes", "images", "shader", "pattern", "paths", "text"];
const SCENES = arg("scenes", ALL_SCENES.join(",")).split(",");
const REPS = Number(arg("reps", "1"));
const GAP = Number(arg("gap", "0"));
const BACKING = arg("backing", "surface");
const LABEL = arg("label", "local");
const COMPARE = arg("compare", null);
// The app's schedule (src/Examples/Benchmark/index.tsx): 28 s per scene, the
// rotation starts at 3.5 s. Measurements start once it has run for a while.
const SCENE_SECONDS = 28;
const TRACE_SECONDS = 8;
const TRACE_AT_SECONDS = 9;
const SETTLE_TICKS = 4;
const HZ = 100; // Linux USER_HZ

if (!["android", "ios"].includes(PLATFORM)) {
  throw new Error("--platform must be android or ios");
}
for (const scene of SCENES) {
  if (!ALL_SCENES.includes(scene)) {
    throw new Error(`unknown scene ${scene} (${ALL_SCENES.join(", ")})`);
  }
}

const sh = (cmd, cmdArgs, opts = {}) =>
  new Promise((resolve, reject) =>
    execFile(
      cmd,
      cmdArgs,
      { maxBuffer: 256 * 1024 * 1024, ...opts },
      (error, stdout, stderr) =>
        error
          ? reject(
              new Error(
                `${cmd} ${cmdArgs.join(" ")}: ${(stderr || error.message)
                  .trim()
                  .split("\n")
                  .slice(-3)
                  .join(" | ")}`
              )
            )
          : resolve(stdout.toString())
    )
  );
const quiet = (p) => p.catch(() => null);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const median = (values) => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
// The interpreter for the present-frames scripts. The Android one needs the
// `perfetto` package: BENCH_PYTHON, else benchmarks/.venv when it exists.
const PYTHON =
  process.env.BENCH_PYTHON ??
  (existsSync(join(here, ".venv", "bin", "python"))
    ? join(here, ".venv", "bin", "python")
    : "python3");

// ---- build -----------------------------------------------------------------

const plan = `scenes=${SCENES.join(",")}&reps=${REPS}&gap=${GAP}&backing=${BACKING}&autostart=1`;

// Bundles the plan into dist/, where the native build embeds it, and returns
// a function that puts back the bundle that was there: dist/ also feeds the
// everyday builds, which must not start the benchmark at launch.
async function bundle(platform) {
  console.log(`[bench] bundling for ${platform}: ${plan}`);
  mkdirSync(join(exampleDir, "dist"), { recursive: true });
  const file = join(exampleDir, "dist", `main.${platform}.jsbundle`);
  const saved = existsSync(file) ? readFileSync(file) : null;
  const restore = () => {
    if (saved) {
      writeFileSync(file, saved);
    } else {
      rmSync(file, { force: true });
    }
  };
  const out =
    platform === "android"
      ? ["--bundle-output", "dist/main.android.jsbundle", "--assets-dest", "dist/res"]
      : ["--bundle-output", "dist/main.ios.jsbundle", "--assets-dest", "dist"];
  // --reset-cache: the plan is inlined by a Babel plugin, which Metro's
  // transform cache does not know depends on the environment.
  await sh(
    "npx",
    ["react-native", "bundle", "--entry-file", "index.js", "--platform", platform, "--dev", "false", "--reset-cache", ...out],
    { cwd: exampleDir, env: { ...process.env, SKIA_BENCH: plan } }
  ).catch((e) => {
    restore();
    throw e;
  });
  return restore;
}

// ---- Android ---------------------------------------------------------------

const PACKAGE = "com.reactnativeskia.example";
const adb = (...a) => quiet(sh("adb", a));

async function buildAndroid() {
  const restore = await bundle("android");
  console.log("[bench] gradle assembleRelease");
  try {
    await sh("./gradlew", ["assembleRelease", "--console=plain", "-q"], {
      cwd: join(exampleDir, "android"),
    });
  } finally {
    restore();
  }
  const apk = join(exampleDir, "android/app/build/outputs/apk/release/app-release.apk");
  console.log("[bench] installing");
  // Pixel phones may hold `adb install` behind a Play Protect dialog ("Send
  // app for a security check?"): answer "Don't send" when it shows up.
  const install = sh("adb", ["install", "-r", "-d", apk]);
  let done = false;
  install.finally(() => (done = true)).catch(() => {});
  while (!done) {
    await sleep(3);
    const top = await adb("shell", "dumpsys activity activities | grep -m1 topResumedActivity");
    if (top?.includes("PlayProtect")) {
      console.log("[bench] dismissing the Play Protect dialog");
      const ui = await adb("exec-out", "uiautomator dump /dev/tty");
      const node = ui?.match(/text="Don(?:'|&apos;)t send"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if (node) {
        const [x, y] = [(+node[1] + +node[3]) / 2, (+node[2] + +node[4]) / 2];
        await adb("shell", "input", "tap", String(x), String(y));
      }
    }
  }
  await install;
}

const PERFETTO_CONFIG =
  "buffers { size_kb: 32768 fill_policy: RING_BUFFER }\n" +
  'data_sources { config { name: "android.surfaceflinger.frame" } }\n' +
  `duration_ms: ${TRACE_SECONDS * 1000}\n`;

async function presentAndroid() {
  const onDevice = "/data/misc/perfetto-traces/skia-bench.pftrace";
  await new Promise((resolve, reject) => {
    const child = execFile("adb", ["shell", "perfetto", "-c", "-", "--txt", "-o", onDevice], (e) =>
      e ? reject(e) : resolve()
    );
    child.stdin.end(PERFETTO_CONFIG);
  });
  const dir = mkdtempSync(join(tmpdir(), "skia-bench-"));
  try {
    const local = join(dir, "trace.pftrace");
    await sh("adb", ["pull", onDevice, local]);
    const out = await sh(PYTHON, [join(here, "present-frames-android.py"), local, PACKAGE]);
    const { frames, source } = JSON.parse(out.trim().split("\n").at(-1));
    return { fps: frames / TRACE_SECONDS, source };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function threadSnapshot() {
  const out = await adb("shell", `cat /proc/uptime; pid=$(pidof ${PACKAGE}); for t in /proc/$pid/task/*; do cat $t/stat; done 2>/dev/null`);
  const at = Number(out?.match(/^(\d+\.\d+) /m)?.[1]);
  const ticks = new Map();
  for (const line of (out ?? "").split("\n")) {
    const m = line.match(/^(\d+) \((.*)\) (.*)$/);
    if (m) {
      const f = m[3].trim().split(/\s+/);
      ticks.set(m[1], { name: m[2], ticks: Number(f[11]) + Number(f[12]) });
    }
  }
  return { at, ticks };
}

// Per-thread CPU over 8 s, pool threads grouped by name (index dropped).
async function threadsAndroid() {
  const a = await threadSnapshot();
  await sleep(TRACE_SECONDS);
  const b = await threadSnapshot();
  const wall = b.at - a.at;
  const groups = {};
  if (!(wall > 1)) {
    return groups;
  }
  for (const [tid, t] of b.ticks) {
    const before = a.ticks.get(tid);
    if (before) {
      const name =
        t.name === PACKAGE.slice(-15) ? "UI" : t.name === "mqt_v_js" ? "JS" : t.name.replace(/[\s:_-]*[\d_]+$/, "");
      groups[name] = (groups[name] ?? 0) + ((t.ticks - before.ticks) / HZ / wall) * 100;
    }
  }
  return groups;
}

async function measureAndroid() {
  const sdk = Number((await adb("shell", "getprop", "ro.build.version.sdk"))?.trim());
  if (!(sdk >= 37)) {
    console.log(`[bench] warning: Android SDK ${sdk}; the perfetto frame source is only verified on 37+`);
  }
  const model = (await adb("shell", "getprop", "ro.product.model"))?.trim();
  await adb("shell", "am", "force-stop", PACKAGE);
  await adb("logcat", "-c");
  const runs = [];
  let current = null;
  const pendingWork = [];
  await new Promise((resolve, reject) => {
    const logcat = spawn("adb", ["logcat", "-s", "ReactNativeJS:I"]);
    let buffer = "";
    const total = SCENES.length * REPS;
    const timeout = setTimeout(
      () => {
        logcat.kill();
        reject(new Error("timed out waiting for [bench] done"));
      },
      (total * (SCENE_SECONDS + GAP) + 90) * 1000
    );
    logcat.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const start = line.match(/\[bench\] start scene=(\w+) rep=(\d+)/);
        if (start) {
          current = { scene: start[1], rep: Number(start[2]), ticks: [], present: null, threads: {}, thermal: null };
          runs.push(current);
          console.log(`[bench] >> ${current.scene} (rep ${current.rep})`);
          const run = current;
          pendingWork.push(
            (async () => {
              const out = await adb("shell", "dumpsys thermalservice | grep -m1 'Thermal Status'");
              run.thermal = Number(out?.match(/Thermal Status: (\d+)/)?.[1] ?? NaN);
              await sleep(TRACE_AT_SECONDS - 1);
              const [present, threads] = await Promise.all([
                presentAndroid().catch((e) => (console.log(`[bench] present failed: ${e.message}`), null)),
                threadsAndroid(),
              ]);
              run.present = present?.fps ?? null;
              run.presentSource = present?.source ?? null;
              run.threads = threads;
              console.log(`[bench]    ${run.scene} present=${run.present?.toFixed(1)}fps (${run.presentSource})`);
            })()
          );
          continue;
        }
        const tick = line.match(/\[bench\] tick scene=(\w+) js=(\d+) ui=(\d+)/);
        if (tick && current?.scene === tick[1]) {
          current.ticks.push({ js: Number(tick[2]), ui: Number(tick[3]) });
          continue;
        }
        if (line.includes("[bench] done")) {
          clearTimeout(timeout);
          logcat.kill();
          resolve();
        }
      }
    });
    adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
      .then(() => adb("shell", "wm", "dismiss-keyguard"))
      // The launcher activity, whatever its class: react-native-test-app's
      // lives in its own Java package.
      .then(() => adb("shell", "cmd", "package", "resolve-activity", "--brief", "-c", "android.intent.category.LAUNCHER", PACKAGE))
      .then((out) => adb("shell", "am", "start", "-n", out.trim().split("\n").at(-1).trim()));
  });
  await Promise.all(pendingWork);
  return {
    device: `${model} (Android SDK ${sdk})`,
    runs: runs.map((r) => {
      const measured = r.ticks.slice(SETTLE_TICKS);
      return {
        scene: r.scene,
        rep: r.rep,
        present: r.present,
        presentSource: r.presentSource,
        ui: median(measured.map((t) => t.ui)),
        js: median(measured.map((t) => t.js)),
        threads: r.threads,
        thermal: r.thermal,
      };
    }),
  };
}

// ---- iOS -------------------------------------------------------------------

// devicectl and xctrace name the phone differently: the CoreDevice identifier
// for one, the hardware UDID for the other. Found through devicectl only:
// xctrace can list an idle phone as offline until devicectl opened a tunnel.
async function iosDevice() {
  const dir = mkdtempSync(join(tmpdir(), "skia-bench-"));
  try {
    const json = join(dir, "devices.json");
    await sh("xcrun", ["devicectl", "list", "devices", "--json-output", json]);
    const { result } = JSON.parse(readFileSync(json, "utf8"));
    const wanted = arg("device", null);
    const d = result.devices.find(
      (x) =>
        x.hardwareProperties?.deviceType === "iPhone" &&
        x.connectionProperties?.pairingState === "paired" &&
        (wanted == null || [x.identifier, x.hardwareProperties?.udid].includes(wanted))
    );
    if (!d) {
      throw new Error("no paired iPhone (xcrun devicectl list devices)");
    }
    return {
      udid: d.hardwareProperties.udid,
      id: d.identifier,
      label: `${d.hardwareProperties?.marketingName} (iOS ${d.deviceProperties?.osVersionNumber})`,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const IOS_APP = join(exampleDir, "ios/build/Build/Products/Release-iphoneos/ReactTestApp.app");

// The generated test app project names no team: --team (and --bundle-id, an
// id with a development profile on this Mac) sign it for the phone.
const signing = [
  ...(arg("team", process.env.BENCH_IOS_TEAM) ? [`DEVELOPMENT_TEAM=${arg("team", process.env.BENCH_IOS_TEAM)}`, "CODE_SIGN_STYLE=Automatic"] : []),
  ...(arg("bundle-id", process.env.BENCH_IOS_BUNDLE_ID) ? [`PRODUCT_BUNDLE_IDENTIFIER=${arg("bundle-id", process.env.BENCH_IOS_BUNDLE_ID)}`] : []),
  "-allowProvisioningUpdates",
];

async function buildIos(device) {
  const restore = await bundle("ios");
  console.log("[bench] xcodebuild Release");
  try {
    await sh(
      "xcodebuild",
      ["-workspace", "ios/example.xcworkspace", "-scheme", "example", "-configuration", "Release", "-sdk", "iphoneos",
        "-destination", `id=${device.udid}`, "-derivedDataPath", "ios/build", ...signing, "build"],
      { cwd: exampleDir }
    );
  } finally {
    restore();
  }
  console.log("[bench] installing");
  await sh("xcrun", ["devicectl", "device", "install", "app", "--device", device.id, IOS_APP]);
}

async function presentIos(device, pid, label) {
  const dir = mkdtempSync(join(tmpdir(), "skia-bench-"));
  try {
    const trace = join(dir, "bench.trace");
    // Keeps the device tunnel open: without a devicectl call shortly before,
    // xctrace can wait for an idle phone "to boot" and time out.
    await quiet(sh("xcrun", ["devicectl", "device", "info", "lockState", "--device", device.id]));
    await sh("xcrun", ["xctrace", "record", "--template", "Metal System Trace", "--device", device.udid,
      "--attach", String(pid), "--time-limit", `${TRACE_SECONDS}s`, "--output", trace]);
    const out = await sh("python3", [join(here, "present-frames-ios.py"), trace, label, String(TRACE_SECONDS)]);
    return JSON.parse(out.trim().split("\n").at(-1));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function measureIos(device) {
  const plist = join(IOS_APP, "Info.plist");
  const bundleId = (await sh("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", plist])).trim();
  // The display labels a frame with the app's name, which can differ from its
  // executable (the test app's executable is ReactTestApp, its name example).
  const plistValue = async (key) => quiet(sh("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plist])).then((v) => v?.trim() || null);
  const label = (await plistValue("CFBundleDisplayName")) ?? (await plistValue("CFBundleName")) ?? (await plistValue("CFBundleExecutable"));
  const dir = mkdtempSync(join(tmpdir(), "skia-bench-"));
  // Traces attach by pid: xctrace does not always find the app by name.
  const launch = async () => {
    const json = join(dir, "launch.json");
    await sh("xcrun", ["devicectl", "device", "process", "launch", "--device", device.id, "--terminate-existing", "--json-output", json, bundleId]);
    return JSON.parse(readFileSync(json, "utf8")).result?.process?.processIdentifier;
  };
  // A first launch after an install is slow (shader caches, dyld): spend it
  // on a warm-up, so the measured launch starts like any later one.
  console.log("[bench] warm-up launch");
  await launch();
  await sleep(12);
  const pid = await launch();
  rmSync(dir, { recursive: true, force: true });
  // The plan runs on the app's own timers from here: scene i starts about
  // i * (28 s + gap) after the launch, give or take the bundle load.
  const t0 = Date.now() + 1500;
  const runs = [];
  let i = 0;
  for (let rep = 1; rep <= REPS; rep++) {
    for (const scene of SCENES) {
      const at = t0 + (i * (SCENE_SECONDS + GAP) + TRACE_AT_SECONDS) * 1000;
      await sleep(Math.max(0, (at - Date.now()) / 1000));
      console.log(`[bench] >> ${scene} (rep ${rep})`);
      const out = await presentIos(device, pid, label).catch((e) => (console.log(`[bench] present failed: ${e.message}`), null));
      console.log(`[bench]    ${scene} present=${out?.fps}fps thermal=${out?.thermal?.join(",")}`);
      runs.push({ scene, rep, present: out?.fps ?? null, swaps: out ? out.swaps / TRACE_SECONDS : null, thermal: out?.thermal ?? [] });
      i++;
    }
  }
  return { device: device.label, runs };
}

// ---- report ----------------------------------------------------------------

function summarize(result) {
  const byScene = new Map();
  for (const run of result.runs) {
    if (!byScene.has(run.scene)) {
      byScene.set(run.scene, []);
    }
    byScene.get(run.scene).push(run);
  }
  return [...byScene].map(([scene, runs]) => ({
    scene,
    present: median(runs.map((r) => r.present).filter((v) => v != null)),
    reps: runs.map((r) => (r.present == null ? "?" : r.present.toFixed(1))).join(" / "),
    ui: median(runs.map((r) => r.ui).filter((v) => v != null)),
    js: median(runs.map((r) => r.js).filter((v) => v != null)),
    threads: Object.entries(runs.at(-1).threads ?? {})
      .filter(([name, p]) => name !== "UI" && name !== "JS" && p >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, p]) => `${name} ${p.toFixed(0)}`)
      .join(", "),
    thermal: [...new Set(runs.flatMap((r) => (Array.isArray(r.thermal) ? r.thermal : [r.thermal])).filter((v) => v != null && v === v))].join(", "),
  }));
}

function report(result, previous) {
  const rows = summarize(result);
  const before = previous ? new Map(summarize(previous).map((r) => [r.scene, r])) : null;
  const fmt = (v, digits = 1) => (v == null ? "?" : v.toFixed(digits));
  const lines = [
    `# React Native Skia benchmark: ${result.label}, ${result.platform}`,
    "",
    `${result.device}, react-native-skia ${result.skia}, ${result.date}. Plan: \`${result.plan}\`.`,
    `Present FPS is the median over reps of frames the compositor showed (${TRACE_SECONDS} s per scene).`,
    "",
  ];
  if (before) {
    lines.push(
      `Compared with ${previous.label} (${previous.skia}, ${previous.date}); a drop of more than 10% is flagged.`,
      "",
      "| scene | before | after | change | |",
      "|---|---|---|---|---|",
      ...rows.map((r) => {
        const b = before.get(r.scene)?.present;
        const change = b && r.present != null ? (r.present / b - 1) * 100 : null;
        const verdict = change == null ? "" : change < -10 ? "regression" : change > 10 ? "improvement" : "";
        return `| ${r.scene} | ${fmt(b)} | ${fmt(r.present)} | ${change == null ? "?" : `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`} | ${verdict} |`;
      }),
      ""
    );
  }
  lines.push(
    result.platform === "android"
      ? "| scene | Present FPS | per rep | UI FPS | JS FPS | busiest threads (% of a core) | thermal |"
      : "| scene | Present FPS | per rep | thermal |",
    result.platform === "android" ? "|---|---|---|---|---|---|---|" : "|---|---|---|---|",
    ...rows.map((r) =>
      result.platform === "android"
        ? `| ${r.scene} | ${fmt(r.present)} | ${r.reps} | ${fmt(r.ui, 0)} | ${fmt(r.js, 0)} | ${r.threads} | ${r.thermal} |`
        : `| ${r.scene} | ${fmt(r.present)} | ${r.reps} | ${r.thermal} |`
    )
  );
  return lines.join("\n");
}

// ---- main ------------------------------------------------------------------

const skia = JSON.parse(readFileSync(join(exampleDir, "../../packages/skia/package.json"), "utf8"));
const git = (await quiet(sh("git", ["rev-parse", "--short", "HEAD"], { cwd: exampleDir })))?.trim();
const dirty = (await quiet(sh("git", ["status", "--porcelain", "--", "../../packages/skia"], { cwd: exampleDir })))?.trim();
const skiaVersion = `${git ?? "?"}${dirty ? "+dirty" : ""}`;

let measured;
if (PLATFORM === "android") {
  if (!flag("no-build")) {
    await buildAndroid();
  }
  measured = await measureAndroid();
} else {
  const device = await iosDevice();
  if (!flag("no-build")) {
    await buildIos(device);
  }
  measured = await measureIos(device);
}

const result = {
  label: LABEL,
  platform: PLATFORM,
  skia: `${skia.name} ${skiaVersion}`,
  date: new Date().toISOString(),
  plan,
  ...measured,
};
const previous = COMPARE ? JSON.parse(readFileSync(COMPARE, "utf8")) : null;
const table = report(result, previous);
mkdirSync(resultsDir, { recursive: true });
const base = join(resultsDir, `${LABEL}-${PLATFORM}-${result.date.replace(/[:.]/g, "-")}`);
writeFileSync(`${base}.json`, JSON.stringify(result, null, 2) + "\n");
writeFileSync(`${base}.md`, table + "\n");
console.log(`\n${table}\n`);
console.log(`[bench] wrote ${base}.json`);
const regressions = previous && table.includes("| regression |");
process.exit(regressions ? 1 : 0);
