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
        implementation: `return jsi::String::createFromUtf8(runtime, "bgra8unorm");`
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
      }
    ]
  },
  {
    name: "CommandBuffer"
  },
  {
    name: "RenderPipelineDescriptor",
    properties: [
      {"name": "vertex", "type": "VertexState"},
      {"name": "primitive", "type": "PrimitiveState"},
      {"name": "depthStencil", "type": "DepthStencilState", "optional": true, pointer: true},
      //{"name": "multisample", "type": "MultisampleState"},
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
    properties: [
      {"name": "view", "type": "TextureView"},
      {"name": "clearValue", "type": "Color"},
      {"name": "loadOp", "type": "LoadOp"},
      {"name": "storeOp", "type": "StoreOp"}
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
      {"name": "entryPoint", "type": "string" }
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
    name: "RenderPipeline"
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
  }
];