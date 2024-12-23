import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import type { SkCanvas, Skia } from "../skia/types";

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

  constructor(Skia: Skia, nativeId = -1) {
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

  render(element: ReactNode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skiaReconciler.updateContainer(element as any, this.root, null, () => {
      debug("updateContainer");
    });
    this.draw();
  }

  // TODO: rename to Draw on nativeView
  draw() {
    this.container.render();
  }

  drawOnCanvas(canvas: SkCanvas) {
    this.container.drawOnCanvas(canvas);
  }

  unmount() {
    this.container.unmounted = true;
    skiaReconciler.updateContainer(null, this.root, null, () => {
      debug("unmountContainer");
    });
  }
}
