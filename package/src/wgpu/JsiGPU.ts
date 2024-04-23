export class JsiGPU implements GPU {
  __brand = "GPU" as const;

  constructor(private readonly ref: Instance) {}

  requestAdapter(
    options?: GPURequestAdapterOptions
  ): Promise<GPUAdapter | null> {
    const adapter = this.ref.requestAdapter(options);
    return Promise.resolve(adapter);
  }

  getPreferredCanvasFormat(): GPUTextureFormat {
    throw new Error("Method not implemented.");
  }
}
