import type { SkImage } from "../../skia/types";
import type { ImageUrlObserver } from "../imageObjectUrls";
import { createImageObjectUrls } from "../imageObjectUrls";

interface Encode {
  readonly resolve: (png: Blob) => void;
  readonly reject: (error: Error) => void;
}

// A registry whose encodes settle only when a test settles them, with every
// URL it makes and revokes written down in order, and `onReport` called as it
// reports a failure.
const makeRegistry = (onReport: () => void = () => {}) => {
  const encodes: Encode[] = [];
  const calls: string[] = [];
  const failures: unknown[] = [];
  let nextUrl = 0;
  const urls = createImageObjectUrls(
    () =>
      new Promise<Blob>((resolve, reject) => encodes.push({ resolve, reject })),
    {
      createObjectURL: () => {
        const url = `blob:${nextUrl++}`;
        calls.push(`create ${url}`);
        return url;
      },
      revokeObjectURL: (url: string) => calls.push(`revoke ${url}`),
    },
    (error) => {
      failures.push(error);
      onReport();
    }
  );
  return { urls, encodes, calls, failures };
};

// An observer writing down what it is told, in order.
const makeObserver = () => {
  const told: string[] = [];
  const observer: ImageUrlObserver = {
    published: (url) => told.push(`published ${url}`),
    failed: () => told.push("failed"),
  };
  return { observer, told };
};

const makeImage = () => ({}) as SkImage;

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const png = new Blob(["png"], { type: "image/png" });

