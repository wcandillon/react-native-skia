/*global NodeJS, performance*/
import type { HostConfig } from "react-reconciler";

import { Skia } from "../../skia";
import type { Node } from "../../skia/Node";
import { exhaustiveCheck } from "../typeddash";

import type { Container } from "./Container";

const DEBUG = false;
export const debug = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) {
    console.log(...args);
  }
};

export enum NodeType {
  Fill = "skFill",
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      skFill: Parameters<typeof Skia.Node.MakeFill>[0];
    }
  }
}

type Instance = Node;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = any;
type TextInstance = Node;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type PublicInstance = Instance;
type HostContext = null;
type UpdatePayload = true;
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

const appendNode = (parent: Node, child: Node) => {
  parent.appendChild(child);
};

const removeNode = (parent: Node, child: Node) => {
  parent.removeChild(child);
};

const insertBefore = (parent: Node, child: Node, before: Node) => {
  parent.insertBefore(before, child);
};

const createNode = (_container: Container, type: NodeType, props: Props) => {
  switch (type) {
    case NodeType.Fill:
      return Skia.Node.MakeFill(props);
    default:
      // TODO: here we need to throw a nice error message
      // This is the error that will show up when the user uses nodes not supported by Skia (View, Audio, etc)
      return exhaustiveCheck(type);
  }
};

export const skHostConfig: SkiaHostConfig = {
  /**
   * This function is used by the reconciler in order to calculate current time for prioritising work.
   */
  now: performance.now,

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
    appendNode(container, child);
  },

  appendChild(parent, child) {
    debug("appendChild", parent, child);
    appendNode(parent, child);
  },

  getRootHostContext: (_rootContainerInstance: Node) => {
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
    props,
    container,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createInstance", type);
    return createNode(container, type, props) as Node;
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

  finalizeContainerChildren: () => {
    debug("finalizeContainerChildren");
  },

  resetAfterCommit(_container) {
    debug("resetAfterCommit");
    //container.redraw();
  },

  getPublicInstance(node: Instance) {
    debug("getPublicInstance");
    return node;
  },

  prepareUpdate: (
    _instance,
    type,
    _oldProps,
    _newProps,
    _rootContainerInstance,
    _hostContext
  ) => {
    debug("prepareUpdate");
    debug("update ", type);
    return true;
  },

  commitUpdate(
    instance,
    _updatePayload,
    type,
    _prevProps,
    nextProps,
    _internalHandle
  ) {
    debug("commitUpdate: ", type);
    instance.setProps(nextProps);
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
    container.clearChildren();
  },

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  removeChild: (parent, child) => {
    removeNode(parent, child);
  },

  removeChildFromContainer: (parent, child) => {
    removeNode(parent, child);
  },

  insertInContainerBefore: (parent, child, before) => {
    insertBefore(parent, child, before);
  },

  insertBefore: (parent, child, before) => {
    insertBefore(parent, child, before);
  },
};
