/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import type { SkImage } from "../../skia/types";
import { SkiaImageView } from "../SkiaImageView";
import { SkiaViewApi } from "../api";

// Every retain, release and id the native view was given, in order.
const mockLog: string[] = [];

jest.mock("../../specs/SkiaImageViewNativeComponent", () => ({
  __esModule: true,
  default: ({ presentedImageId }: { presentedImageId: number }) => {
    mockLog.push(`shows ${presentedImageId}`);
    return null;
  },
}));
jest.mock("../api", () => ({
  SkiaViewApi: {
    presentedImageId: (image: { id: number }) => image.id,
    retainPresentedImage: (image: { id: number }) =>
      mockLog.push(`retain ${image.id}`),
    releasePresentedImage: (id: number) => mockLog.push(`release ${id}`),
  },
}));

const makeImage = (id: number) => ({ id }) as unknown as SkImage;

// Async acts: a view releases its image in a microtask, after the commit.
const mountView = async (element: ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return {
    rerender: (next: ReactElement) => act(async () => root.render(next)),
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
  mockLog.length = 0;
});

describe("SkiaImageView on native", () => {
  it("retains the image it shows and releases it by id on unmount", async () => {
    const view = await mountView(<SkiaImageView image={makeImage(7)} />);
    await view.unmount();
    expect(mockLog).toEqual(["shows 7", "retain 7", "release 7"]);
  });

  it("retains the next image before releasing the one it showed", async () => {
    const view = await mountView(<SkiaImageView image={makeImage(7)} />);
    await view.rerender(<SkiaImageView image={makeImage(8)} />);
    await view.unmount();
    expect(mockLog).toEqual([
      "shows 7",
      "retain 7",
      "shows 8",
      "retain 8",
      "release 7",
      "release 8",
    ]);
  });

  // A list re-keying its rows: the image never loses its last retain, so its
  // bitmap is neither discarded nor read back again.
  it("keeps an image retained as it moves from one view to another in a commit", async () => {
    const view = await mountView(
      <SkiaImageView key="first" image={makeImage(7)} />
    );
    await view.rerender(<SkiaImageView key="second" image={makeImage(7)} />);
    await view.unmount();
    expect(mockLog).toEqual([
      "shows 7",
      "retain 7",
      "shows 7",
      "retain 7",
      "release 7",
      "release 7",
    ]);
  });

  it("shows nothing for a null image and retains nothing", async () => {
    const view = await mountView(<SkiaImageView image={null} />);
    await view.unmount();
    expect(mockLog).toEqual(["shows 0"]);
  });

  // StrictMode runs the unmount cleanup once right after mount and the
  // effect again: every retain still meets its release.
  it("balances its retains under StrictMode's simulated unmount", async () => {
    const view = await mountView(
      <React.StrictMode>
        <SkiaImageView image={makeImage(7)} />
      </React.StrictMode>
    );
    await view.unmount();
    const retains = mockLog.filter((entry) => entry === "retain 7");
    const releases = mockLog.filter((entry) => entry === "release 7");
    expect(retains.length).toBe(2);
    expect(releases.length).toBe(2);
    expect(mockLog[mockLog.length - 1]).toBe("release 7");
  });

  // A development build made before SkiaImageView existed, running this
  // version's JavaScript.
  it("names a native build that predates it", async () => {
    const { presentedImageId } = SkiaViewApi;
    Reflect.deleteProperty(SkiaViewApi, "presentedImageId");
    try {
      await expect(
        mountView(<SkiaImageView image={makeImage(7)} />)
      ).rejects.toThrow(
        "React Native Skia: the native module does not provide SkiaImageView. " +
          "Rebuild the app so the native code matches the JavaScript."
      );
    } finally {
      Object.assign(SkiaViewApi, { presentedImageId });
    }
  });
});
