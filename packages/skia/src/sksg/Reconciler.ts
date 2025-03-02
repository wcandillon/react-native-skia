import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import type { SkCanvas, Skia } from "../skia/types";
import { NodeType } from "../dom/types";

import { debug, sksgHostConfig } from "./HostConfig";
import type { Container } from "./Container";
import { createContainer } from "./Container";
import "./Elements";

const skiaReconciler = ReactReconciler(sksgHostConfig);

skiaReconciler.injectIntoDevTools({
  bundleType: 1,
  version: "0.0.1",
  rendererPackageName: "react-native-skia",
});

export class SkiaSGRoot {
  private root: OpaqueRoot;
  private container: Container;

  constructor(public Skia: Skia, nativeId = -1) {
    this.container = createContainer(Skia, nativeId);
    this.root = skiaReconciler.createContainer(
      this.container,
      0,
      null,
      true,
      null,
      "",
      console.error,
      null
    );
  }

  get sg() {
    const children = this.container.root;
    return { type: NodeType.Group, props: {}, children, isDeclaration: false };
  }

  private updateContainer(element: ReactNode) {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skiaReconciler.updateContainer(element as any, this.root, null, () => {
        debug("updateContainer");
        resolve(true);
      });
    });
  }

  async render(element: ReactNode) {
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
    return recorder.finishRecordingAsPicture();
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
