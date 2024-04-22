export interface Wgpu {
  "create instance":                                            CreateInstance;
  proc:                                                         GetInstanceFeatures;
  "get proc address":                                           GetProcAddress;
  "request adapter options":                                    BindGroupEntry;
  "request adapter callback":                                   CreateComputePipelineAsyncCallbackClass;
  "request adapter callback info":                              BindGroupLayoutEntry;
  "request adapter status":                                     AdapterType;
  adapter:                                                      Adapter;
  "adapter properties":                                         AdapterProperties;
  "adapter type":                                               AdapterType;
  "device descriptor":                                          EDescriptor;
  "dawn toggles descriptor":                                    DawnTogglesDescriptor;
  "dawn cache device descriptor":                               DawnCacheDeviceDescriptor;
  "address mode":                                               AddressMode;
  "backend type":                                               BackendType;
  "bind group":                                                 BindGroup;
  "bind group entry":                                           BindGroupEntry;
  "bind group descriptor":                                      BindGroupDescriptor;
  "bind group layout":                                          BindGroup;
  "buffer binding type":                                        BufferBindingType;
  "buffer binding layout":                                      BindGroupEntry;
  "sampler binding type":                                       BufferBindingType;
  "sampler binding layout":                                     BindGroupEntry;
  "texture sample type":                                        BufferBindingType;
  "texture binding layout":                                     BindGroupEntry;
  "surface capabilities":                                       SurfaceC;
  "surface configuration":                                      SurfaceC;
  "external texture binding entry":                             BufferHostMappedPointer;
  "external texture binding layout":                            AdapterPropertiesMemoryHeaps;
  "storage texture access":                                     WgslFeatureName;
  "storage texture binding layout":                             BindGroupEntry;
  "bind group layout entry":                                    BindGroupLayoutEntry;
  "bind group layout descriptor":                               BindGroupDescriptor;
  "blend component":                                            BlendComponent;
  "blend factor":                                               WgslFeatureName;
  "blend operation":                                            AddressMode;
  bool:                                                         Bool;
  buffer:                                                       Buffer;
  "buffer descriptor":                                          BufferDescriptorClass;
  "buffer host mapped pointer":                                 BufferHostMappedPointer;
  callback:                                                     Callback;
  "buffer map callback":                                        BufferMapCallbackClass;
  "buffer map callback info":                                   BindGroupLayoutEntry;
  "buffer map async status":                                    AdapterType;
  "buffer map state":                                           AddressMode;
  "buffer usage":                                               AddressMode;
  char:                                                         Bool;
  color:                                                        Color;
  "color write mask":                                           AddressMode;
  "constant entry":                                             CompilationInfo;
  "command buffer":                                             BindGroup;
  "command buffer descriptor":                                  CommandBufferDescriptorClass;
  "command encoder":                                            CommandEncoder;
  "command encoder descriptor":                                 CommandBufferDescriptorClass;
  "compare function":                                           BufferBindingType;
  "compilation info":                                           CompilationInfo;
  "compilation info callback":                                  CompilationInfoCallback;
  "compilation info request status":                            AddressMode;
  "compilation message":                                        BindGroupDescriptor;
  "compilation message type":                                   AdapterType;
  "compute pass descriptor":                                    ComputePassDescriptor;
  "compute pass encoder":                                       Encoder;
  "composite alpha mode":                                       AlphaMode;
  "compute pass timestamp writes":                              ComputePassTimestampWrites;
  "compute pipeline":                                           ComputePipeline;
  "compute pipeline descriptor":                                BindGroupDescriptor;
  "dawn compute pipeline full subgroups":                       DawnAdapterPropertiesPowerPreference;
  "alpha mode":                                                 AlphaMode;
  "copy texture for browser options":                           CopyTextureForBrowserOptions;
  "create compute pipeline async callback":                     CreateComputePipelineAsyncCallbackClass;
  "create pipeline async status":                               AdapterType;
  "create render pipeline async callback":                      CreateComputePipelineAsyncCallbackClass;
  "cull mode":                                                  AddressMode;
  device:                                                       Device;
  "device lost callback":                                       DeviceLostCallbackClass;
  "device lost reason":                                         BackendType;
  double:                                                       Bool;
  "error callback":                                             DeviceLostCallbackClass;
  limits:                                                       ComputePassTimestampWrites;
  "dawn experimental subgroup limits":                          DawnAdapterPropertiesPowerPreference;
  "required limits":                                            BindGroupLayoutEntry;
  "supported limits":                                           BindGroupLayoutEntry;
  "logging callback":                                           LoggingCallback;
  "error filter":                                               AddressMode;
  "error type":                                                 AdapterType;
  "logging type":                                               AlphaMode;
  "extent 2D":                                                  BindGroupLayoutEntry;
  "extent 3D":                                                  Extent3D;
  "external texture":                                           ExternalTexture;
  "external texture rotation":                                  AlphaMode;
  "external texture descriptor":                                CopyTextureForBrowserOptions;
  "shared texture memory":                                      SharedTextureMemory;
  "shared texture memory properties":                           BindGroupLayoutEntry;
  "shared texture memory descriptor":                           CommandBufferDescriptorClass;
  "shared texture memory vk image descriptor":                  BufferHostMappedPointer;
  "shared texture memory vk dedicated allocation descriptor":   BufferHostMappedPointer;
  "shared texture memory a hardware buffer descriptor":         BufferHostMappedPointer;
  "shared texture memory dma buf plane":                        BindGroupLayoutEntry;
  "shared texture memory dma buf descriptor":                   AdapterPropertiesMemoryHeaps;
  "shared texture memory opaque FD descriptor":                 BufferHostMappedPointer;
  "shared texture memory zircon handle descriptor":             BufferHostMappedPointer;
  "shared texture memory DXGI shared handle descriptor":        BufferHostMappedPointer;
  "shared texture memory IO surface descriptor":                BufferHostMappedPointer;
  "shared texture memory EGL image descriptor":                 BufferHostMappedPointer;
  "shared texture memory begin access descriptor":              CompilationInfo;
  "shared texture memory end access state":                     CompilationInfo;
  "shared texture memory vk image layout begin state":          BufferHostMappedPointer;
  "shared texture memory vk image layout end state":            BufferHostMappedPointer;
  "shared fence":                                               SharedFence;
  "shared fence descriptor":                                    CommandBufferDescriptorClass;
  "shared fence vk semaphore opaque FD descriptor":             BufferHostMappedPointer;
  "shared fence vk semaphore sync FD descriptor":               BufferHostMappedPointer;
  "shared fence vk semaphore zircon handle descriptor":         BufferHostMappedPointer;
  "shared fence DXGI shared handle descriptor":                 BufferHostMappedPointer;
  "shared fence MTL shared event descriptor":                   BufferHostMappedPointer;
  "shared fence type":                                          HeapProperty;
  "shared fence export info":                                   BindGroupLayoutEntry;
  "shared fence vk semaphore opaque FD export info":            BufferHostMappedPointer;
  "shared fence vk semaphore sync FD export info":              BufferHostMappedPointer;
  "shared fence vk semaphore zircon handle export info":        BufferHostMappedPointer;
  "shared fence DXGI shared handle export info":                BufferHostMappedPointer;
  "shared fence MTL shared event export info":                  BufferHostMappedPointer;
  "feature name":                                               WgslFeatureName;
  "filter mode":                                                AddressMode;
  float:                                                        Bool;
  "front face":                                                 AddressMode;
  "image copy buffer":                                          BindGroupLayoutEntry;
  "image copy texture":                                         BindGroupEntry;
  "image copy external texture":                                BindGroupLayoutEntry;
  "index format":                                               WgslFeatureName;
  instance:                                                     Instance;
  "callback mode":                                              AddressMode;
  future:                                                       Color;
  "wait status":                                                AdapterType;
  "future wait info":                                           ComputePassTimestampWrites;
  "instance features":                                          BindGroupEntry;
  "instance descriptor":                                        BindGroupLayoutEntry;
  "get instance features":                                      GetInstanceFeatures;
  "vertex attribute":                                           BlendState;
  "vertex buffer layout":                                       VertexBufferLayout;
  "vertex step mode":                                           BufferBindingType;
  "load op":                                                    WgslFeatureName;
  "map mode":                                                   AddressMode;
  "mipmap filter mode":                                         AddressMode;
  "store op":                                                   WgslFeatureName;
  "origin 3D":                                                  ComputePassTimestampWrites;
  "origin 2D":                                                  Origin2D;
  "pipeline layout":                                            BindGroup;
  "pipeline layout descriptor":                                 BindGroupDescriptor;
  "pipeline layout pixel local storage":                        DawnTogglesDescriptor;
  "pipeline layout storage attachment":                         StorageAttachment;
  "power preference":                                           WgslFeatureName;
  "present mode":                                               BackendType;
  "programmable stage descriptor":                              FragmentState;
  "primitive topology":                                         AddressMode;
  "query set":                                                  BindGroup;
  "query set descriptor":                                       BindGroupDescriptor;
  "query type":                                                 AddressMode;
  queue:                                                        Queue;
  "queue descriptor":                                           CommandBufferDescriptorClass;
  "queue work done callback":                                   BufferMapCallbackClass;
  "queue work done callback info":                              BindGroupLayoutEntry;
  "queue work done status":                                     AdapterType;
  "render bundle":                                              BindGroup;
  "render bundle encoder":                                      Encoder;
  "render bundle descriptor":                                   CommandBufferDescriptorClass;
  "render bundle encoder descriptor":                           BufferDescriptorClass;
  "render pass color attachment":                               BindGroupEntry;
  "dawn render pass color attachment render to single sampled": DawnRenderPassColorAttachmentRenderToSingleSampled;
  "render pass depth stencil attachment":                       ComputePassTimestampWrites;
  "render pass descriptor":                                     BindGroupDescriptor;
  "render pass descriptor max draw count":                      DawnRenderPassColorAttachmentRenderToSingleSampled;
  "render pass pixel local storage":                            DawnTogglesDescriptor;
  "render pass storage attachment":                             StorageAttachment;
  "render pass encoder":                                        Encoder;
  "render pass timestamp writes":                               ComputePassTimestampWrites;
  "render pipeline":                                            ComputePipeline;
  "request device callback":                                    RequestDeviceCallback;
  "request device status":                                      AdapterType;
  "vertex state":                                               FragmentState;
  "primitive state":                                            BindGroupEntry;
  "primitive depth clip control":                               DawnAdapterPropertiesPowerPreference;
  "depth stencil state":                                        BindGroupEntry;
  "depth stencil state depth write defined dawn":               BufferHostMappedPointer;
  "multisample state":                                          BindGroupEntry;
  "dawn multisample state render to single sampled":            DawnAdapterPropertiesPowerPreference;
  "fragment state":                                             FragmentState;
  "color target state":                                         ColorTargetState;
  "blend state":                                                BlendState;
  "render pipeline descriptor":                                 BindGroupDescriptor;
  sampler:                                                      BindGroup;
  "sampler descriptor":                                         BufferDescriptorClass;
  "shader module":                                              ComputePipeline;
  "shader module descriptor":                                   ColorTargetState;
  "shader module compilation hint":                             CompilationInfo;
  "shader module SPIRV descriptor":                             AdapterPropertiesMemoryHeaps;
  "shader module WGSL descriptor":                              Tor;
  "dawn shader module SPIRV options descriptor":                DawnAdapterPropertiesPowerPreference;
  "shader stage":                                               AddressMode;
  "stencil operation":                                          AddressMode;
  "stencil face state":                                         BlendComponent;
  surface:                                                      Adapter;
  "surface descriptor":                                         CommandBufferDescriptorClass;
  "surface descriptor from android native window":              AdapterPropertiesMemoryHeaps;
  "surface descriptor from canvas HTML selector":               Tor;
  "surface descriptor from metal layer":                        AdapterPropertiesMemoryHeaps;
  "surface descriptor from windows HWND":                       AdapterPropertiesMemoryHeaps;
  "surface descriptor from xcb window":                         SurfaceDescriptorFromXbWindow;
  "surface descriptor from xlib window":                        SurfaceDescriptorFromXbWindow;
  "surface descriptor from wayland surface":                    AdapterPropertiesMemoryHeaps;
  "surface descriptor from windows core window":                AdapterPropertiesMemoryHeaps;
  "surface descriptor from windows swap chain panel":           AdapterPropertiesMemoryHeaps;
  "swap chain":                                                 SwapChain;
  "swap chain descriptor":                                      BindGroupDescriptor;
  "surface texture":                                            BindGroupLayoutEntry;
  "s type":                                                     BackendType;
  texture:                                                      Texture;
  "surface get current texture status":                         AlphaMode;
  "texture aspect":                                             WgslFeatureName;
  "texture data layout":                                        TextureDataLayout;
  "texture descriptor":                                         EDescriptor;
  "texture binding view dimension descriptor":                  DawnAdapterPropertiesPowerPreference;
  "texture dimension":                                          AddressMode;
  "texture format":                                             WgslFeatureName;
  "texture usage":                                              WgslFeatureName;
  "texture view descriptor":                                    BufferDescriptorClass;
  "texture view":                                               BindGroup;
  "texture view dimension":                                     BufferBindingType;
  "vertex format":                                              BufferBindingType;
  "WGSL feature name":                                          WgslFeatureName;
  "whole size":                                                 ArrayLayerCountUndefined;
  "whole map size":                                             ArrayLayerCountUndefined;
  "copy stride undefined":                                      ArrayLayerCountUndefined;
  "limit u32 undefined":                                        ArrayLayerCountUndefined;
  "limit u64 undefined":                                        ArrayLayerCountUndefined;
  "array layer count undefined":                                ArrayLayerCountUndefined;
  "mip level count undefined":                                  ArrayLayerCountUndefined;
  "depth slice undefined":                                      ArrayLayerCountUndefined;
  "query set index undefined":                                  ArrayLayerCountUndefined;
  ObjectType:                                                   Object;
  ObjectId:                                                     Object;
  ObjectHandle:                                                 Object;
  void:                                                         Bool;
  "void *":                                                     Bool;
  "void const *":                                               Bool;
  int:                                                          Bool;
  int32_t:                                                      Bool;
  size_t:                                                       SizeT;
  uint16_t:                                                     Bool;
  uint32_t:                                                     Bool;
  uint64_t:                                                     Bool;
  uint8_t:                                                      Bool;
  "dawn texture internal usage descriptor":                     DawnAdapterPropertiesPowerPreference;
  "dawn encoder internal usage descriptor":                     DawnAdapterPropertiesPowerPreference;
  "dawn adapter properties power preference":                   DawnAdapterPropertiesPowerPreference;
  "heap property":                                              HeapProperty;
  "memory heap info":                                           BindGroupLayoutEntry;
  "adapter properties memory heaps":                            AdapterPropertiesMemoryHeaps;
  "dawn buffer descriptor error info from wire client":         DawnAdapterPropertiesPowerPreference;
}

