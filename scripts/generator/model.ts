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
}

export interface Property {
  name: string;
  type: string;
  optional?: boolean;
}

export interface JSIObject {
  name: string;
  host?: string;
  struct?: boolean;
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
    struct: true,
    properties: [
      {"name": "label", "type": "char", "optional": true},
      {"name": "layout", "type": "pipeline layout", "optional": true},
      {"name": "vertex", "type": "vertex state"},
      {"name": "primitive", "type": "primitive state"},
      {"name": "depth stencil", "type": "depth stencil state", "optional": true},
      {"name": "multisample", "type": "multisample state"},
      {"name": "fragment", "type": "fragment state", "optional": true}
  ]
  },
  {
    name: "RenderPipeline"
  },
  {
    name: "DeviceDescriptor",
    struct: true,
  },
  {
    name: "RequestAdapterOptions",
    struct: true,
    methods: [],
    properties: [
      { name: "powerPreference", type: "GPUPowerPreference", optional: true },
      { name: "forceFallbackAdapter", type: "bool", optional: true }
    ]
  }
];