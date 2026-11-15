/**
 * Fingerprint of the canvaskit.wasm file shipped by the canvaskit-wasm
 * version React Native Skia depends on (see package.json).
 *
 * CanvasKit is split in two files: the canvaskit.js glue, which is bundled
 * with React Native Skia, and the canvaskit.wasm binary, which the app serves
 * itself (usually from a CDN via `locateFile`). The two must come from the
 * same canvaskit-wasm release, yet the binary carries no version information
 * and a neighbouring release usually links fine, only to crash later inside
 * whichever binding changed. In development, LoadSkiaWeb checks the
 * downloaded binary against this fingerprint to fail upfront instead.
 *
 * When bumping canvaskit-wasm, update these values. The
 * CanvasKitWasmFingerprint test fails until they match the installed package.
 */
export const CanvasKitWasmFingerprint = {
  version: "0.41.1",
  size: 8080104,
  sha256: "11e13773783fec05d04a2f8c73b9ad46f98c33359ab680d835b7638bb3b87cde",
} as const;