export interface Object {
  _comment: string;
  category: CategoryElement;
}

export enum CategoryElement {
  Dawn = "dawn",
  Native = "native",
  Upstream = "upstream",
}

export interface WgslFeatureName {
  category: WGSLFeatureNameCategory;
  values:   WGSLFeatureNameValue[];
}

export enum WGSLFeatureNameCategory {
  Bitmask = "bitmask",
  Enum = "enum",
}

export interface WGSLFeatureNameValue {
  value:   number;
  name:    string;
  valid?:  boolean;
  jsrepr?: string;
  tags?:   CategoryElement[];
}

export interface Adapter {
  category:      string;
  "no autolock": boolean;
  methods:       AdapterMethod[];
}

export interface AdapterMethod {
  name:     string;
  tags?:    MemberTag[];
  returns?: string;
  args?:    Arg[];
}

export interface Arg {
  name:        string;
  type:        string;
  annotation?: Annotation;
  optional?:   boolean;
  no_default?: boolean;
  length?:     string;
  default?:    number | string;
}

export enum Annotation {
  Const = "const*",
  ConstConst = "const*const*",
  Empty = "*",
}

export enum MemberTag {
  Dawn = "dawn",
  Emscripten = "emscripten",
  Upstream = "upstream",
}

export interface AdapterProperties {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    AdapterPropertiesMember[];
}

