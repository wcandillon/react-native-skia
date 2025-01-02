import type { SharedValue } from "react-native-reanimated";

import type { NodeType } from "../../dom/types";

type AnimatedProps<T> = Partial<{
  [K in keyof T]: SharedValue<T[K]>;
}>;

export interface Node<Props = object> {
  type: NodeType;
  isDeclaration: boolean;
  props: Props;
  animatedProps?: AnimatedProps<Props>;
  children: Node[];
}
