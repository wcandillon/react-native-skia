import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { StyleSheet, Text, View } from "react-native";
import type { WebGPUCanvasRef } from "@shopify/react-native-skia";
import { WebGPUCanvas } from "@shopify/react-native-skia";

import { useGLTF, useRGBE } from "./AssetManager";
import { makeWebGPURenderer } from "./components/makeWebGPURenderer";

export const Helmet = () => {
  const texture = useRGBE(require("./assets/helmet/royal_esplanade_1k.hdr"));
  const gltf = useGLTF(require("./assets/helmet/DamagedHelmet.gltf"));
  const ref = useRef<WebGPUCanvasRef>(null);

  useEffect(() => {
    if (!texture || !gltf) {
      return;
    }
    if (typeof RNWebGPU === "undefined") {
      return;
    }
    const context = ref.current?.getContext("webgpu");
    if (!context) {
      return;
    }
    const { width, height } = context.canvas;

    const clock = new THREE.Clock();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 20);
    camera.position.set(-1.8, 0.6, 2.7);

    const scene = new THREE.Scene();

    const renderer = makeWebGPURenderer(context);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.background = texture;
    scene.environment = texture;

    scene.add(gltf.scene);
    renderer.setAnimationLoop(animate);

    function animateCamera() {
      const elapsed = clock.getElapsedTime();
      const distance = 5;
      camera.position.x = Math.sin(elapsed) * distance;
      camera.position.z = Math.cos(elapsed) * distance;
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    function animate() {
      animateCamera();
      renderer.render(scene, camera);
      context!.present();
    }

    return () => {
      renderer.setAnimationLoop(null);
    };
  }, [texture, gltf]);

  if (typeof RNWebGPU === "undefined") {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          WebGPU Canvas requires SK_GRAPHITE to be enabled.
        </Text>
        <Text style={styles.submessage}>
          Build react-native-skia with Graphite support to use this feature.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.loading}>Loading assets...</Text>
      <View style={StyleSheet.absoluteFill}>
        <WebGPUCanvas ref={ref} style={styles.canvas} />
      </View>
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
  canvas: {
    flex: 1,
  },
  loading: {
    color: "#fff",
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a1a",
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  submessage: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
