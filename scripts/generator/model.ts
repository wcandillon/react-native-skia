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
  default?: string;
  pointer?: boolean;
}

export interface JSIObject {
  name: string;
  host?: string;
  methods?: Method[];
  defaultProperties?: string;
  properties?: Property[]; 
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
        async: true
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
        async: true
      }
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
      { name: "buffer", type: "Buffer" }
    ]
  },
  {
    name: "BindGroup"
  },
  {
    name: "TextureDescriptor",
    properties: [
      { name: "size", type: "Extent3D" },
      { name: "format", type: "TextureFormat" },
      { name: "usage", type: "uint32_t" } // TextureUsage
    ]
  },
  {
    "name": "BufferDescriptor",
    properties: [
      { name: "size", type: "uint64_t" },
      {"name": "usage", "type": "uint32_t"}, //BufferUsage
      {"name": "mappedAtCreation", "type": "bool", "default": "false"}
    ]
  },
  {
    name: "Buffer",
    methods: [
      { name: "unmap", args: [] },
      { 
        name: "getMappedRange",
        args: [
          { name: "offset", "type": "size_t", "defaultAtomicValue": "0" },
          {"name": "size", "type": "size_t", "defaultAtomicValue": "SIZE_MAX"}
        ],
        implementation: `
        size_t offset = static_cast<size_t>(arguments[0].getNumber());
        size_t size = static_cast<size_t>(arguments[1].getNumber());
        auto data = getObject()->getMappedRange(offset, size);
        auto arrayBufferCtor =
            runtime.global().getPropertyAsFunction(runtime, "ArrayBuffer");
        auto o = arrayBufferCtor.callAsConstructor(runtime, static_cast<double>(size)).getObject(runtime);
        auto buf = o.getArrayBuffer(runtime);
        memcpy(buf.data(runtime), data, size);
        return o;`
      }
    ]
  },
  {
    "name": "CommandEncoderDescriptor"
  },
  {
    name: "CommandEncoder",
    methods: [
      { name: "beginRenderPass", args: [{ name: "descriptor", type: "RenderPassDescriptor" }], returns: "RenderPassEncoder" },
      { name: "finish", args: [], returns: "CommandBuffer" }
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
        }]
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
        auto size = static_cast<uint64_t>(arguments[3].getNumber());
        getObject()->writeBuffer(*buffer, offset, data.data(runtime), size);
        return jsi::Value::undefined();
        `,
      }
    ]
  },
  {
    name: "CommandBuffer"
  },
  {
    name: "RenderPipelineDescriptor",
    defaultProperties: `object->multisample.count = 1;
object->multisample.mask = ~0u;
object->multisample.alphaToCoverageEnabled = false;
`,
    properties: [
      {"name": "vertex", "type": "VertexState"},
      {"name": "primitive", "type": "PrimitiveState"},
      {"name": "depthStencil", "type": "DepthStencilState", "optional": true, pointer: true},
      {"name": "multisample", "type": "MultisampleState",  "optional": true },
      {"name": "fragment", "type": "FragmentState", "optional": true, pointer: true}
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
      }
    ]
  },
  {
    name: "RenderPassDescriptor",
    properties: [
      {"name": "colorAttachments", "type": "RenderPassColorAttachment[]"}
    ]
  },
  {
    name: "RenderPassColorAttachment",
    defaultProperties: `object->resolveTarget = nullptr;
object->depthSlice = UINT32_MAX;`,
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
    defaultProperties: `object->chain.next = nullptr;
object->chain.sType = wgpu::SType::ShaderModuleWGSLDescriptor;`,
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
      { name: "createView", args: [], returns: "TextureView"}
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
    defaultProperties: `object->writeMask = wgpu::ColorWriteMask::All;`,
    properties: [
      {"name": "format", "type": "TextureFormat"},
      {"name": "blend", "type": "BlendState", "optional": true, pointer: true},
      {"name": "writeMask", "type": "uint32_t", "optional": true}
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
      {"name": "entryPoint", "type": "string" }
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
      {"name": "depthWriteEnabled", "type": "bool", "optional": true, "default": "false"},
      {"name": "depthCompare", "type": "CompareFunction", "optional": true, "default": "undefined"},
      {"name": "stencilFront", "type": "StencilFaceState", "optional": true},
      {"name": "stencilBack", "type": "StencilFaceState", "optional": true},
      {"name": "stencilReadMask", "type": "uint32_t", "optional": true, "default": "0xFFFFFFFF"},
      {"name": "stencilWriteMask", "type": "uint32_t", "optional": true, "default": "0xFFFFFFFF"},
      {"name": "depthBias", "type": "int32_t", "optional": true, "default": "0"},
      {"name": "depthBiasSlopeScale", "type": "float", "optional": true, "default": "0.0f"},
      {"name": "depthBiasClamp", "type": "float", "optional": true, "default": "0.0f" }
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
  }
];