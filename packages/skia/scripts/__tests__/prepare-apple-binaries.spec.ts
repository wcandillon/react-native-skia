import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const script = path.join(__dirname, "..", "prepare-apple-binaries.sh");

// Every file below `directory`, relative to it.
const walk = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(file).map((child) => path.join(entry.name, child))
      : [entry.name];
  });

// Runs the assembly and linker staging steps of the Xcode phase against a
// local archive. The macOS-only ditto and plutil are stubbed so the test also
// runs on Linux.
const prepare = (root: string) =>
  execFileSync(
    "/bin/bash",
    [
      "-c",
      `set -Eeuo pipefail
source "$1"
ditto() { mkdir -p "$2"; cp -R "$1"/. "$2"; }
json_strings() { echo arm64; }
WORK_DIR="$2/work"; mkdir -p "$WORK_DIR"; TEMP_PATHS=()
SDK=iphoneos VERSION=0.0.0 SOURCE_SIGNATURE=source MODULE=skia
MODULE_LIBRARIES=(libskia.a) META_IDENTIFIER=ios-arm64 META_ARCHS=arm64
SOURCE_DIRECTORY="$2/source" CONTAINERS="$2/assembly" OUTPUT="$2/output"
assemble_module
CONTAINER_ROOT="$CONTAINERS/$MODULE"
stage_module`,
      "prepare",
      script,
      root,
    ],
    { stdio: "pipe" }
  );

// Xcode collects *.signature files from build products into the archive, and
// App Store Connect rejects any that is not an XCFramework code signature
// (ITMS-91063, #4539). Build bookkeeping must never use that extension.
describe("prepare-apple-binaries.sh", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "rnskia-prepare-"));
    fs.mkdirSync(path.join(root, "source"));
    fs.writeFileSync(path.join(root, "source", "libskia.a"), "archive");
    fs.writeFileSync(
      path.join(root, "source", "metadata.json"),
      '{"architectures":["arm64"]}'
    );
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const signatures = () =>
    ["output", "assembly"].flatMap((directory) =>
      walk(path.join(root, directory))
        .filter((file) => file.endsWith(".signature"))
        .map((file) => path.join(directory, file))
    );

  it("stages the library without writing *.signature files", () => {
    prepare(root);
    expect(
      fs.readFileSync(path.join(root, "output", "librnskia_skia.a"), "utf8")
    ).toBe("archive");
    expect(signatures()).toEqual([]);
    // An incremental build reuses the stamps and still writes none.
    prepare(root);
    expect(signatures()).toEqual([]);
  });

  it("removes the *.signature stamps of earlier releases", () => {
    // Archive build folders persist, so 3.12 stamps would still be uploaded.
    fs.mkdirSync(path.join(root, "output"));
    fs.writeFileSync(path.join(root, "output", ".rnskia-skia.signature"), "");
    fs.mkdirSync(path.join(root, "assembly", "skia", ".slices"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, "assembly", "skia", ".slices", "iphoneos.signature"),
      ""
    );
    prepare(root);
    expect(signatures()).toEqual([]);
  });
});
