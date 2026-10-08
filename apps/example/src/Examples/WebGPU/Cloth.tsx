import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as THREE from "three";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas, importDevice } from "react-native-webgpu";
import type { SkCanvas } from "react-native-skia";
import { Skia, StrokeCap, matchFont } from "react-native-skia";

import { useHDR } from "./components/AssetManager";
import { setupCloth } from "./components/cloth";
import { makeSkiaTexture } from "./components/makeSkiaTexture";
import {
  makeWebGPURenderer,
  disposeWebGPURenderer,
} from "./components/makeWebGPURenderer";

// Screen for the cloth simulation in ./components/cloth.ts, rendered on a
// plain WebGPU canvas. The cloth is textured with a Skia drawing that is
// redrawn every frame straight into the GPU texture three samples, with no
// copy (Graphite builds only; other builds show the plain cloth).
const params = {
  sphere: true,
  wind: 1.0,
};

const textureSize = 1024;

const drawClothTexture = (canvas: SkCanvas, time: number) => {
  const size = textureSize;
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: size, y: size },
      [Skia.Color("#f6d365"), Skia.Color("#fda085"), Skia.Color("#a18cd1")],
      null,
      0
    )
  );
  canvas.drawRect({ x: 0, y: 0, width: size, height: size }, paint);

  const stripe = Skia.Paint();
  stripe.setColor(Skia.Color("rgba(255, 255, 255, 0.35)"));
  const cells = 8;
  const cell = size / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if ((i + j) % 2 === 0) {
        canvas.drawRect(
          { x: i * cell, y: j * cell, width: cell, height: cell },
          stripe
        );
      }
    }
  }

  const font = matchFont({
    fontFamily: "Helvetica",
    fontSize: size / 4,
    fontWeight: "bold",
  });
  const text = "Skia";
  const textWidth = font.measureText(text).width;
  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color("#1a1a1a"));
  canvas.drawText(text, (size - textWidth) / 2, size * 0.6, textPaint, font);

  // A clock hand so it is visible that the texture updates every frame.
  const hand = Skia.Paint();
  hand.setColor(Skia.Color("#1a1a1a"));
  hand.setStrokeWidth(size / 64);
  hand.setStrokeCap(StrokeCap.Round);
  const cx = size / 2;
  const cy = size * 0.3;
  const angle = time * 2;
  canvas.drawLine(
    cx,
    cy,
    cx + Math.cos(angle) * size * 0.2,
    cy + Math.sin(angle) * size * 0.2,
    hand
  );
};

// Skia's Graphite device, when available: three must render on it to sample
// the texture Skia produced.
const getSharedDevice = () => {
  try {
    return importDevice(Skia.getNativeDevice());
  } catch (e) {
    console.warn("Cloth: no shared Skia device, rendering the plain cloth", e);
    return undefined;
  }
};

export const Cloth = () => {
  const hdr = useHDR(require("./assets/helmet/royal_esplanade_1k.hdr"));
  const ref = useRef<CanvasRef>(null);

  useEffect(() => {
    if (!hdr) {
      return;
    }
    const context = ref.current?.getContext("webgpu");
    if (!context) {
      console.warn("Failed to get WebGPU context");
      return;
    }
    const { width, height } = context.canvas;

    const device = getSharedDevice();
    const skiaTexture = device
      ? makeSkiaTexture(device, textureSize, textureSize)
      : undefined;

    const renderer = makeWebGPURenderer({
      context,
      device,
      // the cloth vertex shader reads the verlet positions storage buffer
      requiredLimits: { maxStorageBuffersInVertexStage: 1 },
    });
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdr;
    scene.backgroundBlurriness = 0.5;
    scene.environment = hdr;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 10);
    camera.position.set(-1.6, -0.1, -1.6);
    camera.lookAt(0, -0.1, 0);

    const {
      computeSpringForces,
      computeVertexForces,
      sphere,
      spherePositionUniform,
      sphereUniform,
      windUniform,
    } = setupCloth(scene, { map: skiaTexture?.texture });

    const timer = new THREE.Timer();
    let timeSinceLastStep = 0;
    let timestamp = 0;
    // fixed simulation rate, independent of the display refresh rate
    const stepsPerSecond = 360;
    const timePerStep = 1 / stepsPerSecond;

    const updateSphere = () => {
      sphere.position.set(
        Math.sin(timestamp * 2.1) * 0.1,
        0,
        Math.sin(timestamp * 0.8)
      );
      spherePositionUniform.value.copy(sphere.position);
    };

    const animate = () => {
      timer.update();
      sphere.visible = params.sphere;
      sphereUniform.value = params.sphere ? 1 : 0;
      windUniform.value = params.wind;

      // never advance too far at once, e.g. after the app was backgrounded
      const deltaTime = Math.min(timer.getDelta(), 1 / 60);
      timeSinceLastStep += deltaTime;
      while (timeSinceLastStep >= timePerStep) {
        timestamp += timePerStep;
        timeSinceLastStep -= timePerStep;
        updateSphere();
        renderer.compute(computeSpringForces);
        renderer.compute(computeVertexForces);
      }

      skiaTexture?.draw((canvas) => drawClothTexture(canvas, timestamp));
      renderer.render(scene, camera);
      context.present();
    };
    renderer.setAnimationLoop(animate);

    return () => {
      disposeWebGPURenderer(renderer);
      skiaTexture?.destroy();
    };
  }, [hdr]);

  return (
    <View style={styles.container}>
      <Text style={styles.loading}>Loading assets...</Text>
      <View style={StyleSheet.absoluteFill}>
        <Canvas ref={ref} style={styles.canvas} />
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
});
