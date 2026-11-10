#!/usr/bin/env python3
"""Drawable feedback is primary; Instruments display events are diagnostic only."""
import bisect
import argparse
import json
import math
import sys
from pathlib import Path

from trace_ios import table

PREFIX = "[bench-pacing] "


def timestamp(row, column):
    # xctrace's formatted time is rounded and must never drive the metrics.
    value = float(row[column]["raw"]) / 1_000_000
    if not math.isfinite(value) or value < 0:
        raise ValueError("Invalid trace timestamp")
    return value


def trace_times(surfaces, process):
    mine = [r for r in surfaces if process in r["event-label"]["formatted"]]
    if not mine:
        raise ValueError("No displayed surfaces for the benchmark process")
    displays = {r.get("display-name", {}).get("formatted") for r in mine}
    if len(displays) != 1:
        raise ValueError("Ambiguous displays; measure one display at a time")
    return sorted({timestamp(r, "start") for r in mine})


def trace_events(logs, process, fixture):
    events = []
    for row in logs:
        if row.get("process", {}).get("formatted") != process:
            continue
        message = row.get("message", {}).get("formatted", "")
        if PREFIX not in message:
            continue
        payload = message.split(PREFIX, 1)[1]
        if payload.startswith("failed:"):
            raise ValueError(payload)
        event = json.loads(payload)
        if event.get("fixture") != fixture:
            raise ValueError("Installed benchmark does not match the requested fixture")
        events.append((timestamp(row, "time"), event))
    return sorted(events, key=lambda x: x[0])


def analyze_events(times, events, fixture, config, reps, hz):
    if not math.isfinite(hz) or hz <= 0 or reps < 1:
        raise ValueError("Invalid display rate/repetitions")
    expected = []
    for rep in range(1, reps + 1):
        for count in config["counts"]:
            for i in range(config["warmups"] + config["bursts"]):
                expected.append(dict(rep=rep, count=count, kind="burst", warmup=i < config["warmups"]))
        expected.append(dict(rep=rep, count=1024, kind="continuous", warmup=False))

    active = None
    drain_end = 0
    done = False
    runs = []
    for at, event in events:
        if done:
            raise ValueError("Markers after completion")
        if event["event"] == "done":
            if active is not None or len(runs) != len(expected) or event["samples"] != len(expected) or at < drain_end:
                raise ValueError("Incomplete pacing suite")
            done = True
            continue
        index = len(runs)
        if index >= len(expected) or event.get("id") != index + 1:
            raise ValueError("Duplicate, missing or out-of-order sample")
        if any(event.get(key) != value for key, value in expected[index].items()):
            raise ValueError("Workload/marker mismatch")
        if event["event"] == "begin":
            if active is not None:
                raise ValueError("Overlapping animation markers")
            if at < drain_end:
                raise ValueError("Animation overlaps the previous display-drain window")
            active = (at, event)
        elif event["event"] == "end":
            if active is None or not event.get("finished") or at <= active[0]:
                raise ValueError("Missing/cancelled animation")
            start = active[0]
            intended = config["burstMs"] if event["kind"] == "burst" else config["continuousMs"]
            if at - start < intended - 2 * 1000 / hz:
                raise ValueError("Animation window shorter than the requested workload")
            # UI completion is not display completion: queued buffers can
            # appear later. Include the declared idle to drain those frames,
            # stopping before any following animation/load change. Only
            # actual successive surfaces form intervals; trailing idle adds
            # no synthetic gap, and no pair crosses to the following window.
            drain_end = at + config["idleMs"]
            inside = times[bisect.bisect_left(times, start):bisect.bisect_left(times, drain_end)]
            if len(inside) < 2:
                raise ValueError("Insufficient displayed frames inside an animation window")
            gaps = [b - a for a, b in zip(inside, inside[1:])]
            runs.append({
                **expected[index], "id": index + 1, "frames": len(inside),
                "startMs": start, "endMs": at, "drainEndMs": drain_end,
                "durationMs": at - start, "displayDrainMs": config["idleMs"], "intervalsMs": gaps,
                "longGaps": sum(gap > 1.5 * 1000 / hz for gap in gaps),
                # Boundaries are retained separately, not mixed into actual
                # inter-frame intervals or attributed to the intentional idle.
                "firstPresentationMs": inside[0] - start,
                "lastPresentationToDrainEndMs": drain_end - inside[-1],
                "uiMaxGapMs": event["uiMaxGapMs"], "uiSamples": event["uiSamples"],
            })
            active = None
        else:
            raise ValueError("Unknown pacing marker")
    if not done:
        raise ValueError("Missing pacing completion marker (trace started late or ended early)")
    return {"mode": "pacing", "fixture": fixture, "refreshRate": hz, "runs": runs}


def analyze(surfaces, logs, process, fixture, config, reps, hz):
    """Secondary Instruments diagnostic, also covered by legacy parser tests."""
    return analyze_events(trace_times(surfaces, process), trace_events(logs, process, fixture), fixture, config, reps, hz)


