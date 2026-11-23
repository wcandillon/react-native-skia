/**
 * Archives the output of `yarn build-skia wasm` (libs/wasm) as
 * skia-graphite-wasm.zip and prints its checksum.
 *
 * The archive is not part of the binaries release: the build-skia-wasm.yml
 * workflow publishes it as the GitHub release skia-wasm-<version>. The skia-wasm
 * repository (https://github.com/wcandillon/skia-wasm) pins it, with the
 * printed entry, in its binaries.json and downloads it from there.
 *
 * Usage:
 *   yarn package-skia-wasm [--output=<dir>]     (default: build/wasm)
 */
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import { PackageRoot, WasmLibs } from "./skia-configuration";

const AssetName = "skia-graphite-wasm.zip";
// The layout wasm-configuration.ts documents, at the root of the archive.
const Entries = ["lib", "skia", "emdawnwebgpu", "metadata.json", "LICENSE"];

const output =
  process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--output="))
    ?.slice("--output=".length) ?? path.join(PackageRoot, "build", "wasm");

for (const entry of Entries) {
  if (!fs.existsSync(path.join(WasmLibs, entry))) {
    console.error(
      `❌ ${path.join(WasmLibs, entry)} is missing: run \`yarn build-skia wasm\` first.`
    );
    process.exit(1);
  }
}

const archive = path.resolve(output, AssetName);
fs.mkdirSync(path.dirname(archive), { recursive: true });
// zip adds to an archive that exists already.
fs.rmSync(archive, { force: true });
execFileSync(
  "zip",
  // -X: no uid/gid nor extended timestamps; -y: a symlink stays a symlink.
  ["-q", "-r", "-X", "-y", archive, ...Entries, "-x", "*.DS_Store"],
  { cwd: WasmLibs, stdio: "inherit" }
);

const sha256 = crypto
  .createHash("sha256")
  .update(fs.readFileSync(archive))
  .digest("hex");
const { size } = fs.statSync(archive);

console.log(`✅ ${archive} (${(size / (1 << 20)).toFixed(1)} MB)`);
console.log("");
console.log(
  "Once uploaded, pin it in binaries.json of the skia-wasm repository:"
);
console.log(
  JSON.stringify(
    { [AssetName]: { url: "<where it was uploaded>", sha256, size } },
    null,
    2
  )
);
