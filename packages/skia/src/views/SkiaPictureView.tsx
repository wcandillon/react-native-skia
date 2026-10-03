import React from "react";

import type { SkRect } from "../skia/types";
import SkiaViewNativeComponent from "../specs/SkiaViewNativeComponent";

import { SkiaViewApi } from "./api";
import { androidNativeProps } from "./android";
import type { SkiaPictureViewNativeProps } from "./types";
import { SkiaViewNativeId } from "./SkiaViewNativeId";

interface SkiaPictureViewProps extends SkiaPictureViewNativeProps {
  mode?: "default" | "continuous";
}

/**
 * A view showing a picture. The picture is handed to the native view, which
 * records it once (and again on every redraw) for its surface.
 */
export class SkiaPictureView extends React.Component<SkiaPictureViewProps> {
  private requestId = 0;

  constructor(props: SkiaPictureViewProps) {
    super(props);
    this._nativeId = SkiaViewNativeId.current++;
    const { picture } = props;
    if (picture) {
      assertSkiaViewApi();
      SkiaViewApi.setJsiProperty(this._nativeId, "picture", picture);
    }
    this.tick();
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
    this.tick();
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
  }

  private tick() {
    this.redraw();
    if (this.props.mode === "continuous") {
      this.requestId = requestAnimationFrame(this.tick.bind(this));
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

  render() {
    const {
      mode: _mode,
      picture: _picture,
      opaque = false,
      highBitDepth = false,
      android,
      ...viewProps
    } = this.props;
    return (
      <SkiaViewNativeComponent
        collapsable={false}
        nativeID={`${this._nativeId}`}
        opaque={opaque}
        highBitDepth={highBitDepth}
        {...androidNativeProps(android)}
        {...viewProps}
      />
    );
  }
}

const assertSkiaViewApi = () => {
  if (
    SkiaViewApi === null ||
    SkiaViewApi.setJsiProperty === null ||
    SkiaViewApi.requestRedraw === null ||
    SkiaViewApi.makeImageSnapshot === null
  ) {
    throw Error("Skia View Api was not found.");
  }
};
