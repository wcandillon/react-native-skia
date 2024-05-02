import { gpu } from "@shopify/react-native-skia";


const check = () => {
  requestAnimationFrame(check);
}

export const demo3 = async(context: GPUCanvasContext) => {
  const adapter = await gpu.requestAdapter();
  const device = await adapter!.requestDevice();
   // Create an array of data
   const data = new Float32Array([1.0, 2.0, 3.0, 4.0]);

   // Create a GPU buffer and store data
   const gpuBuffer = device.createBuffer({
       size: data.byteLength,
       usage: 9//GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
       ,
       mappedAtCreation: false
   });

   // Copy data to the GPU buffer
   device.queue.writeBuffer(gpuBuffer, 0, data.buffer, 0, data.byteLength);
   console.log("DONE0");
   device.queue.onSubmittedWorkDone();
   check();
   // Read data back from the GPU buffer
   console.log("DONE1");
  //  gpuBuffer.mapAsync(1, 0, data.byteLength); // GPUMapMode.READ
  //  device.queue.onSubmittedWorkDone();
  //  console.log("DONE2");

  //  const arrayBuffer = gpuBuffer.getMappedRange();
  //  const readData = new Float32Array(arrayBuffer);

  //  // Output the read data
  //  console.log('Data read from the buffer:', readData);
  //  gpuBuffer.unmap();
  };