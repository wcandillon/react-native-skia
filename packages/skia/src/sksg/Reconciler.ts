import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import type { SkCanvas, Skia } from "../skia/types";
import { NodeType } from "../dom/types";

import { debug, sksgHostConfig } from "./HostConfig";
import type { Container } from "./StaticContainer";
import { createContainer } from "./Container";

import "./Elements";

const skiaReconciler = ReactReconciler(sksgHostConfig);

skiaReconciler.injectIntoDevTools();

export class SkiaSGRoot {
  private root: OpaqueRoot;
  private container: Container;

  constructor(
    public Skia: Skia,
    nativeId = -1
  ) {
    const strictMode = false;
    this.container = createContainer(Skia, nativeId);
    this.root = skiaReconciler.createContainer(
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

  get sg() {
    const children = this.container.root;
    return { type: NodeType.Group, props: {}, children };
  }

  private updateContainer(element: ReactNode) {
    const { recordCount } = this.container;
    return new Promise((resolve) => {
      skiaReconciler.updateContainer(element, this.root, null, () => {
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
    return new Promise((resolve) => {
      skiaReconciler.updateContainer(null, this.root, null, () => {
        debug("unmountContainer");
        resolve(true);
      });
    });
  }
}
