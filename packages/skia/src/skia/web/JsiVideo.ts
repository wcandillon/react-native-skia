import type { CanvasKit, Surface } from "canvaskit-wasm";

import type { CanvasKitWebGLBuffer, Video, ImageFactory } from "../types";

import { CanvasKitWebGLBufferImpl } from "./CanvasKitWebGLBufferImpl";
import { JsiSkImageFactory } from "./JsiSkImageFactory";
import { throwNotImplementedOnRNWeb } from "./Host";

export const createVideo = async (
  CanvasKit: CanvasKit,
  url: string
): Promise<Video> => {
  const video = document.createElement("video");
  return new Promise((resolve, reject) => {
    video.src = url;
    video.style.display = "none";
    video.crossOrigin = "anonymous";
    video.volume = 0;
    video.addEventListener("loadedmetadata", () => {
      document.body.appendChild(video);
      resolve(new JsiVideo(new JsiSkImageFactory(CanvasKit), video));
    });
    video.addEventListener("error", () => {
      reject(new Error(`Failed to load video from URL: ${url}`));
    });
  });
};

export class JsiVideo implements Video {
  __typename__ = "Video" as const;

  private webglBuffer: CanvasKitWebGLBuffer | null = null;

  constructor(
    private ImageFactory: ImageFactory,
    private videoElement: HTMLVideoElement
  ) {
    document.body.appendChild(this.videoElement);
  }

  duration() {
    return this.videoElement.duration * 1000;
  }

  framerate(): number {
    return throwNotImplementedOnRNWeb<number>();
  }

  setSurface(surface: Surface) {
    // If we have the surface, we can use the WebGL buffer which is slightly faster
    // This is because WebGL cannot be shared across contextes.
    // This can be removed with WebGPU
    this.webglBuffer = new CanvasKitWebGLBufferImpl(surface, this.videoElement);
  }

  nextImage() {
    return this.ImageFactory.MakeImageFromNativeBuffer(
      this.webglBuffer ? this.webglBuffer : this.videoElement
    );
  }

  seek(time: number) {
    if (isNaN(time)) {
      throw new Error(`Invalid time: ${time}`);
    }
    this.videoElement.currentTime = time / 1000;
  }

  rotation() {
    return 0 as const;
  }

  size() {
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  pause() {
    this.videoElement.pause();
  }

  play() {
    this.videoElement.play();
  }

  setVolume(volume: number) {
    this.videoElement.volume = volume;
  }

  dispose() {
    if (this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
  }
}
