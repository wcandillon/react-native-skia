import * as THREE from "three";
import {
  Fn,
  If,
  Return,
  instancedArray,
  instanceIndex,
  uniform,
  select,
  attribute,
  Loop,
  float,
  transformNormalToView,
  cross,
  triNoise3D,
  time,
  texture as textureNode,
} from "three/tsl";

// Port of https://threejs.org/examples/webgpu_compute_cloth.html: a grid of
// verlet vertices connected by springs, simulated by two compute shaders
// (spring forces, then per-vertex force accumulation + integration) and
// rendered as a sheen cloth colliding with a moving sphere.

const clothWidth = 1;
const clothHeight = 1;
const clothNumSegmentsX = 30;
const clothNumSegmentsY = 30;
const sphereRadius = 0.15;

interface VerletVertex {
  id: number;
  position: THREE.Vector3;
  isFixed: boolean;
  springIds: number[];
}

interface VerletSpring {
  id: number;
  vertex0: VerletVertex;
  vertex1: VerletVertex;
}

// Builds the verlet system: a grid of vertices connected by springs.
const setupVerletGeometry = () => {
  const verletVertices: VerletVertex[] = [];
  const verletSprings: VerletSpring[] = [];
  const verletVertexColumns: VerletVertex[][] = [];

  const addVerletVertex = (
    x: number,
    y: number,
    z: number,
    isFixed: boolean
  ) => {
    const vertex: VerletVertex = {
      id: verletVertices.length,
      position: new THREE.Vector3(x, y, z),
      isFixed,
      springIds: [],
    };
    verletVertices.push(vertex);
    return vertex;
  };

  const addVerletSpring = (vertex0: VerletVertex, vertex1: VerletVertex) => {
    const id = verletSprings.length;
    vertex0.springIds.push(id);
    vertex1.springIds.push(id);
    verletSprings.push({ id, vertex0, vertex1 });
  };

  for (let x = 0; x <= clothNumSegmentsX; x++) {
    const column: VerletVertex[] = [];
    for (let y = 0; y <= clothNumSegmentsY; y++) {
      const posX = x * (clothWidth / clothNumSegmentsX) - clothWidth * 0.5;
      const posZ = y * (clothHeight / clothNumSegmentsY);
      // pin some of the top vertices
      const isFixed = y === 0 && x % 5 === 0;
      column.push(addVerletVertex(posX, clothHeight * 0.5, posZ, isFixed));
    }
    verletVertexColumns.push(column);
  }

  for (let x = 0; x <= clothNumSegmentsX; x++) {
    for (let y = 0; y <= clothNumSegmentsY; y++) {
      const vertex0 = verletVertexColumns[x][y];
      if (x > 0) {
        addVerletSpring(vertex0, verletVertexColumns[x - 1][y]);
      }
      if (y > 0) {
        addVerletSpring(vertex0, verletVertexColumns[x][y - 1]);
      }
      if (x > 0 && y > 0) {
        addVerletSpring(vertex0, verletVertexColumns[x - 1][y - 1]);
      }
      if (x > 0 && y < clothNumSegmentsY) {
        addVerletSpring(vertex0, verletVertexColumns[x - 1][y + 1]);
      }
    }
  }

  return { verletVertices, verletSprings, verletVertexColumns };
};

export interface ClothOptions {
  // sRGB texture mapped onto the cloth; its top edge lands on the pinned edge.
  map?: THREE.Texture;
}

