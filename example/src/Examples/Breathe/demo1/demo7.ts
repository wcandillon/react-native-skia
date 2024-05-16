import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export class Bitmap {
  constructor(
    public data: Uint8Array,
    public width: number,
    public height: number
  ) {
    this.flipYAxis();
  }
  flipYAxis(): void {
    const rowLength = this.width * 4; // 4 bytes per pixel (RGBA8)
    const tempRow = new Uint8Array(rowLength);

    for (let y = 0; y < this.height / 2; y++) {
      const topRowIndex = y * rowLength;
      const bottomRowIndex = (this.height - y - 1) * rowLength;

      // Swap rows
      tempRow.set(this.data.subarray(topRowIndex, topRowIndex + rowLength));
      this.data.copyWithin(
        topRowIndex,
        bottomRowIndex,
        bottomRowIndex + rowLength
      );
      this.data.set(tempRow, bottomRowIndex);
    }
  }
}

export const demo7 = async (
  device: GPUDevice,
  context: GPUCanvasContext,
  img: Bitmap
) => {
  const presentationFormat = "rgba8unorm";

  const dispatchCount = [4, 3, 2];
  const workgroupSize = [2, 3, 4];

  // multiply all elements of an array
  const arrayProd = (arr) => arr.reduce((a, b) => a * b);

  const numThreadsPerWorkgroup = arrayProd(workgroupSize);

  const code = /* wgsl */ `
  // NOTE!: vec3u is padded to by 4 bytes
  @group(0) @binding(0) var<storage, read_write> workgroupResult: array<vec3u>;
  @group(0) @binding(1) var<storage, read_write> localResult: array<vec3u>;
  @group(0) @binding(2) var<storage, read_write> globalResult: array<vec3u>;

  @compute @workgroup_size(${workgroupSize}) fn computeSomething(
      @builtin(workgroup_id) workgroup_id : vec3<u32>,
      @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
      @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
      @builtin(local_invocation_index) local_invocation_index: u32,
      @builtin(num_workgroups) num_workgroups: vec3<u32>
  ) {
    // workgroup_index is similar to local_invocation_index except for
    // workgroups, not threads inside a workgroup.
    // It is not a builtin so we compute it ourselves.

    let workgroup_index =  
       workgroup_id.x +
       workgroup_id.y * num_workgroups.x +
       workgroup_id.z * num_workgroups.x * num_workgroups.y;

    // global_invocation_index is like local_invocation_index
    // except linear across all invocations across all dispatched
    // workgroups. It is not a builtin so we compute it ourselves.

    let global_invocation_index =
       workgroup_index * ${numThreadsPerWorkgroup} +
       local_invocation_index;

    // now we can write each of these builtins to our buffers.
    workgroupResult[global_invocation_index] = workgroup_id;
    localResult[global_invocation_index] = local_invocation_id;
    globalResult[global_invocation_index] = global_invocation_id;
  }
  `;

  const module = device.createShaderModule({ code });

  const pipeline = device.createComputePipeline({
    label: "compute pipeline",
    layout: "auto",
    compute: {
      module,
      entryPoint: "computeSomething",
    },
  });

  const numWorkgroups = arrayProd(dispatchCount);
  const numResults = numWorkgroups * numThreadsPerWorkgroup;
  const size = numResults * 4 * 4; // vec3f * u32

  let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  const workgroupBuffer = device.createBuffer({ size, usage });
  const localBuffer = device.createBuffer({ size, usage });
  const globalBuffer = device.createBuffer({ size, usage });

  usage = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  const workgroupReadBuffer = device.createBuffer({ size, usage });
  const localReadBuffer = device.createBuffer({ size, usage });
  const globalReadBuffer = device.createBuffer({ size, usage });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: workgroupBuffer } },
      { binding: 1, resource: { buffer: localBuffer } },
      { binding: 2, resource: { buffer: globalBuffer } },
    ],
  });

  // Encode commands to do the computation
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(...dispatchCount);
  pass.end();

  encoder.copyBufferToBuffer(workgroupBuffer, 0, workgroupReadBuffer, 0, size);
  encoder.copyBufferToBuffer(localBuffer, 0, localReadBuffer, 0, size);
  encoder.copyBufferToBuffer(globalBuffer, 0, globalReadBuffer, 0, size);

  // Finish encoding and submit the commands
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // Read the results
  await Promise.all([
    workgroupReadBuffer.mapAsync(GPUMapMode.READ),
    localReadBuffer.mapAsync(GPUMapMode.READ),
    globalReadBuffer.mapAsync(GPUMapMode.READ),
  ]);

  const workgroup = new Uint32Array(workgroupReadBuffer.getMappedRange());
  const local = new Uint32Array(localReadBuffer.getMappedRange());
  const global = new Uint32Array(globalReadBuffer.getMappedRange());

  const get3 = (arr, i) => {
    const off = i * 4;
    return `${arr[off]}, ${arr[off + 1]}, ${arr[off + 2]}`;
  };

  for (let i = 0; i < numResults; ++i) {
    if (i % numThreadsPerWorkgroup === 0) {
      console.log(`\
---------------------------------------
global                 local     global   dispatch: ${
        i / numThreadsPerWorkgroup
      }
invoc.    workgroup    invoc.    invoc.
index     id           id        id
---------------------------------------`);
    }
    console.log(
      `${i.toString().padStart(3)}:      ${get3(workgroup, i)}      ${get3(
        local,
        i
      )}   ${get3(global, i)}`
    );
  }
};
