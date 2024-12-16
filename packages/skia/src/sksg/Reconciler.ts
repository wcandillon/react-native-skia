import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

import { debug, sksgHostConfig } from "./HostConfig";
import { Container } from "./Container";
import type { DrawingContext } from "./DrawingContext";

const skiaReconciler = ReactReconciler(sksgHostConfig);

skiaReconciler.injectIntoDevTools({
  bundleType: 1,
  version: "0.0.1",
  rendererPackageName: "react-native-skia",
});

export class SkiaRoot {
  private root: OpaqueRoot;
  private container: Container;

  constructor() {
    this.container = new Container();
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
  }

  draw(ctx: DrawingContext) {
    this.container.render(ctx);
  }

  unmount() {
    this.container.unmounted = true;
    skiaReconciler.updateContainer(null, this.root, null, () => {
      debug("unmountContainer");
    });
  }
}
