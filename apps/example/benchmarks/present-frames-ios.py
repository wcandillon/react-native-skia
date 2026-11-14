#!/usr/bin/env python3
"""Frames the display showed for a process, from an Instruments trace.

Usage: present-frames-ios.py <trace.trace> <process name> <seconds>

Reads the `displayed-surfaces-interval` table of a Metal System Trace
(recorded by run.mjs) and prints one JSON object:
{"frames": <n>, "fps": <frames/seconds>, "swaps": <all display swaps>,
 "thermal": [<thermal states seen>]}. A frame counts when the display swapped
in a surface the process presented, directly or through the compositor.
`swaps` counts every swap, whoever drew it: with only the canvas animating
the two agree, and a gap between them means something else was redrawing.
Python standard library only.
"""
import json
import sys
from trace_ios import table


trace, process, seconds = sys.argv[1], sys.argv[2], float(sys.argv[3])
surfaces = table(trace, "displayed-surfaces-interval")
mine = [r for r in surfaces if f"{process} (" in r.get("event-label", "")]
try:
    thermal = sorted({r.get("thermal-state", "") for r in table(trace, "device-thermal-state-intervals")} - {""})
except Exception:
    thermal = []
print(json.dumps({
    "frames": len(mine),
    "fps": round(len(mine) / seconds, 1),
    "swaps": len(surfaces),
    "thermal": thermal,
}))
