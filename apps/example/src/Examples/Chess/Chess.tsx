import React from "react";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useDerivedValue,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";

import { frag } from "../../components/ShaderLib";

import { lib } from "./Shader";

const { width, height } = Dimensions.get("window");
const sf = 100;

const rt = frag`

const vec2 size = vec2(${width}, ${height});
const vec3 backgroundColor = vec3(0.3, 0.6, 1.0);
uniform vec3 cameraPosition;
const vec3 cameraLookAt = vec3(0., 0., 0.);
const float cameraRoll = 0;

const float PI = 3.141592653589793;

// Material properties for PBR lighting
struct Material {
    vec3 color;
    float roughness;
    float metalness;
    float reflectivity;
};

struct Hit {
    float dist;
    int materialId;
    Material material;
};

struct Light {
    vec3 position;
    vec3 color;
    vec3 intensity;
};


Hit minWithMaterial(Hit a, Hit b) {
  if (a.dist < b.dist) {
    return a;
  } else {
    return b;
  }
}

Light light;

void setupLights() {
  // Main directional light (sun)
  light.position = normalize(vec3(1.0, 2.0, 1.0));
  light.color = vec3(1.0, 1.0, 1.0);
  light.intensity = vec3(1.0);    
}

${lib}

vec3 checkboard(vec3 p, vec3 color) {
  float cornerRadius = 0.05; // Adjust this value to control the roundness
  vec2 q = abs(p.xz);
  float ratio = 1.0 - 0.1;
  float border = ratio * 8.2;
  float cornerDist = length(max(q - border + cornerRadius, 0.0));
  if (cornerDist > cornerRadius) {
    return color;
  }
  vec2 ss = sin(4.0 * 3.141592653589793 * p.xz * 1/border);
  vec3 stripes = sign(ss.x) * sign(ss.y) > 0.0 ? vec3(0.9) : vec3(0.05);
  return stripes;
}

Material createMaterial(vec3 color, float roughness, float metalness, float reflectivity) {
  Material mat;
  mat.color = color;
  mat.roughness = roughness;
  mat.metalness = metalness;
  mat.reflectivity = reflectivity;
  return mat;
}

Hit sceneSDF(float3 p) {
  Hit board;
  board.dist = sdRoundCone(p, vec3(8.2, 0.35, 8.2), 0.2);
  board.material = createMaterial(checkboard(p, vec3(0.756 ,0.603, 0.419)), 0.8, 0.5, 0.5);

  Hit queen;
  queen.dist = sdQueen(p);
  queen.material = createMaterial(vec3(0.9, 0.9, 0.9), 1, 0.5, 0.5);

  Hit result = minWithMaterial(queen, board);  
  return result;
}

float3 getNormal(float3 p) {
  const float h = 0.0001;
  const float2 k = float2(1.0, -1.0);
  return normalize(k.xyy*sceneSDF(p + k.xyy*h).dist + 
                  k.yyx*sceneSDF(p + k.yyx*h).dist + 
                  k.yxy*sceneSDF(p + k.yxy*h).dist + 
                  k.xxx*sceneSDF(p + k.xxx*h).dist);
}

Hit raymarch(float3 ro, float3 rd) {
  float t = 0.0;
  Hit hit;
  
  for(int i = 0; i < 512; i++) {
    float3 p = ro + rd * t;
    hit = sceneSDF(p);
    if(hit.dist < 0.0001 || t > 100.0) {
      break;
    }
    t += hit.dist;
  }
  hit.dist = t;
  return hit;
}

// Calculate shadows using ray marching
float calcShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  
  for(int i = 0; i < 32; i++) {
    float h = sceneSDF(ro + rd * t).dist;
    if(h < 0.001) return 0.0;
    
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.2);
    
    if(t > maxt) break;
  }
  
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  for(int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = sceneSDF(pos + h * nor).dist;
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// Lighting function to calculate illumination for a point
vec3 calculateLighting(vec3 point, vec3 normal, vec3 baseColor, int materialType) {
  // Light settings
  vec3 ambientColor = vec3(0.1, 0.1, 0.1);
  vec3 diffuseColor = vec3(0.7, 0.7, 0.7);
  vec3 lightPosition = cameraPosition; // Position of the point light
  float lightIntensity = 1;
  
  // Ambient component
  vec3 ambient = ambientColor * baseColor;
  
  // Diffuse lighting (directional light from above)
  vec3 lightDir = normalize(vec3(0.0, 5.0, 0.0));
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * diffuseColor * baseColor;
  
  // Point light calculation
  vec3 pointLightDir = normalize(lightPosition - point);
  float pointDiff = max(dot(normal, pointLightDir), 0.0);
  
  // Attenuation (light gets weaker with distance)
  float distance = length(lightPosition - point);
  float attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);
  
  vec3 pointLight = pointDiff * lightIntensity * attenuation * baseColor;
  
  // Combine all lighting components
  return ambient + diffuse + pointLight;
}

vec3 stylizedTonemap(vec3 color) {
  // Moderate exposure boost for balanced brightness
  color *= 5.2;  // Slightly reduced exposure for better balance
  
  // Use a more extreme tone mapping curve
  // Modified Reinhard with slightly reduced white point for controlled highlights
  float whitePoint = 6.5;
  color = (color * (1.0 + color/(whitePoint*whitePoint))) / (1.0 + color);
  
  // Apply color correction before saturation boost
  // This helps prevent oversaturation of already bright areas
  color = pow(color, vec3(0.85));  // Gamma adjustment for brighter midtones
  
  // Enhance saturation significantly
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, 1.9);  // More controlled saturation boost
  
  // Apply a more aggressive contrast S-curve for punchier look
  color = color * color * (3.0 - 1.7 * color);  // Modified to prevent too much darkening
  
  // Remove color bias for neutral black and white rendering
  // If you still want some vibrancy in colored objects but neutral blacks/whites,
  // you could use a selective approach instead
  
  return clamp(color, 0.0, 1.0);
}

// PBR lighting calculation
vec3 pbr(vec3 p, vec3 n, vec3 v, Material mat) {
  setupLights();
    
  // Material properties
  vec3 albedo = mat.color;
  float roughness = mat.roughness;
  float metalness = mat.metalness;
  
  // Constants for PBR
  const float PI = 3.14159265359;
  
  // Base reflectivity for dielectrics (non-metals)
  vec3 F0 = mix(vec3(0.04), albedo, metalness);
  
  // Calculate ambient occlusion
  float ao = calcAO(p, n);
  
  // Initialize the accumulator for direct lighting
  vec3 Lo = vec3(0.0);
  
  // Calculate lighting contribution from each light
  vec3 L;
  float attenuation = 1.0;
  
  // Directional light
  // Directional light
  L = normalize(light.position);
    
  // Simple shadow calculation for directional light
  float shadow = calcShadow(p, L, 0.1, 20.0, 16.0);
  attenuation *= shadow;

  // Half vector between view and light directions
  vec3 H = normalize(v + L);
  
  // Calculate dot products for lighting equation
  float NdotL = max(dot(n, L), 0.0);
  float NdotV = max(dot(n, v), 0.0);
  float NdotH = max(dot(n, H), 0.0);
  float HdotV = max(dot(H, v), 0.0);
  
  if(NdotL > 0.0) {
    // Diffuse term (Lambert)
    vec3 diffuse = albedo / PI;
    
    // Specular term (simplified GGX)
    float alpha = roughness * roughness;
    float alpha2 = alpha * alpha;
    
    // Normal Distribution Function (D)
    float denom = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
    float D = alpha2 / (PI * denom * denom);
    
    // Fresnel term (F) - Schlick approximation
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - HdotV, 5.0);
    
    // Geometry term (G) - simplified
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float G = NdotL * NdotV / ((NdotL * (1.0 - k) + k) * (NdotV * (1.0 - k) + k));
    
    // Combine terms for specular
    vec3 specular = D * F * G / (4.0 * NdotV * NdotL + 0.001);
    //specular *= 0.6; // Reduce specular intensity to 60%
    
    // Energy conservation: metallic surfaces don't have diffuse
    vec3 kD = (1.0 - F) * (1.0 - metalness);
    // Combine diffuse and specular
    Lo += (kD * diffuse + specular) * light.color * light.intensity * NdotL * attenuation;
  }
  // Ambient lighting (simplified IBL)
  vec3 ambient = vec3(0.03) * albedo * ao;
  // Final color
  vec3 color = ambient + Lo;
  color = stylizedTonemap(color);

  return color;
}


float3 render(float3 ro, float3 rd) {
  float3 col = backgroundColor;
  Hit hit = raymarch(ro, rd);
  // If we hit something
  if(hit.dist < 100.0) {
    vec3 p = ro + rd * hit.dist;
    vec3 n = getNormal(p);
    // View direction (from point to camera)
    vec3 v = normalize(ro - p);
    // Apply PBR lighting
    col = pbr(p, n, v, hit.material);
  }
  return col;
}


vec4 main(float2 fragCoord) {
  const int samples = 1; // Use 2 for AA

  float sampleStrength = 1.0/float(samples*samples);
  float3 finalColor = float3(0.0);
  
  // Perform supersampling
  for(int m = 0; m < samples; m++) {
    for(int n = 0; n < samples; n++) {
      // Calculate offset for this sample (only if using AA)
      vec2 offset = (samples > 1) ? 
        (vec2(float(m), float(n)) / float(samples) - 0.5/float(samples)) : 
        vec2(0.0);
      
      // Get UV coordinates with the offset
      float2 uv = ((fragCoord + offset) - 0.5 * size.xy) / size.y;
      uv.y = -uv.y;  // Flip Y coordinate to match Skia's coordinate system
      
      // Camera setup
      float3 ro = cameraPosition;
      float3 ta = cameraLookAt;
      float cr = cameraRoll;

      // Camera matrix
      float3 ww = normalize(ta - ro);
      float3 cp = float3(sin(cameraRoll), cos(cameraRoll), 0.0);
      float3 uu = normalize(cross(ww, cp));
      float3 vv = normalize(cross(uu, ww));
      
      float3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);
      
      // Render this sample
      float3 col = render(ro, rd);
      
      // Accumulate color
      finalColor += col * sampleStrength;
    }
  }
  // Final gamma correction
  finalColor = pow(finalColor, vec3(0.4545));
  return vec4(finalColor, 1.0);
}
`;

export const Chess = () => {
  const rotateX = useSharedValue(Math.PI / 4);
  const rotateY = useSharedValue(Math.PI / 4);

  const gesture = Gesture.Pan()
    .onChange((event) => {
      rotateY.value += event.changeX / sf;
      rotateX.value -= event.changeY / sf;
    })
    .onEnd(({ velocityX, velocityY }) => {
      rotateX.value = withDecay({ velocity: velocityY / sf });
      rotateY.value = withDecay({ velocity: velocityX / sf });
    });
  const uniforms = useDerivedValue(() => {
    const dist = 12;
    const cameraPosition = [
      dist * Math.cos(rotateX.value) * Math.cos(rotateY.value),
      dist * Math.sin(rotateX.value),
      dist * Math.cos(rotateX.value) * Math.sin(rotateY.value),
    ];
    return {
      cameraPosition,
    };
  });
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ flex: 1 }}>
          <Fill>
            <Shader source={rt} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </GestureDetector>
    </View>
  );
};
