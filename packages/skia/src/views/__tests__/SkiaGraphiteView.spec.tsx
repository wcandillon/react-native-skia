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
jest.mock("../api", () => ({
  SkiaViewApi: {
    makeGraphiteContext: jest.fn(),
    destroyGraphiteContext: jest.fn(),
  },
}));

const { SkiaViewApi } = jest.requireMock<{
  SkiaViewApi: {
    makeGraphiteContext: jest.Mock;
    destroyGraphiteContext: jest.Mock;
  };
}>("../api");

const mountView = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<SkiaGraphiteViewRef>();
  act(() => {
    root.render(<SkiaGraphiteView ref={ref} />);
  });
  const view = ref.current;
  if (view === null) {
    throw new Error("SkiaGraphiteView did not attach its ref");
  }
  return {
    view,
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
});
