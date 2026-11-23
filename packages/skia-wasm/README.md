# react-native-skia-wasm

Skia Graphite on WebGPU, compiled to WebAssembly from the same Skia and Dawn revisions as the native binaries.

This package is experimental and private. Today it holds one thing: a smoke test proving that the prebuilt Skia wasm archives link into a module and draw in a browser. The JavaScript bindings that would replace `canvaskit-wasm` on the web will be built here, on top of the same archives.

## What the archives are

`yarn build-skia wasm` in `packages/skia` produces static archives, not a `.wasm` file:

```
libs/wasm/
  lib/*.a          Skia and its modules, as wasm object archives
  skia/            the Skia headers
  emdawnwebgpu/    WebGPU headers and JS library, generated from the pinned Dawn
  metadata.json    Emscripten version, flags and defines a consumer has to match
  LICENSE
```

A `.wasm` module only exists once bindings are compiled against the headers and linked with the archives. Three things have to match what `metadata.json` records, because they change the layout of Skia's types and the features of the object files:

- the Emscripten release,
- the compiler flags (`-fno-exceptions`, `-fno-rtti`, no pthreads),
- the preprocessor defines.

Dawn itself is not in the archives. The browser implements WebGPU; `emdawnwebgpu/` provides `webgpu.h`, `webgpu_cpp.h` and the JavaScript glue, added at link time with `--use-port=emdawnwebgpu/emdawnwebgpu.port.py`.

## Where the archives come from

`scripts/skia.ts` looks, in this order, for:

1. a local build in `packages/skia/libs/wasm`,
2. the archive pinned in `binaries.json`, downloaded once, checked against its SHA-256 and unpacked in the cache.

`SKIA_WASM_FROM_RELEASE=1` skips the local build.

To publish a local build for others:

```sh
cd packages/skia
yarn build-skia wasm
yarn package-skia-wasm      # build/wasm/skia-graphite-wasm.zip, and the entry to pin
```

Upload the zip, then paste the printed entry into `binaries.json` with the URL it was uploaded to.

## The smoke test

```sh
yarn smoke
```

`smoke/smoke.cpp` links every archive into one module and draws one tile with each: shapes and a path, a runtime shader (SkSL compiled to WGSL), a PNG round trip uploaded as a texture, an SVG, a Lottie animation and a paragraph. `smoke/main.js` creates the `GPUDevice`, hands it to the module, reads the texture back with WebGPU and checks every tile. Any WebGPU validation error fails the test.

The test runs in headless Chromium through Playwright. To look at the result in a browser:

```sh
yarn build-smoke
yarn serve                  # http://localhost:8790/smoke/index.html
```

Building needs the Emscripten release named in `metadata.json`. It is found through `EMSDK`, in the emsdk of the Skia checkout (installed by `yarn build-skia wasm`), or on `PATH`.

## Notes for the bindings

- The Graphite context is created without a tick function, so it never blocks: no Asyncify, no JSPI. Synchronous readbacks are not available; GPU work completes from the browser's event loop.
- Graphite only draws GPU images. A CPU image needs `SkImages::TextureFromImage()` or an image provider on the recorder.
- There are no system fonts. Typefaces come from data, through `SkFontMgr_New_Custom_Empty()`.
