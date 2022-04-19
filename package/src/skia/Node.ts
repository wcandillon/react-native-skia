import type { AnimatedProps, CircleProps } from "../renderer";

import type { SkJSIInstance } from "./JsiInstance";

interface Node<T extends string = string> extends SkJSIInstance<T> {
  appendChild(node: Node): void;
}

export interface NodeFactory {
  MakeCanvas(): Node<"NodeCanvas">;
  MakeCircle(props: AnimatedProps<CircleProps>): Node<"NodeCircle">;
}