export enum AdapterPropertiesCategory {
  Structure = "structure",
}

export enum Extensible {
  In = "in",
  Out = "out",
}

export interface AdapterPropertiesMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     string;
  default?:    number | string;
  tags?:       MemberTag[];
  optional?:   boolean;
}

export interface AdapterPropertiesMemoryHeaps {
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  tags?:         CategoryElement[];
  members:       AdapterPropertiesMemoryHeapsMember[];
}

export interface AdapterPropertiesMemoryHeapsMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     number | string;
  optional?:   boolean;
  default?:    number | string;
  tags?:       CategoryElement[];
}

export interface AdapterType {
  category:                 WGSLFeatureNameCategory;
  emscripten_no_enum_table: boolean;
  values:                   AdapterTypeValue[];
  _comment?:                string;
}

export interface AdapterTypeValue {
  value: number;
  name:  string;
}

export interface AddressMode {
  category: WGSLFeatureNameCategory;
  values:   AdapterTypeValue[];
}

export interface AlphaMode {
  category: WGSLFeatureNameCategory;
  tags:     CategoryElement[];
  values:   AdapterTypeValue[];
}

export interface ArrayLayerCountUndefined {
  category: string;
  type:     string;
  value:    string;
}

export interface BackendType {
  category:                 WGSLFeatureNameCategory;
  emscripten_no_enum_table: boolean;
  values:                   WGSLFeatureNameValue[];
}

