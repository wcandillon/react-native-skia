/*global NodeJS*/
import type { Fiber, HostConfig } from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

import { NodeType } from "../dom/types";
import { shallowEq } from "../renderer/typeddash";

import type { Node } from "./nodes/Node";
import type { Container } from "./Container";

const DEBUG = false;
export const debug = (...args: Parameters<typeof console.log>) => {
  if (DEBUG) {
    console.log(...args);
  }
};

const isDeclaration = (type: NodeType) => {
  "worklet";
  return (
    // BlurMaskFilters
    type === NodeType.BlurMaskFilter ||
    // ImageFilters
    type === NodeType.BlendImageFilter ||
    type === NodeType.BlurImageFilter ||
    type === NodeType.OffsetImageFilter ||
    type === NodeType.DropShadowImageFilter ||
    type === NodeType.MorphologyImageFilter ||
    type === NodeType.DisplacementMapImageFilter ||
    type === NodeType.RuntimeShaderImageFilter ||
    // ColorFilters
    type === NodeType.MatrixColorFilter ||
    type === NodeType.BlendColorFilter ||
    type === NodeType.LumaColorFilter ||
    type === NodeType.LinearToSRGBGammaColorFilter ||
    type === NodeType.SRGBToLinearGammaColorFilter ||
    type === NodeType.LerpColorFilter ||
    // Shaders
    type === NodeType.Shader ||
    type === NodeType.ImageShader ||
    type === NodeType.ColorShader ||
    type === NodeType.Turbulence ||
    type === NodeType.FractalNoise ||
    type === NodeType.LinearGradient ||
    type === NodeType.RadialGradient ||
    type === NodeType.SweepGradient ||
    type === NodeType.TwoPointConicalGradient ||
    // Path Effects
    type === NodeType.CornerPathEffect ||
    type === NodeType.DiscretePathEffect ||
    type === NodeType.DashPathEffect ||
    type === NodeType.Path1DPathEffect ||
    type === NodeType.Path2DPathEffect ||
    type === NodeType.SumPathEffect ||
    type === NodeType.Line2DPathEffect ||
    // Mixed
    type === NodeType.Blend ||
    // Paint
    type === NodeType.Paint
  );
};

type Instance = Node;

type Props = object;
type TextInstance = Node;
type SuspenseInstance = Instance;
type HydratableInstance = Instance;
type PublicInstance = Instance;
type HostContext = null;
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
    allProps,
    container,
    _hostContext,
    _internalInstanceHandle
  ) {
    debug("createInstance", type);
    const [props, animatedProps] = container.registerValues(
      allProps as Record<string, unknown>
    );
    const instance = {
      type,
      isDeclaration: isDeclaration(type),
      props,
      animatedProps,
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

  prepareUpdate(
    _instance: Instance,
    _type: string,
    oldProps: Props,
    allProps: Props,
    container: Container,
    _hostContext: HostContext
  ) {
    debug("prepareUpdate");
    console.log("prepareUpdate()");
    const propsAreEqual = shallowEq(oldProps, allProps);
    if (propsAreEqual) {
      return null;
    }
    container.unregisterValues(oldProps);
    container.registerValues(allProps as Record<string, unknown>);
    return container;
  },

  preparePortalMount: () => {
    debug("preparePortalMount");
  },

  cloneInstance(
    instance,
    _updatePayload,
    _type,
    _oldProps,
    newProps,
    _internalInstanceHandle,
    keepChildren: boolean,
    _recyclableInstance: null | Instance
  ) {
    debug("cloneInstance");

    return {
      type: instance.type,
      props: newProps,
      children: keepChildren ? [...instance.children] : [],
      isDeclaration: instance.isDeclaration,
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
  getCurrentEventPriority: () => DefaultEventPriority,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  detachDeletedInstance: () => {},
  getInstanceFromNode: function (_node): Fiber | null | undefined {
    throw new Error("Function not implemented.");
  },
  prepareScopeUpdate: function (_scopeInstance, _instance): void {
    throw new Error("Function not implemented.");
  },
  getInstanceFromScope: function (_scopeInstance): Instance | null {
    throw new Error("Function not implemented.");
  },
};
