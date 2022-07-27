import type { RefObject } from "react";

import type { SkiaView } from "../views";
import type { SkiaValue } from "../values";

import { isRealValue, isValue } from "./processors";
import type { Node } from "./nodes";

type Unsubscribe = () => void;
type Props = { [key: string]: unknown };

export class DependencyManager {
  ref: RefObject<SkiaView>;
  subscriptions: Map<
    Node,
    { values: SkiaValue<unknown>[]; unsubscribe: null | Unsubscribe }
  > = new Map();

  constructor(ref: RefObject<SkiaView>) {
    this.ref = ref;
  }

  unSubscribeNode(node: Node) {
    const subscription = this.subscriptions.get(node);
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe();
    }
    this.subscriptions.delete(node);
  }

  subscribeNode(node: Node, props: Props) {
    const values = Object.values(props).filter(isRealValue);
    if (values.length > 0) {
      this.subscriptions.set(node, { values, unsubscribe: null });
    }
  }

  subscribe() {
    if (this.ref.current === null) {
      throw new Error("Canvas ref is not set");
    }
    this.subscriptions.forEach((subscription) => {
      if (subscription.unsubscribe === null) {
        subscription.unsubscribe = this.ref.current!.registerValues(
          subscription.values
        );
      }
    });
  }

  unsubscribe() {
    this.subscriptions.forEach(({ unsubscribe }) => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
    this.subscriptions.clear();
  }
}
