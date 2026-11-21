/**
 * @jest-environment jsdom
 */
import React, { act, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import type { SkImage } from "../../skia/types";
import { FilterMode, MipmapMode } from "../../skia/types";
import { SkiaImageView } from "../SkiaImageView.web";

import { flushMicrotasks } from "./web-setup";

// react-native-web renders a View as a <div>, its testID as data-testid and
// its style flattened; jest cannot parse react-native.
jest.mock("react-native", () => {
  const flatten = (style: unknown): object => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.map(flatten));
    }
    return typeof style === "object" && style !== null ? style : {};
  };
  return {
    View: ({
      children,
      testID,
      style,
    }: {
      readonly children?: ReactNode;
      readonly testID?: string;
      readonly style?: unknown;
    }) =>
      require("react").createElement(
        "div",
        { "data-testid": testID, "style": flatten(style) },
        children
      ),
  };
});

// An image past the largest canvas is drawn scaled on a surface of the size
// it is encoded at.
interface MockSurface {
  readonly getCanvas: () => {
    readonly drawImageRectOptions: (...args: readonly unknown[]) => void;
  };
  readonly flush: () => void;
  readonly makeImageSnapshot: () => {
    readonly readPixels: () => Promise<Uint8Array<ArrayBuffer>>;
    readonly dispose: () => void;
  };
  readonly dispose: () => void;
}
const mockDrawImageRectOptions = jest.fn();
const mockSurface = (overrides: Partial<MockSurface> = {}): MockSurface => ({
  getCanvas: () => ({ drawImageRectOptions: mockDrawImageRectOptions }),
  flush: () => {},
  makeImageSnapshot: () => ({
    readPixels: () => Promise.resolve(new Uint8Array(4)),
    dispose: () => {},
  }),
  dispose: () => {},
  ...overrides,
});
type SurfaceSize = [width: number, height: number];
const mockMakeOffscreen = jest.fn<MockSurface | null, SurfaceSize>();
const mockMakeRaster = jest.fn<MockSurface | null, SurfaceSize>();
jest.mock("../../skia/web/JsiSkSurfaceFactory", () => ({
  JsiSkSurfaceFactory: jest.fn(() => ({
    MakeOffscreen: mockMakeOffscreen,
    MakeRaster: mockMakeRaster,
  })),
}));
// The page's shared WebGL context, which throws where the page has no WebGL.
const mockGetSharedWebGLContext = jest.fn<null, []>();
jest.mock("../../skia/web/SharedWebGLContext", () => ({
  getSharedWebGLContext: () => mockGetSharedWebGLContext(),
}));

let nextUrl = 0;
const createObjectURL = jest.fn<string, []>();
const revokeObjectURL = jest.fn();
const putImageData = jest.fn();
// jsdom has no canvas: the browser's encode is held here until a test lets it
// finish, as a browser finishes it later.
let pendingEncodes: (() => void)[] = [];
const encodedSizes: (readonly [number, number])[] = [];
function holdEncode(
  this: HTMLCanvasElement,
  callback: (png: Blob | null) => void
) {
  encodedSizes.push([this.width, this.height]);
  pendingEncodes.push(() => callback(new Blob(["png"], { type: "image/png" })));
}
const toBlob = jest.fn<void, Parameters<typeof holdEncode>>();

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

// Every case starts from these: what one queues for itself ends with it.
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
    mockMakeRaster,
    mockDrawImageRectOptions,
    mockGetSharedWebGLContext,
  ]) {
    mock.mockReset();
  }
  mockGetSharedWebGLContext.mockImplementation(() => null);
  createObjectURL.mockImplementation(() => `blob:image-${nextUrl++}`);
  toBlob.mockImplementation(holdEncode);
  mockMakeOffscreen.mockImplementation(() => mockSurface());
  mockMakeRaster.mockImplementation(() => mockSurface());
});

// A spy a case makes is gone after it, however the case ends.
afterEach(() => {
  jest.restoreAllMocks();
});

// Runs after each commit, before the commit's passive effects.
const CommitProbe = ({ onCommit }: { readonly onCommit: () => void }) => {
  useLayoutEffect(onCommit);
  return null;
};

