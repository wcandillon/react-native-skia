import type { SharedValue } from "react-native-reanimated";

import type { Node } from "./Node";

export const isSharedValue = <T = unknown>(
  value: unknown
): value is SharedValue<T> => {
  "worklet";
  // We cannot use `in` operator here because `value` could be a HostObject and therefore we cast.
  return (value as Record<string, unknown>)?._isReanimatedSharedValue === true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const materialize = (node: Node<any>) => {
  "worklet";
  if (node.animatedProps) {
    const keys = Object.keys(node.animatedProps);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = node.animatedProps[key]!;
      node.props[key] = value.value;
    }
  }
  return node;
};
