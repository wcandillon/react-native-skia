/*global NodeJS*/
import type { HostConfig } from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

import type {
  BlurMaskFilterProps,
  CircleProps,
  GroupProps,
} from "../dom/types";
import { NodeType } from "../dom/types";

import type { Node } from "./Node";
import type { Container } from "./Container";
import { CircleNode, FillNode, GroupNode } from "./DrawingNodes";
import { BlurMaskFilterNode } from "./DeclarationNodes";

const DEBUG = false;
export const debug = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) {
    console.log(...args);
  }
};

type Instance = Node<unknown>;

type Props = object;
type TextInstance = Node<unknown>;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type PublicInstance = Instance;
type HostContext = null;
type UpdatePayload = Container;
type ChildSet = Node<unknown>[];
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

export const sksgHostConfig: SkiaHostConfig = {
  /**
   * This function is used by the reconciler in order to calculate current time for prioritising work.
   */
  now: Date.now,
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
    _container,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createInstance", type);
    switch (type) {
      case NodeType.Circle:
        return new CircleNode(props as CircleProps);
      case NodeType.Fill:
        return new FillNode(props as CircleProps);
      case NodeType.Group:
        return new GroupNode(props as GroupProps);
      case NodeType.BlurMaskFilter:
        return new BlurMaskFilterNode(props as BlurMaskFilterProps);
      default:
        throw new Error(`Unknown type: ${type}`);
    }
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

  commitTextUpdate: (
    _textInstance: TextInstance,
    _oldText: string,
    _newText: string
  ) => {
    //  textInstance.instance = newText;
  },

  clearContainer: (container) => {
    debug("clearContainer");
    container.clear();
  },

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  cloneInstance(
    instance: Instance,
    type: string,
    oldProps: Props,
    newProps: Props,
    keepChildren: boolean,
    newChildSet?: ChildSet
  ) {
    console.log(
      "cloneInstance",
      instance,
      type,
      oldProps,
      newProps,
      keepChildren,
      newChildSet
    );
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
    debug("replaceContainerChildren");
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  getCurrentEventPriority: () => DefaultEventPriority,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  detachDeletedInstance: () => {},
};
