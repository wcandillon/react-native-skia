import React from "react";
import type { HostComponent } from "react-native";

import type { SkRect } from "../skia/types";
import { Platform } from "../Platform";
import SkiaDomViewNativeComponent from "../specs/SkiaDomViewNativeComponent";

import { SkiaViewApi } from "./api";
import type { SkiaDomViewProps } from "./types";
import { SkiaViewNativeId } from "./SkiaViewNativeId";

const NativeSkiaDomView: HostComponent<SkiaDomViewProps> =
  Platform.OS !== "web"
    ? SkiaDomViewNativeComponent
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (null as any);

export class SkiaDomView extends React.Component<SkiaDomViewProps> {
  constructor(props: SkiaDomViewProps) {
    super(props);
    this._nativeId = SkiaViewNativeId.current++;
    const { root, onTouch, onSize } = props;
    if (root) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "root", root);
    }
    if (onTouch) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "onTouch", onTouch);
    }
    if (onSize) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "onSize", onSize);
    }
  }

  private _nativeId: number;

  public get nativeId() {
    return this._nativeId;
  }

  getWGPUContext() {
    assertSkiaViewApi();
    return SkiaViewApi.getWGPUContext(this._nativeId);
  }

  componentDidUpdate(prevProps: SkiaDomViewProps) {
    const { root, onTouch, onSize } = this.props;
    if (root !== prevProps.root) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "root", root);
    }
    if (onTouch !== prevProps.onTouch) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "onTouch", onTouch);
    }
    if (onSize !== prevProps.onSize) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "onSize", onSize);
    }
  }

  /**
   * Creates a snapshot from the canvas in the surface
   * @param rect Rect to use as bounds. Optional.
   * @returns An Image object.
   */
  public makeImageSnapshot(rect?: SkRect) {
    assertSkiaViewApi();
    return SkiaViewApi.makeImageSnapshot(this._nativeId, rect);
  }

  /**
   * Creates a snapshot from the canvas in the surface
   * @param rect Rect to use as bounds. Optional.
   * @returns An Image object.
   */
  public makeImageSnapshotAsync(rect?: SkRect) {
    assertSkiaViewApi();
    return SkiaViewApi.makeImageSnapshotAsync(this._nativeId, rect);
  }

  /**
   * Sends a redraw request to the native SkiaView.
   */
  public redraw() {
    assertSkiaViewApi();
    SkiaViewApi.requestRedraw(this._nativeId);
  }

  /**
   * Clear up the dom node when unmounting to release resources.
   */
  componentWillUnmount(): void {
    assertSkiaViewApi();
    SkiaViewApi.setJsiProperty(this._nativeId, "root", null);
  }

  render() {
    const { mode, debug = false, ...viewProps } = this.props;
    return (
      <NativeSkiaDomView
        collapsable={false}
        nativeID={`${this._nativeId}`}
        mode={mode}
        debug={debug}
        {...viewProps}
      />
    );
  }
}

const assertSkiaViewApi = () => {
  if (
    SkiaViewApi === null ||
    SkiaViewApi.setJsiProperty === null ||
    SkiaViewApi.callJsiMethod === null ||
    SkiaViewApi.requestRedraw === null ||
    SkiaViewApi.makeImageSnapshot === null
  ) {
    throw Error("Skia View Api was not found.");
  }
};
