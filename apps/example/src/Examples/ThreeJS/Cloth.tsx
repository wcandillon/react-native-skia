import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  Fn,
  If,
  Loop,
  Return,
  attribute,
  cross,
  float,
  instanceIndex,
  instancedArray,
  select,
  time,
  transformNormalToView,
  triNoise3D,
  uint,
  uniform,
} from "three/tsl";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { CanvasRef } from "react-native-webgpu";
import { Canvas } from "react-native-webgpu";

import { useRGBE } from "./AssetManager";
import { makeWebGPURenderer } from "./components/makeWebGPURenderer";

// Port of https://threejs.org/examples/webgpu_compute_cloth.html
// A verlet cloth simulated with two compute shaders per step.

const CLOTH_WIDTH = 1;
const CLOTH_HEIGHT = 1;
const SEGMENTS_X = 30;
const SEGMENTS_Y = 30;
const SPHERE_RADIUS = 0.15;
const STEPS_PER_SECOND = 360;

const CLOTH_COLOR = 0x204080; // sRGB
const SHEEN_COLOR = 0xffffff; // sRGB

const TARGET = new THREE.Vector3(0, -0.1, 0);
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 3;

// three 0.172's instancedArray() only accepts an element count, so allocate
// the storage buffer and copy the initial data into it.
const instancedArrayFrom = (
  data: Float32Array | Uint32Array,
  type: "float" | "uint" | "vec3" | "uvec2" | "uvec3",
  itemSize: number
) => {
  const node = instancedArray(data.length / itemSize, type);
  (node.value.array as Float32Array | Uint32Array).set(data);
  return node;
};

type VerletVertex = {
  id: number;
  position: THREE.Vector3;
  isFixed: boolean;
  springIds: number[];
};

type VerletSpring = {
  id: number;
  vertex0: VerletVertex;
  vertex1: VerletVertex;
};

const makeVerletGeometry = () => {
  const vertices: VerletVertex[] = [];
  const springs: VerletSpring[] = [];
  const columns: VerletVertex[][] = [];

  const addVertex = (x: number, y: number, z: number, isFixed: boolean) => {
    const vertex = {
      id: vertices.length,
      position: new THREE.Vector3(x, y, z),
      isFixed,
      springIds: [],
    };
    vertices.push(vertex);
    return vertex;
  };

  const addSpring = (vertex0: VerletVertex, vertex1: VerletVertex) => {
    const id = springs.length;
    vertex0.springIds.push(id);
    vertex1.springIds.push(id);
    springs.push({ id, vertex0, vertex1 });
  };

  for (let x = 0; x <= SEGMENTS_X; x++) {
    const column: VerletVertex[] = [];
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      const posX = x * (CLOTH_WIDTH / SEGMENTS_X) - CLOTH_WIDTH * 0.5;
      const posZ = y * (CLOTH_HEIGHT / SEGMENTS_Y);
      // pin some of the top vertices
      const isFixed = y === 0 && x % 5 === 0;
      column.push(addVertex(posX, CLOTH_HEIGHT * 0.5, posZ, isFixed));
    }
    columns.push(column);
  }

  for (let x = 0; x <= SEGMENTS_X; x++) {
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      const vertex0 = columns[x][y];
      if (x > 0) {
        addSpring(vertex0, columns[x - 1][y]);
      }
      if (y > 0) {
        addSpring(vertex0, columns[x][y - 1]);
      }
      if (x > 0 && y > 0) {
        addSpring(vertex0, columns[x - 1][y - 1]);
      }
      if (x > 0 && y < SEGMENTS_Y) {
        addSpring(vertex0, columns[x - 1][y + 1]);
      }
    }
  }

  return { vertices, springs, columns };
};

