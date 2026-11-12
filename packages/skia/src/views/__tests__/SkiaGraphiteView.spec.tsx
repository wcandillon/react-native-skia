/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { Ref } from "react";
import { createRoot } from "react-dom/client";

import { SkiaGraphiteView } from "../SkiaGraphiteView";
import type { SkiaGraphiteViewRef } from "../SkiaGraphiteView";

// The host instance of the native view, which getContext() measures.
let mockHost: object = {};

jest.mock("../../Platform", () => ({ Platform: { OS: "android" } }));
jest.mock("../../specs/SkiaViewNativeComponent", () => ({
  __esModule: true,
  default: ({ ref }: { ref: Ref<object> }) => {
    require("react").useImperativeHandle(ref, () => mockHost);
    return null;
  },
}));
jest.mock("../api", () => {
  let nextNativeId = 1000;
  return {
    SkiaViewApi: {
      allocateNativeId: () => nextNativeId++,
      makeGraphiteContext: jest.fn(),
      destroyGraphiteContext: jest.fn(),
      setJsiProperty: jest.fn(),
      releaseView: jest.fn(),
    },
  };
});

const { SkiaViewApi } = jest.requireMock<{
  SkiaViewApi: {
    makeGraphiteContext: jest.Mock;
    destroyGraphiteContext: jest.Mock;
    setJsiProperty: jest.Mock;
    releaseView: jest.Mock;
  };
}>("../api");

const mountView = ({ strict = false, deviceIndependentFonts = false } = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<SkiaGraphiteViewRef>();
  const render = (fonts: boolean) => {
    const element = (
      <SkiaGraphiteView ref={ref} deviceIndependentFonts={fonts} />
    );
    act(() => {
      root.render(
        strict ? <React.StrictMode>{element}</React.StrictMode> : element
      );
    });
  };
  render(deviceIndependentFonts);
  const view = ref.current;
  if (view === null) {
    throw new Error("SkiaGraphiteView did not attach its ref");
  }
  return {
    view,
    render,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  SkiaViewApi.makeGraphiteContext.mockReset();
  SkiaViewApi.destroyGraphiteContext.mockReset();
  SkiaViewApi.setJsiProperty.mockReset();
  SkiaViewApi.releaseView.mockReset();
});

// A host laid out at 200 × 100 points and drawn at half that size: measured
// relative to itself, React Native reports its layout box.
const createScaledHost = () => {
  const host = {
    measureLayout: (
      relativeTo: object,
      onSuccess: (
        left: number,
        top: number,
        width: number,
        height: number
      ) => void,
      onFail: () => void
    ) => (relativeTo === host ? onSuccess(0, 0, 200, 100) : onFail()),
    getBoundingClientRect: () => ({ width: 100, height: 50 }),
  };
  return host;
};

describe("SkiaGraphiteView on native", () => {
  it("sizes the context from the view's layout, not its transformed box", async () => {
    mockHost = createScaledHost();
    const { view, unmount } = mountView();
    view.getContext();
    expect(SkiaViewApi.makeGraphiteContext).toHaveBeenCalledWith(
      view.getNativeId(),
      200,
      100,
      false,
      false,
      false
    );
    await unmount();
  });

  // The native target made for the id outlives the context JS holds; the
  // view retires it on unmount in case no native view ever bound to it.
  it("retires its context on unmount", async () => {
    mockHost = createScaledHost();
    const { view, unmount } = mountView();
    view.getContext();
    expect(SkiaViewApi.destroyGraphiteContext).not.toHaveBeenCalled();
    await unmount();
    expect(SkiaViewApi.destroyGraphiteContext).toHaveBeenCalledTimes(1);
    expect(SkiaViewApi.destroyGraphiteContext).toHaveBeenCalledWith(
      view.getNativeId()
    );
  });

  // StrictMode runs the unmount cleanup once right after mount and re-runs
  // the effect, with the id unchanged: a context kept from the first effect
  // run was made for the id the cleanup retires, and the native side keeps
  // its target for the view (see RNSkGraphiteTargetRegistry).
  it("retires the same id under StrictMode's simulated unmount", async () => {
    mockHost = createScaledHost();
    const { view, unmount } = mountView({ strict: true });
    const nativeId = view.getNativeId();
    view.getContext();
    expect(SkiaViewApi.makeGraphiteContext).toHaveBeenLastCalledWith(
      nativeId,
      200,
      100,
      false,
      false,
      false
    );
    expect(SkiaViewApi.destroyGraphiteContext.mock.calls).toEqual([[nativeId]]);
    await unmount();
    expect(SkiaViewApi.destroyGraphiteContext.mock.calls).toEqual([
      [nativeId],
      [nativeId],
    ]);
  });

  // Off by default; the context is made with it, and a change reaches the
  // target the context already holds through the view's properties.
  it("passes deviceIndependentFonts to the context and its changes to the view", async () => {
    mockHost = createScaledHost();
    const { view, render, unmount } = mountView({
      deviceIndependentFonts: true,
    });
    const nativeId = view.getNativeId();
    view.getContext();
    expect(SkiaViewApi.makeGraphiteContext).toHaveBeenCalledWith(
      nativeId,
      200,
      100,
      false,
      false,
      true
    );
    expect(SkiaViewApi.setJsiProperty).toHaveBeenLastCalledWith(
      nativeId,
      "deviceIndependentFonts",
      true
    );
    render(false);
    expect(SkiaViewApi.setJsiProperty).toHaveBeenLastCalledWith(
      nativeId,
      "deviceIndependentFonts",
      false
    );
    await unmount();
  });

  // The native side keeps the properties of the id while the component is
  // mounted, for the native views Fabric creates for it over time: the
  // unmount lets go of them (see useNativeViewId).
  it("releases its id on unmount", async () => {
    mockHost = createScaledHost();
    const { view, unmount } = mountView();
    expect(SkiaViewApi.releaseView).not.toHaveBeenCalled();
    await unmount();
    expect(SkiaViewApi.releaseView.mock.calls).toEqual([[view.getNativeId()]]);
  });

  // The simulated unmount lets go of the properties too: they have to be
  // set again after it, or the view would lose its options.
  it("sets its properties again after StrictMode's simulated unmount", async () => {
    mockHost = createScaledHost();
    const { view, unmount } = mountView({
      strict: true,
      deviceIndependentFonts: true,
    });
    const nativeId = view.getNativeId();
    expect(SkiaViewApi.releaseView.mock.calls).toEqual([[nativeId]]);
    expect(SkiaViewApi.setJsiProperty).toHaveBeenCalledTimes(2);
    expect(SkiaViewApi.releaseView.mock.invocationCallOrder[0]).toBeLessThan(
      SkiaViewApi.setJsiProperty.mock.invocationCallOrder[1]
    );
    await unmount();
    expect(SkiaViewApi.releaseView).toHaveBeenCalledTimes(2);
  });

  // A bundle newer than the native binary (an over-the-air update): the
  // binary lets go of the properties by itself.
  it("unmounts on a binary without releaseView", async () => {
    mockHost = createScaledHost();
    const { releaseView } = SkiaViewApi;
    Object.assign(SkiaViewApi, { releaseView: undefined });
    try {
      const { unmount } = mountView();
      await unmount();
    } finally {
      Object.assign(SkiaViewApi, { releaseView });
    }
  });
});
