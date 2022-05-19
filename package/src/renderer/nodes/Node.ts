import type { SkCanvas } from "../../skia";
import type { SkiaReadonlyValue } from "../../values";
import type { AnimatedProps } from "../processors";
import { isValue } from "../processors";
import { mapKeys } from "../typeddash";

import type { RenderContext } from "./RenderContext";

export enum NodeType {
  Circle = "skCircle",
  Group = "skGroup",
  Fill = "skFill",
}

export abstract class Node {
  children: Node[] = [];
}

export abstract class RenderNode<P> extends Node {
  constructor(props: AnimatedProps<P>) {
    super();
    this.props = this.initializeProps(props);
  }

  protected readonly props: P;
  private unsubscribers: (() => void)[] = [];
  private subscribers: Array<{
    keys: string[];
    cb: (props: Partial<P> | P) => void;
  }> = [];

  protected subscribeToPropertyChanges(
    keys: string[],
    cb: (props: Partial<P> | P) => void
  ) {
    this.subscribers.push({ keys, cb });
    this.unsubscribers.push(() => {
      this.subscribers = this.subscribers.filter(
        (subscriber) => subscriber.cb !== cb
      );
    });
  }

  private propertyUpdated(key: keyof P, props: Partial<P>) {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.keys.find((k) => k === key) !== undefined) {
        subscriber.cb(props);
      }
    });
  }

  private initializeProps(props: AnimatedProps<P>) {
    // Unsubscribe from old props
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    // Create new resolved / materialised props
    const materializedProps: Partial<P> = {};

    if (props) {
      mapKeys(props).forEach((key) => {
        if (isValue(props[key])) {
          // get skia value
          const skiaValue = props[key] as SkiaReadonlyValue<P[typeof key]>;
          // Listen to changes
          this.unsubscribers.push(
            skiaValue.addListener((v) => {
              // Update property value
              materializedProps[key] = v;
              // Call property updated to enable updating derived properties
              this.propertyUpdated(key, materializedProps as P);
            })
          );
          // Call property updated
          materializedProps[key] = skiaValue.current;
        } else {
          materializedProps[key] = props[key] as P[keyof P];
        }
      });
    }
    return materializedProps as P;
  }

  added() {
    // Set properties first time after node has been added.
    mapKeys(this.props).forEach((key) => this.propertyUpdated(key, this.props));
    this.children.forEach((c) => {
      if (c instanceof RenderNode) {
        (c as RenderNode<unknown>).added();
      }
    });
  }

  remove() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.children.forEach((c) => {
      if (c instanceof RenderNode) {
        (c as RenderNode<unknown>).remove();
      }
    });
  }

  abstract render(canvas: SkCanvas, ctx: RenderContext): void;
}
