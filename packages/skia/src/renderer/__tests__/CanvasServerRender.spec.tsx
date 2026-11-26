import React from "react";
import { renderToString } from "react-dom/server";

import type { Canvas as CanvasComponent } from "../Canvas";
import type { Group as GroupComponent } from "../components";

// Resolve the platform modules to their web implementation, as a web bundler
// would. CanvasKit is not loaded, as on a server.
jest.mock("../../Platform", () => require("../../Platform/Platform.web"));
jest.mock("../../specs/SkiaPictureViewNativeComponent", () =>
  require("../../specs/SkiaPictureViewNativeComponent.web")
);
jest.mock("../../specs/NativeSkiaModule", () =>
  require("../../specs/NativeSkiaModule.web")
);
jest.mock("../../skia/Skia", () => require("../../skia/Skia.web"));
jest.mock("../../sksg/Container", () => require("../../sksg/Container.web"));

// What a reconciler hooks itself into when it is built: it wraps
// onStartTransitionFinish (S) around the one already there.
const internals = (
  React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
      S: unknown;
    };
  }
).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// A server that evaluates the bundle once per request against a single React
// instance (the Expo dev server, for web) keeps whatever an evaluation hooks
// into React, and the whole bundle behind it, for the lifetime of the process
// (#4544). Importing the library and rendering a Canvas to HTML must leave
// React as they found it: the reconciler is built by the first render into a
// Canvas, from a layout effect, which a server never runs.
describe("Canvas server render", () => {
  it("imports and renders to HTML without building the reconciler", () => {
    const untouched = internals.S;
    // Installs global.SkiaViewApi
    require("../../specs/NativeSkiaModule.web");
    const { Canvas } = require("../Canvas") as {
      Canvas: typeof CanvasComponent;
    };
    const { Group } = require("../components") as {
      Group: typeof GroupComponent;
    };
    expect(internals.S).toBe(untouched);
    const html = renderToString(
      <Canvas style={{ width: 256, height: 256 }}>
        <Group />
      </Canvas>
    );
    expect(html).toContain("<canvas");
    expect(internals.S).toBe(untouched);
  });
});