export interface BindGroup {
  category: string;
  methods:  BindGroupMethod[];
}

export interface BindGroupMethod {
  name:     string;
  returns?: Returns;
  args?:    CompilationInfoMember[];
}

export interface CompilationInfoMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     PurpleLength;
}

export enum PurpleLength {
  FenceCount = "fence count",
  MessageCount = "message count",
  Strlen = "strlen",
}

export enum Returns {
  QueryType = "query type",
  Uint32T = "uint32_t",
  Void = "void",
}

export interface BindGroupDescriptor {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    BindGroupDescriptorMember[];
  tags?:      MemberTag[];
}

export interface BindGroupDescriptorMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     FluffyLength;
  optional?:   boolean;
}

export enum FluffyLength {
  BindGroupLayoutCount = "bind group layout count",
  ColorAttachmentCount = "color attachment count",
  EntryCount = "entry count",
  Strlen = "strlen",
}

export interface BindGroupEntry {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    BindGroupEntryMember[];
}

export interface BindGroupEntryMember {
  name:      string;
  type:      string;
  optional?: boolean;
  default?:  string;
  tags?:     MemberTag[];
}

export interface BindGroupLayoutEntry {
  category:    AdapterPropertiesCategory;
  extensible?: Extensible;
  members:     BindGroupLayoutEntryMember[];
  tags?:       CategoryElement[];
}

