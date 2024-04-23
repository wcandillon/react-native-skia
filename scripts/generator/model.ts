export interface Arg {
  name: string;
  type: string;
}

export interface Method {
  name: string;
  async?: boolean;
  args: Arg[];
  returns: string;
}

export interface JSIObject {
  name: string;
  host?: string;
  methods: Method[];
}

export const model = [
  {
    name: "GPU",
    host: "Instance",
    methods: []
  },
  {
    name: "Adapter",
    methods: []
  }
];