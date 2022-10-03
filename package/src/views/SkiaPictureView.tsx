import React from "react";
import { requireNativeComponent } from "react-native";

import type { SkRect } from "../skia/types";
import type { SkiaValue } from "../values";

import { SkiaViewApi } from "./api";
import type { NativeSkiaViewProps, SkiaPictureViewProps } from "./types";

let SkiaViewNativeId = 1000;

const NativeSkiaPictureView =
  requireNativeComponent<NativeSkiaViewProps>("SkiaPictureView");

export class SkiaPictureView extends React.Component<SkiaPictureViewProps> {
  constructor(props: SkiaPictureViewProps) {
    super(props);
    this._nativeId = SkiaViewNativeId++;
    const { picture } = props;
    if (picture) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "picture", picture);
    }
  }

  private _nativeId: number;

  public get nativeId() {
    return this._nativeId;
  }

  componentDidUpdate(prevProps: SkiaPictureViewProps) {
    const { picture } = this.props;
    if (picture !== prevProps.picture) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "picture", picture);
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
   * Sends a redraw request to the native SkiaView.
   */
  public redraw() {
    assertSkiaViewApi();
    SkiaViewApi.requestRedraw(this._nativeId);
  }

  /**
   * Registers one or move values as a dependant value of the Skia View. The view will
   * The view will redraw itself when any of the values change.
   * @param values Values to register
   */
  public registerValues(values: SkiaValue<unknown>[]): () => void {
    assertSkiaViewApi();
    return SkiaViewApi.registerValuesInView(this._nativeId, values);
  }

  render() {
    const { mode, debug = false, ...viewProps } = this.props;
    return (
      <NativeSkiaPictureView
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
    SkiaViewApi.registerValuesInView === null ||
    SkiaViewApi.requestRedraw === null ||
    SkiaViewApi.makeImageSnapshot === null
  ) {
    throw Error("Skia View Api was not found.");
  }
};
