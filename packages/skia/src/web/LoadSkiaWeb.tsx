// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit";
import type {
  CanvasKit as CanvasKitType,
  CanvasKitInitOptions,
} from "canvaskit-wasm";

import { CanvasKitWasmFingerprint } from "./CanvasKitWasmFingerprint";

declare global {
  var CanvasKit: CanvasKitType;
}

export interface LoadSkiaWebOptions extends CanvasKitInitOptions {
  /**
   * Checks that the canvaskit.wasm file returned by `locateFile` is the one
   * matching the canvaskit.js glue bundled with React Native Skia, and fails
   * with a descriptive error otherwise. A file from another canvaskit-wasm
   * release usually loads fine and only crashes later, inside whichever
   * binding differs between the two versions.
   *
   * The check downloads the file itself before handing it to CanvasKit, which
   * costs a little startup time, so it defaults to `__DEV__`. It only runs in
   * a browser window and when `locateFile` is provided.
   */
  verifyWasm?: boolean;
}

const WASM_FILE = "canvaskit.wasm";
const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];

const isDev = () => typeof __DEV__ !== "undefined" && __DEV__;

// The verification fetches the binary and hands it over as a blob URL, which
// needs a browser window. Node (tests, SSR) reads the file from disk instead.
const canVerify = () =>
  typeof window !== "undefined" &&
  typeof fetch === "function" &&
  typeof Blob !== "undefined" &&
  typeof URL !== "undefined" &&
  typeof URL.createObjectURL === "function";

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

// crypto.subtle only exists in secure contexts (https or localhost). Without
// it the size check below still tells every published release apart.
const sha256 = async (data: ArrayBuffer) => {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    return null;
  }
  return toHex(await subtle.digest("SHA-256", data));
};

const mismatchError = (url: string, details: string) =>
  new Error(
    `[react-native-skia] The CanvasKit binary loaded from ${url} doesn't match ` +
      "the canvaskit.js bundled with react-native-skia " +
      `(canvaskit-wasm ${CanvasKitWasmFingerprint.version}). ${details} ` +
      "Make sure locateFile points to the same canvaskit-wasm version, e.g. " +
      `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CanvasKitWasmFingerprint.version}/bin/full/${WASM_FILE}`
  );

// Downloads the binary, checks it against the bundled glue, and returns a
// blob URL CanvasKit can load it from without a second download.
const fetchVerifiedWasm = async (url: string) => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(
      `[react-native-skia] Couldn't download ${WASM_FILE} from ${url} (HTTP ${response.status}).`
    );
  }
  const bytes = await response.arrayBuffer();
  const header = new Uint8Array(bytes.slice(0, WASM_MAGIC.length));
  if (
    header.length !== WASM_MAGIC.length ||
    WASM_MAGIC.some((byte, i) => header[i] !== byte)
  ) {
    throw mismatchError(
      url,
      "It isn't a WebAssembly file (a server answering with an HTML page is the usual cause)."
    );
  }
  if (bytes.byteLength !== CanvasKitWasmFingerprint.size) {
    throw mismatchError(
      url,
      `It is ${bytes.byteLength} bytes long, ${CanvasKitWasmFingerprint.size} were expected.`
    );
  }
  const hash = await sha256(bytes);
  if (hash !== null && hash !== CanvasKitWasmFingerprint.sha256) {
    throw mismatchError(
      url,
      `Its SHA-256 is ${hash}, ${CanvasKitWasmFingerprint.sha256} was expected.`
    );
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/wasm" }));
};

// Rewords the errors the Emscripten glue aborts with when the binary can't be
// instantiated at all: "expected magic word" for a non-wasm file, LinkError
// for a release whose imports differ.
const describeInitError = (e: unknown, url: string) => {
  const message = e instanceof Error ? e.message : String(e);
  if (/magic word|LinkError|CompileError/.test(message)) {
    return mismatchError(url, message);
  }
  return e;
};

const initCanvasKit = async (
  opts?: LoadSkiaWebOptions
): Promise<CanvasKitType> => {
  const { verifyWasm = isDev(), ...ckOpts } = opts ?? {};
  const { locateFile } = ckOpts;
  if (!verifyWasm || locateFile === undefined || !canVerify()) {
    try {
      return await CanvasKitInit(ckOpts);
    } catch (e) {
      throw describeInitError(
        e,
        locateFile ? locateFile(WASM_FILE) : WASM_FILE
      );
    }
  }
  const url = locateFile(WASM_FILE);
  const blobUrl = await fetchVerifiedWasm(url);
  try {
    return await CanvasKitInit({
      ...ckOpts,
      locateFile: (file: string) =>
        file === WASM_FILE ? blobUrl : locateFile(file),
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};

let ckSharedPromise: Promise<CanvasKitType> | undefined;

export const LoadSkiaWeb = async (opts?: LoadSkiaWebOptions) => {
  if (global.CanvasKit !== undefined) {
    return;
  }
  ckSharedPromise = ckSharedPromise ?? initCanvasKit(opts);
  try {
    const CanvasKit = await ckSharedPromise;
    // The CanvasKit API is stored on the global object and used
    // to create the JsiSKApi in the Skia.web.ts file.
    global.CanvasKit = CanvasKit;
  } catch (e) {
    // Let a later call retry (for instance with a corrected locateFile)
    // instead of replaying the same failure.
    ckSharedPromise = undefined;
    throw e;
  }
};

// We keep this function for backward compatibility
export const LoadSkia = LoadSkiaWeb;
