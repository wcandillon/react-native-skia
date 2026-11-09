#!/usr/bin/env python3
"""Displayed-frame pacing for UI-marked animations and their display-drain tails."""
import bisect
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


def analyze(surfaces, logs, process, fixture, config, reps, hz):
    if not math.isfinite(hz) or hz <= 0 or reps < 1:
        raise ValueError("Invalid display rate/repetitions")
    mine = [r for r in surfaces if process in r["event-label"]["formatted"]]
    if not mine:
        raise ValueError("No displayed surfaces for the benchmark process")
    displays = {r.get("display-name", {}).get("formatted") for r in mine}
    if len(displays) != 1:
        raise ValueError("Ambiguous displays; measure one display at a time")
    times = sorted({timestamp(r, "start") for r in mine})
    events = []
    for row in logs:
        if row.get("process", {}).get("formatted") != process:
            continue
        message = row.get("message", {}).get("formatted", "")
        if PREFIX not in message:
            continue
        event = json.loads(message.split(PREFIX, 1)[1])
        if event.get("fixture") != fixture:
            raise ValueError("Installed benchmark does not match the requested fixture")
        events.append((timestamp(row, "time"), event))
    events.sort(key=lambda x: x[0])

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
                "durationMs": at - start, "displayDrainMs": config["idleMs"], "intervalsMs": gaps,
                "longGaps": sum(gap > 1.5 * 1000 / hz for gap in gaps),
                # Boundaries are retained separately, not mixed into actual
                # inter-frame intervals or attributed to the intentional idle.
                "firstSurfaceMs": inside[0] - start,
                "lastSurfaceToDrainEndMs": drain_end - inside[-1],
                "uiMaxGapMs": event["uiMaxGapMs"], "uiSamples": event["uiSamples"],
            })
            active = None
        else:
            raise ValueError("Unknown pacing marker")
    if not done:
        raise ValueError("Missing pacing completion marker (trace started late or ended early)")
    return {"mode": "pacing", "fixture": fixture, "refreshRate": hz, "runs": runs}


def main():
    trace, process, fixture, config_path, repetitions, hz = sys.argv[1:]
    config = json.loads(Path(config_path).read_text())
    result = analyze(
        table(trace, "displayed-surfaces-interval", True), table(trace, "os-log", True),
        process, fixture, config, int(repetitions), float(hz),
    )
    try:
        result["thermal"] = sorted({r.get("thermal-state", "") for r in table(trace, "device-thermal-state-intervals")} - {""})
    except Exception:
        result["thermal"] = []
    print(json.dumps(result))


if __name__ == "__main__":
    main()
