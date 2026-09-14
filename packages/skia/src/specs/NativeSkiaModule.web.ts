/* eslint-disable import/no-anonymous-default-export */
import type { SkPicture, SkRect } from "../skia/types";
import type { ISkiaViewApi } from "../views/types";
import type { SkiaPictureViewHandle } from "../views/SkiaPictureView.web";

export type ISkiaViewApiWeb = ISkiaViewApi & {
  views: Record<string, SkiaPictureViewHandle>;
  deferedPictures: Record<string, SkPicture>;
  unregisteredViews: Set<string>;
  registerView(nativeId: string, view: SkiaPictureViewHandle): void;
  unregisterView(nativeId: string): void;
};

global.SkiaViewApi = {
  views: {},
  deferedPictures: {},
  unregisteredViews: new Set<string>(),
  deferedOnSize: {},
  web: true,
  registerView(nativeId: string, view: SkiaPictureViewHandle) {
    this.unregisteredViews.delete(nativeId);
    // Maybe a picture for this view was already set
    if (this.deferedPictures[nativeId]) {
      view.setPicture(this.deferedPictures[nativeId] as SkPicture);
      delete this.deferedPictures[nativeId];
    }
    this.views[nativeId] = view;
  },
  unregisterView(nativeId: string) {
    // Views must be removed on unmount: the handle's closures capture the
    // canvas element, so a stale entry retains the whole detached DOM tree.
    this.unregisteredViews.add(nativeId);
    delete this.views[nativeId];
    delete this.deferedPictures[nativeId];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setJsiProperty(nativeId: number, name: string, value: any) {
    if (name === "picture") {
      const id = `${nativeId}`;
      if (this.views[id]) {
        this.views[id].setPicture(value);
      } else if (!this.unregisteredViews.has(id)) {
        this.deferedPictures[id] = value;
      }
      // Otherwise the view has unmounted (e.g. a trailing animation frame):
      // drop the picture instead of deferring it for an id that will never
      // register again, which would retain it forever.
    }
  },
  size(nativeId: number) {
    if (this.views[`${nativeId}`]) {
      return this.views[`${nativeId}`].getSize();
    } else {
      return { width: 0, height: 0 };
    }
  },
  requestRedraw(nativeId: number) {
    // The view may already have unmounted (e.g. a trailing animation frame).
    this.views[`${nativeId}`]?.redraw();
  },
  makeImageSnapshot(nativeId: number, rect?: SkRect) {
    const view = this.views[`${nativeId}`];
    if (!view) {
      throw new Error(
        `Cannot make image snapshot: view with nativeID ${nativeId} is not registered (it may have unmounted)`
      );
    }
    return view.makeImageSnapshot(rect);
  },
  makeImageSnapshotAsync(nativeId: number, rect?: SkRect) {
    return new Promise((resolve, reject) => {
      const view = this.views[`${nativeId}`];
      if (!view) {
        reject(
          new Error(
            `Cannot make image snapshot: view with nativeID ${nativeId} is not registered (it may have unmounted)`
          )
        );
        return;
      }
      const result = view.makeImageSnapshot(rect);
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Failed to make image snapshot"));
      }
    });
  },
} as ISkiaViewApiWeb;

// eslint-disable-next-line import/no-default-export
export default {};
