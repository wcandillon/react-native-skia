import dawn from "./dawn.json"

export type Model = typeof dawn;

export enum Annotation {
  Const = "const*",
  ConstConst = "const*const*",
  Empty = "*",
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

export interface Fn {
  category: 'function';
  args: Arg[];
  returns: string;
}

export enum MemberTag {
  Dawn = "dawn",
  Emscripten = "emscripten",
  Upstream = "upstream",
}

export interface Method {
  name:      string;
  args?:     Arg[];
  _comment?: string;
  tags?:     MemberTag[];
  returns?:  string;
}

export interface Obj {
  category: 'object';
  methods: Method[];
}

export const model = dawn as Model;