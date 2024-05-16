export interface Arg {
  name: string;
  type: string;
  baseType?: string;
  optional?: boolean;
  defaultValue?: boolean;
  defaultAtomicValue?: string;
  ctype?: boolean;
}

export interface Method {
  name: string;
  async?: boolean;
  args: Arg[];
  returns?: string;
  implementation?: string;
  member?: string
}

export interface Property {
  name: string;
  type: string;
  optional?: boolean;
  defaultAtomicValue?: string;
  pointer?: boolean;
}

export interface JSIObject {
  name: string;
  host?: string;
  methods?: Method[];
  properties?: Property[]; 
  defaultProperties?: string;
  fromValueImpl?: string;
  iterable?: string;
}

export const model: JSIObject[] = [
  {
    name: "GPU",
    host: "Instance",
    methods: [
      {
        name: "requestAdapter",
        args: [
          { name: "options", optional: true, type: "RequestAdapterOptions", defaultValue: true }
        ],
        returns: "Adapter",
        implementation: ` auto defaultOptions = new wgpu::RequestAdapterOptions();
        auto options =
            count > 0 ? JsiRequestAdapterOptions::fromValue(runtime, arguments[0])
                      : defaultOptions;
        auto context = getContext();
        auto object = getObject();
        return RNJsi::JsiPromises::createPromiseAsJSIValue(
            runtime,
            [context = std::move(context), object = std::move(object),
             options = std::move(options)](
                jsi::Runtime &runtime,
                std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
              wgpu::Adapter adapter = nullptr;
              object->RequestAdapter(
                  nullptr,
                  [](WGPURequestAdapterStatus, WGPUAdapter cAdapter, const char *message,
                    void *userdata) {
                    if (message != nullptr) {
                      fprintf(stderr, "%s", message);
                      return;
                    }
                    *static_cast<wgpu::Adapter *>(userdata) =
                        wgpu::Adapter::Acquire(cAdapter);
                  },
                  &adapter);
              if (adapter == nullptr) {
                promise->resolve(jsi::Value::null());
              } else {
                promise->resolve(jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiAdapter>(std::move(context),
                                                          std::move(adapter))));
              }
            });`
      },
      {
        name: "getPreferredCanvasFormat",
        args: [],
        returns: "string",
        implementation: `return jsi::String::createFromUtf8(runtime, "rgba8unorm");`
      }
    ]
  },
  {
    name: "Context",
    properties: [
      { name: "gpu", type: "GPU" }
    ]
  },
  {
    name: "Adapter",
    methods: [
      {
        name: "requestDevice",
        args: [
          { name: "descriptor", type: "DeviceDescriptor", optional: true, defaultValue: true }
        ],
        returns: "Device",
       // async: true,
        implementation: `    auto defaultDescriptor = new wgpu::DeviceDescriptor();
        auto descriptor =
            count > 0 ? JsiDeviceDescriptor::fromValue(runtime, arguments[0])
                      : defaultDescriptor;
        auto context = getContext();
        auto object = getObject();
        return RNJsi::JsiPromises::createPromiseAsJSIValue(
            runtime,
            [context = std::move(context), object = std::move(object),
             descriptor = std::move(descriptor)](
                jsi::Runtime &runtime,
                std::shared_ptr<RNJsi::JsiPromises::Promise> promise) -> void {
                wgpu::Device device = nullptr;
                object->RequestDevice(
                    nullptr,
                    [](WGPURequestDeviceStatus, WGPUDevice cDevice, const char *message,
                      void *userdata) {
                      if (message != nullptr) {
                        fprintf(stderr, "%s", message);
                        return;
                      }
                      *static_cast<wgpu::Device *>(userdata) = wgpu::Device::Acquire(cDevice);
                    },
                    &device);
              if (device == nullptr) {
                promise->resolve(jsi::Value::null());
              } else {
                device.SetUncapturedErrorCallback(
                  [](WGPUErrorType type, const char *message, void *userdata) {
                    RNSkLogger::logToConsole("Error: %s", message);
                  },
                nullptr);
                promise->resolve(jsi::Object::createFromHostObject(
                    runtime, std::make_shared<JsiDevice>(std::move(context),
                                                         std::move(device))));
              }
            });`
      }
    ]
  },
  {
    name: "SamplerDescriptor",
    properties: [
      { name: "addressModeU", type: "AddressMode", "optional": true, "defaultAtomicValue": "clamp-to-edge" },
      { name: "addressModeV", type: "AddressMode", "optional": true, "defaultAtomicValue": "clamp-to-edge"  },
      { name: "addressModeW", type: "AddressMode", "optional": true, "defaultAtomicValue": "clamp-to-edge"  },
      { name: "magFilter", type: "FilterMode", "optional": true, "defaultAtomicValue": "nearest" },
      { name: "minFilter", type: "FilterMode", "optional": true, "defaultAtomicValue": "nearest" },
      { name: "mipmapFilter", type: "MipmapFilterMode", "optional": true, "defaultAtomicValue": "nearest" },
      { name: "lodMinClamp", type: "float", "optional": true, "defaultAtomicValue": "0.0f"  },
      { name: "lodMaxClamp", type: "float", "optional": true, "defaultAtomicValue": "32.0f" }
    ]
  },
  {
    name: "ImageCopyTexture",
    properties: [
      { name: "texture", type: "Texture" },
      { name: "mipLevel", type: "uint32_t", optional: true, defaultAtomicValue: "0" },
      { name: "origin", type: "Extent3D" },
      { name: "aspect", type: "TextureAspect", optional: true, defaultAtomicValue: "wgpu:TextureAspect::All" }
    ],
    fromValueImpl: ` static wgpu::ImageCopyTexture *fromValue(jsi::Runtime &runtime,
      const jsi::Value &raw) {
const auto &obj = raw.asObject(runtime);
if (obj.isHostObject(runtime)) {
return obj.asHostObject<JsiImageCopyTexture>(runtime)->getObject().get();
} else {
auto object = new wgpu::ImageCopyTexture();

if (obj.hasProperty(runtime, "texture")) {
auto texture = obj.getProperty(runtime, "texture");

object->texture = *JsiTexture::fromValue(runtime, texture);
} else {
throw jsi::JSError(
runtime, "Missing mandatory prop texture in ImageCopyTexture");
}
if (obj.hasProperty(runtime, "mipLevel")) {
auto mipLevel = obj.getProperty(runtime, "mipLevel");

object->mipLevel = static_cast<uint32_t>(mipLevel.getNumber());
}
if (obj.hasProperty(runtime, "origin")) {
auto origin = obj.getProperty(runtime, "origin").asObject(runtime);
auto x = origin.hasProperty(runtime, "x") ? origin.getProperty(runtime, "x").getNumber() : 0;
auto y = origin.hasProperty(runtime, "y") ? origin.getProperty(runtime, "y").getNumber() : 0;
auto z = origin.hasProperty(runtime, "z") ? origin.getProperty(runtime, "z").getNumber() : 0;
object->origin = { static_cast<uint32_t>(x), static_cast<uint32_t>(y), static_cast<uint32_t>(z) };
} else {
throw jsi::JSError(runtime,
"Missing mandatory prop origin in ImageCopyTexture");
}
if (obj.hasProperty(runtime, "aspect")) {
auto aspect = obj.getProperty(runtime, "aspect");

object->aspect =
getTextureAspect(aspect.getString(runtime).utf8(runtime).c_str());
}
return object;
}
}`
  },
  {
    name: "TextureDataLayout",
    properties: [
      {"name": "offset", "type": "uint64_t", "defaultAtomicValue": "0", optional: true },
      {"name": "bytesPerRow", "type": "uint32_t", optional: true, "defaultAtomicValue": "WGPU_COPY_STRIDE_UNDEFINED"},
      {"name": "rowsPerImage", "type": "uint32_t", optional: true,  "defaultAtomicValue": "WGPU_COPY_STRIDE_UNDEFINED"}
    ]
  },
  {
    name: "Device",
    methods: [
      {
        name: "getQueue",
        args: [],
        returns: "Queue",
        member: "queue"
      },
      {
        name: "createPipelineLayout",
        args: [
          { name: "descriptor", type: "PipelineLayoutDescriptor" }
        ],
      },
      {
        name: "createSampler",
        args: [
          { name: "descriptor", type: "SamplerDescriptor" }
        ],
        returns: "Sampler"
      },
      {
        name: "createBindGroup",
        args: [{
          name: "descriptor",
          type: "BindGroupDescriptor"
        }],
        returns: "BindGroup"
      },
      {
        name: "createRenderPipeline",
        args: [{
          name: "descriptor",
          type: "RenderPipelineDescriptor",
        }],
        returns: "RenderPipeline",
      },
      {
        name: "createComputePipeline",
        args: [{
          name: "descriptor",
          type: "ComputePipelineDescriptor",
        }],
        returns: "ComputePipeline",
      },
      {
        name: "createShaderModule",
        args: [{
          name: "moduleDescriptor",
          type: "ShaderModuleWGSLDescriptor",
          baseType: "ShaderModuleDescriptor"
        }],
        returns: "ShaderModule",
      },
      {
        name: "createCommandEncoder",
        args: [{
          name: "descriptor",
          type: "CommandEncoderDescriptor",
          optional: true,
          defaultValue: true
        }],
        returns: "CommandEncoder",
      },
      {
        name: "createBuffer",
        args: [{
          name: "descritor",
          type: "BufferDescriptor"
        }],
        returns: "Buffer"
      },
      {
        name: "createTexture",
        args: [
          {
            name: "descriptor",
            type: "TextureDescriptor"
          }
        ],
        returns: "Texture"
      }
    ]
  },
  {
    name: "BindGroupDescriptor",
    properties: [
      { name: "layout", type: "BindGroupLayout" },
      { name: "entries", type: "BindGroupEntry[]"}
    ]
  },
  {
    name: "BindGroupLayout",
  },
  {
    name: "BindGroupEntry",
    properties: [
      { name: "binding", type: "uint32_t" },
      { name: "buffer", type: "Buffer" },
      { name: "size", type: "uint32_t" },
      { name: "offset", type: "uint32_t" },
      { name: "sampler", type: "Sampler" }, // dummy
      
    ],
    fromValueImpl: `
    static wgpu::BindGroupEntry *fromValue(jsi::Runtime &runtime,
                                           const jsi::Value &raw) {
      const auto &obj = raw.asObject(runtime);
      if (obj.isHostObject(runtime)) {
        return obj.asHostObject<JsiBindGroupEntry>(runtime)->getObject().get();
      } else {
        auto object = new wgpu::BindGroupEntry();
  
        if (obj.hasProperty(runtime, "binding")) {
          auto binding = obj.getProperty(runtime, "binding");
  
          object->binding = static_cast<uint32_t>(binding.getNumber());
        } else {
          throw jsi::JSError(runtime,
                             "Missing mandatory prop binding in BindGroupEntry");
        }
  
        if (obj.hasProperty(runtime, "resource") &&
            obj.getProperty(runtime, "resource").isObject()) {
          auto resource = obj.getProperty(runtime, "resource").asObject(runtime);
          if (resource.isHostObject(runtime)) {
            if (auto textureView = dynamic_pointer_cast<JsiTextureView>(resource.asHostObject(runtime))) {
              object->textureView = *JsiTextureView::fromValue(runtime, obj.getProperty(runtime, "resource"));
            } else if (auto sampler = dynamic_pointer_cast<JsiSampler>(resource.asHostObject(runtime))) {
              object->sampler = *JsiSampler::fromValue(runtime, obj.getProperty(runtime, "resource"));
            } else {
              throw jsi::JSError(runtime, "Missing mandatory prop textureView or sampler in BindGroupEntry");
            }
          } else {
          if (resource.hasProperty(runtime, "buffer")) {
            auto buffer = resource.getProperty(runtime, "buffer");
  
            object->buffer = *JsiBuffer::fromValue(runtime, buffer);
          } else {
            throw jsi::JSError(runtime,
                               "Missing mandatory prop buffer in BindGroupEntry");
          }
          if (resource.hasProperty(runtime, "size")) {
            auto size = resource.getProperty(runtime, "size");
  
            object->size = static_cast<uint32_t>(size.getNumber());
          } else {
            object->size = object->buffer.GetSize();
          }
          if (resource.hasProperty(runtime, "offset")) {
            auto offset = resource.getProperty(runtime, "offset");
  
            object->offset = static_cast<uint32_t>(offset.getNumber());
          } else {
            object->offset = 0;
          }
          }
        } else {
          throw jsi::JSError(runtime,
                             "Missing mandatory prop binding in BindGroupEntry");
        }
        return object;
      }
    }`
  },
  {
    name: "BindGroup"
  },
  {
    name: "TextureDescriptor",
    properties: [
      { name: "size", type: "Extent3D" },
      { name: "format", type: "TextureFormat" },
      { name: "usage", type: "TextureUsage" },
      { name: "mipLevelCount", type: "uint32_t", optional: true }
    ]
  },
  {
    "name": "BufferDescriptor",
    properties: [
      { name: "size", type: "uint64_t" },
      {"name": "usage", "type": "BufferUsage"},
      {"name": "mappedAtCreation", "type": "bool", optional: true },
    ]
  },
  {
    name: "Buffer",
    methods: [
      { name: "unmap", args: [] },
      {
        name: "mapAsync",
        args: [
          {
            name: "mode",
            type: "uint32_t",
          }
        ],
        implementation: `
        auto object = getObject();
        auto mode = static_cast<wgpu::MapMode>(arguments[0].getNumber());
        auto offset = count > 1 ? static_cast<uint32_t>(arguments[1].getNumber()) : 0;
        auto size = count > 2 ? static_cast<uint32_t>(arguments[2].getNumber()) : getObject()->GetSize();
        auto instance = getContext()->getInstance();
        return RNJsi::JsiPromises::createPromiseAsJSIValue(
            runtime, [object = std::move(object), mode, offset,
                      size, instance = std::move(instance)](jsi::Runtime &runtime,
                            std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
              RNSkLogger::logToConsole("Buffer::MapAsync start");
              auto callback = [](WGPUBufferMapAsyncStatus status, void *userdata) {
                RNSkLogger::logToConsole(
                    "Buffer::MapAsync callback status: " +
                    std::to_string(static_cast<int>(status)));
                auto promise =
                    static_cast<RNJsi::JsiPromises::Promise *>(userdata);
                promise->resolve(jsi::Value::undefined());
              };
              wgpu::BufferMapCallbackInfo callbackInfo = {nullptr, wgpu::CallbackMode::WaitAnyOnly, callback,
                                                   promise.get()};
              wgpu::Future future = object->MapAsync(mode, offset, size, callbackInfo);
              wgpu::FutureWaitInfo waitInfo = {future};
              RNSkia::RNSkLogger::logToConsole("before WaitAny");
              instance.WaitAny(1, &waitInfo, UINT64_MAX); 
            });`
      },
      { 
        name: "getMappedRange",
        args: [
          { name: "offset", "type": "size_t", "defaultAtomicValue": "0" },
          {"name": "size", "type": "size_t", "defaultAtomicValue": "SIZE_MAX"}
        ],
        implementation: `
        size_t offset = count > 0 ? static_cast<size_t>(arguments[0].getNumber()) : 0;
        size_t size = count > 1 ? static_cast<size_t>(arguments[1].getNumber()) : getObject()->GetSize();
        auto usage = getObject()->GetUsage();
        void *data = (usage & wgpu::BufferUsage::MapWrite)
                         ? getObject()->GetMappedRange(offset, size)
                         : const_cast<void *>(
                               getObject()->GetConstMappedRange(offset, size));
        if (data == nullptr) {
          throw jsi::JSError(runtime, "Buffer::GetMappedRange failed");
        }
        auto buf = std::make_shared<MutableJSIBuffer>(data, size);
        auto val = jsi::ArrayBuffer(runtime, buf);
        auto d = val.data(runtime);
        return val;
        `
      }
    ]
  },
  {
    "name": "CommandEncoderDescriptor"
  },
  {
    "name": "ComputePassDescriptor"
  },
  {
    name: "ComputePassEncoder",
    methods: [
      {
        name: "setPipeline",
        args: [
          { name: "pipeline", type: "ComputePipeline" }
        ]
      },
      {
        name: "setBindGroup",
        args: [
          { name: "index", type: "uint32_t" },
          { name: "bindGroup", type: "BindGroup" },
          { name: "dynamicOffsetCount", "type": "size_t", "defaultAtomicValue": "0"},
        //  { name: "dynamicOffsets", "type": "uint32_t*", "defaultAtomicValue": "nullptr"}
        ],
        implementation: `auto index = static_cast<uint32_t>(arguments[0].getNumber());
        auto bindGroup = JsiBindGroup::fromValue(runtime, arguments[1]);
        //auto dynamicOffsetCount = static_cast<size_t>(arguments[2].getNumber());
        getObject()->SetBindGroup(index, *bindGroup, 0, nullptr);
        return jsi::Value::undefined();`
      },
      {
        name: "dispatchWorkgroups",
        args: [
          { name: "x", type: "uint32_t" },
          { name: "y", type: "uint32_t", optional: true, defaultAtomicValue: "1" },
          { name: "z", type: "uint32_t", optional: true, defaultAtomicValue: "1" }
        ],
      },
      {
        name: "end",
        args: []
      }
    ]
  },
  {
    name: "CommandEncoder",
    methods: [
      { name: "beginRenderPass", args: [{ name: "descriptor", type: "RenderPassDescriptor" }], returns: "RenderPassEncoder" },
      { name: "finish", args: [], returns: "CommandBuffer" },
      {
        name: "beginComputePass",
        args: [{ name: "descriptor", type: "ComputePassDescriptor", optional: true }],
        returns: "ComputePassEncoder",
        implementation: `
        auto defaultDescriptor = new wgpu::ComputePassDescriptor();
        auto descriptor =
            count > 0 ? JsiComputePassDescriptor::fromValue(runtime, arguments[0])
                      : defaultDescriptor;
    
        auto ret = getObject()->BeginComputePass(descriptor);
        if (ret == nullptr) {
          throw jsi::JSError(runtime, "beginComputePass returned null");
        }
        return jsi::Object::createFromHostObject(
            runtime, std::make_shared<JsiComputePassEncoder>(getContext(), ret));`
      },
      {
        name: "copyBufferToBuffer",
        args: [
          { name: "source", type: "Buffer" },
          { name: "sourceOffset", type: "uint32_t" },
          { name: "destination", type: "Buffer" },
          { name: "destinationOffset", type: "uint32_t" },
          { name: "size", type: "uint32_t" }
        ],
      }
    ]
  },
  {
    name: "Queue",
    methods: [
      {
        name: "submit",
        args: [{
          name: "commandBuffers",
          type: "CommandBuffer[]",
          ctype: true
        }],
        implementation: `std::vector<wgpu::CommandBuffer> commandBuffers;
        auto jsiArray = arguments[0].asObject(runtime).asArray(runtime);
        auto jsiArraySize = static_cast<int>(jsiArray.size(runtime));
        for (int i = 0; i < jsiArraySize; i++) {
          auto val = jsiArray.getValueAtIndex(runtime, i);
          commandBuffers.push_back(*JsiCommandBuffer::fromValue(runtime, val));
        }
    
        getObject()->Submit(commandBuffers.size(), commandBuffers.data());
        return jsi::Value::undefined();`
      },

      {
        name: "writeTexture",
        args: [
          {
            name: "destination",
            type: "ImageCopyTexture"
          },
          // {
          //   name: "data",
          //   type: "ArrayBuffer"
          // },
          {
            name: "dataLayout",
            type: "TextureDataLayout"
          },
          {
            name: "size",
            type: "Extent3D"
          }
        ],
        implementation: `    auto destination = JsiImageCopyTexture::fromValue(runtime, arguments[0]);
        if (!arguments[1].isObject()) {
          throw jsi::JSError(runtime, "writeTexture: data must be an ArrayBuffer");
        }
        if (!arguments[1].getObject(runtime).isArrayBuffer(runtime)) {
          throw jsi::JSError(runtime, "Expected an ArrayBuffer");
        }
        auto data = arguments[1].getObject(runtime).getArrayBuffer(runtime);
        auto dataLayout = JsiTextureDataLayout::fromValue(runtime, arguments[2]);
        auto size = JsiExtent3D::fromValue(runtime, arguments[3]);
    
        getObject()->WriteTexture(destination, data.data(runtime), data.size(runtime), dataLayout, size);
    
        return jsi::Value::undefined();`
      },
      {
        name: "writeBuffer",
        args: [
          // {"name": "buffer", "type": "Buffer"},
          // {"name": "offset", "type": "double"},
          // {"name": "data", "type": "double[]"},
          // {"name": "size", "type": "double"}
        ],
        implementation: `
        auto buffer = JsiBuffer::fromValue(runtime, arguments[0]);
        auto offset = static_cast<uint64_t>(arguments[1].getNumber());
        auto data = arguments[2].getObject(runtime).getArrayBuffer(runtime);
        auto offset2 = count > 3 ? static_cast<uint64_t>(arguments[3].getNumber()) : 0;
        auto size = count > 4 ?  static_cast<uint64_t>(arguments[4].getNumber()) : buffer->GetSize();
        getObject()->WriteBuffer(*buffer, offset, data.data(runtime) + offset2, size);
        return jsi::Value::undefined();
        `,
      },
      {
        name: "onSubmittedWorkDone",
        args: [],
        implementation: `
        auto object = getObject();
        auto instance = getContext()->getInstance();
        return RNJsi::JsiPromises::createPromiseAsJSIValue(
            runtime, [object = std::move(object),
                      instance = std::move(instance)](
                         jsi::Runtime &runtime,
                         std::shared_ptr<RNJsi::JsiPromises::Promise> promise) {
              RNSkLogger::logToConsole("onSubmittedWorkDone start");
              auto callback = [](WGPUQueueWorkDoneStatus status, void *userdata) {
                RNSkLogger::logToConsole("onSubmittedWorkDone callback status: " +
                                         std::to_string(static_cast<int>(status)));
                auto promise = static_cast<RNJsi::JsiPromises::Promise *>(userdata);
                promise->resolve(jsi::Value::undefined());
              RNSkLogger::logToConsole("onSubmittedWorkDone end");
              };
              wgpu::QueueWorkDoneCallbackInfo callbackInfo = {
                  nullptr, wgpu::CallbackMode::WaitAnyOnly, callback,
                  promise.get()};
              wgpu::Future future =
                  object->OnSubmittedWorkDone(callbackInfo);
              wgpu::FutureWaitInfo waitInfo = {future};
              instance.WaitAny(1, &waitInfo, UINT64_MAX);
            });
        `
      }
    ]
  },
  {
    name: "CommandBuffer"
  },
  {
    name: "RenderPipelineDescriptor",
//     defaultProperties: `object->multisample.count = 1;
// object->multisample.mask = ~0u;
// object->multisample.alphaToCoverageEnabled = false;
// `,
    properties: [
      {"name": "vertex", "type": "VertexState"},
      {"name": "primitive", "type": "PrimitiveState"},
     // {"name": "depthStencil", "type": "DepthStencilState", "optional": true, pointer: true},
      {"name": "multisample", "type": "MultisampleState",  "optional": true },
      {"name": "fragment", "type": "FragmentState", "optional": true, pointer: true}
    ]
  },
  {
    name: "ComputePipelineDescriptor",
    properties: [
      {"name": "layout", "type": "PipelineLayout", "optional": true},
      {"name": "compute", "type": "ProgrammableStageDescriptor"}
    ],
    fromValueImpl: `static wgpu::ComputePipelineDescriptor *fromValue(jsi::Runtime &runtime,
      const jsi::Value &raw) {
const auto &obj = raw.asObject(runtime);
if (obj.isHostObject(runtime)) {
return obj.asHostObject<JsiComputePipelineDescriptor>(runtime)
->getObject()
.get();
} else {
auto object = new wgpu::ComputePipelineDescriptor();

// if (obj.hasProperty(runtime, "layout")) {
//   auto layout = obj.getProperty(runtime, "layout");

//   object->layout = *JsiPipelineLayout::fromValue(runtime, layout);
// }
if (obj.hasProperty(runtime, "compute")) {
auto compute = obj.getProperty(runtime, "compute");

object->compute =
*JsiProgrammableStageDescriptor::fromValue(runtime, compute);
} else {
throw jsi::JSError(
runtime,
"Missing mandatory prop compute in ComputePipelineDescriptor");
}
return object;
}
}`
  },
  {
    name: "ProgrammableStageDescriptor",
    properties: [
      {name: "module", type: "ShaderModule" },
      { name: "entryPoint", type: "string" }
    ]
  },
  {
    name: "RenderPassEncoder",
    methods: [
      { name: "setPipeline", args: [{ name: "pipeline", type: "RenderPipeline" }] },
      { name: "draw", args: [
        { name: "vertexCount", type: "uint32_t" },
        { name: "instanceCount", type: "uint32_t", optional: true, defaultAtomicValue: "1" },
        { name: "firstVertex", type: "uint32_t", optional: true, defaultAtomicValue: "0" },
        { name: "firstInstance", type: "uint32_t", optional: true, defaultAtomicValue: "0" },
        ]
      },
      {
        name: "end",
        args: [],
      },
      {
        name: "pushDebugGroup",
        args: [{ name: "label", type: "string" }]
      },
      { name: "popDebugGroup", args: [] },
      {
        name: "setBindGroup",
        args: [
          { name: "index", type: "uint32_t" },
          { name: "bindGroup", type: "BindGroup" },
          { name: "dynamicOffsetCount", "type": "size_t", "defaultAtomicValue": "0"},
        //  { name: "dynamicOffsets", "type": "uint32_t*", "defaultAtomicValue": "nullptr"}
        ],
        implementation: `auto index = static_cast<uint32_t>(arguments[0].getNumber());
        auto bindGroup = JsiBindGroup::fromValue(runtime, arguments[1]);
        //auto dynamicOffsetCount = static_cast<size_t>(arguments[2].getNumber());
        getObject()->SetBindGroup(index, *bindGroup, 0, nullptr);
        return jsi::Value::undefined();`
      },
      {
        name: "setVertexBuffer",
        args: [
          { name: "slot", type: "uint32_t" },
          { name: "buffer", type: "Buffer" },
          {name: "offset", "type": "uint64_t"},
          {name: "size", "type": "uint64_t"}
        ],
        implementation: `auto slot = static_cast<uint32_t>(arguments[0].getNumber());
        auto buffer = JsiBuffer::fromValue(runtime, arguments[1]);
        auto offset = count > 2 ? static_cast<uint64_t>(arguments[2].getNumber()) : 0;
        auto size = count > 3 ? static_cast<uint64_t>(arguments[3].getNumber()) : buffer->GetSize();

        getObject()->SetVertexBuffer(slot, *buffer, offset, size);
        return jsi::Value::undefined();`
      },
    ]
  },
  {
    name: "RenderPassDescriptor",
    properties: [
      {"name": "colorAttachments", "type": "RenderPassColorAttachment[]"},
     // {"name": "depthStencilAttachment", "type": "RenderPassDepthStencilAttachment", "optional": true, pointer: true}
    ]
  },
  {
    name: "RenderPassDepthStencilAttachment",
    properties: [
      {"name": "view", "type": "TextureView"},
      {"name": "depthClearValue", "type": "uint32_t"},
      {"name": "depthLoadOp", "type": "LoadOp"},
      {"name": "depthStoreOp", "type": "StoreOp"}
    ]
  },
  {
    name: "RenderPassColorAttachment",
//    defaultProperties: `object->resolveTarget = nullptr;
//object->depthSlice = UINT32_MAX;`,
    properties: [
      {"name": "view", "type": "TextureView"},
      {"name": "clearValue", "type": "Color"},
      {"name": "loadOp", "type": "LoadOp"},
      {"name": "storeOp", "type": "StoreOp"}
    ]
  },
  {
    name: "Extent3D",
   // iterable: '2',
    properties: [
      {"name": "width", "type": "uint32_t"},
      {"name": "height", "type": "uint32_t"},
      // {"name": "depth", "type": "uint32_t"},
    ]
  },
  {
    name: "Color",
    iterable: '4',
    properties: [
      {"name": "r", "type": "double"},
      {"name": "g", "type": "double"},
      {"name": "b", "type": "double"},
      {"name": "a", "type": "double"}
    ]
  },
  {
    name: "ShaderModuleWGSLDescriptor",
    defaultProperties: `
object->sType = wgpu::SType::ShaderModuleWGSLDescriptor;`,
    properties: [
      {"name": "code", "type": "string"}
    ]
  },
  {
    name: "ShaderModule",
  },
  {
    name: "Texture",
    methods: [
      { name: "createView", args: [
        {  name: "descriptor", type: "TextureViewDescriptor", optional: true }
      ], returns: "TextureView",
    implementation: `    auto defaultDescriptor = nullptr;
    auto descriptor =
        count > 0 ? JsiTextureViewDescriptor::fromValue(runtime, arguments[0])
                  : defaultDescriptor;

    auto ret = getObject()->CreateView(descriptor);
    if (ret == nullptr) {
      throw jsi::JSError(runtime, "createView returned null");
    }
    return jsi::Object::createFromHostObject(
        runtime, std::make_shared<JsiTextureView>(getContext(), ret));`}
    ]
  },
  {
    name: "TextureViewDescriptor",
    properties: [
      {"name": "format", "type": "TextureFormat" , "optional": true},
      {"name": "dimension", "type": "TextureViewDimension", "optional": true},
      {"name": "baseMipLevel", "type": "uint32_t", "optional": true},
      {"name": "mipLevelCount", "type": "uint32_t", "optional": true}
    ]
  },
  {
    name: "TextureView"
  },
  {
    name: "FragmentState",
    properties: [
      {"name": "module", "type": "ShaderModule"},
      {"name": "entryPoint", "type": "string" },
      // is (ColorTargetState | null)[]
      {"name": "targets", "type": "ColorTargetState[]", "optional": true}
    ]
  },
  {
    name: "ColorTargetState",
   // defaultProperties: `object->writeMask = wgpu::ColorWriteMask::All;`,
    properties: [
      {"name": "format", "type": "TextureFormat"},
      {"name": "blend", "type": "BlendState", "optional": true, pointer: true},
      {"name": "writeMask", "type": "ColorWriteMask", "optional": true}
    ]
  },
  {
    name: "BlendState",
    properties: [
      {"name": "color", "type": "BlendComponent"},
      {"name": "alpha", "type": "BlendComponent"}
    ]
  },
  {
    name: "BlendComponent",
    properties: [
      {"name": "operation", "type": "BlendOperation", "optional": true},
      {"name": "srcFactor", "type": "BlendFactor", "optional": true},
      {"name": "dstFactor", "type": "BlendFactor", "optional": true}
    ]
  },
  {
    name: "VertexState",
    properties: [
      {"name": "module", "type": "ShaderModule"},
      {"name": "entryPoint", "type": "string" },
      {"name": "buffers", "type": "VertexBufferLayout[]", "optional": true }
    ]
  },
  {
    name: "VertexBufferLayout",
    properties: [
      { name: "arrayStride", type: "uint64_t" },
      { name: "stepMode", type: "VertexStepMode", optional: true },
      { name: "attributes", type: "VertexAttribute[]"}
    ]
  },
  {
    name: "VertexAttribute",
    properties: [
      {"name": "shaderLocation", "type": "uint32_t"},
      {"name": "format", "type": "VertexFormat"},
      {"name": "offset", "type": "uint32_t"}
    ]
  },
  {
    name: "PrimitiveState",
    properties: [
      {"name": "topology", "type": "PrimitiveTopology", "optional": true},
      {"name": "stripIndexFormat", "type": "IndexFormat", "optional": true},
      {"name": "frontFace", "type": "FrontFace", "optional": true},
      {"name": "cullMode", "type": "CullMode", "optional": true},
      //{"name": "unclippedDepth", "type": "bool", "optional": true}
    ]
  },
  {
    name: "DepthStencilState",
    properties: [
      {"name": "format", "type": "TextureFormat"},
      {"name": "depthWriteEnabled", "type": "bool", "optional": true,},
      {"name": "depthCompare", "type": "CompareFunction", "optional": true },
      {"name": "stencilFront", "type": "StencilFaceState", "optional": true},
      {"name": "stencilBack", "type": "StencilFaceState", "optional": true},
      {"name": "stencilReadMask", "type": "uint32_t", "optional": true },
      {"name": "stencilWriteMask", "type": "uint32_t", "optional": true},
      {"name": "depthBias", "type": "int32_t", "optional": true, },
      {"name": "depthBiasSlopeScale", "type": "float", "optional": true, },
      {"name": "depthBiasClamp", "type": "float", "optional": true }
    ]
  },
  {
    name: "StencilFaceState",
    properties: [
      {"name": "compare", "type": "CompareFunction", "optional": true},
      {"name": "failOp", "type": "StencilOperation", "optional": true},
      {"name": "depthFailOp", "type": "StencilOperation", "optional": true},
      {"name": "passOp", "type": "StencilOperation", "optional": true}
    ]
  },
  {
    name: "RenderPipeline",
    methods: [{
      name: "getBindGroupLayout",
      returns: "BindGroupLayout",
      args: [
        {
          name: "index",
          type: "uint32_t"
        }
      ]
    }]
  },
  {
    name: "DeviceDescriptor",
  },
  {
    name: "RequestAdapterOptions",
    methods: [],
    properties: [
      { name: "powerPreference", type: "PowerPreference", optional: true },
      { name: "forceFallbackAdapter", type: "bool", optional: true }
    ]
  },
  {
    name: "MultisampleState",
    properties: [
      { name: "count", type: "uint32_t", optional: true },
      { name: "mask", type: "uint32_t", optional: true },
      { name: "alphaToCoverageEnabled", type: "bool", optional: true }
    ]
  },
  {
    name: "ComputePipeline",
    methods: [
      { name: "getBindGroupLayout", args: [{ name: "index", type: "uint32_t" }], returns: "BindGroupLayout" }
    ]
  },
  {
    name: "PipelineLayout",
  },
  {
    name: "PipelineLayoutDescriptor",
    properties: [
      { name: "bindGroupLayouts", type: "BindGroupLayout[]"}
    ]
  },
  {
    name: "Sampler"
  }
];