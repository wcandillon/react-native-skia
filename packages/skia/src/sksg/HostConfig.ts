/*global NodeJS*/
import { createContext } from "react";
import type { Fiber, HostConfig } from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

import type { NodeType } from "../dom/types";
import { shallowEq } from "../renderer/typeddash";

import type { Node } from "./Node";
import type { Container } from "./Container";

type EventPriority = number;
const NoEventPriority = 0;

const DEBUG = false;
export const debug = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) {
    console.log(...args);
  }
};

type Instance = Node;

type Props = object;
type TextInstance = Node;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type PublicInstance = Instance;
type HostContext = object;
type UpdatePayload = Container;
type ChildSet = Node[];
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
let currentUpdatePriority: EventPriority = NoEventPriority;

export const sksgHostConfig: SkiaHostConfig = {
  /**
   * This function is used by the reconciler in order to calculate current time for prioritising work.
   */
  supportsMutation: false,
  isPrimaryRenderer: false,
  supportsPersistence: true,
  supportsHydration: false,
  //supportsMicrotask: true,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  getRootHostContext: (_rootContainerInstance: Container) => {
    debug("getRootHostContext");
    return {};
  },

  getChildHostContext(_parentHostContext, _type, _rootContainerInstance) {
    debug("getChildHostContext");
    return {};
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
    propsWithChildren,
    _container,
    _hostContext,
    _internalInstanceHandle
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { children, ...props } = propsWithChildren as any;
    debug("createInstance", type);
    const instance = {
      type,
      props,
      children: [],
    };
    return instance;
  },

  appendInitialChild(parentInstance: Instance, child: Instance | TextInstance) {
    parentInstance.children.push(child);
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

  prepareForCommit(_container: Container) {
    debug("prepareForCommit");
    return null;
  },

  resetAfterCommit(container: Container) {
    debug("resetAfterCommit");
    container.redraw();
  },

  getPublicInstance(node: Instance) {
    debug("getPublicInstance");
    return node;
  },

  commitTextUpdate: (
    _textInstance: TextInstance,
    _oldText: string,
    _newText: string
  ) => {
    //  textInstance.instance = newText;
  },

  clearContainer: (_container) => {
    debug("clearContainer");
  },

  prepareUpdate(
    _instance: Instance,
    _type: string,
    oldProps: Props,
    newProps: Props,
    container: Container,
    _hostContext: HostContext
  ) {
    debug("prepareUpdate");
    const propsAreEqual = shallowEq(oldProps, newProps);
    if (propsAreEqual) {
      return null;
    }
    return container;
  },

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  cloneInstance(
    instance,
    _type,
    _oldProps,
    newProps,
    _updatePayload,
    _internalInstanceHandle,
    keepChildren: boolean,
    _recyclableInstance: null | Instance
  ) {
    debug("cloneInstance");
    return {
      type: instance.type,
      props: { ...newProps },
      children: keepChildren ? [...instance.children] : [],
    };
  },

  createContainerChildSet(): ChildSet {
    debug("createContainerChildSet");
    return [];
  },

  appendChildToContainerChildSet(
    childSet: ChildSet,
    child: Instance | TextInstance
  ): void {
    childSet.push(child);
  },

  finalizeContainerChildren(container: Container, newChildren: ChildSet) {
    debug("finalizeContainerChildren");
    container.root = newChildren;
  },

  replaceContainerChildren(container: Container, newChildren: ChildSet) {
    container.root = newChildren;
  },

  cloneHiddenInstance(
    _instance: Instance,
    _type: string,
    _props: Props
  ): Instance {
    debug("cloneHiddenInstance");
    throw new Error("Not yet implemented.");
  },

  cloneHiddenTextInstance(_instance: Instance, _text: string): TextInstance {
    debug("cloneHiddenTextInstance");
    throw new Error("Not yet implemented.");
  },
  // see https://github.com/pmndrs/react-three-fiber/pull/2360#discussion_r916356874
  getCurrentEventPriority: () => DefaultEventPriority,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  detachDeletedInstance: (_node: Instance) => {},
  getInstanceFromNode: function (_node): Fiber | null | undefined {
    throw new Error("Function not implemented.");
  },
  prepareScopeUpdate: function (_scopeInstance, _instance): void {
    throw new Error("Function not implemented.");
  },
  getInstanceFromScope: function (_scopeInstance): Instance | null {
    throw new Error("Function not implemented.");
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback() {},
  maySuspendCommit: () => false,
  preloadInstance: () => true, // true indicates already loaded
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  HostTransitionContext: createContext(null),
  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) {
      return currentUpdatePriority;
    }
    return DefaultEventPriority;
  },
  resetFormInstance() {},
};
