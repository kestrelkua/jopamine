// "Do you think colors can become angled??" — a material whose colour depends on the angle you see it from.
// Its hue sits around a chosen base shade and swings away from it as a surface turns from you, so walking
// around something changes its colour. Shades can also wash in over it (other shades acting on you).
import * as THREE from 'three'

export interface ShadeUniforms {
  /** The base hue, 0..1 (Caribbean blue is about 0.53). */
  uBase: { value: number }
  /** How far the hue swings with angle. */
  uSpread: { value: number }
  /** 0 = grey, 1 = full colour. */
  uSat: { value: number }
  /** Another shade washing over everything, and how strongly (0..1). */
  uDriftHue: { value: number }
  uDrift: { value: number }
}

export const makeShade = (base = 0.53, sat = 1, spread = 0.09): ShadeUniforms => ({
  uBase: { value: base },
  uSpread: { value: spread },
  uSat: { value: sat },
  uDriftHue: { value: base },
  uDrift: { value: 0 },
})

const HSV = /* glsl */ `
uniform float uBase;
uniform float uSpread;
uniform float uSat;
uniform float uDriftHue;
uniform float uDrift;
vec3 shadeHsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float shadeHueMix(float a, float b, float k) {
  float d = fract(b - a + 0.5) - 0.5;
  return a + d * k;
}
`

/**
 * A Lambert material tinted by angle. `light` sets how bright it is (0..1), `chroma` how saturated.
 * Everything that shares `u` changes together.
 */
export function angled(
  u: ShadeUniforms,
  { light = 0.75, chroma = 0.75, opacity = 1, emissive = 0, side = THREE.FrontSide, facets = false }: { light?: number; chroma?: number; opacity?: number; emissive?: number; side?: THREE.Side; facets?: boolean } = {},
) {
  const m = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: opacity < 1, opacity, side, emissive: '#ffffff', emissiveIntensity: 0, flatShading: facets })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u)
    shader.fragmentShader = HSV + shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `#include <normal_fragment_maps>
      {
        vec3 vdir = normalize(vViewPosition);
        float facing = clamp(dot(normalize(normal), vdir), -1.0, 1.0);
        float h = uBase + (1.0 - facing) * uSpread + normal.x * uSpread * 0.7 - normal.y * uSpread * 0.3;
        h = shadeHueMix(h, uDriftHue, uDrift);
        vec3 c = shadeHsv2rgb(vec3(fract(h), ${chroma.toFixed(3)} * uSat, ${light.toFixed(3)}));
        diffuseColor.rgb = c;
        totalEmissiveRadiance += c * ${emissive.toFixed(3)};
      }`,
    )
  }
  // Each combination of settings compiles its own program.
  m.customProgramCacheKey = () => `angled-${light}-${chroma}-${emissive}-${facets}`
  return m
}

/** A plain colour at the current shade (for skies, fog, scarves). */
export function shadeColor(u: ShadeUniforms, { light = 0.7, chroma = 0.7, offset = 0 } = {}) {
  let h = u.uBase.value + offset
  const d = ((((u.uDriftHue.value - h + 0.5) % 1) + 1) % 1) - 0.5
  h += d * u.uDrift.value
  return new THREE.Color().setHSL(((h % 1) + 1) % 1, chroma * u.uSat.value, light)
}
