import type { SkPicture } from "../../skia/types";
import type * as Offscreen from "../Offscreen";

const mockFlush = jest.fn();
const mockMakeImageSnapshot = jest.fn();

jest.mock("../../skia", () => ({
  Skia: {
    Surface: {
      MakeOffscreen: () => ({
        getCanvas: () => ({ drawPicture: jest.fn() }),
        flush: mockFlush,
        makeImageSnapshot: mockMakeImageSnapshot,
      }),
    },
  },
}));
jest.mock("../../sksg/Reconciler", () => ({ SkiaSGRoot: jest.fn() }));
jest.mock("../../Platform", () => ({ Platform: { OS: "ios" } }));

const { drawAsImageFromPicture } = require("../Offscreen") as typeof Offscreen;

const picture = {} as SkPicture;
const size = { width: 16, height: 16 };

describe("drawAsImageFromPicture", () => {
  beforeEach(() => {
    mockFlush.mockReset();
    mockMakeImageSnapshot.mockReset();
  });

  it("resolves to the CPU image of the snapshot", async () => {
    const raster = {};
    mockMakeImageSnapshot.mockReturnValue({
      makeRasterImage: () => Promise.resolve(raster),
    });
    await expect(drawAsImageFromPicture(picture, size)).resolves.toBe(raster);
  });

  it.each([
    ["flush()", mockFlush],
    ["makeImageSnapshot()", mockMakeImageSnapshot],
  ])("rejects rather than throws when %s throws", async (_, method) => {
    const error = new Error("Graphite could not submit the recording");
    method.mockImplementationOnce(() => {
      throw error;
    });
    // A synchronous throw would fail the test on this line.
    const promise = drawAsImageFromPicture(picture, size);
    await expect(promise).rejects.toBe(error);
  });
});
