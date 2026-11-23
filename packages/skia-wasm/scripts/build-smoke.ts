/**
 * Compiles smoke/smoke.cpp and links it with every Skia archive into
 * dist/smoke.js and dist/smoke.wasm. This is the check that the archives are
 * usable: that they link into one module and draw through the browser's WebGPU.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { findEmscripten } from "./emscripten";
import { PackageRoot, prepareSkia } from "./skia";

const Dist = path.join(PackageRoot, "dist");
// A font for the text tile: the web has no system fonts to fall back on.
const Font = path.join(
  PackageRoot,
  "../skia/src/skia/__tests__/assets/Roboto-Medium.ttf"
);

(async () => {
  const { root, source, metadata } = await prepareSkia();
  const emscripten = findEmscripten(metadata.emscripten);
  console.log(
    `Skia wasm archives (${source}): ${root}\nEmscripten ${metadata.emscripten}: ${emscripten}`
  );

  fs.rmSync(Dist, { recursive: true, force: true });
  fs.mkdirSync(Dist, { recursive: true });
  fs.copyFileSync(Font, path.join(Dist, "font.ttf"));

  const args = [
    path.join(PackageRoot, "smoke", "smoke.cpp"),
    // What the archives were compiled with: see metadata.json.
    ...metadata.cflags,
    ...metadata.defines.map((define) => `-D${define}`),
    "-O2",
    `-I${path.join(root, "skia")}`,
    // The WebGPU headers when compiling and the JS half of WebGPU when linking.
    `--use-port=${path.join(root, "emdawnwebgpu", "emdawnwebgpu.port.py")}`,
    ...metadata.libraries.map((library) => path.join(root, "lib", library)),
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
    path.join(Dist, "smoke.js"),
  ];
  execFileSync(path.join(emscripten, "em++"), args, { stdio: "inherit" });

  for (const file of ["smoke.js", "smoke.wasm"]) {
    const { size } = fs.statSync(path.join(Dist, file));
    console.log(`✅ dist/${file} ${(size / (1 << 20)).toFixed(2)} MB`);
  }
})().catch((error: Error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
