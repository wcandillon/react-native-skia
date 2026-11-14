"""Shared strict UI-window attribution; clocks are supplied by each platform."""
import bisect
import math


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
