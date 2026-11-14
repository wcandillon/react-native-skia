"""Shared xctrace XML decoding; retain raw nanoseconds as well as labels."""
import subprocess
import time
import xml.etree.ElementTree as ET


def decode(data, detailed=False):
    root = ET.fromstring(data)
    ids = {}

    def value(el):
        ref = el.get("ref")
        if ref is not None:
            if ref not in ids:
                raise ValueError(f"Unresolved xctrace reference {ref}")
            return ids[ref]
        text = (el.text or "").strip()
        cell = {"raw": text, "formatted": el.get("fmt") or text}
        if el.get("id") is not None:
            ids[el.get("id")] = cell
        for child in el:
            value(child)
        return cell

    rows = []
    # A query can return several tables (e.g. Metal's filtered log and the
    # added Logging instrument). Each table has its own column declaration.
    for node in root.findall("node"):
        schema = node.find("schema")
        if schema is None:
            continue
        columns = [col.findtext("mnemonic") for col in schema.findall("col")]
        for row in node.findall("row"):
            cells = [value(cell) for cell in row]
            if len(cells) != len(columns):
                raise ValueError("Incomplete xctrace row")
            rows.append(dict(zip(columns, cells if detailed else [c["formatted"] for c in cells])))
    return rows


def table(trace, schema, detailed=False):
    # Xcode 27 can export complete XML and then crash. Accept a parseable
    # document, not the process exit code; retry incomplete output as before.
    for attempt in range(12):
        if attempt:
            time.sleep(1)
        result = subprocess.run([
            "xcrun", "xctrace", "export", "--input", trace, "--xpath",
            f'/trace-toc/run[@number="1"]/data/table[@schema="{schema}"]',
        ], capture_output=True)
        try:
            return decode(result.stdout, detailed)
        except (ET.ParseError, ValueError):
            continue
    raise RuntimeError(f"xctrace export of {schema} failed 12 times")
