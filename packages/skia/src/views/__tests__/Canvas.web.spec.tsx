/**
 * @jest-environment jsdom
 */
import React, { act, Activity } from "react";
import { createRoot } from "react-dom/client";

// Installs global.SkiaViewApi
import "../../specs/NativeSkiaModule.web";
import type { Skia } from "../../skia/types";
import { JsiSkApi } from "../../skia/web/JsiSkia";
import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import { Canvas } from "../../renderer/Canvas";
import { Rect } from "../../renderer/components";

import {
  installWebEnvironment,
  resetWebEnvironment,
  installCanvasKit,
  canvasSize,
} from "./web-setup";

// A <Canvas> rendered end to end on the web: its reconciler, container and
// pictures are the real ones (CanvasKit recordings); only the WebGL surface
// the view paints into is mocked.

jest.mock("../../Platform", () => require("../../Platform/Platform.web"));
jest.mock("../../specs/SkiaViewNativeComponent", () =>
  require("../../specs/SkiaViewNativeComponent.web")
);
// The pictures are recorded with the real CanvasKit, loaded before the
// surface mock replaces global.CanvasKit.
const real: { Skia: Skia | null } = { Skia: null };
jest.mock("../../skia", () => ({
  get Skia() {
    return real.Skia;
  },
}));

beforeAll(async () => {
  await LoadSkiaWeb();
  real.Skia = JsiSkApi(global.CanvasKit);
  installWebEnvironment();
});

beforeEach(resetWebEnvironment);

describe("Canvas on the web", () => {
  // #4354: hiding an Activity cleans up the canvas's effects, which disposes
  // its picture, while the view keeps it. On reveal, the view's layout effect
  // runs before the canvas's and paints what it holds: CanvasKit throws on
  // the deleted picture.
  it("does not paint a deleted picture when its Activity is revealed", async () => {
    const { rawCanvas } = installCanvasKit();
    canvasSize.width = 100;
    canvasSize.height = 100;
    rawCanvas.drawPicture.mockImplementation(
      (picture: { isDeleted(): boolean }) => {
        if (picture.isDeleted()) {
          throw new Error(
            "Cannot pass deleted object as a pointer of type sk_sp<Picture>"
          );
        }
      }
    );
    const errors: unknown[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container, {
      onUncaughtError: (error) => errors.push(error),
      onCaughtError: (error) => errors.push(error),
    });
    const render = (mode: "visible" | "hidden") =>
      act(async () => {
        root.render(
          <Activity mode={mode}>
            <Canvas style={{ width: 100, height: 100 }}>
              <Rect x={0} y={0} width={100} height={100} color="red" />
            </Canvas>
          </Activity>
        );
      });

    await render("visible");
    expect(rawCanvas.drawPicture).toHaveBeenCalledTimes(1);

    await render("hidden");
    await render("visible");
    expect(errors).toEqual([]);
    // The canvas records a new picture on reveal, and the view paints it.
    const [last] = rawCanvas.drawPicture.mock.calls.at(-1)!;
    expect(last.isDeleted()).toBe(false);

    await act(async () => root.unmount());
    container.remove();
  });
});