export const setupCloth = (scene: THREE.Scene, { map }: ClothOptions = {}) => {
  const { verletVertices, verletSprings, verletVertexColumns } =
    setupVerletGeometry();
  const vertexCount = verletVertices.length;
  const springCount = verletSprings.length;

  // Vertex buffers. springListArray lists spring ids grouped by the vertex
  // they affect so the vertex shader can iterate its springs contiguously.
  // vertexParams holds per vertex: x = isFixed, y = springCount,
  // z = index of its first spring in springListArray.
  const springListArray: number[] = [];
  const vertexPositionArray = new Float32Array(vertexCount * 3);
  const vertexParamsArray = new Uint32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const vertex = verletVertices[i];
    vertexPositionArray[i * 3] = vertex.position.x;
    vertexPositionArray[i * 3 + 1] = vertex.position.y;
    vertexPositionArray[i * 3 + 2] = vertex.position.z;
    vertexParamsArray[i * 3] = vertex.isFixed ? 1 : 0;
    if (!vertex.isFixed) {
      vertexParamsArray[i * 3 + 1] = vertex.springIds.length;
      vertexParamsArray[i * 3 + 2] = springListArray.length;
      springListArray.push(...vertex.springIds);
    }
  }
  const vertexPositionBuffer = instancedArray(vertexPositionArray, "vec3");
  const vertexForceBuffer = instancedArray(vertexCount, "vec3");
  const vertexParamsBuffer = instancedArray(vertexParamsArray, "uvec3");
  const springListBuffer = instancedArray(
    new Uint32Array(springListArray),
    "uint"
  );

  // Spring buffers
  const springVertexIdArray = new Uint32Array(springCount * 2);
  const springRestLengthArray = new Float32Array(springCount);
  for (let i = 0; i < springCount; i++) {
    const spring = verletSprings[i];
    springVertexIdArray[i * 2] = spring.vertex0.id;
    springVertexIdArray[i * 2 + 1] = spring.vertex1.id;
    springRestLengthArray[i] = spring.vertex0.position.distanceTo(
      spring.vertex1.position
    );
  }
  const springVertexIdBuffer = instancedArray(springVertexIdArray, "uvec2");
  const springRestLengthBuffer = instancedArray(springRestLengthArray, "float");
  const springForceBuffer = instancedArray(springCount * 3, "vec3");

  // Uniforms
  const dampeningUniform = uniform(0.99);
  const spherePositionUniform = uniform(new THREE.Vector3(0, 0, 0));
  const sphereUniform = uniform(1.0);
  const windUniform = uniform(1.0);
  const stiffnessUniform = uniform(0.2);

  // 1. One force per spring from its current length vs rest length.
  const computeSpringForces = Fn(() => {
    const vertexIds = springVertexIdBuffer.element(instanceIndex);
    const restLength = springRestLengthBuffer.element(instanceIndex);

    const vertex0Position = vertexPositionBuffer.element(vertexIds.x);
    const vertex1Position = vertexPositionBuffer.element(vertexIds.y);

    const delta = vertex1Position.sub(vertex0Position).toVar();
    const dist = delta.length().max(0.000001).toVar();
    const force = dist
      .sub(restLength)
      .mul(stiffnessUniform)
      .mul(delta)
      .mul(0.5)
      .div(dist);
    springForceBuffer.element(instanceIndex).assign(force);
  })()
    .compute(springCount)
    .setName("Spring Forces");

  // 2. Per vertex: accumulate spring forces, add gravity, wind and the sphere
  // collision, then integrate the position.
  const computeVertexForces = Fn(() => {
    const vertexParams = vertexParamsBuffer.element(instanceIndex).toVar();
    const isFixed = vertexParams.x;
    const vertexSpringCount = vertexParams.y;
    const springPointer = vertexParams.z;

    If(isFixed, () => {
      Return();
    });

    const position = vertexPositionBuffer
      .element(instanceIndex)
      .toVar("vertexPosition");
    const force = vertexForceBuffer.element(instanceIndex).toVar("vertexForce");

    force.mulAssign(dampeningUniform);

    const ptrStart = springPointer.toVar("ptrStart");
    const ptrEnd = ptrStart.add(vertexSpringCount).toVar("ptrEnd");

    Loop(
      { start: ptrStart, end: ptrEnd, type: "uint", condition: "<" },
      ({ i }) => {
        const springId = springListBuffer.element(i).toVar("springId");
        const springForce = springForceBuffer.element(springId);
        const springVertexIds = springVertexIdBuffer.element(springId);
        const factor = select(
          springVertexIds.x.equal(instanceIndex),
          1.0,
          -1.0
        );
        force.addAssign(springForce.mul(factor));
      }
    );

    // gravity
    force.y.subAssign(0.00005);

    // wind
    const noise = triNoise3D(position, 1, time).sub(0.2).mul(0.0001);
    const windForce = noise.mul(windUniform);
    force.z.subAssign(windForce);

    // collision with sphere
    const deltaSphere = position.add(force).sub(spherePositionUniform);
    const dist = deltaSphere.length();
    const sphereForce = float(sphereRadius)
      .sub(dist)
      .max(0)
      .mul(deltaSphere)
      .div(dist)
      .mul(sphereUniform);
    force.addAssign(sphereForce);

    vertexForceBuffer.element(instanceIndex).assign(force);
    vertexPositionBuffer.element(instanceIndex).addAssign(force);
  })()
    .compute(vertexCount)
    .setName("Vertex Forces");

  // Sphere
  const sphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(sphereRadius * 0.95, 4),
    new THREE.MeshStandardNodeMaterial()
  );
  scene.add(sphere);

  // Cloth mesh: a plane whose every vertex sits at the center of 4 verlet
  // vertices; position and normal are derived from them in the vertex shader.
  const meshVertexCount = clothNumSegmentsX * clothNumSegmentsY;
  const geometry = new THREE.BufferGeometry();
  const verletVertexIdArray = new Uint32Array(meshVertexCount * 4);
  // UVs follow the grid: u across the width, v from the pinned edge down.
  // u is mirrored because the camera looks at the cloth from the -z side,
  // where +x runs right to left on screen.
  const uvArray = new Float32Array(meshVertexCount * 2);
  const indices: number[] = [];
  const getIndex = (x: number, y: number) => y * clothNumSegmentsX + x;
  for (let x = 0; x < clothNumSegmentsX; x++) {
    for (let y = 0; y < clothNumSegmentsY; y++) {
      const index = getIndex(x, y);
      verletVertexIdArray[index * 4] = verletVertexColumns[x][y].id;
      verletVertexIdArray[index * 4 + 1] = verletVertexColumns[x + 1][y].id;
      verletVertexIdArray[index * 4 + 2] = verletVertexColumns[x][y + 1].id;
      verletVertexIdArray[index * 4 + 3] = verletVertexColumns[x + 1][y + 1].id;
      uvArray[index * 2] = 1 - x / (clothNumSegmentsX - 1);
      uvArray[index * 2 + 1] = y / (clothNumSegmentsY - 1);
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
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(meshVertexCount * 3), 3, false)
  );
  geometry.setAttribute(
    "vertexIds",
    new THREE.BufferAttribute(verletVertexIdArray, 4, false)
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2, false));
  geometry.setIndex(indices);

  const clothMaterial = new THREE.MeshPhysicalNodeMaterial({
    color: new THREE.Color().setHex(0x204080),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color().setHex(0xffffff),
  });

  if (map) {
    // Sample the map ourselves rather than through `map`: the WebGPU backend
    // relies on sRGB texture formats for decoding, which an external texture
    // (e.g. one exported by Skia) does not carry, so decode in the shader.
    // (@types/three declares ColorSpaceNode without its vec4 value type)
    clothMaterial.colorNode = textureNode(map).colorSpaceToWorking(
      THREE.SRGBColorSpace
    ) as unknown as THREE.Node<"vec4">;
  }

  clothMaterial.positionNode = Fn(() => {
    const vertexIds = attribute("vertexIds", "uvec4" as const);
    const v0 = vertexPositionBuffer.element(vertexIds.x).toVar();
    const v1 = vertexPositionBuffer.element(vertexIds.y).toVar();
    const v2 = vertexPositionBuffer.element(vertexIds.z).toVar();
    const v3 = vertexPositionBuffer.element(vertexIds.w).toVar();

    const top = v0.add(v1);
    const right = v1.add(v3);
    const bottom = v2.add(v3);
    const left = v0.add(v2);

    const tangent = right.sub(left).normalize();
    const bitangent = bottom.sub(top).normalize();
    const normal = cross(tangent, bitangent);

    // computed in the vertex shader, interpolated to the fragment shader
    clothMaterial.normalNode = transformNormalToView(normal).toVarying();

    return v0.add(v1).add(v2).add(v3).mul(0.25);
  })();

  const clothMesh = new THREE.Mesh(geometry, clothMaterial);
  clothMesh.frustumCulled = false;
  scene.add(clothMesh);

  return {
    computeSpringForces,
    computeVertexForces,
    sphere,
    spherePositionUniform,
    sphereUniform,
    windUniform,
  };
};
