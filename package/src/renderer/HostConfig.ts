/* eslint-disable @typescript-eslint/no-explicit-any */
/*global NodeJS*/
import type { HostConfig } from "react-reconciler";

import type { NodeType, Node } from "../dom/types";
import type { SkiaValue } from "../values";

import type { Container } from "./Container";
import { createNode } from "./HostComponents";
import type { AnimatedProps } from "./processors";
import { isSelector, isValue } from "./processors";
import { mapKeys, shallowEq } from "./typeddash";

const DEBUG = false;
export const debug = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) {
    console.log(...args);
  }
};

type Instance = Node<unknown>;

type Props = any;
type TextInstance = Node<unknown>;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type PublicInstance = Instance;
type HostContext = null;
type UpdatePayload = Container;
type ChildSet = unknown;
type TimeoutHandle = NodeJS.Timeout;
type NoTimeout = -1;

type SkiaHostConfig = HostConfig<
  NodeType,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout
>;

const appendNode = (parent: Node<unknown>, child: Node<unknown>) => {
  parent.addChild(child);
};

const removeNode = (parent: Node<unknown>, child: Node<unknown>) => {
  return parent.removeChild(child);
};

const insertBefore = (
  parent: Node<unknown>,
  child: Node<unknown>,
  before: Node<unknown>
) => {
  parent.insertChildBefore(child, before);
};

export const skHostConfig: SkiaHostConfig = {
  /**
   * This function is used by the reconciler in order to calculate current time for prioritising work.
   */
  now: Date.now,

  supportsMutation: true,
  isPrimaryRenderer: false,
  supportsPersistence: false,
  supportsHydration: false,
  //supportsMicrotask: true,

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  appendChildToContainer(container, child) {
    debug("appendChildToContainer", container, child);
    appendNode(container.root, child);
  },

  appendChild(parent, child) {
    debug("appendChild", parent, child);
    appendNode(parent, child);
  },

  getRootHostContext: (_rootContainerInstance: Container) => {
    debug("getRootHostContext");
    return null;
  },

  getChildHostContext(_parentHostContext, _type, _rootContainerInstance) {
    debug("getChildHostContext");
    return null;
  },

  shouldSetTextContent(_type, _props) {
    return false;
  },

  createTextInstance(
    _text,
    _rootContainerInstance,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createTextInstance");
    // return SpanNode({}, text) as SkNode;
    throw new Error("Text nodes are not supported yet");
  },

  createInstance(
    type,
    pristineProps,
    container,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createInstance", type);
    const props = { ...pristineProps };
    const node = createNode(container, type, materialize(props));
    container.depMgr.subscribeNode(node, props);
    return node;
  },

  appendInitialChild(parentInstance, child) {
    debug("appendInitialChild");
    appendNode(parentInstance, child);
  },

  finalizeInitialChildren(
    parentInstance,
    _type,
    _props,
    _rootContainerInstance,
    _hostContext
  ) {
    debug("finalizeInitialChildren", parentInstance);
    return false;
  },

  commitMount() {
    // if finalizeInitialChildren = true
    debug("commitMount");
  },

  prepareForCommit(_containerInfo) {
    debug("prepareForCommit");
    return null;
  },

  resetAfterCommit(container) {
    debug("resetAfterCommit");
    container.redraw();
  },

  getPublicInstance(node: Instance) {
    debug("getPublicInstance");
    return node;
  },

  prepareUpdate: (
    _instance,
    type,
    oldProps,
    newProps,
    rootContainerInstance,
    _hostContext
  ) => {
    debug("prepareUpdate");
    const propsAreEqual = shallowEq(oldProps, newProps);
    if (propsAreEqual) {
      return null;
    }
    debug("update ", type);
    return rootContainerInstance;
  },

  commitUpdate(
    instance,
    updatePayload,
    type,
    prevProps,
    nextProps,
    _internalHandle
  ) {
    debug("commitUpdate: ", type);
    if (shallowEq(prevProps, nextProps)) {
      return;
    }
    const props = { ...nextProps };
    updatePayload.depMgr.unsubscribeNode(instance);
    instance.setProps(materialize(props));
    updatePayload.depMgr.subscribeNode(instance, props);
  },

  commitTextUpdate: (
    _textInstance: TextInstance,
    _oldText: string,
    _newText: string
  ) => {
    //  textInstance.instance = newText;
  },

  clearContainer: (container) => {
    debug("clearContainer");
    container.root.children().forEach((child) => {
      container.root.removeChild(child);
    });
  },

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  removeChild: (parent, child) => {
    removeNode(parent, child);
  },

  removeChildFromContainer: (container, child) => {
    removeNode(container.root, child);
  },

  insertInContainerBefore: (container, child, before) => {
    insertBefore(container.root, child, before);
  },

  insertBefore: (parent, child, before) => {
    insertBefore(parent, child, before);
  },
};

const materialize = <P>(props: AnimatedProps<P>) => {
  const result = { ...props };
  mapKeys(props).forEach((key) => {
    const prop = props[key];
    if (isValue(prop)) {
      result[key] = (prop as SkiaValue<P[typeof key]>).current;
    } else if (isSelector(prop)) {
      result[key] = prop.selector(prop.value.current) as P[typeof key];
    }
  });

  return result as any;
};
