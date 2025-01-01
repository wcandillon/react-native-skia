import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import type { SkCanvas, Skia } from "../skia/types";
import { NodeType } from "../dom/types";

import { debug, sksgHostConfig } from "./HostConfig";
import { Container } from "./Container";

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
    this.container = new Container(Skia, nativeId);
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

  render(element: ReactNode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skiaReconciler.updateContainer(element as any, this.root, null, () => {
      debug("updateContainer");
    });
  }

  drawOnCanvas(canvas: SkCanvas) {
    this.container.drawOnCanvas(canvas);
  }

  getPicture() {
    const recorder = this.Skia.PictureRecorder();
    const canvas = recorder.beginRecording();
    this.drawOnCanvas(canvas);
    recorder.finishRecordingAsPicture();
  }

  unmount() {
    this.container.unmounted = true;
    skiaReconciler.updateContainer(null, this.root, null, () => {
      debug("unmountContainer");
    });
  }
}
