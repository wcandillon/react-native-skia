import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { CanvasKitWasmFingerprint } from "../CanvasKitWasmFingerprint";

describe("CanvasKitWasmFingerprint", () => {
  it("matches the canvaskit-wasm version react-native-skia depends on", () => {
    const skiaPkg = JSON.parse(
      readFileSync(path.join(__dirname, "../../../package.json"), "utf8")
    );
    expect(skiaPkg.dependencies["canvaskit-wasm"]).toBe(
      CanvasKitWasmFingerprint.version
    );
    const canvasKitPkg = JSON.parse(
      readFileSync(require.resolve("canvaskit-wasm/package.json"), "utf8")
    );
    expect(canvasKitPkg.version).toBe(CanvasKitWasmFingerprint.version);
  });

  it("matches the installed canvaskit.wasm binary", () => {
    const wasm = readFileSync(
      require.resolve("canvaskit-wasm/bin/full/canvaskit.wasm")
    );
    expect(wasm.byteLength).toBe(CanvasKitWasmFingerprint.size);
    expect(createHash("sha256").update(wasm).digest("hex")).toBe(
      CanvasKitWasmFingerprint.sha256
    );
  });
});
