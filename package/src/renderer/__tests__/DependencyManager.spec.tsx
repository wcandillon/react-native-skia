import { DependencyManager } from "../DependencyManager";
import { Selector } from "../../values";
import { RNSkValue } from "../../values/web/RNSkValue";
import type { Node } from "../../dom/types";
import { NodeType } from "../../dom/types/NodeType";

class TestNode<P> implements Node<P> {
  type = NodeType.Circle;
  _children: TestNode<unknown>[] = [];

  constructor(public mgr: DependencyManager, public props: P) {}

  setProps(props: P) {
    this.props = props;
  }

  setProp<K extends keyof P>(name: K, v: P[K]) {
    this.props[name] = v;
    return false;
  }

  getProps() {
    return this.props;
  }

  children() {
    return this._children;
  }

  addChild(child: Node<unknown>) {
    this._children.push(child as TestNode<unknown>);
  }

  dispose() {
    this.mgr.unsubscribeNode(this);
    this._children.forEach((child) => child.dispose());
  }

  removeChild(child: Node<unknown>) {
    const index = this._children.indexOf(child as TestNode<unknown>);
    if (index !== -1) {
      const [node] = this._children.splice(index, 1);
      node.dispose();
    }
    return [];
  }

  insertChildBefore(child: Node<unknown>, before: Node<unknown>) {
    const index = this._children.indexOf(child as TestNode<unknown>);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
    const beforeIndex = this._children.indexOf(before as TestNode<unknown>);
    this._children.splice(beforeIndex, 0, child as TestNode<unknown>);
  }
}

describe("DependencyManager", () => {
  it("should resolve all properties for a node", () => {
    const mgr = new DependencyManager(() => () => {});
    const node = new TestNode(mgr, { a: 100, b: "hello", c: { d: "world" } });
    expect(node.props.a).toBe(100);
    expect(node.props.b).toBe("hello");
    expect(node.props.c).toEqual({ d: "world" });
    expect(Object.keys(node.props)).toEqual(["a", "b", "c"]);
  });
  it("should update a node's property value when the dependant value change", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
    value.current = 200;
    expect(node.props.a).toBe(200);
  });
  it("should not update a node's property value for a removed node", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
    mgr.unsubscribeNode(node);
    value.current = 200;
    expect(node.props.a).toBe(100);
  });
  it("should update all node props when the dependant value change", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const nodeA = new TestNode(mgr, { a: value });
    mgr.subscribeNode(nodeA, nodeA.props);
    expect(nodeA.props.a).toBe(100);
    const nodeB = new TestNode(mgr, { b: value });
    mgr.subscribeNode(nodeB, nodeB.props);
    expect(nodeB.props.b).toBe(100);
    value.current = 200;
    expect(nodeA.props.a).toBe(200);
    expect(nodeB.props.b).toBe(200);
  });
  it("should only update the remaining node props when the dependant value change", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const nodeA = new TestNode(mgr, { a: value });
    mgr.subscribeNode(nodeA, nodeA.props);
    expect(nodeA.props.a).toBe(100);
    const nodeB = new TestNode(mgr, { b: value });
    mgr.subscribeNode(nodeB, nodeB.props);
    expect(nodeB.props.b).toBe(100);
    mgr.unsubscribeNode(nodeA);
    value.current = 200;
    expect(nodeA.props.a).toBe(100);
    expect(nodeB.props.b).toBe(200);
  });
  it("should update corresponding value/props correctly", () => {
    const mgr = new DependencyManager(() => () => {});
    const valueA = new RNSkValue(100);
    const valueB = new RNSkValue(200);
    const node = new TestNode(mgr, { a: valueA, b: valueB });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
    expect(node.props.b).toBe(200);
    valueA.current = 300;
    expect(node.props.a).toBe(300);
    expect(node.props.b).toBe(200);
  });
  it("should remove listeners on a node when node is removed", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(mgr.subscriptions.has(value)).toBe(true);
    expect(mgr.subscriptions.get(value)!.nodes.has(node)).toBe(true);
    mgr.unsubscribeNode(node);
    expect(mgr.subscriptions.has(value)).toBe(false);
  });
  it("should remove listeners for removed node only", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const node1 = new TestNode(mgr, { a: value });
    const node2 = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node1, node1.props);
    mgr.subscribeNode(node2, node2.props);
    expect(mgr.subscriptions.has(value)).toBe(true);
    mgr.unsubscribeNode(node1);
    expect(mgr.subscriptions.has(value)).toBe(true);
    expect(mgr.subscriptions.get(value)?.nodes.has(node1)).toBe(false);
    expect(mgr.subscriptions.get(value)?.nodes.has(node2)).toBe(true);
    mgr.unsubscribeNode(node2);
    expect(mgr.subscriptions.has(value)).toBe(false);
  });
  it("should remove value when last node is removed", () => {
    const mgr = new DependencyManager(() => () => {});
    const value = new RNSkValue(100);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(mgr.subscriptions.has(value)).toBe(true);
    mgr.unsubscribeNode(node);
    expect(mgr.subscriptions.has(value)).toBe(false);
  });
  it("should resolve a value property to the value's current", () => {
    const value = new RNSkValue(100);
    const mgr = new DependencyManager(() => () => {});
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
  });
  it("should resolve a selector property to the selectors value", () => {
    const value = new RNSkValue([100]);
    const mgr = new DependencyManager(() => () => {});
    const node = new TestNode(mgr, { a: Selector(value, (v) => v[0]) });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
  });
  it("should register a listener on SkiaValues", () => {
    const value = new RNSkValue(100);
    const mockRegister = jest.fn();
    const mgr = new DependencyManager(mockRegister);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    mgr.update();
    expect(node.props.a).toBe(100);
    expect(mockRegister).toBeCalled();
  });
  it("should unregister the listener when mgr is updated for the second time", () => {
    const value = new RNSkValue(100);
    const mockUnregister = jest.fn();
    const mockRegister = jest.fn(() => mockUnregister);
    const mgr = new DependencyManager(mockRegister);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    mgr.update();
    mgr.update();
    expect(node.props.a).toBe(100);
    expect(mockRegister).toBeCalledTimes(2);
    expect(mockUnregister).toBeCalledTimes(1);
  });
  it("should register a listener on the value", () => {
    const value = new RNSkValue(100);
    const mockRegister = jest.fn();
    const mgr = new DependencyManager(mockRegister);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(value._listeners.length).toBe(1);
  });
  it("should unregister the listener on the value when node is removed", () => {
    const value = new RNSkValue(100);
    const mockRegister = jest.fn();
    const mgr = new DependencyManager(mockRegister);
    const node = new TestNode(mgr, { a: value });
    mgr.subscribeNode(node, node.props);
    expect(node.props.a).toBe(100);
    mgr.unsubscribeNode(node);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(value._listeners.length).toBe(0);
  });
});
