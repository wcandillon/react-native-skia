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

// A buffer of the device Skia renders with, mapped as it is made, which tells
// a destroyed device from a lost one (the Gpu spec): Dawn unmaps the buffers
// of a destroyed device, and a loss alone leaves them mapped.
let mappedBuffer: GPUBuffer | null = null;
export const mapGpuBuffer = () => {
  mappedBuffer = getSharedDevice().createBuffer({
    size: 4,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
};
export const mappedGpuBufferState = () => mappedBuffer?.mapState ?? null;
