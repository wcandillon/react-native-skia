import type { CanvasKit } from "canvaskit-wasm";

import type { SkData } from "../types";
import type { DataFactory } from "../types/Data/DataFactory";
import { SkiaError, SkiaValidationError } from "../types/Errors";

import { Host } from "./Host";
import { JsiSkData } from "./JsiSkData";

export class JsiSkDataFactory extends Host implements DataFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  fromURI(uri: string) {
    // A network failure rejects with fetch()'s TypeError; a response that is
    // not one, with a NotFoundError (404, 410) or a TypeError.
    return fetch(uri)
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            throw new SkiaError(
              `fromURI: no resource at ${uri}`,
              "NotFoundError"
            );
          }
          throw new TypeError(
            `fromURI: could not load ${uri} (HTTP ${response.status})`
          );
        }
        return response.arrayBuffer();
      })
      .then((data) => new JsiSkData(this.CanvasKit, data));
  }
  /**
   * Creates a new Data object from a byte array.
   * @param bytes An array of bytes representing the data
   */
  fromBytes(bytes: Uint8Array) {
    return new JsiSkData(this.CanvasKit, bytes as unknown as ArrayBuffer);
  }
  /**
   * Creates a new Data object from a base64 encoded string.
   * @param base64 A Base64 encoded string representing the data
   */
  fromBase64(base64: string): SkData {
    let decoded: string;
    try {
      decoded = atob(base64);
    } catch {
      throw new SkiaValidationError("fromBase64: invalid base64 string");
    }
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return this.fromBytes(bytes);
  }
}
