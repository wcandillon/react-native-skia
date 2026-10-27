/*global NodeJS*/
import { createContext } from "react";
import type { Fiber, HostConfig, ReactContext } from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

import { NodeType } from "../dom/types";

import type { Node } from "./Node";
import type { Container } from "./StaticContainer";

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
type ActivityInstance = Instance;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type FormInstance = Instance;
type PublicInstance = Instance;
type HostContext = object;
type ChildSet = Node[];
type TimeoutHandle = NodeJS.Timeout;
type NoTimeout = -1;
type TransitionStatus = null;
type SuspendedState = null;
type RendererInspectionConfig = null;
type FormStateMarkerInstance = Instance;
type HoistableRoot = never;
type Resource = never;

type SkiaHostConfig = HostConfig<
  NodeType,
  Props,
  Container,
  Instance,
  TextInstance,
  ActivityInstance,
  SuspenseInstance,
  HydratableInstance,
  FormInstance,
  PublicInstance,
  HostContext,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
  TransitionStatus,
  SuspendedState,
  RendererInspectionConfig,
  FormStateMarkerInstance,
  HoistableRoot,
  Resource
>;
let currentUpdatePriority: EventPriority = NoEventPriority;

// cloneHiddenInstance returns this for every node a Suspense (or Activity/Offscreen) boundary hides.
// React never stores it: it only hands it to appendInitialChild and appendChildToContainerChildSet,
// and both must skip it so a hidden node never enters the scene. Frozen so a copy or mutation
// cannot turn it into an ordinary empty group that slips past those identity checks.
const hiddenInstance: Instance = Object.freeze({
  type: NodeType.Group,
  props: {},
  children: [],
});

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

  getChildHostContext(_parentHostContext, _type) {
    debug("getChildHostContext");
    return {};
  },

  shouldSetTextContent(_type, _props) {
    return false;
  },

  createTextInstance(
    text,
    _rootContainerInstance,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createTextInstance");
    throw new Error(
      `Text strings cannot be rendered directly inside a <Canvas> ("${text}"). ` +
        "Use the <Text> or <Paragraph> component instead."
    );
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
    if (child !== hiddenInstance) {
      parentInstance.children.push(child);
    }
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
    container.recordAfterCommit();
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

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  cloneInstance(
    instance,
    _type,
    _oldProps,
    newProps,
    keepChildren,
    _newChildSet
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
    if (child !== hiddenInstance) {
      childSet.push(child);
    }
  },

  // The scene graph changes at commit (replaceContainerChildren): a render
  // React completes and then drops, such as a transition that suspends, leaves
  // the committed scene in place.
  finalizeContainerChildren(_container: Container, _newChildren: ChildSet) {
    debug("finalizeContainerChildren");
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
    return hiddenInstance;
  },

  cloneHiddenTextInstance(_instance: Instance, _text: string): TextInstance {
    debug("cloneHiddenTextInstance");
    throw new Error("Not yet implemented.");
  },
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
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback() {},
  maySuspendCommit: () => false,
  maySuspendCommitOnUpdate: () => false,
  maySuspendCommitInSyncRender: () => false,
  preloadInstance: () => true, // true indicates already loaded
  startSuspendingCommit: () => null,
  suspendInstance() {},
  suspendOnActiveViewTransition() {},
  waitForCommitToBeReady: () => null,
  getSuspendedCommitReason: () => null,
  NotPendingTransition: null,
  HostTransitionContext: createContext<TransitionStatus>(
    null
  ) as unknown as ReactContext<TransitionStatus>,
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

  rendererVersion: "0.0.1",
  rendererPackageName: "react-native-skia",
  extraDevToolsConfig: null,
  // React logs an error raised in another environment, such as a server component, through this
  bindToConsole(methodName, [format, ...rest], badgeName) {
    const log: (...data: unknown[]) => void = Reflect.get(console, methodName);
    return log.bind(console, `[%s] ${format}`, ` ${badgeName} `, ...rest);
  },
};
