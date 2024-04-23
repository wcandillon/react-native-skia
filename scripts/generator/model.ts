export interface Arg {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: boolean;
}

export interface Method {
  name: string;
  async?: boolean;
  args: Arg[];
  returns: string;
  implementation?: string;
}

export interface Property {
  name: string;
  type: string;
  optional?: boolean;
  default?: string;
}

export interface JSIObject {
  name: string;
  host?: string;
  methods?: Method[];
  properties?: Property[]; 
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
        name: "createRenderPipeline",
        args: [{
          name: "descriptor",
          type: "RenderPipelineDescriptor",
        }],
        returns: "RenderPipeline",
      }
    ]
  },
  {
    name: "RenderPipelineDescriptor",
    properties: [
      {"name": "vertex", "type": "VertexState"},
      {"name": "primitive", "type": "PrimitiveState"},
      {"name": "depthStencil", "type": "DepthStencilState", "optional": true},
      {"name": "multisample", "type": "MultisampleState"},
      {"name": "fragment", "type": "FragmentState", "optional": true}
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
      {"name": "unclippedDepth", "type": "bool", "optional": true}
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
    name: "StencilFaceState"
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
      { name: "powerPreference", type: "GPUPowerPreference", optional: true },
      { name: "forceFallbackAdapter", type: "bool", optional: true }
    ]
  }
];