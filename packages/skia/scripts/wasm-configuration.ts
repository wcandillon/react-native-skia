/**
 * The Emscripten side of the Skia wasm target: the toolchain, the emdawnwebgpu
 * package that stands in for Dawn, and the description of what was built.
 *
 * `yarn build-skia wasm` fills libs/wasm, which is also the layout of the
 * release asset:
 *
 *   lib/*.a          Skia and its modules, as wasm object archives
 *   skia/            the Skia headers (the same selection as cpp/skia)
 *   emdawnwebgpu/    WebGPU headers and JS library, from the pinned Dawn
 *   metadata.json    toolchain version, flags and defines to match
 *   LICENSE          Skia's
 *
 * The archives are not a module: a consumer compiles its bindings against the
 * headers and links both into a .wasm with the same Emscripten version.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  EmdawnwebgpuDir,
  OutFolder,
  SkiaPatches,
  SkiaSrc,
  WasmLibs,
  commonArgs,
  configurations,
  skiaBuildDir,
  wasmOutputNames,
} from "./skia-configuration";
import { listPatches } from "./patches";
import { fileOps } from "./utils";

// Skia pins emsdk in its DEPS and the Emscripten release in bin/activate-emsdk.
// Building with that pair keeps Skia on the toolchain upstream compiles it with.
export const EmsdkDir = path.join(SkiaSrc, "third_party", "externals", "emsdk");
export const EmscriptenDir = path.join(EmsdkDir, "upstream", "emscripten");

const DawnSrc = path.join(SkiaSrc, "third_party", "externals", "dawn");
const SkiaExternals = path.join(SkiaSrc, "third_party", "externals");

const python = (args: string[], cwd: string) =>
  execFileSync("python3", args, {
    cwd,
    stdio: ["ignore", "inherit", "inherit"],
  });

/**
 * Installs and activates the pinned Emscripten. GN's wasm toolchain does the
 * same when it compiles, but the emdawnwebgpu package is generated before that.
 */
export const activateEmsdk = () => {
  python([path.join(SkiaSrc, "bin", "activate-emsdk")], SkiaSrc);
  if (!fs.existsSync(path.join(EmscriptenDir, "em++"))) {
    throw new Error(
      `No Emscripten in ${EmscriptenDir}: bin/activate-emsdk does not install it on this host.`
    );
  }
};

export const emscriptenVersion = () =>
  JSON.parse(
    fs.readFileSync(path.join(EmscriptenDir, "emscripten-version.txt"), "utf8")
  ) as string;

/**
 * Builds the emdawnwebgpu package from the pinned Dawn checkout, so the wasm
 * build sees the WebGPU API of the same Dawn revision as the native builds.
 *
 * This reproduces Dawn's emdawnwebgpu_pkg CMake target (src/emdawnwebgpu/
 * CMakeLists.txt) without configuring Dawn: generate the headers and the JS
 * tables from dawn.json, compute the struct layouts with Emscripten, and lay
 * the files out next to the port file that em++ takes with --use-port.
 */
