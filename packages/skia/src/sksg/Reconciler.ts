import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import type { SkCanvas, Skia } from "../skia/types";
import { NodeType } from "../dom/types";

import { debug, sksgHostConfig } from "./HostConfig";
import type { Container } from "./StaticContainer";
import { createContainer } from "./Container";

import "./Elements";

const createReconciler = () => {
  const reconciler = ReactReconciler(sksgHostConfig);
  reconciler.injectIntoDevTools();
  return reconciler;
};

let skiaReconciler: ReturnType<typeof createReconciler> | null = null;

/**
 * The reconciler is built by the first render, not when this module is
 * evaluated: building one hooks it into the React instance for the lifetime
 * of the process (ReactSharedInternals.S, the DevTools hook). A server that
 * evaluates the bundle once per request against a single React instance, as
 * the Expo dev server does for web, would otherwise keep one reconciler, and
 * the whole bundle behind it, per request.
 */
const getReconciler = () => {
  if (skiaReconciler === null) {
    skiaReconciler = createReconciler();
  }
  return skiaReconciler;
};

export class SkiaSGRoot {
  private root: OpaqueRoot | null = null;
  private container: Container;

  constructor(
    public Skia: Skia,
    nativeId = -1
  ) {
    this.container = createContainer(Skia, nativeId);
  }

  /**
   * The React root, created by the first render: a Canvas constructs its
   * SkiaSGRoot while it renders, which a server does too, and renders into
   * it from a layout effect, which a server never runs.
   */
  private getRoot() {
    if (this.root === null) {
      const strictMode = false;
      this.root = getReconciler().createContainer(
        this.container,
        0,
        null,
        strictMode,
        null,
        "",
        console.error,
        console.error,
        console.error,
        () => {},
        null
      );
    }
    return this.root;
  }

  get sg() {
    const children = this.container.root;
    return { type: NodeType.Group, props: {}, children };
  }

  private updateContainer(element: ReactNode) {
    const { recordCount } = this.container;
    const root = this.getRoot();
    return new Promise((resolve) => {
      getReconciler().updateContainer(element, root, null, () => {
        if (this.container.recordCount === recordCount) {
          this.container.recordAfterCommit();
        }
        resolve(true);
      });
    });
  }

  /**
   * Commits the element and records the scene graph once. The container
   * records it at the end of a commit that changes the host tree
   * (resetAfterCommit), which React does not call for a commit that changes
   * nothing, such as the one of an element React bails out on (the same one
   * again): the completion callback updateContainer() is given records that
   * one, so a shared value changed since the last render is picked up.
   */
  async render(element: ReactNode) {
    this.container.mount();
    await this.updateContainer(element);
  }

  drawOnCanvas(canvas: SkCanvas) {
    this.container.drawOnCanvas(canvas);
  }

  /** See Container.readSharedValues(). */
  readSharedValues() {
    this.container.readSharedValues();
  }

  getPicture() {
    const recorder = this.Skia.PictureRecorder();
    const canvas = recorder.beginRecording();
    this.drawOnCanvas(canvas);
    const picture = recorder.finishRecordingAsPicture();
    recorder.dispose();
    return picture;
  }

  unmount() {
    this.container.unmount();
    const { root } = this;
    if (root === null) {
      // Never rendered: React holds nothing for this root.
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      getReconciler().updateContainer(null, root, null, () => {
        debug("unmountContainer");
        resolve(true);
      });
    });
  }
}
