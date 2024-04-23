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
      {"name": "label", "type": "string", "optional": true},
      {"name": "layout", "type": "PipelineLayout", "optional": true},
      {"name": "vertex", "type": "VertexState"},
      {"name": "primitive", "type": "PrimitiveState"},
      {"name": "depth stencil", "type": "DepthStencilState", "optional": true},
      {"name": "multisample", "type": "MultisampleState"},
      {"name": "fragment", "type": "FragmentState", "optional": true}
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
      { name: "powerPreference", type: "GPUPowerPreference", optional: true },
      { name: "forceFallbackAdapter", type: "bool", optional: true }
    ]
  }
];