export const buildEmdawnwebgpuPackage = (destination = EmdawnwebgpuDir) => {
  console.log("⚙️ Generating the emdawnwebgpu package...");
  const gen = path.join(OutFolder, "wasm", "emdawnwebgpu-gen");
  fileOps.rm(gen);
  fileOps.mkdir(gen);

  python(
    [
      "generator/dawn_json_generator.py",
      "--template-dir",
      "generator/templates",
      "--output-dir",
      gen,
      "--dawn-json",
      "src/dawn/dawn.json",
      "--wire-json",
      "src/dawn/dawn_wire.json",
      // Dawn's own copies are gclient dependencies the Skia checkout lacks.
      "--jinja2-path",
      path.join(SkiaExternals, "jinja2"),
      "--markupsafe-path",
      path.join(SkiaExternals, "markupsafe"),
      "--targets",
      "emdawnwebgpu_headers,emdawnwebgpu_js",
    ],
    DawnSrc
  );

  // The JS library reads and writes the C structs by offset: Emscripten
  // compiles webgpu.h for both pointer sizes to compute them.
  const emGen = path.join(gen, "src", "emdawnwebgpu");
  const structInfo = (bits: 32 | 64) => {
    const output = path.join(emGen, `webgpu_generated_struct_info${bits}.json`);
    python(
      [
        path.join(EmscriptenDir, "tools", "gen_struct_info.py"),
        "-q",
        path.join(emGen, "struct_info_webgpu.json"),
        `-I=${path.join(emGen, "include")}`,
        ...(bits === 64 ? ["--wasm64"] : []),
        `-o=${output}`,
      ],
      DawnSrc
    );
    return output;
  };
  const snippet = (part: number) =>
    path.join(
      DawnSrc,
      "src",
      "emdawnwebgpu",
      "snippets",
      `library_webgpu_struct_info_part${part}.txt`
    );
  python(
    [
      "src/emdawnwebgpu/concat.py",
      path.join(emGen, "library_webgpu_generated_struct_info.js"),
      snippet(1),
      structInfo(32),
      snippet(2),
      structInfo(64),
      snippet(3),
    ],
    DawnSrc
  );

  fileOps.rm(destination);
  fileOps.mkdir(destination);
  // The hand-written half: the JS library, its C++ glue and the port file.
  fileOps.cp(
    path.join(DawnSrc, "third_party", "emdawnwebgpu", "pkg"),
    destination
  );
  fileOps.cp(path.join(DawnSrc, "src", "emdawnwebgpu", "pkg"), destination);
  const copy = (source: string, ...to: string[]) => {
    const directory = path.join(destination, ...to);
    fileOps.mkdir(directory);
    fs.copyFileSync(source, path.join(directory, path.basename(source)));
  };
  const dawnHeader = (name: string) =>
    path.join(DawnSrc, "include", "webgpu", name);
  const generated = (...segments: string[]) => path.join(emGen, ...segments);
  copy(
    generated("include", "webgpu", "webgpu.h"),
    "webgpu",
    "include",
    "webgpu"
  );
  copy(dawnHeader("webgpu_glfw.h"), "webgpu", "include", "webgpu");
  for (const name of [
    "library_webgpu_enum_tables.js",
    "library_webgpu_generated_struct_info.js",
    "library_webgpu_generated_sig_info.js",
  ]) {
    copy(generated(name), "webgpu", "src");
  }
  for (const name of ["webgpu_cpp.h", "webgpu_cpp_chained_struct.h"]) {
    copy(
      generated("include", "webgpu", name),
      "webgpu_cpp",
      "include",
      "webgpu"
    );
  }
  copy(
    dawnHeader("webgpu_enum_class_bitmasks.h"),
    "webgpu_cpp",
    "include",
    "webgpu"
  );
  copy(
    generated("include", "dawn", "webgpu_cpp_print.h"),
    "webgpu_cpp",
    "include",
    "dawn"
  );
  console.log(`✅ emdawnwebgpu package in ${destination}`);
};

/** GN names wasm archives lib<name>.wasm.a; they ship as lib<name>.a. */
export const wasmArchiveSource = (library: string) =>
  path.join(skiaBuildDir("wasm", "wasm32"), library.replace(/\.a$/, ".wasm.a"));

const git = (cwd: string, args: string[]) =>
  execFileSync("git", args, { cwd }).toString().trim();

/** The defines GN gives to a target that depends on Skia and its modules. */
const consumerDefines = () => {
  const out = skiaBuildDir("wasm", "wasm32");
  const defines = new Set<string>();
  for (const target of [
    "//modules/svg:svg",
    "//modules/skottie:skottie",
    "//modules/skparagraph:skparagraph",
  ]) {
    const description = JSON.parse(
      execFileSync("gn", ["desc", out, target, "defines", "--format=json"], {
        cwd: SkiaSrc,
        env: {
          ...process.env,
          PATH: `${path.join(SkiaSrc, "..", "depot_tools")}:${process.env.PATH}`,
        },
        // gn prints its warnings about unused args on stdout before the JSON.
      })
        .toString()
        .replace(/^[^{]*/, "")
    ) as Record<string, { defines?: string[] }>;
    for (const define of description[target]?.defines ?? []) {
      // Set only while compiling Skia itself.
      if (!define.startsWith("SKIA_IMPLEMENTATION")) {
        defines.add(define);
      }
    }
  }
  return [...defines].sort();
};

/**
 * Records what the archives were built from and with. Code compiled against
 * them has to use the same Emscripten release and these flags and defines:
 * they change the layout of Skia's types and the features of the objects.
 */
export const writeWasmMetadata = () => {
  const gnArgs = Object.fromEntries(
    [...commonArgs, ...configurations.wasm.args]
      // An absolute path of the build machine.
      .filter(([name]) => name !== "skia_emdawnwebgpu_dir")
      .map(([name, value]) => [name, value])
  );
  const metadata = {
    skia: {
      commit: git(SkiaSrc, ["rev-parse", "HEAD"]),
      patches: listPatches(SkiaPatches),
    },
    dawn: {
      commit: git(DawnSrc, ["rev-parse", "HEAD"]),
    },
    emscripten: emscriptenVersion(),
    // What every object in lib/ was compiled with, beyond the defines.
    cflags: ["-std=c++20", "-fno-exceptions", "-fno-rtti"],
    defines: consumerDefines(),
    // Linking needs the JS half of WebGPU: emdawnwebgpu/emdawnwebgpu.port.py.
    ldflags: ["--use-port=emdawnwebgpu/emdawnwebgpu.port.py"],
    libraries: wasmOutputNames,
    gnArgs,
  };
  fs.writeFileSync(
    path.join(WasmLibs, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n"
  );
};