def analyze_native(native, fixture, config, reps, hz, pid, native_hash):
    source = "metal-drawable-presentedTime-v2"
    if (native.get("schema") != 2 or native.get("source") != source or
            native.get("clock") != "CACurrentMediaTime" or native.get("completed") is not True or
            native.get("overflow") != 0):
        raise ValueError("Incomplete/unsupported native presentation feedback")
    if native.get("pid") != pid or native.get("fixture") != fixture or native.get("nativeHash") != native_hash:
        raise ValueError("Stale native process, fixture or implementation; run pod install and rebuild")
    session = native.get("session")
    if not isinstance(session, str) or not session:
        raise ValueError("Missing native capture session")
    events = []
    for marker in native.get("markers", []):
        if not isinstance(marker, list) or len(marker) != 2:
            raise ValueError("Incomplete native UI marker")
        at, event = marker
        if type(at) not in (int, float) or not math.isfinite(at) or at < 0 or not isinstance(event, dict):
            raise ValueError("Invalid native marker clock")
        if event.get("session") != session or event.get("fixture") != fixture:
            raise ValueError("Native/UI session mismatch")
        events.append((at * 1000, event))

    # Native UI log boundaries and drawable feedback already share the host
    # clock. No Instruments discovery, callback-arrival or JS-clock alignment.
    to_ms = lambda seconds: seconds * 1000
    if native.get("columns") != ["drawableId", "acquiredAt", "presentedTime", "callbackAt"]:
        raise ValueError("Unknown native feedback columns")
    frames, ids = [], set()
    for row in native.get("rows", []):
        if not isinstance(row, list) or len(row) != 4:
            raise ValueError("Incomplete native feedback row")
        drawable, acquired, presented, callback = row
        if type(drawable) is not int or drawable < 0 or drawable in ids:
            raise ValueError("Duplicate/invalid drawable ID")
        ids.add(drawable)
        if any(type(v) not in (int, float) or not math.isfinite(v) or v < 0
               for v in (acquired, presented, callback)):
            raise ValueError("Missing/invalid drawable callback")
        if callback <= 0 or callback < acquired or (presented > 0 and not acquired <= presented <= callback):
            raise ValueError("Invalid native presentation clock ordering")
        frames.append((to_ms(acquired), to_ms(presented) if presented > 0 else None))
    # Several drawables assigned the same timestamp represent one display
    # instant, not extra frames. Zero means dropped/not shown, not timestamp 0.
    times = sorted({presented for _, presented in frames if presented is not None})
    data = analyze_events(times, sorted(events, key=lambda x: x[0]), fixture, config, reps, hz)
    for run in data["runs"]:
        relevant = [(a, p) for a, p in frames if run["startMs"] <= a <= run["endMs"]]
        run["droppedDrawables"] = sum(p is None for _, p in relevant)
        if any(p is not None and p >= run["drainEndMs"] for _, p in relevant):
            raise ValueError("Presentation feedback extends beyond the configured drain window")
    stopped = native.get("stoppedAt")
    if type(stopped) not in (int, float) or not math.isfinite(stopped) or to_ms(stopped) < data["runs"][-1]["drainEndMs"]:
        raise ValueError("Native capture stopped before the final drain finished")
    powers = [native.get(key) for key in ("lowPowerAtStart", "lowPowerAtEnd")]
    if any(type(v) is not bool for v in powers) or powers[0] != powers[1]:
        raise ValueError("Invalid/changed Low Power Mode")
    thermal_names = ["Nominal", "Fair", "Serious", "Critical"]
    thermals = [native.get(key) for key in ("thermalAtStart", "thermalAtEnd")]
    if any(type(v) is not int or not 0 <= v < len(thermal_names) for v in thermals):
        raise ValueError("Invalid thermal endpoint metadata")
    data.update(measurement=source, nativeHash=native_hash, nativeCapture=native,
                lowPowerMode=powers[0], thermal=sorted({thermal_names[v] for v in thermals}),
                thermalCoverage="native endpoints")
    return data


def main():
    parser = argparse.ArgumentParser()
    for name in ("native", "fixture", "config", "reps", "hz", "pid", "native_hash"):
        parser.add_argument(name)
    parser.add_argument("--trace")
    parser.add_argument("--process")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    result = analyze_native(
        json.loads(Path(args.native).read_text()), args.fixture, config,
        int(args.reps), float(args.hz), int(args.pid), args.native_hash,
    )
    # Never substitute potentially incomplete trace swaps for drawable feedback.
    # Keep their discrepancies visible, but do not use them for verdicts.
    result["traceDiagnostics"] = {"available": False, "reason": "not requested"}
    if args.trace:
        try:
            diagnostic = analyze(table(args.trace, "displayed-surfaces-interval", True),
                                 table(args.trace, "os-log", True), args.process,
                                 args.fixture, config, int(args.reps), float(args.hz))
            result["traceDiagnostics"] = {"available": True, "runs": diagnostic["runs"]}
        except (ValueError, RuntimeError) as error:
            result["traceDiagnostics"] = {"available": False, "error": str(error)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
