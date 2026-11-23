/**
 * Compiles smoke.cpp and links it with every Skia wasm archive of libs/wasm
 * into libs/wasm-smoke, next to the page that runs it. This is the check that
 * the archives `yarn build-skia wasm` made are usable: that they link into one
 * module and draw through the browser's WebGPU.
 *
 * The other platforms need no such test: the example app is their consumer.
 * These archives have none in this repository.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { PackageRoot, WasmLibs } from "../skia-configuration";
import {
  EmscriptenDir,
  activateEmsdk,
  emscriptenVersion,
} from "../wasm-configuration";

/** What the page is served from. */
export const SmokeDir = path.join(PackageRoot, "libs", "wasm-smoke");
// A font for the text tile: the web has no system fonts to fall back on.
const Font = path.join(
  PackageRoot,
  "src/skia/__tests__/assets/Roboto-Medium.ttf"
);

interface Metadata {
  emscripten: string;
  cflags: string[];
  defines: string[];
  libraries: string[];
}

const build = () => {
  const metadataFile = path.join(WasmLibs, "metadata.json");
  if (!fs.existsSync(metadataFile)) {
    throw new Error(
      `No Skia wasm archives in ${WasmLibs}: run \`yarn build-skia wasm\` first.`
    );
  }
  const metadata = JSON.parse(
    fs.readFileSync(metadataFile, "utf8")
  ) as Metadata;
  if (!fs.existsSync(path.join(EmscriptenDir, "em++"))) {
    activateEmsdk();
  }
  // Objects of different Emscripten releases are not meant to be linked.
  if (emscriptenVersion() !== metadata.emscripten) {
    throw new Error(
      `The archives were built with Emscripten ${metadata.emscripten}; the Skia checkout has ${emscriptenVersion()}.`
    );
  }

  fs.rmSync(SmokeDir, { recursive: true, force: true });
  fs.mkdirSync(SmokeDir, { recursive: true });
  fs.copyFileSync(Font, path.join(SmokeDir, "font.ttf"));
  for (const file of ["index.html", "main.js"]) {
    fs.copyFileSync(path.join(__dirname, file), path.join(SmokeDir, file));
  }

  const args = [
    path.join(__dirname, "smoke.cpp"),
    // What the archives were compiled with: see metadata.json.
    ...metadata.cflags,
    ...metadata.defines.map((define) => `-D${define}`),
    "-O2",
    `-I${path.join(WasmLibs, "skia")}`,
    // The WebGPU headers when compiling and the JS half of WebGPU when linking.
    `--use-port=${path.join(WasmLibs, "emdawnwebgpu", "emdawnwebgpu.port.py")}`,
    ...metadata.libraries.map((library) => path.join(WasmLibs, "lib", library)),
    "-sMODULARIZE",
    "-sEXPORT_ES6",
    "-sENVIRONMENT=web",
    "-sALLOW_MEMORY_GROWTH",
    // Reports a missing export or a bad pointer instead of failing silently.
    "-sASSERTIONS=1",
    // The page hands its GPUDevice and GPUTexture over through WebGPU.importJs*.
    "-sEXPORTED_RUNTIME_METHODS=WebGPU,HEAPU8",
    "-sEXPORTED_FUNCTIONS=_malloc,_free",
    "-o",
    path.join(SmokeDir, "smoke.js"),
  ];
  execFileSync(path.join(EmscriptenDir, "em++"), args, { stdio: "inherit" });

  for (const file of ["smoke.js", "smoke.wasm"]) {
    const { size } = fs.statSync(path.join(SmokeDir, file));
    console.log(
      `✅ libs/wasm-smoke/${file} ${(size / (1 << 20)).toFixed(2)} MB`
    );
  }
};

if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
