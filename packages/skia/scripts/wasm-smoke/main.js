// Runs the smoke module on the page's GPUDevice, reads the texture it drew
// into back, and checks every tile. The result is left in window.smoke for
// smoke.playwright.ts, and shown on the page for a person.
import createSmokeModule from "./smoke.js";

const TILE = 128;
const COLUMNS = 3;
const WIDTH = TILE * COLUMNS;
const HEIGHT = TILE * 2;

// In grid order. A color is what the center of the tile must be; the text
// tile is checked for dark pixels on its white background instead.
const tiles = [
  { name: "shapes", color: [0, 128, 255] },
  { name: "runtime effect", color: [255, 0, 128] },
  { name: "image", color: [128, 0, 255] },
  { name: "svg", color: [0, 160, 80] },
  { name: "skottie", color: [255, 128, 0] },
  { name: "paragraph" },
];

// Shown while running, and named in the failure when a step never finishes.
let currentStep = "starting";
const step = (name) => {
  currentStep = name;
  window.smokeStep = name;
  document.querySelector("pre").textContent = `running: ${name}`;
};

const run = async () => {
  if (!navigator.gpu) {
    throw new Error("This browser does not expose WebGPU.");
  }
  step("requesting a WebGPU adapter");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No WebGPU adapter.");
  }
  step("requesting a WebGPU device");
  const device = await adapter.requestDevice();
  // Anything Graphite does that WebGPU rejects fails the test.
  const gpuErrors = [];
  device.addEventListener("uncapturederror", (event) => {
    gpuErrors.push(event.error.message);
  });

  step("loading the wasm module");
  const smoke = await createSmokeModule();
  step("creating the Graphite context");
  if (!smoke._smoke_init(smoke.WebGPU.importJsDevice(device))) {
    throw new Error("Graphite did not create a context on the device.");
  }

  step("loading the font");
  const font = new Uint8Array(await (await fetch("./font.ttf")).arrayBuffer());
  const fontPtr = smoke._malloc(font.length);
  smoke.HEAPU8.set(font, fontPtr);
  const hasFont = smoke._smoke_set_font(fontPtr, font.length);
  smoke._free(fontPtr);
  if (!hasFont) {
    throw new Error("FreeType did not load the font.");
  }

  step("drawing");
  const texture = device.createTexture({
    size: [WIDTH, HEIGHT],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
  });
  const drawn = smoke._smoke_draw(smoke.WebGPU.importJsTexture(texture));
  if (drawn < 0) {
    throw new Error(`Drawing failed at step ${-drawn}.`);
  }

  // Read the texture back with WebGPU itself, independently of Skia.
  step("reading the texture back");
  const bytesPerRow = WIDTH * 4;
  const buffer = device.createBuffer({
    size: bytesPerRow * HEIGHT,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, [
    WIDTH,
    HEIGHT,
  ]);
  device.queue.submit([encoder.finish()]);
  await buffer.mapAsync(GPUMapMode.READ);
  const pixels = new Uint8Array(buffer.getMappedRange()).slice();
  buffer.unmap();

  // The submission is done by now: let Graphite see it before tearing down.
  step("waiting for Graphite's pending GPU work");
  let pending = smoke._smoke_tick();
  for (let i = 0; pending && i < 100; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    pending = smoke._smoke_tick();
  }
  if (!pending) {
    smoke._smoke_shutdown();
  }

  const context = document.querySelector("canvas").getContext("2d");
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels), WIDTH, HEIGHT),
    0,
    0
  );

  const pixel = (x, y) => [...pixels.subarray((y * WIDTH + x) * 4).slice(0, 4)];
  const results = tiles.map((tile, index) => {
    const left = (index % COLUMNS) * TILE;
    const top = Math.floor(index / COLUMNS) * TILE;
    const center = pixel(left + TILE / 2, top + TILE / 2);
    const result = {
      name: tile.name,
      drawn: (drawn & (1 << index)) !== 0,
      center,
    };
    if (tile.color) {
      result.pass =
        result.drawn &&
        tile.color.every((value, i) => Math.abs(value - center[i]) <= 2) &&
        center[3] === 255;
    } else {
      // Black glyphs on white: some pixels dark, most of them still white.
      let dark = 0;
      for (let y = top; y < top + TILE; y++) {
        for (let x = left; x < left + TILE; x++) {
          if (pixels[(y * WIDTH + x) * 4] < 64) {
            dark++;
          }
        }
      }
      result.darkPixels = dark;
      result.pass = result.drawn && dark > 200 && dark < (TILE * TILE) / 2;
    }
    return result;
  });

  return {
    pass:
      results.every((result) => result.pass) &&
      gpuErrors.length === 0 &&
      !pending,
    tiles: results,
    gpuErrors,
    pendingGpuWork: !!pending,
  };
};

// A promise that never settles would leave the page blank: report the step.
const timeout = new Promise((_, reject) => {
  setTimeout(
    () => reject(new Error(`Timed out while ${currentStep}.`)),
    30_000
  );
});

Promise.race([run(), timeout])
  .catch((error) => ({ pass: false, error: String(error?.message ?? error) }))
  .then((result) => {
    window.smoke = result;
    document.querySelector("pre").textContent = JSON.stringify(result, null, 2);
    document.title = result.pass ? "smoke: pass" : "smoke: FAIL";
  });