export interface BindGroupLayoutEntryMember {
  name: string;
  type: string;
}

export interface BlendComponent {
  category:   AdapterPropertiesCategory;
  extensible: boolean;
  members:    BindGroupEntryMember[];
}

export interface BlendState {
  category:   AdapterPropertiesCategory;
  extensible: boolean;
  members:    BindGroupLayoutEntryMember[];
}

export interface Bool {
  category: CategoryElement;
}

export interface Buffer {
  category: string;
  methods:  BufferMethod[];
}

export interface BufferMethod {
  name:      string;
  args?:     Arg[];
  _comment?: string;
  tags?:     MemberTag[];
  returns?:  string;
}

export interface BufferBindingType {
  category: WGSLFeatureNameCategory;
  values:   BufferBindingTypeValue[];
}

export interface BufferBindingTypeValue {
  value:   number;
  name:    string;
  jsrepr?: string;
  valid?:  boolean;
}

export interface BufferDescriptorClass {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    BufferDescriptorMember[];
}

export interface BufferDescriptorMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     TentacledLength;
  optional?:   boolean;
  default?:    string;
}

export enum TentacledLength {
  BundleCount = "bundle count",
  ColorFormatCount = "color format count",
  DynamicOffsetCount = "dynamic offset count",
  Strlen = "strlen",
}

