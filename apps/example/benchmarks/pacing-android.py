#!/usr/bin/env python3
"""SurfaceView present fences and synchronous UI markers in Perfetto's clock."""
import argparse
import json
import math
import re
from pathlib import Path

from pacing_common import analyze_events

PREFIX = "[bench-pacing] "
SOURCE = "android-surfaceflinger-present-fence-v1"


def analyze_capture(frames, logs, fixture, config, reps, hz, pid, stats=()):
    for row in stats:
        # Perfetto v59's derived GPU duration lanes can accumulate unmatched
        # scopes until SliceTracker's per-track depth limit (512). These
        # lanes are not Queue/PresentFenceSignaled inputs. Exempt only this
        # proven scope; preserve the diagnostic, never blanket-ignore errors.
        gpu_only = (row.get("name") == "slice_max_depth_exceeded" and
                    row.get("source") == "analysis" and
                    bool(row.get("atDepthLimit")) and
                    all(isinstance(track, str) and track.startswith("GPU_") for track in row["atDepthLimit"]))
        if row["value"] > 0 and not gpu_only:
            raise ValueError("Perfetto reported trace errors/data loss")
    # Perfetto has a separate track for each buffer slot of one SurfaceView.
    # Attribution belongs to the layer, not to any one of those tracks.
    layers = {row["layer"] for row in frames}
    if len(layers) != 1:
        raise ValueError("Expected exactly one benchmark SurfaceView layer; no window fallback")
    stamps, queued = {}, {}
    for row in frames:
        frame, at = row["frame"], row["ts"]
        if type(frame) is not int or frame < 0 or type(at) is not int or at <= 0:
            raise ValueError("Invalid SurfaceFlinger frame/timestamp")
        target = queued if row.get("stage") == "Queue" else stamps
        if frame in target:
            raise ValueError("Duplicate presentation feedback for a surface buffer")
        target[frame] = at
    events, session = [], None
    for row in sorted(logs, key=lambda r: r["ts"]):
        if row["pid"] != pid or PREFIX not in row["msg"]:
            continue
        payload = row["msg"].split(PREFIX, 1)[1]
        if payload.startswith("failed:"):
            raise ValueError(payload)
        event = json.loads(payload)
        if event.get("fixture") != fixture:
            raise ValueError("Installed benchmark fixture is stale")
        if event.get("jsDevelopment") is not False:
            raise ValueError("Android pacing requires Release JS")
        owner = event.get("session")
        if not isinstance(owner, str) or not owner:
            raise ValueError("Missing benchmark session")
        if session is not None and session != owner:
            raise ValueError("Multiple benchmark sessions in one capture")
        session = owner
        at = row["ts"]
        if type(at) is not int or at <= 0:
            raise ValueError("Invalid UI marker clock")
        if event.get("event") == "end":
            gap, samples = event.get("uiMaxGapMs"), event.get("uiSamples")
            if type(gap) not in (int, float) or not math.isfinite(gap) or gap < 0 or type(samples) is not int or samples < 1:
                raise ValueError("Invalid UI timing counters")
        events.append((at / 1e6, event))
    # Both sources have already been synchronized by Perfetto. Never align
    # clocks by adb arrival, Date.now(), first-frame guesses, or logcat receipt.
    data = analyze_events(sorted(set(at / 1e6 for at in stamps.values())),
                          events, fixture, config, reps, hz)
    for frame, at in queued.items():
        if frame in stamps and stamps[frame] < at:
            raise ValueError("Presentation predates the queued buffer")
    for run in data["runs"]:
        relevant = [frame for frame, at in queued.items()
                    if run["startMs"] <= at / 1e6 <= run["endMs"]]
        if any(frame in stamps and stamps[frame] / 1e6 >= run["drainEndMs"] for frame in relevant):
            raise ValueError("Queued presentation exceeds the configured drain")
        # Absence of a fence may mean an unshown buffer or missing feedback;
        # retain the count, without pretending these are confirmed drops.
        run["unmatchedQueuedBuffers"] = sum(frame not in stamps for frame in relevant)
    data.update(measurement=SOURCE, configuration="Release", jsDevelopment=False,
                androidCapture={"pid": pid, "session": session, "frames": frames,
                                "markers": logs, "traceStats": list(stats)})
    return data


def read_trace(trace, package, pid):
    from perfetto.trace_processor import TraceProcessor
    if not re.fullmatch(r"[A-Za-z0-9_.]+", package):
        raise ValueError("Invalid package")
    with TraceProcessor(trace=trace) as tp:
        frames = [dict(ts=int(r.ts), frame=int(r.frame_number), layer=r.layer_name,
                       trackId=int(r.track_id), track=r.track, stage=r.stage)
                  for r in tp.query(f"""
                    select s.ts, s.frame_number, s.track_id, s.layer_name,
                           t.name as track, s.name as stage
                    from frame_slice s join track t on s.track_id=t.id
                    where instr(s.layer_name, 'SurfaceView[{package}/') > 0
                      and s.name in ('Queue','PresentFenceSignaled') order by s.ts
                  """)]
        logs = [dict(ts=int(r.ts), pid=int(r.pid), tid=int(r.tid), msg=r.msg)
                for r in tp.query(f"""
                  select l.ts, l.msg, t.tid, p.pid from android_logs l
                  join thread t using(utid) join process p using(upid)
                  where p.pid={int(pid)} and instr(l.msg, '{PREFIX}') > 0
                  order by l.ts
                """)]
        stats = [dict(name=r.name, value=int(r.value), source=r.source) for r in tp.query("""
          select name,value,source from stats
          where severity in ('error','data_loss') and value > 0
        """)]
        if any(row["name"] == "slice_max_depth_exceeded" for row in stats):
            # Inspect every slice track, not just the chosen app layer. Any
            # depth-limited buffer/event lane leaves the error fatal.
            deep = [r.track for r in tp.query("""
              select t.name as track from slice s join track t on s.track_id=t.id
              group by t.id having max(s.depth) >= 511
            """)]
            for row in stats:
                if row["name"] == "slice_max_depth_exceeded":
                    row["atDepthLimit"] = deep
    return frames, logs, stats


def main():
    parser = argparse.ArgumentParser()
    for name in ("trace", "package", "pid", "fixture", "config", "reps", "hz"):
        parser.add_argument(name)
    args = parser.parse_args()
    frames, logs, stats = read_trace(args.trace, args.package, int(args.pid))
    result = analyze_capture(frames, logs, args.fixture,
                             json.loads(Path(args.config).read_text()),
                             int(args.reps), float(args.hz), int(args.pid), stats)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
