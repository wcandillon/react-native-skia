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

export const model: JSIObject[] = [
  {
    name: "GPU",
    host: "Instance",
    methods: [
      {
        name: "requestAdapter",
        args: [],
        returns: "Adapter",
        async: true
      }
    ]
  },
  {
    name: "Adapter",
    methods: []
  }
];