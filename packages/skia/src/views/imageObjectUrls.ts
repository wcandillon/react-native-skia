import { exhaustiveCheck } from "../renderer/typeddash";
import type { SkImage } from "../skia/types";

/** A view showing an image, told what becomes of the image's URL. */
export interface ImageUrlObserver {
  readonly published: (url: string) => void;
  readonly failed: () => void;
}

/**
 * The object URL each image is shown by in an `<img>`, one per image however
 * many views show it, as native keeps one bitmap (see RNSkPresentedImages):
 * encoded at the image's first retain, and again at the first retain after
 * its encode failed, the failure holding until that encode settles, and
 * revoked with its last release.
 */
export interface ImageObjectUrls {
  readonly retain: (image: SkImage) => void;
  /** Gives back a retain. The last one revokes the URL once its encode has settled. */
  readonly release: (image: SkImage) => void;
  /**
   * Tells `observer` at once whether the image's URL is published or failed,
   * nothing during its first encode, and from then on what becomes of it.
   */
  readonly observe: (image: SkImage, observer: ImageUrlObserver) => void;
  readonly unobserve: (image: SkImage, observer: ImageUrlObserver) => void;
}

export type ObjectUrlRegistry = Pick<
  typeof URL,
  "createObjectURL" | "revokeObjectURL"
>;

type Encode =
  | { readonly state: "encoding" }
  | { readonly state: "retrying" }
  | { readonly state: "published"; readonly url: string }
  | { readonly state: "failed" };

type Running = Extract<Encode, { readonly state: "encoding" | "retrying" }>;
type Settled = Extract<Encode, { readonly state: "published" | "failed" }>;

interface Retained {
  readonly retains: number;
  readonly encode: Encode;
}

const FAILED: Settled = { state: "failed" };

const tell = (observer: ImageUrlObserver, encode: Encode) => {
  switch (encode.state) {
    case "encoding":
      return;
    case "published":
      observer.published(encode.url);
      return;
    case "retrying":
    case "failed":
      observer.failed();
      return;
    default:
      exhaustiveCheck(encode);
  }
};

export const createImageObjectUrls = (
  encode: (image: SkImage) => Promise<Blob>,
  objectUrls: ObjectUrlRegistry,
  reportFailure: (error: unknown) => void
): ImageObjectUrls => {
  const retained = new Map<SkImage, Retained>();
  const observers = new Map<SkImage, Set<ImageUrlObserver>>();
  // An encode settled after its image was released, or encoded again, is for
  // nothing: its URL is revoked.
  const settle = (image: SkImage, running: Running, settled: Settled) => {
    const current = retained.get(image);
    if (current === undefined || current.encode !== running) {
      if (settled.state === "published") {
        objectUrls.revokeObjectURL(settled.url);
      }
      return;
    }
    retained.set(image, { retains: current.retains, encode: settled });
    // A copy: an observer may stop observing while it is told.
    for (const observer of [...(observers.get(image) ?? [])]) {
      tell(observer, settled);
    }
  };
  const startEncode = (image: SkImage, state: Running["state"]): Running => {
    const running: Running = { state };
    encode(image)
      .then((png) => objectUrls.createObjectURL(png))
      .then(
        (url) => settle(image, running, { state: "published", url }),
        (error: unknown) => {
          settle(image, running, FAILED);
          reportFailure(error);
        }
      );
    return running;
  };
  const encodeAtRetain = (image: SkImage, current: Retained | undefined) => {
    if (current === undefined) {
      return startEncode(image, "encoding");
    }
    return current.encode.state === "failed"
      ? startEncode(image, "retrying")
      : current.encode;
  };
  return {
    retain: (image) => {
      const current = retained.get(image);
      retained.set(image, {
        retains: (current?.retains ?? 0) + 1,
        encode: encodeAtRetain(image, current),
      });
    },
    release: (image) => {
      const current = retained.get(image);
      if (current === undefined) {
        return;
      }
      if (current.retains > 1) {
        retained.set(image, { ...current, retains: current.retains - 1 });
        return;
      }
      retained.delete(image);
      if (current.encode.state === "published") {
        objectUrls.revokeObjectURL(current.encode.url);
      }
    },
    observe: (image, observer) => {
      const imageObservers =
        observers.get(image) ?? new Set<ImageUrlObserver>();
      imageObservers.add(observer);
      observers.set(image, imageObservers);
      const current = retained.get(image);
      if (current !== undefined) {
        tell(observer, current.encode);
      }
    },
    unobserve: (image, observer) => {
      const imageObservers = observers.get(image);
      if (imageObservers === undefined) {
        return;
      }
      imageObservers.delete(observer);
      if (imageObservers.size === 0) {
        observers.delete(image);
      }
    },
  };
};
