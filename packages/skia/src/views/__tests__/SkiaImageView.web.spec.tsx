/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import type { SkImage } from "../../skia/types";
import { FilterMode, MipmapMode } from "../../skia/types";
import { SkiaImageView } from "../SkiaImageView.web";

import { flushMicrotasks } from "./web-setup";

// react-native-web renders a View as a <div>; jest cannot parse react-native.
jest.mock("react-native", () => ({
  View: ({ children }: { children?: ReactNode }) =>
    require("react").createElement("div", null, children),
}));

// An image past the largest canvas is drawn scaled on an offscreen surface.
const mockDrawImageRectOptions = jest.fn();
const mockMakeOffscreen = jest.fn(() => ({
  getCanvas: () => ({ drawImageRectOptions: mockDrawImageRectOptions }),
  flush: () => {},
  makeImageSnapshot: () => ({
    readPixels: () => new Uint8Array(4),
    dispose: () => {},
  }),
  dispose: () => {},
}));
jest.mock("../../skia/web/JsiSkSurfaceFactory", () => ({
  JsiSkSurfaceFactory: jest.fn(() => ({ MakeOffscreen: mockMakeOffscreen })),
}));

let nextUrl = 0;
const createObjectURL = jest.fn(() => `blob:image-${nextUrl++}`);
const revokeObjectURL = jest.fn();
const putImageData = jest.fn();
// jsdom has no canvas: the browser's encode is held here until a test lets it
// finish, as a browser finishes it later.
let pendingEncodes: (() => void)[] = [];
const encodedSizes: [number, number][] = [];
const toBlob = jest.fn(function (
  this: HTMLCanvasElement,
  callback: (png: Blob | null) => void
) {
  encodedSizes.push([this.width, this.height]);
  pendingEncodes.push(() => callback(new Blob(["png"], { type: "image/png" })));
});

class FakeImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number
  ) {}
}

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ImageData: FakeImageData,
    CanvasKit: {},
  });
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  Object.assign(HTMLCanvasElement.prototype, {
    getContext: () => ({ putImageData }),
    toBlob,
  });
});

beforeEach(() => {
  nextUrl = 0;
  pendingEncodes = [];
  encodedSizes.length = 0;
  for (const mock of [
    createObjectURL,
    revokeObjectURL,
    putImageData,
    toBlob,
    mockMakeOffscreen,
    mockDrawImageRectOptions,
  ]) {
    mock.mockClear();
  }
});

const makeImage = (width = 2, height = 2, readable = true) => {
  const readPixels = jest.fn(() =>
    readable ? new Uint8Array(width * height * 4) : null
  );
  const encodeToBytes = jest.fn(() => Uint8Array.of(137, 80, 78, 71));
  const image = {
    width: () => width,
    height: () => height,
    readPixels,
    encodeToBytes,
  } as unknown as SkImage;
  return { image, readPixels, encodeToBytes };
};

const finishEncodes = async () => {
  await act(async () => {
    const encodes = pendingEncodes;
    pendingEncodes = [];
    encodes.forEach((finish) => finish());
    await flushMicrotasks();
  });
};

const mount = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    render: (next: React.ReactElement) => act(() => root.render(next)),
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

const sources = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("img")).map((img) =>
    img.getAttribute("src")
  );

describe("SkiaImageView on the web", () => {
  it("has the browser encode an image once however many views show it", async () => {
    const { image, readPixels, encodeToBytes } = makeImage();
    const view = mount(
      <>
        <SkiaImageView image={image} />
        <SkiaImageView image={image} />
      </>
    );
    expect(readPixels).toHaveBeenCalledTimes(1);
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(encodedSizes).toEqual([[2, 2]]);
    expect(encodeToBytes).not.toHaveBeenCalled();
    expect(mockMakeOffscreen).not.toHaveBeenCalled();
    // The encode ends after the commit: until then the views show nothing.
    expect(sources(view.container)).toEqual([]);
    await finishEncodes();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(sources(view.container)).toEqual(["blob:image-0", "blob:image-0"]);
    await view.unmount();
  });

  it("encodes an image past the largest canvas's area scaled into it", async () => {
    const { image, readPixels } = makeImage(8192, 4096);
    const view = mount(<SkiaImageView image={image} />);
    expect(readPixels).not.toHaveBeenCalled();
    expect(mockMakeOffscreen.mock.calls).toEqual([[5792, 2896]]);
    expect(mockDrawImageRectOptions.mock.calls).toEqual([
      [
        image,
        { x: 0, y: 0, width: 8192, height: 4096 },
        { x: 0, y: 0, width: 5792, height: 2896 },
        FilterMode.Linear,
        MipmapMode.Linear,
      ],
    ]);
    expect(encodedSizes).toEqual([[5792, 2896]]);
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    await view.unmount();
  });

  it("encodes a strip wider than any canvas at the widest one", async () => {
    const { image } = makeImage(30000000, 1);
    const view = mount(<SkiaImageView image={image} />);
    expect(mockMakeOffscreen.mock.calls).toEqual([[32767, 1]]);
    expect(encodedSizes).toEqual([[32767, 1]]);
    await view.unmount();
    await finishEncodes();
  });

  it("lets the image's URL go with its last view", async () => {
    const { image } = makeImage();
    const view = mount(
      <>
        <SkiaImageView key="first" image={image} />
        <SkiaImageView key="second" image={image} />
      </>
    );
    await finishEncodes();
    const [url] = sources(view.container);
    view.render(<SkiaImageView key="second" image={image} />);
    await flushMicrotasks();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await view.unmount();
    await flushMicrotasks();
    expect(revokeObjectURL.mock.calls).toEqual([[url]]);
  });

  it("revokes the URL of an image let go before its encode ended", async () => {
    const { image } = makeImage();
    const view = mount(<SkiaImageView image={image} />);
    await view.unmount();
    await finishEncodes();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL.mock.calls).toEqual([["blob:image-0"]]);
  });

  // The release waits for the commit's other effects: a view mounted in the
  // same commit as the last one unmounts takes the image over.
  it("keeps the image for a view that takes it over in one commit", async () => {
    const { image } = makeImage();
    const view = mount(<SkiaImageView key="before" image={image} />);
    view.render(<SkiaImageView key="after" image={image} />);
    await finishEncodes();
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    await view.unmount();
  });

  it("encodes once under StrictMode's second effect run", async () => {
    const { image } = makeImage();
    const view = mount(
      <React.StrictMode>
        <SkiaImageView image={image} />
      </React.StrictMode>
    );
    await finishEncodes();
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    await view.unmount();
  });

  it("shows the previous image, its URL kept, until the next one is encoded", async () => {
    const first = makeImage();
    const second = makeImage();
    const view = mount(<SkiaImageView image={first.image} />);
    await finishEncodes();
    view.render(<SkiaImageView image={second.image} />);
    await act(flushMicrotasks);
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-1"]);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:image-0");
    await view.unmount();
  });

  it("shows nothing, and warns once, for an image whose pixels cannot be read", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { image } = makeImage(2, 2, false);
    const view = mount(
      <>
        <SkiaImageView image={image} />
        <SkiaImageView image={image} />
      </>
    );
    await finishEncodes();
    expect(sources(view.container)).toEqual([]);
    expect(toBlob).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    await view.unmount();
  });

  it("shows nothing without an image", async () => {
    const view = mount(<SkiaImageView image={null} />);
    expect(sources(view.container)).toEqual([]);
    expect(createObjectURL).not.toHaveBeenCalled();
    await view.unmount();
  });
});