describe("createImageObjectUrls", () => {
  it("encodes an image once however many retain it, and revokes its URL with the last release", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const image = makeImage();
    const { observer, told } = makeObserver();
    urls.retain(image);
    urls.retain(image);
    urls.retain(image);
    urls.observe(image, observer);
    expect(encodes).toHaveLength(1);
    encodes[0].resolve(png);
    await settle();
    expect(told).toEqual(["published blob:0"]);
    urls.release(image);
    urls.release(image);
    expect(calls).toEqual(["create blob:0"]);
    urls.release(image);
    expect(calls).toEqual(["create blob:0", "revoke blob:0"]);
  });

  it("tells a view that starts to observe what became of the image at once", async () => {
    const { urls, encodes } = makeRegistry();
    const image = makeImage();
    urls.retain(image);
    const early = makeObserver();
    urls.observe(image, early.observer);
    expect(early.told).toEqual([]);
    encodes[0].resolve(png);
    await settle();
    const late = makeObserver();
    urls.observe(image, late.observer);
    expect(late.told).toEqual(["published blob:0"]);
  });

  it("changes nothing for a release with no retain, however often", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const image = makeImage();
    urls.release(image);
    urls.release(image);
    urls.retain(image);
    encodes[0].resolve(png);
    await settle();
    urls.release(image);
    urls.release(image);
    expect(calls).toEqual(["create blob:0", "revoke blob:0"]);
  });

  it("revokes the URL of an image released before its encode ended, telling nobody", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const image = makeImage();
    const { observer, told } = makeObserver();
    urls.retain(image);
    urls.observe(image, observer);
    urls.release(image);
    expect(calls).toEqual([]);
    encodes[0].resolve(png);
    await settle();
    expect(calls).toEqual(["create blob:0", "revoke blob:0"]);
    expect(told).toEqual([]);
  });

  it("tells every observer of an image whose encode failed, reports it once and revokes nothing", async () => {
    const { urls, encodes, calls, failures } = makeRegistry();
    const image = makeImage();
    const first = makeObserver();
    const second = makeObserver();
    urls.retain(image);
    urls.retain(image);
    urls.observe(image, first.observer);
    urls.observe(image, second.observer);
    const error = new Error("no pixels");
    encodes[0].reject(error);
    await settle();
    expect(first.told).toEqual(["failed"]);
    expect(second.told).toEqual(["failed"]);
    urls.release(image);
    urls.release(image);
    expect(failures).toEqual([error]);
    expect(calls).toEqual([]);
  });

  it("encodes an image again at the retain after its encode failed, and tells its earlier observers", async () => {
    const { urls, encodes } = makeRegistry();
    const image = makeImage();
    const { observer, told } = makeObserver();
    urls.retain(image);
    urls.observe(image, observer);
    encodes[0].reject(new Error("no pixels"));
    await settle();
    urls.retain(image);
    expect(encodes).toHaveLength(2);
    encodes[1].resolve(png);
    await settle();
    expect(told).toEqual(["failed", "published blob:0"]);
  });

  // As native's stores keep a failure through the drawing the next retain
  // starts: a view mounts and retains in either order there.
  it("tells a view that starts to observe while a failed encode is retried that it failed, then what the retry makes", async () => {
    const { urls, encodes } = makeRegistry();
    const image = makeImage();
    urls.retain(image);
    encodes[0].reject(new Error("no pixels"));
    await settle();
    urls.retain(image);
    const { observer, told } = makeObserver();
    urls.observe(image, observer);
    expect(told).toEqual(["failed"]);
    encodes[1].resolve(png);
    await settle();
    expect(told).toEqual(["failed", "published blob:0"]);
  });

  it("tells the views of an image whose encode failed before it reports the failure", async () => {
    const { observer, told } = makeObserver();
    const toldWhenReported: string[] = [];
    const { urls, encodes } = makeRegistry(() =>
      toldWhenReported.push(...told)
    );
    const image = makeImage();
    urls.retain(image);
    urls.observe(image, observer);
    encodes[0].reject(new Error("no pixels"));
    await settle();
    expect(toldWhenReported).toEqual(["failed"]);
  });

  it("encodes an image again once its last retain went", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const image = makeImage();
    urls.retain(image);
    encodes[0].resolve(png);
    await settle();
    urls.release(image);
    urls.retain(image);
    expect(encodes).toHaveLength(2);
    encodes[1].resolve(png);
    await settle();
    const { observer, told } = makeObserver();
    urls.observe(image, observer);
    expect(told).toEqual(["published blob:1"]);
    expect(calls).toEqual(["create blob:0", "revoke blob:0", "create blob:1"]);
  });

  it("revokes the URL of an encode a later one replaced, telling nobody", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const image = makeImage();
    const { observer, told } = makeObserver();
    urls.retain(image);
    urls.release(image);
    urls.retain(image);
    urls.observe(image, observer);
    encodes[0].resolve(png);
    await settle();
    expect(told).toEqual([]);
    encodes[1].resolve(png);
    await settle();
    expect(told).toEqual(["published blob:1"]);
    expect(calls).toEqual(["create blob:0", "revoke blob:0", "create blob:1"]);
  });

  it("keeps each image's retains and observers apart", async () => {
    const { urls, encodes, calls } = makeRegistry();
    const first = makeImage();
    const second = makeImage();
    const firstObserver = makeObserver();
    const secondObserver = makeObserver();
    urls.retain(first);
    urls.retain(second);
    urls.observe(first, firstObserver.observer);
    urls.observe(second, secondObserver.observer);
    encodes[0].resolve(png);
    encodes[1].reject(new Error("no pixels"));
    await settle();
    expect(firstObserver.told).toEqual(["published blob:0"]);
    expect(secondObserver.told).toEqual(["failed"]);
    urls.release(first);
    expect(calls).toEqual(["create blob:0", "revoke blob:0"]);
  });

  it("tells an observer that stopped observing nothing more, and one observing twice once", async () => {
    const { urls, encodes } = makeRegistry();
    const image = makeImage();
    const leaving = makeObserver();
    const twice = makeObserver();
    urls.retain(image);
    urls.observe(image, leaving.observer);
    urls.unobserve(image, leaving.observer);
    urls.unobserve(image, leaving.observer);
    urls.observe(image, twice.observer);
    urls.observe(image, twice.observer);
    encodes[0].resolve(png);
    await settle();
    expect(leaving.told).toEqual([]);
    expect(twice.told).toEqual(["published blob:0"]);
  });

  it("tells each observer of a settled encode once, though they stop observing as they are told", async () => {
    const { urls, encodes } = makeRegistry();
    const image = makeImage();
    const told: string[] = [];
    const leaveAll = () => {
      urls.unobserve(image, first);
      urls.unobserve(image, second);
    };
    const first: ImageUrlObserver = {
      published: (url) => {
        told.push(`first ${url}`);
        leaveAll();
      },
      failed: () => told.push("first failed"),
    };
    const second: ImageUrlObserver = {
      published: (url) => {
        told.push(`second ${url}`);
        leaveAll();
      },
      failed: () => told.push("second failed"),
    };
    urls.retain(image);
    urls.observe(image, first);
    urls.observe(image, second);
    encodes[0].resolve(png);
    await settle();
    expect(told).toEqual(["first blob:0", "second blob:0"]);
    urls.release(image);
    urls.retain(image);
    encodes[1].resolve(png);
    await settle();
    expect(told).toEqual(["first blob:0", "second blob:0"]);
  });

  it("answers one sequence of retains, observers and releases the same way every time", async () => {
    const run = async () => {
      const { urls, encodes, calls } = makeRegistry();
      const image = makeImage();
      const { observer, told } = makeObserver();
      urls.retain(image);
      urls.observe(image, observer);
      urls.retain(image);
      urls.release(image);
      encodes[0].resolve(png);
      await settle();
      urls.release(image);
      return { calls, told };
    };
    expect(await run()).toEqual(await run());
  });
});
