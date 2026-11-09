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
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

trace, process, seconds = sys.argv[1], sys.argv[2], float(sys.argv[3])


def table(schema):
    # To stdout, and the exit status ignored: on Xcode 27, `xctrace export`
    # writes the whole table and then segfaults on its way out (with
    # `--output <file>` it crashes before flushing the file). What it wrote
    # is complete when it parses.
    # The crash sometimes comes before the output is out: try again.
    root = None
    for attempt in range(12):
        if attempt:
            time.sleep(1)
        out = subprocess.run(
            [
                "xcrun", "xctrace", "export", "--input", trace,
                "--xpath", f'/trace-toc/run[@number="1"]/data/table[@schema="{schema}"]',
            ],
            capture_output=True,
        ).stdout
        try:
            root = ET.fromstring(out)
            break
        except ET.ParseError:
            continue
    if root is None:
        raise RuntimeError(f"xctrace export of {schema} failed 12 times")
    # xctrace writes each distinct value once with an id and refers back to it.
    ids = {}

    def value(el):
        ref = el.get("ref")
        if ref is not None:
            return ids.get(ref, "")
        v = el.get("fmt") or (el.text or "").strip()
        if el.get("id") is not None:
            ids[el.get("id")] = v
        for child in el:
            value(child)
        return v

    cols = [c.findtext("mnemonic") for c in root.iter("col")]
    return [dict(zip(cols, (value(c) for c in row))) for row in root.iter("row")]


surfaces = table("displayed-surfaces-interval")
mine = [r for r in surfaces if f"{process} (" in r.get("event-label", "")]
try:
    thermal = sorted({r.get("thermal-state", "") for r in table("device-thermal-state-intervals")} - {""})
except Exception:
    thermal = []
print(json.dumps({
    "frames": len(mine),
    "fps": round(len(mine) / seconds, 1),
    "swaps": len(surfaces),
    "thermal": thermal,
}))