export interface BufferHostMappedPointer {
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  tags:          CategoryElement[];
  members:       BindGroupLayoutEntryMember[];
  _comment?:     string;
}

export interface BufferMapCallbackClass {
  category: string;
  args:     BindGroupLayoutEntryMember[];
}

export interface Callback {
  category: string;
  tags:     CategoryElement[];
  args:     BindGroupLayoutEntryMember[];
}

export interface Color {
  category: AdapterPropertiesCategory;
  members:  BindGroupLayoutEntryMember[];
}

export interface ColorTargetState {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    AdapterPropertiesMemoryHeapsMember[];
}

export interface CommandBufferDescriptorClass {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    BindGroupDescriptorMember[];
  tags?:      CategoryElement[];
}

export interface CommandEncoder {
  category:      string;
  "no autolock": boolean;
  methods:       CommandEncoderMethod[];
}

export interface CommandEncoderMethod {
  name:     string;
  returns?: string;
  args:     AdapterPropertiesMemoryHeapsMember[];
  tags?:    CategoryElement[];
}

export interface CompilationInfo {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    CompilationInfoMember[];
  tags?:      CategoryElement[];
}

export interface CompilationInfoCallback {
  category: string;
  args:     Arg[];
}

export interface ComputePassDescriptor {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    Arg[];
}

export interface Encoder {
  category:      string;
  "no autolock": boolean;
  methods:       ComputePassEncoderMethod[];
}

export interface ComputePassEncoderMethod {
  name:     string;
  args?:    BufferDescriptorMember[];
  tags?:    MemberTag[];
  returns?: string;
}

export interface ComputePassTimestampWrites {
  category: AdapterPropertiesCategory;
  members:  BindGroupEntryMember[];
}

export interface ComputePipeline {
  category: string;
  methods:  ComputePipelineMethod[];
}

export interface ComputePipelineMethod {
  name:     string;
  returns?: string;
  args:     CompilationInfoMember[];
}

export interface CopyTextureForBrowserOptions {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  tags:       CategoryElement[];
  members:    AdapterPropertiesMemoryHeapsMember[];
}

export interface CreateComputePipelineAsyncCallbackClass {
  category: string;
  args:     BindGroupDescriptorMember[];
}

export interface CreateInstance {
  category: string;
  returns:  string;
  _comment: string;
  args:     AdapterPropertiesMember[];
}

export interface DawnAdapterPropertiesPowerPreference {
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  tags?:         CategoryElement[];
  members:       BindGroupEntryMember[];
}

export interface DawnCacheDeviceDescriptor {
  tags:          CategoryElement[];
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  members:       AdapterPropertiesMember[];
}

export interface DawnRenderPassColorAttachmentRenderToSingleSampled {
  tags?:         CategoryElement[];
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  members:       DawnRenderPassColorAttachmentRenderToSingleSampledMember[];
}

export interface DawnRenderPassColorAttachmentRenderToSingleSampledMember {
  name:     string;
  type:     string;
  default?: number;
}

export interface DawnTogglesDescriptor {
  tags:          CategoryElement[];
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  members:       DawnTogglesDescriptorMember[];
}

export interface DawnTogglesDescriptorMember {
  name:        string;
  type:        string;
  default?:    number;
  annotation?: Annotation;
  length?:     string;
}

export interface Device {
  category: string;
  methods:  DeviceMethod[];
}

export interface DeviceMethod {
  name:           string;
  returns?:       string;
  args?:          AdapterPropertiesMember[];
  tags?:          PurpleTag[];
  "no autolock"?: boolean;
}

export enum PurpleTag {
  Dawn = "dawn",
  Deprecated = "deprecated",
  Emscripten = "emscripten",
  Native = "native",
}

