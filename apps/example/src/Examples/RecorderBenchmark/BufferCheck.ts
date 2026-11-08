import { __experimental } from "react-native-skia";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";

/**
 * Checks what the command buffer relies on: a worklet on the UI runtime
 * writes into the buffer's memory through getBuffer() and native code sees
 * the write without a copy, while an ArrayBuffer captured by a worklet is
 * copied by react-native-worklets (a write into the copy never reaches
 * native code).
 */
export interface BufferCheck {
  /** The memory address seen from the JS runtime and the UI runtime. */
  jsAddress: number;
  uiAddress: number;
  sameAddress: boolean;
  /** The UI runtime read what the JS runtime wrote. */
  uiReadJsWrite: boolean;
  /** Native code and the JS runtime read what the UI runtime wrote. */
  nativeReadUiWrite: boolean;
  jsReadUiWrite: boolean;
  /** A write into an ArrayBuffer captured by a worklet stays in the copy. */
  capturedArrayBufferIsCopied: boolean;
  lines: string[];
}

export const checkBuffer = async (): Promise<BufferCheck> => {
  const api = __experimental.getExperimentalApi();
  const buffer = api.makeCommandBuffer(16);
  const f32 = new Float32Array(buffer.getBuffer());
  f32[0] = 42;
  const jsAddress = buffer.getDataAddress();
  const ui = await new Promise<{ seen: number; address: number }>((resolve) => {
    scheduleOnUI(() => {
      "worklet";
      const view = new Float32Array(buffer.getBuffer());
      const seen = view[0];
      view[1] = 7;
      scheduleOnRN(resolve, { seen, address: buffer.getDataAddress() });
    });
  });
  const nativeReadUiWrite = buffer.readFloat(1) === 7;
  const jsReadUiWrite = f32[1] === 7;
  // The ArrayBuffer itself, captured by a worklet.
  const captured = buffer.getBuffer();
  await new Promise<void>((resolve) => {
    scheduleOnUI(() => {
      "worklet";
      const view = new Float32Array(captured);
      view[2] = 99;
      scheduleOnRN(resolve);
    });
  });
  const capturedArrayBufferIsCopied = buffer.readFloat(2) !== 99;
  const result: BufferCheck = {
    jsAddress,
    uiAddress: ui.address,
    sameAddress: jsAddress === ui.address,
    uiReadJsWrite: ui.seen === 42,
    nativeReadUiWrite,
    jsReadUiWrite,
    capturedArrayBufferIsCopied,
    lines: [],
  };
  result.lines = [
    `data address, JS runtime: ${jsAddress}`,
    `data address, UI runtime: ${ui.address} (${result.sameAddress ? "same" : "DIFFERENT"})`,
    `UI runtime read the JS write (42): ${ui.seen} (${result.uiReadJsWrite ? "ok" : "FAILED"})`,
    `native read the UI write (7): ${buffer.readFloat(1)} (${nativeReadUiWrite ? "ok" : "FAILED"})`,
    `JS runtime read the UI write (7): ${f32[1]} (${jsReadUiWrite ? "ok" : "FAILED"})`,
    `ArrayBuffer captured by a worklet: write of 99 ${capturedArrayBufferIsCopied ? "stayed in the worklet's copy (copied by react-native-worklets)" : "reached native memory (shared)"}`,
  ];
  buffer.dispose();
  return result;
};
