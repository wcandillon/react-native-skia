#!/usr/bin/env python3
"""Frames SurfaceFlinger presented for a package's SurfaceView, from a perfetto trace.

Usage: present-frames-android.py <trace.pftrace> <package>

Reads a trace recorded with the `android.surfaceflinger.frame` data source
(see run.mjs) and prints one JSON object:
{"frames": <n>, "source": "SurfaceView"|"window", "tracks": [...]}. A frame
counts once its present fence signalled, i.e. the display took it; queued
but dropped frames do not count. A SurfaceView canvas has a layer of its
own; a TextureView canvas draws through the window, whose frames then count.

Needs the `perfetto` package (TraceProcessor); it downloads
trace_processor_shell on first use. Set it up once with
`python3 -m venv benchmarks/.venv && benchmarks/.venv/bin/pip install perfetto`;
run.mjs picks benchmarks/.venv/bin/python up by itself (or set BENCH_PYTHON).
"""
import json
import sys

from perfetto.trace_processor import TraceProcessor

trace, package = sys.argv[1], sys.argv[2]
tp = TraceProcessor(trace=trace)
def presented(track_filter):
    return list(
        tp.query(
            f"""
            select t.name as track, count(*) as frames
            from frame_slice s join track t on s.track_id = t.id
            where {track_filter}
              and s.name = 'PresentFenceSignaled'
            group by t.name
            """
        )
    )

# The canvas's own SurfaceView layer; failing that (a TextureView canvas, as
# before the backingView prop), the app's window layer, which then carries
# the canvas frames since the view hierarchy redraws for each one.
source = "SurfaceView"
rows = presented(f"t.name like '%SurfaceView[{package}/%'")
if not rows:
    source = "window"
    rows = presented(f"t.name like '%{package}/%' and t.name not like '%SurfaceView%'")
print(json.dumps({"frames": sum(r.frames for r in rows), "source": source, "tracks": [r.track for r in rows]}))