const makeImage = (width = 2, height = 2, readable = true) => {
  const readPixels = jest.fn(() =>
    Promise.resolve(readable ? new Uint8Array(width * height * 4) : null)
  );
  const encodeToBytes = jest.fn(() =>
    Promise.resolve(Uint8Array.of(137, 80, 78, 71))
  );
  const rasterDispose = jest.fn();
  const raster = {
    width: () => width,
    height: () => height,
    dispose: rasterDispose,
  } as unknown as SkImage;
  const makeRasterImage = jest.fn(() => Promise.resolve(raster));
  const image = {
    width: () => width,
    height: () => height,
    readPixels,
    encodeToBytes,
    makeRasterImage,
  } as unknown as SkImage;
  return {
    image,
    readPixels,
    encodeToBytes,
    makeRasterImage,
    raster,
    rasterDispose,
  };
};

const UNREADABLE = new Error(
  "SkiaImageView: could not read the image's pixels"
);

// The browser's encode starts once the image's pixels are read back.
const startEncodes = flushMicrotasks;

const finishEncodes = async () => {
  await startEncodes();
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
    // As a click's update renders, ahead of any update of a lower priority.
    renderDiscretely: (next: React.ReactElement) =>
      flushSync(() => root.render(next)),
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

// React schedules work as a browser page has it, outside act: an update made
// outside a React event renders at the default priority, in a task of its own.
const outsideAct = async (body: () => Promise<void>) => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  try {
    await body();
  } finally {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  }
};

const drainMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn++) {
    await Promise.resolve();
  }
};

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 10));

const imageElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("img"));

