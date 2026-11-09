import { Skia } from "react-native-skia";
import { importDevice } from "react-native-webgpu";

// The device Skia renders with, as a GPUDevice. Skia replaces a lost device
// with a new one: the import is let go of when that happens, so that the next
// use imports the new device.
let sharedDevice: GPUDevice | null = null;
export const getSharedDevice = () => {
  if (sharedDevice === null) {
    const device = importDevice(Skia.getNativeDevice());
    sharedDevice = device;
    Skia.gpu.lost.then(() => {
      if (sharedDevice === device) {
        sharedDevice = null;
      }
    });
  }
  return sharedDevice;
};

// Loses the GPU device on purpose: the device is shared with
// react-native-webgpu, whose test hook asks Dawn to lose it.
export const forceGpuDeviceLoss = () => {
  (
    getSharedDevice() as GPUDevice & { forceLossForTesting: () => void }
  ).forceLossForTesting();
};
