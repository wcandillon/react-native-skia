/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { Image } from "react-native";
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader";
import { HDRLoader } from "three/addons/loaders/HDRLoader";

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

// Metro serves bundled assets over HTTP in dev, so three's loaders can fetch
// them (and the relative .bin/.jpg files a .gltf references) like on the web.
export const resolveAsset = (mod: ReturnType<typeof require>) => {
  return Image.resolveAssetSource(mod).uri;
};

export const debugManager = new THREE.LoadingManager();

debugManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`Started loading ${url} (${itemsLoaded}/${itemsTotal})`);
};

debugManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading ${url} (${itemsLoaded}/${itemsTotal})`);
};

debugManager.onError = (url) => {
  console.error(`There was an error loading ${url}`);
};

export const useHDR = (asset: ReturnType<typeof require>) => {
  const url = resolveAsset(asset);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new HDRLoader();
    loader.load(url, (tex: THREE.Texture) => {
      setTexture(tex);
    });
  }, [url]);
  return texture;
};

export const useGLTF = (asset: ReturnType<typeof require>) => {
  const [gltf, setGLTF] = useState<GLTF | null>(null);
  const url = resolveAsset(asset);
  useEffect(() => {
    const loader = new GLTFLoader(debugManager);
    const dracoLoader = new DRACOLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(url, (model: GLTF) => {
      setGLTF(model);
    });
  }, [url]);
  return gltf;
};