const sources = (container: HTMLElement) =>
  imageElements(container).map((element) => element.getAttribute("src"));

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
    await startEncodes();
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(encodedSizes).toEqual([[2, 2]]);
    expect(encodeToBytes).not.toHaveBeenCalled();
    expect(mockMakeOffscreen).not.toHaveBeenCalled();
    expect(mockMakeRaster).not.toHaveBeenCalled();
    // The encode ends after the commit: until then the views show nothing.
    expect(sources(view.container)).toEqual([]);
    await finishEncodes();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(sources(view.container)).toEqual(["blob:image-0", "blob:image-0"]);
    await view.unmount();
  });

  it("encodes an image past the largest canvas's area scaled into it on the GPU", async () => {
    const { image, readPixels, makeRasterImage } = makeImage(8192, 4096);
    const view = mount(<SkiaImageView image={image} />);
    await startEncodes();
    expect(readPixels).not.toHaveBeenCalled();
    expect(makeRasterImage).not.toHaveBeenCalled();
    expect(mockMakeRaster).not.toHaveBeenCalled();
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

  // A GPU refuses a render target past its largest texture, 16384 on most
  // desktops and less on some phones, where a 2D canvas takes 32767.
  const largestRenderTarget = 16384;
  it.each([
    [
      "the GPU makes no render target of its encoded size",
      [[18317, 915]],
      () =>
        mockMakeOffscreen.mockImplementation((width, height) =>
          width > largestRenderTarget || height > largestRenderTarget
            ? null
            : mockSurface()
        ),
    ],
    [
      "the page has no WebGL, whose shared context throws",
      [],
      () =>
        mockGetSharedWebGLContext.mockImplementation(() => {
          throw new Error("Could not create a WebGL context");
        }),
    ],
  ])(
    "scales an image on the CPU where %s",
    async (_where, offscreenCalls, arrange) => {
      arrange();
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { image, raster, makeRasterImage } = makeImage(20000, 1000);
      const view = mount(<SkiaImageView image={image} />);
      await finishEncodes();
      expect(mockMakeOffscreen.mock.calls).toEqual(offscreenCalls);
      expect(makeRasterImage).toHaveBeenCalledTimes(1);
      expect(mockMakeRaster.mock.calls).toEqual([[18317, 915]]);
      expect(mockDrawImageRectOptions.mock.calls).toEqual([
        [
          raster,
          { x: 0, y: 0, width: 20000, height: 1000 },
          { x: 0, y: 0, width: 18317, height: 915 },
          FilterMode.Linear,
          MipmapMode.Linear,
        ],
      ]);
      expect(sources(view.container)).toEqual(["blob:image-0"]);
      expect(warn).not.toHaveBeenCalled();
      await view.unmount();
    }
  );

  it("reports a throw of the GPU path other than the shared context's, scaling nothing on the CPU", async () => {
    mockMakeOffscreen.mockImplementation(() => {
      throw new Error("the render target could not be made");
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { image, makeRasterImage } = makeImage(20000, 1000);
    const view = mount(<SkiaImageView image={image} />);
    await finishEncodes();
    expect(makeRasterImage).not.toHaveBeenCalled();
    expect(mockMakeRaster).not.toHaveBeenCalled();
    expect(sources(view.container)).toEqual([]);
    expect(warn.mock.calls).toEqual([
      [new Error("the render target could not be made")],
    ]);
    await view.unmount();
  });

  it.each([
    ["the GPU", false],
    ["the CPU", true],
  ])(
    "keeps the surface and copies it scales an image with on %s until the scaled pixels are read",
    async (_path, noRenderTarget) => {
      let finishRead: (pixels: Uint8Array<ArrayBuffer>) => void = () => {};
      const scaledDispose = jest.fn();
      const surfaceDispose = jest.fn();
      const surface = mockSurface({
        makeImageSnapshot: () => ({
          readPixels: () =>
            new Promise<Uint8Array<ArrayBuffer>>((resolve) => {
              finishRead = resolve;
            }),
          dispose: scaledDispose,
        }),
        dispose: surfaceDispose,
      });
      if (noRenderTarget) {
        mockMakeOffscreen.mockImplementation(() => null);
        mockMakeRaster.mockImplementation(() => surface);
      } else {
        mockMakeOffscreen.mockImplementation(() => surface);
      }
      const { image, rasterDispose } = makeImage(8192, 4096);
      const view = mount(<SkiaImageView image={image} />);
      await startEncodes();
      expect(scaledDispose).not.toHaveBeenCalled();
      expect(surfaceDispose).not.toHaveBeenCalled();
      expect(rasterDispose).not.toHaveBeenCalled();
      finishRead(new Uint8Array(4));
      await startEncodes();
      expect(scaledDispose).toHaveBeenCalledTimes(1);
      expect(surfaceDispose).toHaveBeenCalledTimes(1);
      expect(rasterDispose).toHaveBeenCalledTimes(noRenderTarget ? 1 : 0);
      await view.unmount();
      await finishEncodes();
    }
  );

  it("encodes a strip wider than any canvas at the widest one", async () => {
    const { image } = makeImage(30000000, 1);
    const view = mount(<SkiaImageView image={image} />);
    await startEncodes();
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

  it("never shows a URL revoked before the render it was handed to, when a discrete update changes the image first", async () => {
    const shown = makeImage();
    const told = makeImage();
    const next = makeImage();
    const view = mount(<SkiaImageView image={shown.image} />);
    await finishEncodes();
    view.render(<SkiaImageView image={told.image} />);
    await startEncodes();
    await outsideAct(async () => {
      pendingEncodes.splice(0).forEach((finish) => finish());
      await drainMicrotasks();
      expect(createObjectURL).toHaveBeenCalledTimes(2);
      view.renderDiscretely(<SkiaImageView image={next.image} />);
      await drainMicrotasks();
      await nextTask();
    });
    const revoked = revokeObjectURL.mock.calls.map(([url]) => url);
    expect(
      sources(view.container).filter((url) => revoked.includes(url))
    ).toEqual([]);
    await finishEncodes();
    expect(sources(view.container)).toEqual([
      createObjectURL.mock.results.at(-1)?.value,
    ]);
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
    expect(warn.mock.calls).toEqual([[UNREADABLE]]);
    await view.unmount();
  });

  it("shows nothing without an image", async () => {
    const view = mount(<SkiaImageView image={null} />);
    expect(sources(view.container)).toEqual([]);
    expect(createObjectURL).not.toHaveBeenCalled();
    await view.unmount();
  });

  it.each([
    ["the GPU", false],
    ["the CPU", true],
  ])(
    "lets go of the surface it scales an image on with %s when drawing throws",
    async (_path, noRenderTarget) => {
      const surfaceDispose = jest.fn();
      const throwingSurface = () =>
        mockSurface({
          getCanvas: () => ({
            drawImageRectOptions: () => {
              throw new Error("the image was disposed");
            },
          }),
          dispose: surfaceDispose,
        });
      if (noRenderTarget) {
        mockMakeOffscreen.mockImplementation(() => null);
        mockMakeRaster.mockImplementation(throwingSurface);
      } else {
        mockMakeOffscreen.mockImplementation(throwingSurface);
      }
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { image, rasterDispose } = makeImage(8192, 4096);
      const view = mount(<SkiaImageView image={image} />);
      await finishEncodes();
      expect(surfaceDispose).toHaveBeenCalledTimes(1);
      expect(rasterDispose).toHaveBeenCalledTimes(noRenderTarget ? 1 : 0);
      expect(mockMakeRaster).toHaveBeenCalledTimes(noRenderTarget ? 1 : 0);
      expect(sources(view.container)).toEqual([]);
      expect(warn.mock.calls).toEqual([[new Error("the image was disposed")]]);
      await view.unmount();
    }
  );

  // As React Native's Image clears its image when a new source fails.
  it("clears the view when its next image cannot be read", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const first = makeImage();
    const second = makeImage(2, 2, false);
    const view = mount(<SkiaImageView image={first.image} />);
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    view.render(<SkiaImageView image={second.image} />);
    await finishEncodes();
    expect(sources(view.container)).toEqual([]);
    expect(revokeObjectURL.mock.calls).toEqual([["blob:image-0"]]);
    expect(warn.mock.calls).toEqual([[UNREADABLE]]);
    await view.unmount();
  });

  // As native's views of an image no bitmap could be made for show it once a
  // later retain reads it back.
  it("shows an image whose encode failed once a later view's encode of it succeeds", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { image, readPixels } = makeImage();
    readPixels.mockImplementationOnce(() => Promise.resolve(null));
    const view = mount(<SkiaImageView key="first" image={image} />);
    await finishEncodes();
    expect(sources(view.container)).toEqual([]);
    view.render(
      <>
        <SkiaImageView key="first" image={image} />
        <SkiaImageView key="second" image={image} />
      </>
    );
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-0", "blob:image-0"]);
    expect(warn.mock.calls).toEqual([[UNREADABLE]]);
    await view.unmount();
  });

  // As native's views do, whichever of a view's retain and its mount comes
  // first.
  it("shows nothing in a view whose next image failed to encode, until a retry of it succeeds", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const shown = makeImage();
    const failing = makeImage();
    failing.readPixels.mockImplementationOnce(() => Promise.resolve(null));
    const view = mount(
      <>
        <SkiaImageView key="first" image={failing.image} />
        <SkiaImageView key="second" image={shown.image} />
      </>
    );
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-0"]);
    view.render(
      <>
        <SkiaImageView key="first" image={failing.image} />
        <SkiaImageView key="second" image={failing.image} />
      </>
    );
    await act(flushMicrotasks);
    expect(sources(view.container)).toEqual([]);
    await finishEncodes();
    expect(sources(view.container)).toEqual(["blob:image-1", "blob:image-1"]);
    expect(warn.mock.calls).toEqual([[UNREADABLE]]);
    await view.unmount();
  });

  // As React Native's Image puts `overflow: "hidden"` under the caller's style.
  it("clips its image to its rounded corners unless its style says otherwise", () => {
    const { image } = makeImage();
    const view = mount(
      <>
        <SkiaImageView
          testID="rounded"
          image={image}
          style={{ borderRadius: 8 }}
        />
        <SkiaImageView
          testID="overflowing"
          image={image}
          style={{ borderRadius: 8, overflow: "visible" }}
        />
      </>
    );
    const styleOf = (testID: string) => {
      const element = view.container.querySelector<HTMLElement>(
        `[data-testid="${testID}"]`
      );
      if (element === null) {
        throw new Error(`no view ${testID}`);
      }
      return element.style;
    };
    expect(styleOf("rounded").overflow).toBe("hidden");
    expect(styleOf("rounded").borderRadius).toBe("8px");
    expect(styleOf("overflowing").overflow).toBe("visible");
    return view.unmount();
  });

  it("shows nothing in the commit that takes its image away", async () => {
    const { image } = makeImage();
    const commits: (string | null)[][] = [];
    let probed: HTMLElement | undefined;
    const record = () => {
      if (probed !== undefined) {
        commits.push(sources(probed));
      }
    };
    const view = mount(
      <>
        <SkiaImageView image={image} />
        <CommitProbe onCommit={record} />
      </>
    );
    await finishEncodes();
    probed = view.container;
    view.render(
      <>
        <SkiaImageView image={null} />
        <CommitProbe onCommit={record} />
      </>
    );
    expect(commits[0]).toEqual([]);
    await view.unmount();
  });

  // A dragged <img> makes the browser cancel the gesture an ancestor runs, as
  // react-native-web's own Image keeps from happening.
  it("never starts a drag of its image", async () => {
    const { image } = makeImage();
    const view = mount(<SkiaImageView image={image} />);
    await finishEncodes();
    const [imageElement] = imageElements(view.container);
    expect(imageElement.getAttribute("draggable")).toBe("false");
    await view.unmount();
  });

  it("hands its View every View prop", async () => {
    const { image } = makeImage();
    const view = mount(
      <SkiaImageView
        image={image}
        testID="cell"
        style={{ width: 40, height: 40 }}
      />
    );
    const cell = view.container.querySelector<HTMLElement>(
      '[data-testid="cell"]'
    );
    expect(cell?.style.width).toBe("40px");
    expect(cell?.style.height).toBe("40px");
    await view.unmount();
    await finishEncodes();
  });
});
