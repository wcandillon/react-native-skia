/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { Image } from "react-native";
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader";
import { RGBELoader } from "three/addons/loaders/RGBELoader";
import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";

export interface GLTF {
  animations: THREE.AnimationClip[];
  scene: THREE.Group;
  scenes: THREE.Group[];
  cameras: THREE.Camera[];
  asset: {
    copyright?: string | undefined;
    generator?: string | undefined;
    version?: string | undefined;
    minVersion?: string | undefined;
    extensions?: any;
    extras?: any;
  };
  parser: any;
  userData: Record<string, any>;
}

export const resolveAsset = (mod: ReturnType<typeof require>) => {
  return Image.resolveAssetSource(mod).uri;
};

// three's TextureLoader/ImageBitmapLoader need DOM image APIs that Skia doesn't
// provide. Decode JPG/PNG bytes through Skia and hand three.js a DataTexture
// instead so it uploads via device.queue.writeTexture.
class SkiaTextureLoader extends THREE.Loader<THREE.DataTexture> {
  load(
    url: string,
    onLoad: (texture: THREE.DataTexture) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void
  ) {
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`SkiaTextureLoader: HTTP ${res.status} for ${url}`);
        }
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const data = Skia.Data.fromBytes(new Uint8Array(buffer));
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) {
          throw new Error(`SkiaTextureLoader: failed to decode ${url}`);
        }
        const width = image.width();
        const height = image.height();
        // SkImage.readPixels throws "Not implemented yet" under SK_GRAPHITE,
        // so draw into a CPU-backed surface and read pixels off its canvas.
        // (Surface.MakeOffscreen is GPU-backed and the sync readback returns
        // null under Graphite.)
        const surface = Skia.Surface.Make(width, height);
        if (!surface) {
          throw new Error(
            `SkiaTextureLoader: Surface.Make failed for ${url}`
          );
        }
        const canvas = surface.getCanvas();
        canvas.drawImage(image, 0, 0);
        // No flush needed: raster surfaces write to memory synchronously, and
        // Surface.flush() under SK_GRAPHITE crashes for CPU surfaces because
        // it dereferences a null recorder (see JsiSkSurface::flush).
        const pixels = canvas.readPixels(0, 0, {
          width,
          height,
          colorType: ColorType.RGBA_8888,
          alphaType: AlphaType.Unpremul,
        });
        if (!pixels) {
          throw new Error(`SkiaTextureLoader: readPixels failed for ${url}`);
        }
        const texture = new THREE.DataTexture(
          pixels as Uint8Array,
          width,
          height,
          THREE.RGBAFormat,
          THREE.UnsignedByteType
        );
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        onLoad(texture);
      })
      .catch((e) => {
        console.warn("[SkiaTextureLoader] failed", url, e);
        onError?.(e);
      });
  }
}

const skiaTextureLoaderPlugin = (parser: any) => {
  parser.textureLoader = new SkiaTextureLoader(parser.options.manager);
  return { name: "SKIA_TEXTURE_LOADER" };
};

export const useRGBE = (asset: ReturnType<typeof require>) => {
  const url = resolveAsset(asset);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new RGBELoader();
    loader.load(url, function (tex: THREE.Texture) {
      setTexture(tex);
    });
  }, [url]);
  return texture;
};

export const useGLTF = (asset: ReturnType<typeof require>) => {
  const [gltf, setGLTF] = useState<GLTF | null>(null);
  const url = resolveAsset(asset);
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register(skiaTextureLoaderPlugin);
    const dracoLoader = new DRACOLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(url, (model: GLTF) => {
      setGLTF(model);
    });
  }, [url]);
  return gltf;
};
