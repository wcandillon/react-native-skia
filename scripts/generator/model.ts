import dawn from "./model-js.json";

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

export interface Arg {
  name:        string;
  type:        string;
  annotation?: Annotation;
  optional?:   boolean;
  no_default?: boolean;
  length?:     string;
  default?:    number | string;
}

export interface Method {
  async?: boolean;
  name: string;
  returns?: string;
  args?: Arg[]
  tags?: MemberTag[];
}

export interface WGPUObject {
  category: "object";
  jsiName?: string;
  methods: Method[];
}

export interface WgpuFunction {
  category: "function";

}

export interface WGPU {
  [key: string]: WGPUObject | WgpuFunction
}


export const model = dawn as WGPU;