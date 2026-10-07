import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as THREE from "three";
import { Canvas, Image, useCanvasSize } from "react-native-skia";

import { useGLTF, useHDR } from "./components/AssetManager";
import type { ThreeSceneFactory } from "./components/useThreeScene";
import { useThreeScene } from "./components/useThreeScene";

// three.js renders into an offscreen WebGPU texture that is wrapped into an
// SkImage every frame and drawn by a Skia Canvas (see useThreeScene).
export const Helmet = () => {
  const texture = useHDR(require("./assets/helmet/royal_esplanade_1k.hdr"));
  const gltf = useGLTF(require("./assets/helmet/DamagedHelmet.gltf"));
  const { ref, size } = useCanvasSize();

  const makeScene = useCallback<ThreeSceneFactory>(
    (renderer, { width, height }) => {
      if (!texture || !gltf) {
        return undefined;
      }
      const timer = new THREE.Timer();

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 20);
      camera.position.set(-1.8, 0.6, 2.7);

      const scene = new THREE.Scene();

      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;

      scene.add(gltf.scene);

      const update = () => {
        timer.update();
        const elapsed = timer.getElapsed();
        const distance = 5;
        camera.position.x = Math.sin(elapsed) * distance;
        camera.position.z = Math.cos(elapsed) * distance;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      };

      return { scene, camera, update };
    },
    [texture, gltf]
  );
  const scene = useThreeScene(size, makeScene, [makeScene]);

  return (
    <View style={styles.container}>
      <Text style={styles.loading}>Loading assets...</Text>
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Image
          image={scene}
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          fit="fill"
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  loading: {
    color: "#fff",
  },
});