export interface EDescriptor {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    DeviceDescriptorMember[];
}

export interface DeviceDescriptorMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     string;
  optional?:   boolean;
  default?:    number | string;
}

export interface DeviceLostCallbackClass {
  category: string;
  args:     CompilationInfoMember[];
}

export interface Extent3D {
  category: AdapterPropertiesCategory;
  members:  DawnRenderPassColorAttachmentRenderToSingleSampledMember[];
}

export interface ExternalTexture {
  category: string;
  tags:     CategoryElement[];
  methods:  BindGroupMethod[];
}

export interface FragmentState {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    FragmentStateMember[];
}

export interface FragmentStateMember {
  name:        string;
  type:        string;
  annotation?: Annotation;
  length?:     string;
  optional?:   boolean;
  default?:    number;
}

export interface GetInstanceFeatures {
  category:  string;
  _comment?: string;
  returns:   string;
  args:      AdapterPropertiesMemoryHeapsMember[];
}

export interface GetProcAddress {
  category: string;
  returns:  string;
  args:     AdapterPropertiesMember[];
}

export interface HeapProperty {
  category: WGSLFeatureNameCategory;
  tags:     CategoryElement[];
  values:   HeapPropertyValue[];
}

export interface HeapPropertyValue {
  value:  number;
  name:   string;
  valid?: boolean;
}

export interface Instance {
  category:      string;
  "no autolock": boolean;
  methods:       BufferMethod[];
}

export interface LoggingCallback {
  category: string;
  tags:     CategoryElement[];
  args:     Arg[];
}

export interface Origin2D {
  category: AdapterPropertiesCategory;
  tags:     CategoryElement[];
  members:  BindGroupEntryMember[];
}

export interface StorageAttachment {
  category:   AdapterPropertiesCategory;
  tags:       CategoryElement[];
  extensible: Extensible;
  members:    DawnRenderPassColorAttachmentRenderToSingleSampledMember[];
}

export interface Queue {
  category: string;
  methods:  QueueMethod[];
}

export interface QueueMethod {
  name:        string;
  args:        AdapterPropertiesMember[];
  tags?:       MemberTag[];
  _comment?:   string;
  returns?:    string;
  extensible?: Extensible;
}

export interface RequestDeviceCallback {
  category: string;
  _comment: string;
  args:     Arg[];
}

export interface Tor {
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  members:       CompilationInfoMember[];
}

export interface SharedFence {
  category: string;
  tags:     CategoryElement[];
  methods:  SharedFenceMethod[];
}

export interface SharedFenceMethod {
  name:    string;
  returns: Returns;
  args:    AdapterPropertiesMemoryHeapsMember[];
}

export interface SharedTextureMemory {
  category: string;
  tags:     CategoryElement[];
  methods:  ComputePassEncoderMethod[];
}

export interface SizeT {
  category:           CategoryElement;
  "wire transparent": boolean;
}

export interface SurfaceC {
  category:   AdapterPropertiesCategory;
  tags:       CategoryElement[];
  extensible: Extensible;
  members:    AdapterPropertiesMember[];
  methods?:   SharedFenceMethod[];
}

export interface SurfaceDescriptorFromXbWindow {
  category:      AdapterPropertiesCategory;
  chained:       Extensible;
  "chain roots": string[];
  tags:          CategoryElement[];
  members:       Arg[];
}

export interface SwapChain {
  category: string;
  tags:     MemberTag[];
  methods:  AdapterMethod[];
}

export interface Texture {
  category: string;
  methods:  TextureMethod[];
}

export interface TextureMethod {
  name:     string;
  returns?: string;
  args?:    AdapterPropertiesMember[];
}

export interface TextureDataLayout {
  category:   AdapterPropertiesCategory;
  extensible: Extensible;
  members:    TextureDataLayoutMember[];
}

export interface TextureDataLayoutMember {
  name:    string;
  type:    string;
  default: number | string;
}

export interface VertexBufferLayout {
  category:   AdapterPropertiesCategory;
  extensible: boolean;
  members:    AdapterPropertiesMember[];
}
