import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import { applyPatches } from "../patches";

// Exercise git apply on disposable source trees; no native build runs.
describe("applyPatches", () => {
  let root: string;
  let source: string;
  let patches: string;

  const section = (file: string, before = "original", after = "patched") =>
    `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1 +1 @@\n-${before}\n+${after}\n`;

  const writeSource = (file: string, content = "original\n") => {
    const target = path.join(source, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "skia patches "));
    source = path.join(root, "checkout");
    patches = path.join(root, "patches");
    fs.mkdirSync(source);
    fs.mkdirSync(patches);
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("applies any visible patch filename in order and skips already applied changes", () => {
    writeSource("first.h");
    writeSource("second.h");
    writeSource("unrelated.h", "local edit\n");
    fs.writeFileSync(path.join(patches, "b.patch"), section("second.h"));
    fs.writeFileSync(path.join(patches, "a.patch"), section("first.h"));
    fs.writeFileSync(path.join(patches, "._a.patch"), "Finder metadata");
    fs.mkdirSync(path.join(patches, "directory.patch"));

    applyPatches(source, patches);
    applyPatches(source, patches);

    expect(fs.readFileSync(path.join(source, "first.h"), "utf8")).toBe(
      "patched\n"
    );
    expect(fs.readFileSync(path.join(source, "second.h"), "utf8")).toBe(
      "patched\n"
    );
    expect(fs.readFileSync(path.join(source, "unrelated.h"), "utf8")).toBe(
      "local edit\n"
    );
    expect(console.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Applied a.patch")
    );
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("Applied b.patch")
    );
    expect(console.log).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("a.patch is already")
    );
  });

  it("patches ignored header copies without requiring absent source or build files", () => {
    // Match cpp/skia inside this repository: ignored, with no nested .git.
    execFileSync("git", ["init", "--quiet", root]);
    fs.writeFileSync(path.join(root, ".gitignore"), "checkout/\n");
    writeSource("include/Recorder.h");
    fs.writeFileSync(
      path.join(patches, "graphite.patch"),
      section("include/Recorder.h") + section("src/Recorder.cpp")
    );
    fs.writeFileSync(
      path.join(patches, "platform.patch"),
      section("gn/BUILD.gn")
    );

    applyPatches(source, patches, { copiedFilesOnly: true });
    applyPatches(source, patches, { copiedFilesOnly: true });

    expect(
      fs.readFileSync(path.join(source, "include/Recorder.h"), "utf8")
    ).toBe("patched\n");
    expect(fs.readdirSync(source)).toEqual(["include"]);
  });

  it("accepts headers copied from a checkout that was already patched", () => {
    writeSource("include/Recorder.h", "patched\n");
    fs.writeFileSync(
      path.join(patches, "graphite.patch"),
      section("include/Recorder.h") + section("src/Recorder.cpp")
    );

    applyPatches(source, patches, { copiedFilesOnly: true });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("graphite.patch is already")
    );
  });

  it.each([false, true])(
    "rejects stale patches (copiedFilesOnly=%s)",
    (copiedFilesOnly) => {
      writeSource("include/Recorder.h", "upstream changed\n");
      fs.writeFileSync(
        path.join(patches, "graphite.patch"),
        section("include/Recorder.h")
      );

      expect(() => applyPatches(source, patches, { copiedFilesOnly })).toThrow(
        "graphite.patch does not apply"
      );
      expect(
        fs.readFileSync(path.join(source, "include/Recorder.h"), "utf8")
      ).toBe("upstream changed\n");
    }
  );
});
