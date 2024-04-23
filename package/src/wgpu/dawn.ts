/* eslint-disable @typescript-eslint/ban-types */
interface WGPU {
  createInstance(descriptor: InstanceDescriptor | undefined): Instance;
  getProcAddress(device: Device | undefined, procName: string): Proc;
  getInstanceFeatures(features: InstanceFeatures): boolean;
}

type Proc = Function;
interface RequestAdapterOptions {
  compatibleSurface: Surface;
  powerPreference: PowerPreference;
  backendType: BackendType;
  forceFallbackAdapter: boolean;
  compatibilityMode: boolean;
}
type RequestAdapterCallback = Function;
interface RequestAdapterCallbackInfo {
  mode: CallbackMode;
  callback: RequestAdapterCallback;
  userdata: bigint;
}
enum RequestAdapterStatus {
  Success = 0,
  Unavailable = 1,
  Error = 2,
  Unknown = 3,
}
interface Adapter {
  getInstance(): Instance;
  getLimits(limits: SupportedLimits): boolean;
  getProperties(properties: AdapterProperties): void;
  hasFeature(feature: FeatureName): boolean;
  enumerateFeatures(features: FeatureName): number;
  requestDevice(
    descriptor: DeviceDescriptor | undefined,
    callback: RequestDeviceCallback,
    userdata: bigint
  ): void;
  createDevice(descriptor: DeviceDescriptor | undefined): Device;
}
interface AdapterProperties {
  vendorId: number;
  vendorName: string;
  architecture: string;
  deviceId: number;
  name: string;
  driverDescription: string;
  adapterType: AdapterType;
  backendType: BackendType;
  compatibilityMode: boolean;
}
enum AdapterType {
  DiscreteGpu = 0,
  IntegratedGpu = 1,
  Cpu = 2,
  Unknown = 3,
}
interface DeviceDescriptor {
  label: string;
  requiredFeatureCount: number;
  requiredFeatures: FeatureName;
  requiredLimits: RequiredLimits;
  defaultQueue: QueueDescriptor;
  deviceLostCallback: DeviceLostCallback;
  deviceLostUserdata: bigint;
}
interface DawnTogglesDescriptor {
  enabledToggleCount: number;
  enabledToggles: string;
  disabledToggleCount: number;
  disabledToggles: string;
}
interface DawnCacheDeviceDescriptor {
  isolationKey: string;
}
enum AddressMode {
  Repeat = 0,
  MirrorRepeat = 1,
  ClampToEdge = 2,
}
enum BackendType {
  Undefined = 0,
  Null = 1,
  WebGpu = 2,
  D3D11 = 3,
  D3D12 = 4,
  Metal = 5,
  Vulkan = 6,
  OpenGl = 7,
  OpenGles = 8,
}
interface BindGroup {
  setLabel(label: string): void;
}
interface BindGroupEntry {
  binding: number;
  buffer: Buffer;
  offset: bigint;
  size: bigint;
  sampler: Sampler;
  textureView: TextureView;
}
interface BindGroupDescriptor {
  label: string;
  layout: BindGroupLayout;
  entryCount: number;
  entries: BindGroupEntry;
}
interface BindGroupLayout {
  setLabel(label: string): void;
}
enum BufferBindingType {
  Undefined = 0,
  Uniform = 1,
  Storage = 2,
  ReadOnlyStorage = 3,
}
interface BufferBindingLayout {
  type: BufferBindingType;
  hasDynamicOffset: boolean;
  minBindingSize: bigint;
}
enum SamplerBindingType {
  Undefined = 0,
  Filtering = 1,
  NonFiltering = 2,
  Comparison = 3,
}
interface SamplerBindingLayout {
  type: SamplerBindingType;
}
enum TextureSampleType {
  Undefined = 0,
  Float = 1,
  UnfilterableFloat = 2,
  Depth = 3,
  Sint = 4,
  Uint = 5,
}
interface TextureBindingLayout {
  sampleType: TextureSampleType;
  viewDimension: TextureViewDimension;
  multisampled: boolean;
}
interface SurfaceCapabilities {
  formatCount: number;
  formats: TextureFormat;
  presentModeCount: number;
  presentModes: PresentMode;
  alphaModeCount: number;
  alphaModes: CompositeAlphaMode;
}
interface SurfaceConfiguration {
  device: Device;
  format: TextureFormat;
  usage: TextureUsage;
  viewFormatCount: number;
  viewFormats: TextureFormat;
  alphaMode: CompositeAlphaMode;
  width: number;
  height: number;
  presentMode: PresentMode;
}
interface ExternalTextureBindingEntry {
  externalTexture: ExternalTexture;
}
interface ExternalTextureBindingLayout {}
enum StorageTextureAccess {
  Undefined = 0,
  WriteOnly = 1,
  ReadOnly = 2,
  ReadWrite = 3,
}
interface StorageTextureBindingLayout {
  access: StorageTextureAccess;
  format: TextureFormat;
  viewDimension: TextureViewDimension;
}
interface BindGroupLayoutEntry {
  binding: number;
  visibility: ShaderStage;
  buffer: BufferBindingLayout;
  sampler: SamplerBindingLayout;
  texture: TextureBindingLayout;
  storageTexture: StorageTextureBindingLayout;
}
interface BindGroupLayoutDescriptor {
  label: string;
  entryCount: number;
  entries: BindGroupLayoutEntry;
}
interface BlendComponent {
  operation: BlendOperation;
  srcFactor: BlendFactor;
  dstFactor: BlendFactor;
}
enum BlendFactor {
  Zero = 0,
  One = 1,
  Src = 2,
  OneMinusSrc = 3,
  SrcAlpha = 4,
  OneMinusSrcAlpha = 5,
  Dst = 6,
  OneMinusDst = 7,
  DstAlpha = 8,
  OneMinusDstAlpha = 9,
  SrcAlphaSaturated = 10,
  Constant = 11,
  OneMinusConstant = 12,
  Src1 = 13,
  OneMinusSrc1 = 14,
  Src1Alpha = 15,
  OneMinusSrc1Alpha = 16,
}
enum BlendOperation {
  Add = 0,
  Subtract = 1,
  ReverseSubtract = 2,
  Min = 3,
  Max = 4,
}
interface Buffer {
  mapAsync(
    mode: MapMode,
    offset: number,
    size: number,
    callback: BufferMapCallback,
    userdata: bigint
  ): void;
  mapAsyncF(
    mode: MapMode,
    offset: number,
    size: number,
    callbackInfo: BufferMapCallbackInfo
  ): Future;
  getMappedRange(offset: number, size: number): bigint;
  getConstMappedRange(offset: number, size: number): bigint;
  setLabel(label: string): void;
  getUsage(): BufferUsage;
  getSize(): bigint;
  getMapState(): BufferMapState;
  unmap(): void;
  destroy(): void;
}
interface BufferDescriptor {
  label: string;
  usage: BufferUsage;
  size: bigint;
  mappedAtCreation: boolean;
}
interface BufferHostMappedPointer {
  pointer: bigint;
  disposeCallback: Callback;
  userdata: bigint;
}
type Callback = Function;
type BufferMapCallback = Function;
interface BufferMapCallbackInfo {
  mode: CallbackMode;
  callback: BufferMapCallback;
  userdata: bigint;
}
enum BufferMapAsyncStatus {
  Success = 0,
  ValidationError = 1,
  Unknown = 2,
  DeviceLost = 3,
  DestroyedBeforeCallback = 4,
  UnmappedBeforeCallback = 5,
  MappingAlreadyPending = 6,
  OffsetOutOfRange = 7,
  SizeOutOfRange = 8,
}
enum BufferMapState {
  Unmapped = 0,
  Pending = 1,
  Mapped = 2,
}
enum BufferUsage {
  None = 0,
  MapRead = 1,
  MapWrite = 2,
  CopySrc = 4,
  CopyDst = 8,
  Index = 16,
  Vertex = 32,
  Uniform = 64,
  Storage = 128,
  Indirect = 256,
  QueryResolve = 512,
}
interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}
enum ColorWriteMask {
  None = 0,
  Red = 1,
  Green = 2,
  Blue = 4,
  Alpha = 8,
  All = 15,
}
interface ConstantEntry {
  key: string;
  value: number;
}
interface CommandBuffer {
  setLabel(label: string): void;
}
interface CommandBufferDescriptor {
  label: string;
}
interface CommandEncoder {
  finish(descriptor: CommandBufferDescriptor | undefined): CommandBuffer;
  beginComputePass(
    descriptor: ComputePassDescriptor | undefined
  ): ComputePassEncoder;
  beginRenderPass(descriptor: RenderPassDescriptor): RenderPassEncoder;
  copyBufferToBuffer(
    source: Buffer,
    sourceOffset: bigint,
    destination: Buffer,
    destinationOffset: bigint,
    size: bigint
  ): void;
  copyBufferToTexture(
    source: ImageCopyBuffer,
    destination: ImageCopyTexture,
    copySize: Extent3D
  ): void;
  copyTextureToBuffer(
    source: ImageCopyTexture,
    destination: ImageCopyBuffer,
    copySize: Extent3D
  ): void;
  copyTextureToTexture(
    source: ImageCopyTexture,
    destination: ImageCopyTexture,
    copySize: Extent3D
  ): void;
  clearBuffer(buffer: Buffer, offset: bigint, size: bigint): void;
  injectValidationError(message: string): void;
  insertDebugMarker(markerLabel: string): void;
  popDebugGroup(): void;
  pushDebugGroup(groupLabel: string): void;
  resolveQuerySet(
    querySet: QuerySet,
    firstQuery: number,
    queryCount: number,
    destination: Buffer,
    destinationOffset: bigint
  ): void;
  writeBuffer(
    buffer: Buffer,
    bufferOffset: bigint,
    data: Uint8Array,
    size: bigint
  ): void;
  writeTimestamp(querySet: QuerySet, queryIndex: number): void;
  setLabel(label: string): void;
}
interface CommandEncoderDescriptor {
  label: string;
}
enum CompareFunction {
  Undefined = 0,
  Never = 1,
  Less = 2,
  LessEqual = 3,
  Greater = 4,
  GreaterEqual = 5,
  Equal = 6,
  NotEqual = 7,
  Always = 8,
}
interface CompilationInfo {
  messageCount: number;
  messages: CompilationMessage;
}
type CompilationInfoCallback = Function;
enum CompilationInfoRequestStatus {
  Success = 0,
  Error = 1,
  DeviceLost = 2,
  Unknown = 3,
}
interface CompilationMessage {
  message: string;
  type: CompilationMessageType;
  lineNum: bigint;
  linePos: bigint;
  offset: bigint;
  length: bigint;
  utf16LinePos: bigint;
  utf16Offset: bigint;
  utf16Length: bigint;
}
enum CompilationMessageType {
  Error = 0,
  Warning = 1,
  Info = 2,
}
interface ComputePassDescriptor {
  label: string;
  timestampWrites: ComputePassTimestampWrites;
}
interface ComputePassEncoder {
  insertDebugMarker(markerLabel: string): void;
  popDebugGroup(): void;
  pushDebugGroup(groupLabel: string): void;
  setPipeline(pipeline: ComputePipeline): void;
  setBindGroup(
    groupIndex: number,
    group: BindGroup | undefined,
    dynamicOffsetCount: number,
    dynamicOffsets: Uint32Array
  ): void;
  writeTimestamp(querySet: QuerySet, queryIndex: number): void;
  dispatchWorkgroups(
    workgroupCountX: number,
    workgroupCountY: number,
    workgroupCountZ: number
  ): void;
  dispatchWorkgroupsIndirect(
    indirectBuffer: Buffer,
    indirectOffset: bigint
  ): void;
  end(): void;
  setLabel(label: string): void;
}
enum CompositeAlphaMode {
  Auto = 0,
  Opaque = 1,
  Premultiplied = 2,
  Unpremultiplied = 3,
  Inherit = 4,
}
interface ComputePassTimestampWrites {
  querySet: QuerySet;
  beginningOfPassWriteIndex: number;
  endOfPassWriteIndex: number;
}
interface ComputePipeline {
  getBindGroupLayout(groupIndex: number): BindGroupLayout;
  setLabel(label: string): void;
}
interface ComputePipelineDescriptor {
  label: string;
  layout: PipelineLayout;
  compute: ProgrammableStageDescriptor;
}
interface DawnComputePipelineFullSubgroups {
  requiresFullSubgroups: boolean;
}
enum AlphaMode {
  Premultiplied = 0,
  Unpremultiplied = 1,
  Opaque = 2,
}
interface CopyTextureForBrowserOptions {
  flipY: boolean;
  needsColorSpaceConversion: boolean;
  srcAlphaMode: AlphaMode;
  srcTransferFunctionParameters: Float32Array;
  conversionMatrix: Float32Array;
  dstTransferFunctionParameters: Float32Array;
  dstAlphaMode: AlphaMode;
  internalUsage: boolean;
}
type CreateComputePipelineAsyncCallback = Function;
enum CreatePipelineAsyncStatus {
  Success = 0,
  ValidationError = 1,
  InternalError = 2,
  DeviceLost = 3,
  DeviceDestroyed = 4,
  Unknown = 5,
}
type CreateRenderPipelineAsyncCallback = Function;
enum CullMode {
  None = 0,
  Front = 1,
  Back = 2,
}
interface Device {
  createBindGroup(descriptor: BindGroupDescriptor): BindGroup;
  createBindGroupLayout(descriptor: BindGroupLayoutDescriptor): BindGroupLayout;
  createBuffer(descriptor: BufferDescriptor): Buffer;
  createErrorBuffer(descriptor: BufferDescriptor): Buffer;
  createCommandEncoder(
    descriptor: CommandEncoderDescriptor | undefined
  ): CommandEncoder;
  createComputePipeline(descriptor: ComputePipelineDescriptor): ComputePipeline;
  createComputePipelineAsync(
    descriptor: ComputePipelineDescriptor,
    callback: CreateComputePipelineAsyncCallback,
    userdata: bigint
  ): void;
  createExternalTexture(
    externalTextureDescriptor: ExternalTextureDescriptor
  ): ExternalTexture;
  createErrorExternalTexture(): ExternalTexture;
  createPipelineLayout(descriptor: PipelineLayoutDescriptor): PipelineLayout;
  createQuerySet(descriptor: QuerySetDescriptor): QuerySet;
  createRenderPipelineAsync(
    descriptor: RenderPipelineDescriptor,
    callback: CreateRenderPipelineAsyncCallback,
    userdata: bigint
  ): void;
  createRenderBundleEncoder(
    descriptor: RenderBundleEncoderDescriptor
  ): RenderBundleEncoder;
  createRenderPipeline(descriptor: RenderPipelineDescriptor): RenderPipeline;
  createSampler(descriptor: SamplerDescriptor | undefined): Sampler;
  createShaderModule(descriptor: ShaderModuleDescriptor): ShaderModule;
  createErrorShaderModule(
    descriptor: ShaderModuleDescriptor,
    errorMessage: string
  ): ShaderModule;
  createSwapChain(surface: Surface, descriptor: SwapChainDescriptor): SwapChain;
  createTexture(descriptor: TextureDescriptor): Texture;
  importSharedTextureMemory(
    descriptor: SharedTextureMemoryDescriptor
  ): SharedTextureMemory;
  importSharedFence(descriptor: SharedFenceDescriptor): SharedFence;
  createErrorTexture(descriptor: TextureDescriptor): Texture;
  destroy(): void;
  getLimits(limits: SupportedLimits): boolean;
  hasFeature(feature: FeatureName): boolean;
  enumerateFeatures(features: FeatureName): number;
  getAdapter(): Adapter;
  getQueue(): Queue;
  injectError(type: ErrorType, message: string): void;
  forceLoss(type: DeviceLostReason, message: string): void;
  tick(): void;
  setUncapturedErrorCallback(callback: ErrorCallback, userdata: bigint): void;
  setLoggingCallback(callback: LoggingCallback, userdata: bigint): void;
  setDeviceLostCallback(callback: DeviceLostCallback, userdata: bigint): void;
  pushErrorScope(filter: ErrorFilter): void;
  popErrorScope(callback: ErrorCallback, userdata: bigint): void;
  setLabel(label: string): void;
  validateTextureDescriptor(descriptor: TextureDescriptor): void;
  getSupportedSurfaceUsage(surface: Surface): TextureUsage;
}
type DeviceLostCallback = Function;
enum DeviceLostReason {
  Undefined = 0,
  Destroyed = 1,
}
interface Limits {
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
  maxTextureArrayLayers: number;
  maxBindGroups: number;
  maxBindGroupsPlusVertexBuffers: number;
  maxBindingsPerBindGroup: number;
  maxDynamicUniformBuffersPerPipelineLayout: number;
  maxDynamicStorageBuffersPerPipelineLayout: number;
  maxSampledTexturesPerShaderStage: number;
  maxSamplersPerShaderStage: number;
  maxStorageBuffersPerShaderStage: number;
  maxStorageTexturesPerShaderStage: number;
  maxUniformBuffersPerShaderStage: number;
  maxUniformBufferBindingSize: bigint;
  maxStorageBufferBindingSize: bigint;
  minUniformBufferOffsetAlignment: number;
  minStorageBufferOffsetAlignment: number;
  maxVertexBuffers: number;
  maxBufferSize: bigint;
  maxVertexAttributes: number;
  maxVertexBufferArrayStride: number;
  maxInterStageShaderComponents: number;
  maxInterStageShaderVariables: number;
  maxColorAttachments: number;
  maxColorAttachmentBytesPerSample: number;
  maxComputeWorkgroupStorageSize: number;
  maxComputeInvocationsPerWorkgroup: number;
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeWorkgroupSizeZ: number;
  maxComputeWorkgroupsPerDimension: number;
}
interface DawnExperimentalSubgroupLimits {
  minSubgroupSize: number;
  maxSubgroupSize: number;
}
interface RequiredLimits {
  limits: Limits;
}
interface SupportedLimits {
  limits: Limits;
}
type LoggingCallback = Function;
enum ErrorFilter {
  Validation = 0,
  OutOfMemory = 1,
  Internal = 2,
}
enum ErrorType {
  NoError = 0,
  Validation = 1,
  OutOfMemory = 2,
  Internal = 3,
  Unknown = 4,
  DeviceLost = 5,
}
enum LoggingType {
  Verbose = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
}
interface Extent2D {
  width: number;
  height: number;
}
interface Extent3D {
  width: number;
  height: number;
  depthOrArrayLayers: number;
}
interface ExternalTexture {
  setLabel(label: string): void;
  destroy(): void;
  expire(): void;
  refresh(): void;
}
enum ExternalTextureRotation {
  Rotate0Degrees = 0,
  Rotate90Degrees = 1,
  Rotate180Degrees = 2,
  Rotate270Degrees = 3,
}
interface ExternalTextureDescriptor {
  label: string;
  plane0: TextureView;
  plane1: TextureView;
  visibleOrigin: Origin2D;
  visibleSize: Extent2D;
  doYuvToRgbConversionOnly: boolean;
  yuvToRgbConversionMatrix: Float32Array;
  srcTransferFunctionParameters: Float32Array;
  dstTransferFunctionParameters: Float32Array;
  gamutConversionMatrix: Float32Array;
  flipY: boolean;
  rotation: ExternalTextureRotation;
}
interface SharedTextureMemory {
  setLabel(label: string): void;
  getProperties(properties: SharedTextureMemoryProperties): void;
  createTexture(descriptor: TextureDescriptor | undefined): Texture;
  beginAccess(
    texture: Texture,
    descriptor: SharedTextureMemoryBeginAccessDescriptor
  ): boolean;
  endAccess(
    texture: Texture,
    descriptor: SharedTextureMemoryEndAccessState
  ): boolean;
  isDeviceLost(): boolean;
}
interface SharedTextureMemoryProperties {
  usage: TextureUsage;
  size: Extent3D;
  format: TextureFormat;
}
interface SharedTextureMemoryDescriptor {
  label: string;
}
interface SharedTextureMemoryVkImageDescriptor {
  vkFormat: number;
  vkUsageFlags: number;
  vkExtent3D: Extent3D;
}
interface SharedTextureMemoryVkDedicatedAllocationDescriptor {
  dedicatedAllocation: boolean;
}
interface SharedTextureMemoryAHardwareBufferDescriptor {
  handle: bigint;
}
interface SharedTextureMemoryDmaBufPlane {
  fd: number;
  offset: bigint;
  stride: number;
}
interface SharedTextureMemoryDmaBufDescriptor {
  size: Extent3D;
  drmFormat: number;
  drmModifier: bigint;
  planeCount: number;
  planes: SharedTextureMemoryDmaBufPlane;
}
interface SharedTextureMemoryOpaqueFdDescriptor {
  memoryFd: number;
  allocationSize: bigint;
}
interface SharedTextureMemoryZirconHandleDescriptor {
  memoryFd: number;
  allocationSize: bigint;
}
interface SharedTextureMemoryDxgiSharedHandleDescriptor {
  handle: bigint;
}
interface SharedTextureMemoryIoSurfaceDescriptor {
  ioSurface: bigint;
}
interface SharedTextureMemoryEglImageDescriptor {
  image: bigint;
}
interface SharedTextureMemoryBeginAccessDescriptor {
  initialized: boolean;
  fenceCount: number;
  fences: SharedFence;
  signaledValues: BigUint64Array;
}
interface SharedTextureMemoryEndAccessState {
  initialized: boolean;
  fenceCount: number;
  fences: SharedFence;
  signaledValues: BigUint64Array;
}
interface SharedTextureMemoryVkImageLayoutBeginState {
  oldLayout: number;
  newLayout: number;
}
interface SharedTextureMemoryVkImageLayoutEndState {
  oldLayout: number;
  newLayout: number;
}
interface SharedFence {
  exportInfo(info: SharedFenceExportInfo): void;
}
interface SharedFenceDescriptor {
  label: string;
}
interface SharedFenceVkSemaphoreOpaqueFdDescriptor {
  handle: number;
}
interface SharedFenceVkSemaphoreSyncFdDescriptor {
  handle: number;
}
interface SharedFenceVkSemaphoreZirconHandleDescriptor {
  handle: number;
}
interface SharedFenceDxgiSharedHandleDescriptor {
  handle: bigint;
}
interface SharedFenceMtlSharedEventDescriptor {
  sharedEvent: bigint;
}
enum SharedFenceType {
  Undefined = 0,
  VkSemaphoreOpaqueFd = 1,
  VkSemaphoreSyncFd = 2,
  VkSemaphoreZirconHandle = 3,
  DxgiSharedHandle = 4,
  MtlSharedEvent = 5,
}
interface SharedFenceExportInfo {
  type: SharedFenceType;
}
interface SharedFenceVkSemaphoreOpaqueFdExportInfo {
  handle: number;
}
interface SharedFenceVkSemaphoreSyncFdExportInfo {
  handle: number;
}
interface SharedFenceVkSemaphoreZirconHandleExportInfo {
  handle: number;
}
interface SharedFenceDxgiSharedHandleExportInfo {
  handle: bigint;
}
interface SharedFenceMtlSharedEventExportInfo {
  sharedEvent: bigint;
}
enum FeatureName {
  Undefined = 0,
  DepthClipControl = 1,
  Depth32FloatStencil8 = 2,
  TimestampQuery = 3,
  TextureCompressionBc = 4,
  TextureCompressionEtc2 = 5,
  TextureCompressionAstc = 6,
  IndirectFirstInstance = 7,
  ShaderF16 = 8,
  Rg11B10UfloatRenderable = 9,
  Bgra8UnormStorage = 10,
  Float32Filterable = 11,
  DawnInternalUsages = 1002,
  DawnMultiPlanarFormats = 1003,
  DawnNative = 1004,
  ChromiumExperimentalDp4A = 1005,
  ChromiumExperimentalTimestampQueryInsidePasses = 1006,
  ImplicitDeviceSynchronization = 1007,
  SurfaceCapabilities = 1008,
  TransientAttachments = 1009,
  MsaaRenderToSingleSampled = 1010,
  DualSourceBlending = 1011,
  D3D11MultithreadProtected = 1012,
  AngleTextureSharing = 1013,
  ChromiumExperimentalSubgroups = 1014,
  ChromiumExperimentalSubgroupUniformControlFlow = 1015,
  PixelLocalStorageCoherent = 1017,
  PixelLocalStorageNonCoherent = 1018,
  Norm16TextureFormats = 1019,
  MultiPlanarFormatExtendedUsages = 1020,
  MultiPlanarFormatP010 = 1021,
  HostMappedPointer = 1022,
  MultiPlanarRenderTargets = 1023,
  MultiPlanarFormatNv12A = 1024,
  FramebufferFetch = 1025,
  BufferMapExtendedUsages = 1026,
  AdapterPropertiesMemoryHeaps = 1027,
  SharedTextureMemoryVkDedicatedAllocation = 1100,
  SharedTextureMemoryAHardwareBuffer = 1101,
  SharedTextureMemoryDmaBuf = 1102,
  SharedTextureMemoryOpaqueFd = 1103,
  SharedTextureMemoryZirconHandle = 1104,
  SharedTextureMemoryDxgiSharedHandle = 1105,
  SharedTextureMemoryD3D11Texture2D = 1106,
  SharedTextureMemoryIoSurface = 1107,
  SharedTextureMemoryEglImage = 1108,
  SharedFenceVkSemaphoreOpaqueFd = 1200,
  SharedFenceVkSemaphoreSyncFd = 1201,
  SharedFenceVkSemaphoreZirconHandle = 1202,
  SharedFenceDxgiSharedHandle = 1203,
  SharedFenceMtlSharedEvent = 1204,
}
enum FilterMode {
  Nearest = 0,
  Linear = 1,
}
enum FrontFace {
  Ccw = 0,
  Cw = 1,
}
interface ImageCopyBuffer {
  layout: TextureDataLayout;
  buffer: Buffer;
}
interface ImageCopyTexture {
  texture: Texture;
  mipLevel: number;
  origin: Origin3D;
  aspect: TextureAspect;
}
interface ImageCopyExternalTexture {
  externalTexture: ExternalTexture;
  origin: Origin3D;
  naturalSize: Extent2D;
}
enum IndexFormat {
  Undefined = 0,
  Uint16 = 1,
  Uint32 = 2,
}
interface Instance {
  createSurface(descriptor: SurfaceDescriptor): Surface;
  processEvents(): void;
  waitAny(
    futureCount: number,
    futures: FutureWaitInfo,
    timeoutNs: bigint
  ): WaitStatus;
  requestAdapter(
    options: RequestAdapterOptions | undefined,
    callback: RequestAdapterCallback,
    userdata: bigint
  ): void;
  requestAdapterF(
    options: RequestAdapterOptions | undefined,
    callbackInfo: RequestAdapterCallbackInfo
  ): Future;
  hasWgslLanguageFeature(feature: WgslFeatureName): boolean;
  enumerateWgslLanguageFeatures(features: WgslFeatureName): number;
}
enum CallbackMode {
  WaitAnyOnly = 0,
  AllowProcessEvents = 1,
  AllowSpontaneous = 2,
}
interface Future {
  id: bigint;
}
enum WaitStatus {
  Success = 0,
  TimedOut = 1,
  UnsupportedTimeout = 2,
  UnsupportedCount = 3,
  UnsupportedMixedSources = 4,
  Unknown = 5,
}
interface FutureWaitInfo {
  future: Future;
  completed: boolean;
}
interface InstanceFeatures {
  timedWaitAnyEnable: boolean;
  timedWaitAnyMaxCount: number;
}
interface InstanceDescriptor {
  features: InstanceFeatures;
}
interface VertexAttribute {
  format: VertexFormat;
  offset: bigint;
  shaderLocation: number;
}
interface VertexBufferLayout {
  arrayStride: bigint;
  stepMode: VertexStepMode;
  attributeCount: number;
  attributes: VertexAttribute;
}
enum VertexStepMode {
  Vertex = 0,
  Instance = 1,
  VertexBufferNotUsed = 2,
}
enum LoadOp {
  Undefined = 0,
  Clear = 1,
  Load = 2,
}
enum MapMode {
  None = 0,
  Read = 1,
  Write = 2,
}
enum MipmapFilterMode {
  Nearest = 0,
  Linear = 1,
}
enum StoreOp {
  Undefined = 0,
  Store = 1,
  Discard = 2,
}
interface Origin3D {
  x: number;
  y: number;
  z: number;
}
interface Origin2D {
  x: number;
  y: number;
}
interface PipelineLayout {
  setLabel(label: string): void;
}
interface PipelineLayoutDescriptor {
  label: string;
  bindGroupLayoutCount: number;
  bindGroupLayouts: BindGroupLayout;
}
interface PipelineLayoutPixelLocalStorage {
  totalPixelLocalStorageSize: bigint;
  storageAttachmentCount: number;
  storageAttachments: PipelineLayoutStorageAttachment;
}
interface PipelineLayoutStorageAttachment {
  offset: bigint;
  format: TextureFormat;
}
enum PowerPreference {
  Undefined = 0,
  LowPower = 1,
  HighPerformance = 2,
}
enum PresentMode {
  Fifo = 0,
  FifoRelaxed = 1,
  Immediate = 2,
  Mailbox = 3,
}
interface ProgrammableStageDescriptor {
  module: ShaderModule;
  entryPoint: string;
  constantCount: number;
  constants: ConstantEntry;
}
enum PrimitiveTopology {
  PointList = 0,
  LineList = 1,
  LineStrip = 2,
  TriangleList = 3,
  TriangleStrip = 4,
}
interface QuerySet {
  setLabel(label: string): void;
  getType(): QueryType;
  getCount(): number;
  destroy(): void;
}
interface QuerySetDescriptor {
  label: string;
  type: QueryType;
  count: number;
}
enum QueryType {
  Occlusion = 0,
  Timestamp = 1,
}
interface Queue {
  submit(commandCount: number, commands: CommandBuffer): void;
  onSubmittedWorkDone(
    signalValue: bigint,
    callback: QueueWorkDoneCallback,
    userdata: bigint
  ): void;
  onSubmittedWorkDone(callback: QueueWorkDoneCallback, userdata: bigint): void;
  onSubmittedWorkDoneF(callbackInfo: QueueWorkDoneCallbackInfo): Future;
  writeBuffer(
    buffer: Buffer,
    bufferOffset: bigint,
    data: ArrayBuffer,
    size: number
  ): void;
  writeTexture(
    destination: ImageCopyTexture,
    data: ArrayBuffer,
    dataSize: number,
    dataLayout: TextureDataLayout,
    writeSize: Extent3D
  ): void;
  copyTextureForBrowser(
    source: ImageCopyTexture,
    destination: ImageCopyTexture,
    copySize: Extent3D,
    options: CopyTextureForBrowserOptions
  ): void;
  copyExternalTextureForBrowser(
    source: ImageCopyExternalTexture,
    destination: ImageCopyTexture,
    copySize: Extent3D,
    options: CopyTextureForBrowserOptions
  ): void;
  setLabel(label: string): void;
}
interface QueueDescriptor {
  label: string;
}
type QueueWorkDoneCallback = Function;
interface QueueWorkDoneCallbackInfo {
  mode: CallbackMode;
  callback: QueueWorkDoneCallback;
  userdata: bigint;
}
enum QueueWorkDoneStatus {
  Success = 0,
  Error = 1,
  Unknown = 2,
  DeviceLost = 3,
}
interface RenderBundle {
  setLabel(label: string): void;
}
interface RenderBundleEncoder {
  setPipeline(pipeline: RenderPipeline): void;
  setBindGroup(
    groupIndex: number,
    group: BindGroup | undefined,
    dynamicOffsetCount: number,
    dynamicOffsets: Uint32Array
  ): void;
  draw(
    vertexCount: number,
    instanceCount: number,
    firstVertex: number,
    firstInstance: number
  ): void;
  drawIndexed(
    indexCount: number,
    instanceCount: number,
    firstIndex: number,
    baseVertex: number,
    firstInstance: number
  ): void;
  drawIndirect(indirectBuffer: Buffer, indirectOffset: bigint): void;
  drawIndexedIndirect(indirectBuffer: Buffer, indirectOffset: bigint): void;
  insertDebugMarker(markerLabel: string): void;
  popDebugGroup(): void;
  pushDebugGroup(groupLabel: string): void;
  setVertexBuffer(
    slot: number,
    buffer: Buffer | undefined,
    offset: bigint,
    size: bigint
  ): void;
  setIndexBuffer(
    buffer: Buffer,
    format: IndexFormat,
    offset: bigint,
    size: bigint
  ): void;
  finish(descriptor: RenderBundleDescriptor | undefined): RenderBundle;
  setLabel(label: string): void;
}
interface RenderBundleDescriptor {
  label: string;
}
interface RenderBundleEncoderDescriptor {
  label: string;
  colorFormatCount: number;
  colorFormats: TextureFormat;
  depthStencilFormat: TextureFormat;
  sampleCount: number;
  depthReadOnly: boolean;
  stencilReadOnly: boolean;
}
interface RenderPassColorAttachment {
  view: TextureView;
  depthSlice: number;
  resolveTarget: TextureView;
  loadOp: LoadOp;
  storeOp: StoreOp;
  clearValue: Color;
}
interface DawnRenderPassColorAttachmentRenderToSingleSampled {
  implicitSampleCount: number;
}
interface RenderPassDepthStencilAttachment {
  view: TextureView;
  depthLoadOp: LoadOp;
  depthStoreOp: StoreOp;
  depthClearValue: number;
  depthReadOnly: boolean;
  stencilLoadOp: LoadOp;
  stencilStoreOp: StoreOp;
  stencilClearValue: number;
  stencilReadOnly: boolean;
}
interface RenderPassDescriptor {
  label: string;
  colorAttachmentCount: number;
  colorAttachments: RenderPassColorAttachment;
  depthStencilAttachment: RenderPassDepthStencilAttachment;
  occlusionQuerySet: QuerySet;
  timestampWrites: RenderPassTimestampWrites;
}
interface RenderPassDescriptorMaxDrawCount {
  maxDrawCount: bigint;
}
interface RenderPassPixelLocalStorage {
  totalPixelLocalStorageSize: bigint;
  storageAttachmentCount: number;
  storageAttachments: RenderPassStorageAttachment;
}
interface RenderPassStorageAttachment {
  offset: bigint;
  storage: TextureView;
  loadOp: LoadOp;
  storeOp: StoreOp;
  clearValue: Color;
}
interface RenderPassEncoder {
  setPipeline(pipeline: RenderPipeline): void;
  setBindGroup(
    groupIndex: number,
    group: BindGroup | undefined,
    dynamicOffsetCount: number,
    dynamicOffsets: Uint32Array
  ): void;
  draw(
    vertexCount: number,
    instanceCount: number,
    firstVertex: number,
    firstInstance: number
  ): void;
  drawIndexed(
    indexCount: number,
    instanceCount: number,
    firstIndex: number,
    baseVertex: number,
    firstInstance: number
  ): void;
  drawIndirect(indirectBuffer: Buffer, indirectOffset: bigint): void;
  drawIndexedIndirect(indirectBuffer: Buffer, indirectOffset: bigint): void;
  executeBundles(bundleCount: number, bundles: RenderBundle): void;
  insertDebugMarker(markerLabel: string): void;
  popDebugGroup(): void;
  pushDebugGroup(groupLabel: string): void;
  setStencilReference(reference: number): void;
  setBlendConstant(color: Color): void;
  setViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    minDepth: number,
    maxDepth: number
  ): void;
  setScissorRect(x: number, y: number, width: number, height: number): void;
  setVertexBuffer(
    slot: number,
    buffer: Buffer | undefined,
    offset: bigint,
    size: bigint
  ): void;
  setIndexBuffer(
    buffer: Buffer,
    format: IndexFormat,
    offset: bigint,
    size: bigint
  ): void;
  beginOcclusionQuery(queryIndex: number): void;
  endOcclusionQuery(): void;
  writeTimestamp(querySet: QuerySet, queryIndex: number): void;
  pixelLocalStorageBarrier(): void;
  end(): void;
  setLabel(label: string): void;
}
interface RenderPassTimestampWrites {
  querySet: QuerySet;
  beginningOfPassWriteIndex: number;
  endOfPassWriteIndex: number;
}
interface RenderPipeline {
  getBindGroupLayout(groupIndex: number): BindGroupLayout;
  setLabel(label: string): void;
}
type RequestDeviceCallback = Function;
enum RequestDeviceStatus {
  Success = 0,
  Error = 1,
  Unknown = 2,
}
interface VertexState {
  module: ShaderModule;
  entryPoint: string;
  constantCount: number;
  constants: ConstantEntry;
  bufferCount: number;
  buffers: VertexBufferLayout;
}
interface PrimitiveState {
  topology: PrimitiveTopology;
  stripIndexFormat: IndexFormat;
  frontFace: FrontFace;
  cullMode: CullMode;
}
interface PrimitiveDepthClipControl {
  unclippedDepth: boolean;
}
interface DepthStencilState {
  format: TextureFormat;
  depthWriteEnabled: boolean;
  depthCompare: CompareFunction;
  stencilFront: StencilFaceState;
  stencilBack: StencilFaceState;
  stencilReadMask: number;
  stencilWriteMask: number;
  depthBias: number;
  depthBiasSlopeScale: number;
  depthBiasClamp: number;
}
interface DepthStencilStateDepthWriteDefinedDawn {
  depthWriteDefined: boolean;
}
interface MultisampleState {
  count: number;
  mask: number;
  alphaToCoverageEnabled: boolean;
}
interface DawnMultisampleStateRenderToSingleSampled {
  enabled: boolean;
}
interface FragmentState {
  module: ShaderModule;
  entryPoint: string;
  constantCount: number;
  constants: ConstantEntry;
  targetCount: number;
  targets: ColorTargetState;
}
interface ColorTargetState {
  format: TextureFormat;
  blend: BlendState;
  writeMask: ColorWriteMask;
}
interface BlendState {
  color: BlendComponent;
  alpha: BlendComponent;
}
interface RenderPipelineDescriptor {
  label: string;
  layout: PipelineLayout;
  vertex: VertexState;
  primitive: PrimitiveState;
  depthStencil: DepthStencilState;
  multisample: MultisampleState;
  fragment: FragmentState;
}
interface Sampler {
  setLabel(label: string): void;
}
interface SamplerDescriptor {
  label: string;
  addressModeU: AddressMode;
  addressModeV: AddressMode;
  addressModeW: AddressMode;
  magFilter: FilterMode;
  minFilter: FilterMode;
  mipmapFilter: MipmapFilterMode;
  lodMinClamp: number;
  lodMaxClamp: number;
  compare: CompareFunction;
  maxAnisotropy: number;
}
interface ShaderModule {
  getCompilationInfo(callback: CompilationInfoCallback, userdata: bigint): void;
  setLabel(label: string): void;
}
interface ShaderModuleDescriptor {
  label: string;
  hintCount: number;
  hints: ShaderModuleCompilationHint;
}
interface ShaderModuleCompilationHint {
  entryPoint: string;
  layout: PipelineLayout;
}
interface ShaderModuleSpirvDescriptor {
  codeSize: number;
  code: Uint32Array;
}
interface ShaderModuleWgslDescriptor {
  code: string;
}
interface DawnShaderModuleSpirvOptionsDescriptor {
  allowNonUniformDerivatives: boolean;
}
enum ShaderStage {
  None = 0,
  Vertex = 1,
  Fragment = 2,
  Compute = 4,
}
enum StencilOperation {
  Keep = 0,
  Zero = 1,
  Replace = 2,
  Invert = 3,
  IncrementClamp = 4,
  DecrementClamp = 5,
  IncrementWrap = 6,
  DecrementWrap = 7,
}
interface StencilFaceState {
  compare: CompareFunction;
  failOp: StencilOperation;
  depthFailOp: StencilOperation;
  passOp: StencilOperation;
}
interface Surface {
  configure(config: SurfaceConfiguration): void;
  getCapabilities(adapter: Adapter, capabilities: SurfaceCapabilities): void;
  getCurrentTexture(surfaceTexture: SurfaceTexture): void;
  getPreferredFormat(adapter: Adapter): TextureFormat;
  present(): void;
  unconfigure(): void;
}
interface SurfaceDescriptor {
  label: string;
}
interface SurfaceDescriptorFromAndroidNativeWindow {
  window: ArrayBuffer;
}
interface SurfaceDescriptorFromCanvasHtmlSelector {
  selector: string;
}
interface SurfaceDescriptorFromMetalLayer {
  layer: ArrayBuffer;
}
interface SurfaceDescriptorFromWindowsHwnd {
  hinstance: ArrayBuffer;
  hwnd: ArrayBuffer;
}
interface SurfaceDescriptorFromXcbWindow {
  connection: ArrayBuffer;
  window: number;
}
interface SurfaceDescriptorFromXlibWindow {
  display: ArrayBuffer;
  window: bigint;
}
interface SurfaceDescriptorFromWaylandSurface {
  display: ArrayBuffer;
  surface: ArrayBuffer;
}
interface SurfaceDescriptorFromWindowsCoreWindow {
  coreWindow: ArrayBuffer;
}
interface SurfaceDescriptorFromWindowsSwapChainPanel {
  swapChainPanel: ArrayBuffer;
}
interface SwapChain {
  getCurrentTextureView(): TextureView;
  getCurrentTexture(): Texture;
  present(): void;
}
interface SwapChainDescriptor {
  label: string;
  usage: TextureUsage;
  format: TextureFormat;
  width: number;
  height: number;
  presentMode: PresentMode;
}
interface SurfaceTexture {
  texture: Texture;
  suboptimal: boolean;
  status: SurfaceGetCurrentTextureStatus;
}
enum SType {
  Invalid = 0,
  SurfaceDescriptorFromMetalLayer = 1,
  SurfaceDescriptorFromWindowsHwnd = 2,
  SurfaceDescriptorFromXlibWindow = 3,
  SurfaceDescriptorFromCanvasHtmlSelector = 4,
  ShaderModuleSpirvDescriptor = 5,
  ShaderModuleWgslDescriptor = 6,
  PrimitiveDepthClipControl = 7,
  SurfaceDescriptorFromWaylandSurface = 8,
  SurfaceDescriptorFromAndroidNativeWindow = 9,
  SurfaceDescriptorFromXcbWindow = 10,
  SurfaceDescriptorFromWindowsCoreWindow = 11,
  ExternalTextureBindingEntry = 12,
  ExternalTextureBindingLayout = 13,
  SurfaceDescriptorFromWindowsSwapChainPanel = 14,
  RenderPassDescriptorMaxDrawCount = 15,
  DepthStencilStateDepthWriteDefinedDawn = 16,
  TextureBindingViewDimensionDescriptor = 17,
  DawnTextureInternalUsageDescriptor = 1000,
  DawnEncoderInternalUsageDescriptor = 1003,
  DawnInstanceDescriptor = 1004,
  DawnCacheDeviceDescriptor = 1005,
  DawnAdapterPropertiesPowerPreference = 1006,
  DawnBufferDescriptorErrorInfoFromWireClient = 1007,
  DawnTogglesDescriptor = 1008,
  DawnShaderModuleSpirvOptionsDescriptor = 1009,
  RequestAdapterOptionsLuid = 1010,
  RequestAdapterOptionsGetGlProc = 1011,
  RequestAdapterOptionsD3D11Device = 1012,
  DawnMultisampleStateRenderToSingleSampled = 1013,
  DawnRenderPassColorAttachmentRenderToSingleSampled = 1014,
  RenderPassPixelLocalStorage = 1015,
  PipelineLayoutPixelLocalStorage = 1016,
  BufferHostMappedPointer = 1017,
  DawnExperimentalSubgroupLimits = 1018,
  AdapterPropertiesMemoryHeaps = 1019,
  DawnComputePipelineFullSubgroups = 1020,
  SharedTextureMemoryVkImageDescriptor = 1100,
  SharedTextureMemoryVkDedicatedAllocationDescriptor = 1101,
  SharedTextureMemoryAHardwareBufferDescriptor = 1102,
  SharedTextureMemoryDmaBufDescriptor = 1103,
  SharedTextureMemoryOpaqueFdDescriptor = 1104,
  SharedTextureMemoryZirconHandleDescriptor = 1105,
  SharedTextureMemoryDxgiSharedHandleDescriptor = 1106,
  SharedTextureMemoryD3D11Texture2DDescriptor = 1107,
  SharedTextureMemoryIoSurfaceDescriptor = 1108,
  SharedTextureMemoryEglImageDescriptor = 1109,
  SharedTextureMemoryInitializedBeginState = 1200,
  SharedTextureMemoryInitializedEndState = 1201,
  SharedTextureMemoryVkImageLayoutBeginState = 1202,
  SharedTextureMemoryVkImageLayoutEndState = 1203,
  SharedFenceVkSemaphoreOpaqueFdDescriptor = 1204,
  SharedFenceVkSemaphoreOpaqueFdExportInfo = 1205,
  SharedFenceVkSemaphoreSyncFdDescriptor = 1206,
  SharedFenceVkSemaphoreSyncFdExportInfo = 1207,
  SharedFenceVkSemaphoreZirconHandleDescriptor = 1208,
  SharedFenceVkSemaphoreZirconHandleExportInfo = 1209,
  SharedFenceDxgiSharedHandleDescriptor = 1210,
  SharedFenceDxgiSharedHandleExportInfo = 1211,
  SharedFenceMtlSharedEventDescriptor = 1212,
  SharedFenceMtlSharedEventExportInfo = 1213,
}
interface Texture {
  createView(descriptor: TextureViewDescriptor | undefined): TextureView;
  setLabel(label: string): void;
  getWidth(): number;
  getHeight(): number;
  getDepthOrArrayLayers(): number;
  getMipLevelCount(): number;
  getSampleCount(): number;
  getDimension(): TextureDimension;
  getFormat(): TextureFormat;
  getUsage(): TextureUsage;
  destroy(): void;
}
enum SurfaceGetCurrentTextureStatus {
  Success = 0,
  Timeout = 1,
  Outdated = 2,
  Lost = 3,
  OutOfMemory = 4,
  DeviceLost = 5,
}
enum TextureAspect {
  All = 0,
  StencilOnly = 1,
  DepthOnly = 2,
  Plane0Only = 3,
  Plane1Only = 4,
  Plane2Only = 5,
}
interface TextureDataLayout {
  offset: bigint;
  bytesPerRow: number;
  rowsPerImage: number;
}
interface TextureDescriptor {
  label: string;
  usage: TextureUsage;
  dimension: TextureDimension;
  size: Extent3D;
  format: TextureFormat;
  mipLevelCount: number;
  sampleCount: number;
  viewFormatCount: number;
  viewFormats: TextureFormat;
}
interface TextureBindingViewDimensionDescriptor {
  textureBindingViewDimension: TextureViewDimension;
}
enum TextureDimension {
  "1D" = 0,
  "2D" = 1,
  "3D" = 2,
}
enum TextureFormat {
  Undefined = 0,
  R8Unorm = 1,
  R8Snorm = 2,
  R8Uint = 3,
  R8Sint = 4,
  R16Uint = 5,
  R16Sint = 6,
  R16Float = 7,
  Rg8Unorm = 8,
  Rg8Snorm = 9,
  Rg8Uint = 10,
  Rg8Sint = 11,
  R32Float = 12,
  R32Uint = 13,
  R32Sint = 14,
  Rg16Uint = 15,
  Rg16Sint = 16,
  Rg16Float = 17,
  Rgba8Unorm = 18,
  Rgba8UnormSrgb = 19,
  Rgba8Snorm = 20,
  Rgba8Uint = 21,
  Rgba8Sint = 22,
  Bgra8Unorm = 23,
  Bgra8UnormSrgb = 24,
  Rgb10A2Uint = 25,
  Rgb10A2Unorm = 26,
  Rg11B10Ufloat = 27,
  Rgb9E5Ufloat = 28,
  Rg32Float = 29,
  Rg32Uint = 30,
  Rg32Sint = 31,
  Rgba16Uint = 32,
  Rgba16Sint = 33,
  Rgba16Float = 34,
  Rgba32Float = 35,
  Rgba32Uint = 36,
  Rgba32Sint = 37,
  Stencil8 = 38,
  Depth16Unorm = 39,
  Depth24Plus = 40,
  Depth24PlusStencil8 = 41,
  Depth32Float = 42,
  Depth32FloatStencil8 = 43,
  Bc1RgbaUnorm = 44,
  Bc1RgbaUnormSrgb = 45,
  Bc2RgbaUnorm = 46,
  Bc2RgbaUnormSrgb = 47,
  Bc3RgbaUnorm = 48,
  Bc3RgbaUnormSrgb = 49,
  Bc4RUnorm = 50,
  Bc4RSnorm = 51,
  Bc5RgUnorm = 52,
  Bc5RgSnorm = 53,
  Bc6HRgbUfloat = 54,
  Bc6HRgbFloat = 55,
  Bc7RgbaUnorm = 56,
  Bc7RgbaUnormSrgb = 57,
  Etc2Rgb8Unorm = 58,
  Etc2Rgb8UnormSrgb = 59,
  Etc2Rgb8A1Unorm = 60,
  Etc2Rgb8A1UnormSrgb = 61,
  Etc2Rgba8Unorm = 62,
  Etc2Rgba8UnormSrgb = 63,
  EacR11Unorm = 64,
  EacR11Snorm = 65,
  EacRg11Unorm = 66,
  EacRg11Snorm = 67,
  Astc4X4Unorm = 68,
  Astc4X4UnormSrgb = 69,
  Astc5X4Unorm = 70,
  Astc5X4UnormSrgb = 71,
  Astc5X5Unorm = 72,
  Astc5X5UnormSrgb = 73,
  Astc6X5Unorm = 74,
  Astc6X5UnormSrgb = 75,
  Astc6X6Unorm = 76,
  Astc6X6UnormSrgb = 77,
  Astc8X5Unorm = 78,
  Astc8X5UnormSrgb = 79,
  Astc8X6Unorm = 80,
  Astc8X6UnormSrgb = 81,
  Astc8X8Unorm = 82,
  Astc8X8UnormSrgb = 83,
  Astc10X5Unorm = 84,
  Astc10X5UnormSrgb = 85,
  Astc10X6Unorm = 86,
  Astc10X6UnormSrgb = 87,
  Astc10X8Unorm = 88,
  Astc10X8UnormSrgb = 89,
  Astc10X10Unorm = 90,
  Astc10X10UnormSrgb = 91,
  Astc12X10Unorm = 92,
  Astc12X10UnormSrgb = 93,
  Astc12X12Unorm = 94,
  Astc12X12UnormSrgb = 95,
  R16Unorm = 96,
  Rg16Unorm = 97,
  Rgba16Unorm = 98,
  R16Snorm = 99,
  Rg16Snorm = 100,
  Rgba16Snorm = 101,
  R8Bg8Biplanar420Unorm = 102,
  R10X6Bg10X6Biplanar420Unorm = 103,
  R8Bg8A8Triplanar420Unorm = 104,
}
enum TextureUsage {
  None = 0,
  CopySrc = 1,
  CopyDst = 2,
  TextureBinding = 4,
  StorageBinding = 8,
  RenderAttachment = 16,
  TransientAttachment = 32,
  StorageAttachment = 64,
}
interface TextureViewDescriptor {
  label: string;
  format: TextureFormat;
  dimension: TextureViewDimension;
  baseMipLevel: number;
  mipLevelCount: number;
  baseArrayLayer: number;
  arrayLayerCount: number;
  aspect: TextureAspect;
}
interface TextureView {
  setLabel(label: string): void;
}
enum TextureViewDimension {
  Undefined = 0,
  "1D" = 1,
  "2D" = 2,
  "2DArray" = 3,
  Cube = 4,
  CubeArray = 5,
  "3D" = 6,
}
enum VertexFormat {
  Undefined = 0,
  Uint8X2 = 1,
  Uint8X4 = 2,
  Sint8X2 = 3,
  Sint8X4 = 4,
  Unorm8X2 = 5,
  Unorm8X4 = 6,
  Snorm8X2 = 7,
  Snorm8X4 = 8,
  Uint16X2 = 9,
  Uint16X4 = 10,
  Sint16X2 = 11,
  Sint16X4 = 12,
  Unorm16X2 = 13,
  Unorm16X4 = 14,
  Snorm16X2 = 15,
  Snorm16X4 = 16,
  Float16X2 = 17,
  Float16X4 = 18,
  Float32 = 19,
  Float32X2 = 20,
  Float32X3 = 21,
  Float32X4 = 22,
  Uint32 = 23,
  Uint32X2 = 24,
  Uint32X3 = 25,
  Uint32X4 = 26,
  Sint32 = 27,
  Sint32X2 = 28,
  Sint32X3 = 29,
  Sint32X4 = 30,
  Unorm1010102 = 31,
}
enum WgslFeatureName {
  Undefined = 0,
  ReadonlyAndReadwriteStorageTextures = 1,
  Packed4X8IntegerDotProduct = 2,
  UnrestrictedPointerParameters = 3,
  PointerCompositeAccess = 4,
  ChromiumTestingUnimplemented = 1000,
  ChromiumTestingUnsafeExperimental = 1001,
  ChromiumTestingExperimental = 1002,
  ChromiumTestingShippedWithKillswitch = 1003,
  ChromiumTestingShipped = 1004,
}
interface DawnTextureInternalUsageDescriptor {
  internalUsage: TextureUsage;
}
interface DawnEncoderInternalUsageDescriptor {
  useInternalUsages: boolean;
}
interface DawnAdapterPropertiesPowerPreference {
  powerPreference: PowerPreference;
}
enum HeapProperty {
  Undefined = 0,
  DeviceLocal = 1,
  HostVisible = 2,
  HostCoherent = 4,
  HostUncached = 8,
  HostCached = 16,
}
interface MemoryHeapInfo {
  properties: HeapProperty;
  size: bigint;
}
interface AdapterPropertiesMemoryHeaps {
  heapCount: number;
  heapInfo: MemoryHeapInfo;
}
interface DawnBufferDescriptorErrorInfoFromWireClient {
  outOfMemory: boolean;
}
