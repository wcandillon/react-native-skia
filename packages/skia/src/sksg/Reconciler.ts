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
      skiaReconciler.defaultOnCaughtError,
      console.error,
      () => {},
      null
    );
  }

  get sg() {
    const children = this.container.root;
    return { type: NodeType.Group, props: {}, children, isDeclaration: false };
  }

  private updateContainer(element: ReactNode) {
    return new Promise((resolve) => {
      skiaReconciler.updateContainer(element, this.root, null, () => {
        resolve(true);
      });
    });
  }

  async render(element: ReactNode) {
    this.container.mount();
    await this.updateContainer(element);
    this.container.redraw();
  }

  drawOnCanvas(canvas: SkCanvas) {
    this.container.drawOnCanvas(canvas);
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