const makeCloth = (scene: THREE.Scene) => {
  const { vertices, springs, columns } = makeVerletGeometry();
  const vertexCount = vertices.length;
  const springCount = springs.length;

  // Vertex buffers. params holds (isFixed, springCount, springPointer) per
  // vertex; springList holds spring ids grouped by the vertex they affect.
  const springList: number[] = [];
  const vertexPositions = new Float32Array(vertexCount * 3);
  const vertexParams = new Uint32Array(vertexCount * 3);
  vertices.forEach((vertex, i) => {
    vertexPositions[i * 3] = vertex.position.x;
    vertexPositions[i * 3 + 1] = vertex.position.y;
    vertexPositions[i * 3 + 2] = vertex.position.z;
    vertexParams[i * 3] = vertex.isFixed ? 1 : 0;
    if (!vertex.isFixed) {
      vertexParams[i * 3 + 1] = vertex.springIds.length;
      vertexParams[i * 3 + 2] = springList.length;
      springList.push(...vertex.springIds);
    }
  });
  const vertexPositionBuffer = instancedArrayFrom(vertexPositions, "vec3", 3);
  const vertexForceBuffer = instancedArray(vertexCount, "vec3");
  const vertexParamsBuffer = instancedArrayFrom(vertexParams, "uvec3", 3);
  const springListBuffer = instancedArrayFrom(
    new Uint32Array(springList),
    "uint",
    1
  );

  // Spring buffers
  const springVertexIds = new Uint32Array(springCount * 2);
  const springRestLengths = new Float32Array(springCount);
  springs.forEach((spring, i) => {
    springVertexIds[i * 2] = spring.vertex0.id;
    springVertexIds[i * 2 + 1] = spring.vertex1.id;
    springRestLengths[i] = spring.vertex0.position.distanceTo(
      spring.vertex1.position
    );
  });
  const springVertexIdBuffer = instancedArrayFrom(springVertexIds, "uvec2", 2);
  const springRestLengthBuffer = instancedArrayFrom(
    springRestLengths,
    "float",
    1
  );
  const springForceBuffer = instancedArray(springCount * 3, "vec3");

  // Uniforms
  const dampening = uniform(0.99);
  const spherePosition = uniform(new THREE.Vector3(0, 0, 0));
  const sphereEnabled = uniform(1.0);
  const wind = uniform(1.0);
  const stiffness = uniform(0.2);

  // three dispatches ceil(count / 64) workgroups and its compute shaders have
  // no bounds check. In a browser the extra invocations are harmless because
  // Dawn clamps out-of-range buffer indices, but the device we share with Skia
  // is created with robustness disabled, so they would read garbage and write
  // past the end of the buffers. Guard both kernels explicitly.
  const guard = (count: number) => {
    If(instanceIndex.greaterThanEqual(uint(count)), () => {
      Return();
    });
  };

  // 1. One force per spring, from its stretch relative to the rest length.
  const computeSpringForces = Fn(() => {
    guard(springCount);
    const vertexIds = springVertexIdBuffer.element(instanceIndex);
    const restLength = springRestLengthBuffer.element(instanceIndex);
    const vertex0Position = vertexPositionBuffer.element(vertexIds.x);
    const vertex1Position = vertexPositionBuffer.element(vertexIds.y);
    const delta = vertex1Position.sub(vertex0Position).toVar();
    const dist = delta.length().max(0.000001).toVar();
    const force = dist
      .sub(restLength)
      .mul(stiffness)
      .mul(delta)
      .mul(0.5)
      .div(dist);
    springForceBuffer.element(instanceIndex).assign(force);
  })().compute(springCount);

  // 2. Accumulate spring forces per vertex, add gravity, wind and the sphere
  // collision, then integrate.
  const computeVertexForces = Fn(() => {
    guard(vertexCount);
    const params = vertexParamsBuffer.element(instanceIndex).toVar();
    const isFixed = params.x;
    const count = params.y;
    const pointer = params.z;

    If(isFixed, () => {
      Return();
    });

    const position = vertexPositionBuffer
      .element(instanceIndex)
      .toVar("vertexPosition");
    const force = vertexForceBuffer.element(instanceIndex).toVar("vertexForce");
    force.mulAssign(dampening);

    const ptrStart = pointer.toVar("ptrStart");
    const ptrEnd = ptrStart.add(count).toVar("ptrEnd");

    Loop(
      { start: ptrStart, end: ptrEnd, type: "uint", condition: "<" },
      ({ i }) => {
        const springId = springListBuffer.element(i).toVar("springId");
        const springForce = springForceBuffer.element(springId);
        const ids = springVertexIdBuffer.element(springId);
        const factor = select(ids.x.equal(instanceIndex), 1.0, -1.0);
        force.addAssign(springForce.mul(factor));
      }
    );

    // gravity
    force.y.subAssign(0.00005);

    // wind
    const noise = triNoise3D(position, 1, time).sub(0.2).mul(0.0001);
    force.z.subAssign(noise.mul(wind));

    // collision with the sphere
    const deltaSphere = position.add(force).sub(spherePosition);
    const dist = deltaSphere.length();
    const sphereForce = float(SPHERE_RADIUS)
      .sub(dist)
      .max(0)
      .mul(deltaSphere)
      .div(dist)
      .mul(sphereEnabled);
    force.addAssign(sphereForce);

    vertexForceBuffer.element(instanceIndex).assign(force);
    vertexPositionBuffer.element(instanceIndex).addAssign(force);
  })().compute(vertexCount);

  // Sphere
  const sphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(SPHERE_RADIUS * 0.95, 4),
    new THREE.MeshStandardNodeMaterial()
  );
  scene.add(sphere);

  // Cloth mesh: each rendered vertex sits at the center of 4 verlet vertices.
  const meshVertexCount = SEGMENTS_X * SEGMENTS_Y;
  const verletVertexIds = new Uint32Array(meshVertexCount * 4);
  const uvs = new Float32Array(meshVertexCount * 2);
  const indices: number[] = [];
  const getIndex = (x: number, y: number) => y * SEGMENTS_X + x;
  for (let x = 0; x < SEGMENTS_X; x++) {
    for (let y = 0; y < SEGMENTS_Y; y++) {
      const index = getIndex(x, y);
      verletVertexIds[index * 4] = columns[x][y].id;
      verletVertexIds[index * 4 + 1] = columns[x + 1][y].id;
      verletVertexIds[index * 4 + 2] = columns[x][y + 1].id;
      verletVertexIds[index * 4 + 3] = columns[x + 1][y + 1].id;
      // UVs so a texture (e.g. drawn with Skia) can be mapped on the cloth
      uvs[index * 2] = x / (SEGMENTS_X - 1);
      uvs[index * 2 + 1] = 1 - y / (SEGMENTS_Y - 1);
      if (x > 0 && y > 0) {
        indices.push(
          getIndex(x, y),
          getIndex(x - 1, y),
          getIndex(x - 1, y - 1)
        );
        indices.push(
          getIndex(x, y),
          getIndex(x - 1, y - 1),
          getIndex(x, y - 1)
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(meshVertexCount * 3), 3, false)
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2, false));
  geometry.setAttribute(
    "vertexIds",
    new THREE.BufferAttribute(verletVertexIds, 4, false)
  );
  geometry.setIndex(indices);

  const material = new THREE.MeshPhysicalNodeMaterial({
    color: new THREE.Color().setHex(CLOTH_COLOR),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color().setHex(SHEEN_COLOR),
  });
  // Gather the 4 verlet vertices around each rendered vertex and derive the
  // position (their center) and normal from them.
  const vertexIds = attribute("vertexIds");
  const v0 = vertexPositionBuffer.element(vertexIds.x);
  const v1 = vertexPositionBuffer.element(vertexIds.y);
  const v2 = vertexPositionBuffer.element(vertexIds.z);
  const v3 = vertexPositionBuffer.element(vertexIds.w);
  const tangent = v1.add(v3).sub(v0.add(v2)).normalize();
  const bitangent = v2.add(v3).sub(v0.add(v1)).normalize();
  // computed in the vertex stage and interpolated for the fragment stage
  material.normalNode = transformNormalToView(
    cross(tangent, bitangent)
  ).varying();
  material.positionNode = v0.add(v1).add(v2).add(v3).mul(0.25);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let timestamp = 0;
  const updateSphere = () => {
    sphere.position.set(
      Math.sin(timestamp * 2.1) * 0.1,
      0,
      Math.sin(timestamp * 0.8)
    );
    spherePosition.value.copy(sphere.position);
  };

  return {
    material,
    stiffness,
    wind,
    sphereEnabled,
    step: (renderer: THREE.WebGPURenderer, dt: number) => {
      timestamp += dt;
      updateSphere();
      renderer.compute(computeSpringForces);
      renderer.compute(computeVertexForces);
    },
  };
};

