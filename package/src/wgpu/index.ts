import { JsiGPU } from "./JsiGPU";

declare global {
  var Instance: Instance;
}

export const gpu = new JsiGPU(global.Instance);
