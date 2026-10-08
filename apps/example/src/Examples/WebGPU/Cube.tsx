import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas } from "react-native-webgpu";

import {
  makeWebGPURenderer,
  disposeWebGPURenderer,
} from "./components/makeWebGPURenderer";

export const Cube = () => {
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    const context = ref.current?.getContext("webgpu");
    if (!context) {
      console.warn("Failed to get WebGPU context");
      return;
    }
    const { width, height } = context.canvas;

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    camera.position.z = 1;

    const scene = new THREE.Scene();

    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshNormalMaterial();

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = makeWebGPURenderer({ context });
    renderer.init();

    const animate = (time: number) => {
      mesh.rotation.x = time / 2000;
      mesh.rotation.y = time / 1000;

      renderer.render(scene, camera);
      context.present();
    };
    renderer.setAnimationLoop(animate);

    return () => {
      disposeWebGPURenderer(renderer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Canvas ref={ref} style={styles.canvas} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  canvas: {
    flex: 1,
  },
});
