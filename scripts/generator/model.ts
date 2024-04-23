export interface Arg {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
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
          { name: "options", optional: true, type: "RequestAdapterOptions", defaultValue: "auto defaultOptions = std::make_shared<wgpu::RequestAdapterOptions>();" }
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
          { name: "descriptor", type: "DeviceDescriptor", optional: true, defaultValue: "auto defaultDescriptor = std::make_shared<wgpu::DeviceDescriptor>();" }
        ],
        returns: "Device",
        async: true
      }
    ]
  },
  {
    name: "Device",
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