export const Cloth = () => {
  const texture = useRGBE(require("./assets/helmet/royal_esplanade_1k.hdr"));
  const ref = useRef<CanvasRef>(null);
  // Orbit camera state, driven by the gestures below (replaces OrbitControls).
  const orbit = useRef({
    yaw: Math.atan2(-1.6, -1.6),
    pitch: 0,
    distance: Math.hypot(1.6, 1.6),
    startDistance: 0,
  });

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onChange((e) => {
        const o = orbit.current;
        o.yaw -= e.changeX * 0.008;
        o.pitch = Math.max(
          -Math.PI / 2 + 0.05,
          Math.min(Math.PI / 2 - 0.05, o.pitch + e.changeY * 0.008)
        );
      });
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        orbit.current.startDistance = orbit.current.distance;
      })
      .onChange((e) => {
        const o = orbit.current;
        o.distance = Math.max(
          MIN_DISTANCE,
          Math.min(MAX_DISTANCE, o.startDistance / e.scale)
        );
      });
    return Gesture.Simultaneous(pan, pinch);
  }, []);

  useEffect(() => {
    if (!texture) {
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
    let cancelled = false;
    let renderer: THREE.WebGPURenderer | null = null;

    (async () => {
      const scene = new THREE.Scene();
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.backgroundBlurriness = 0.5;
      scene.environment = texture;

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 10);

      renderer = makeWebGPURenderer(context);
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1;

      const cloth = makeCloth(scene);

      // compute() needs an initialized backend
      await renderer.init();
      if (cancelled) {
        return;
      }

      const timePerStep = 1 / STEPS_PER_SECOND;
      let timeSinceLastStep = 0;
      let last = performance.now();

      const animate = () => {
        const now = performance.now();
        // don't advance too far, e.g. after the app was backgrounded
        const dt = Math.min((now - last) / 1000, 1 / 60);
        last = now;

        // fixed number of simulation steps per second, independent of the
        // refresh rate
        timeSinceLastStep += dt;
        while (timeSinceLastStep >= timePerStep) {
          timeSinceLastStep -= timePerStep;
          cloth.step(renderer!, timePerStep);
        }

        const o = orbit.current;
        const cp = Math.cos(o.pitch);
        camera.position.set(
          TARGET.x + Math.sin(o.yaw) * cp * o.distance,
          TARGET.y + Math.sin(o.pitch) * o.distance,
          TARGET.z + Math.cos(o.yaw) * cp * o.distance
        );
        camera.lookAt(TARGET);

        renderer!.render(scene, camera);
        context.present();
      };

      renderer.setAnimationLoop(animate);
    })();

    return () => {
      cancelled = true;
      renderer?.setAnimationLoop(null);
      renderer?.dispose();
    };
  }, [texture]);

  if (typeof RNWebGPU === "undefined") {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          WebGPU Canvas requires SK_GRAPHITE to be enabled.
        </Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Text style={styles.loading}>Loading assets...</Text>
        <View style={StyleSheet.absoluteFill}>
          <Canvas ref={ref} style={styles.canvas} />
        </View>
      </View>
    </GestureDetector>
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
  },
});
