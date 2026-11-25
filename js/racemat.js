// Theos Seitenscheidel - Material-Bausteine des Rennmodus: weiche Schatten, PBR-Flächen aus racetex.js, Laub mit durchscheinendem Gegenlicht, Wind.
import * as THREE from './vendor/three.module.min.js';

export const RT = { time: { value: 0 }, wind: { value: 1 }, car: { value: new THREE.Vector3(1e6, 0, 0) } }; // gemeinsame Uniforms aller Rennmodus-Materialien

// Schattenkante: acht versetzte Abfragen statt des harten Rasters, die Blätter zittern leicht im Wind, auch wenn die Karte gerade nicht neu gerechnet wird
const SHADOW_PARS = THREE.ShaderChunk.shadowmap_pars_fragment.replace('if ( frustumTest ) {', `if ( frustumTest ) {
    float ang = 6.2832 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); vec2 tx = shadowRadius / shadowMapSize; float sum = 0.0;
    vec2 sc = shadowCoord.xy + vec2(sin(raceTime * 1.7 + shadowCoord.y * 1300.0), cos(raceTime * 1.3 + shadowCoord.x * 1100.0)) * tx * 0.55;
    for (int i = 0; i < SHADOW_TAPS; i++) { float r = sqrt((float(i) + 0.5) / float(SHADOW_TAPS)); float a = float(i) * 2.4 + ang; sum += texture2DCompare(shadowMap, sc + vec2(cos(a), sin(a)) * r * tx, shadowCoord.z); }
    return mix(1.0, sum / float(SHADOW_TAPS), shadowIntensity);`).replace('float texture2DCompare(', 'uniform float raceTime;\n\tfloat texture2DCompare(');

export function patchShadow(shader, taps = 8) { shader.uniforms.raceTime = RT.time; shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmap_pars_fragment>', `#define SHADOW_TAPS ${taps}\n${SHADOW_PARS}`); }

// A/N-Texturpaar auf ein Standardmaterial: Normale aus rg, Rauheit aus b, Verdeckung aus a; `extra` darf den Shader weiter verändern
export function surfacePatch(mat, extra) {
  const key = 'surf' + (extra ? extra.key : '');
  mat.onBeforeCompile = (shader) => { patchShadow(shader);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness; vec4 surfN = texture2D(normalMap, vNormalMapUv); roughnessFactor *= surfN.b * 1.25;')
      .replace('#include <normal_fragment_maps>', 'vec3 mapN = vec3(surfN.xy * 2.0 - 1.0, 0.0); mapN.xy *= normalScale; mapN.z = sqrt(saturate(1.0 - dot(mapN.xy, mapN.xy))); normal = normalize(tbn * mapN);')
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= mix(1.0, surfN.a, 0.8); reflectedLight.indirectSpecular *= mix(1.0, surfN.a, 0.6); reflectedLight.directDiffuse *= mix(1.0, surfN.a, 0.3);');
    if (extra) extra.fn(shader); };
  mat.customProgramCacheKey = () => key; return mat;
}
export function surface(tex, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: o.noMap ? null : tex.a, normalMap: tex.n, color: o.color === undefined ? 0xffffff : o.color, roughness: o.roughness === undefined ? 1 : o.roughness, metalness: o.metalness || 0, vertexColors: !!o.vertexColors, side: o.side || THREE.FrontSide, envMapIntensity: o.env === undefined ? 1 : o.env }); m.normalScale.set(o.normal === undefined ? 1 : o.normal, o.normal === undefined ? 1 : o.normal); return surfacePatch(m, o.extra);
}

// Wind: Stamm schwankt langsam, Äste nicken, Blätter zittern. aw = (Stammgewicht, Ast-/Blattgewicht, Phase)
export const WIND_VS = `
  { vec3 ip = vec3(0.0);
#ifdef USE_INSTANCING
    ip = instanceMatrix[3].xyz;
#endif
    float ph = ip.x * 0.11 + ip.z * 0.13; float t = raceTime * raceWind;
    vec3 s = vec3(sin(t * 0.9 + ph), 0.0, cos(t * 0.73 + ph * 1.3)) * aw.x * 0.17; s += vec3(sin(t * 2.1 + aw.z * 6.3 + ph), sin(t * 1.7 + aw.z * 9.1) * 0.5, cos(t * 2.4 + aw.z * 4.2)) * aw.y * 0.07; s += vec3(sin(t * 7.3 + aw.z * 31.0 + position.y), cos(t * 8.1 + aw.z * 17.0), sin(t * 6.1 + position.x * 3.0)) * aw.y * 0.018; transformed += s; }`;
function windVertex(shader) { shader.uniforms.raceTime = RT.time; shader.uniforms.raceWind = RT.wind; shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aw; uniform float raceTime, raceWind;').replace('#include <begin_vertex>', `#include <begin_vertex>${WIND_VS}`); }

// Tiefenmaterial der Bäume für die Schattenkarte: gleicher Wind, gleiche Blattlöcher
export function windDepth(map, alphaTest) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: map || null, alphaTest: alphaTest || 0, side: map ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = windVertex; m.customProgramCacheKey = () => 'windDepth' + (map ? 1 : 0); return m;
}
export const barkExtra = { key: 'bark', fn: (s) => windVertex(s) };

// Laub: Licht legt sich weich um die Krone, Gegenlicht scheint durch die Blätter, die Normale wird nie gekippt (sie zeigt aus der Krone heraus)
const LEAF_LIGHT = `
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
  float nl = dot( geometryNormal, directLight.direction ); float wrap = saturate( ( nl + 0.42 ) / 1.42 ); wrap *= wrap * 0.35 + 0.65;
  float back = pow( saturate( dot( geometryViewDir, - directLight.direction ) ), 4.0 ) * 1.5 + saturate( - nl ) * 0.42;
  vec3 irradiance = ( wrap + back * vec3( 1.12, 1.34, 0.46 ) ) * directLight.color;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Lambert
#define RE_IndirectDiffuse RE_IndirectDiffuse_Lambert`;
export const AMB = { up: { value: new THREE.Color(2.2, 2.5, 2.9) }, down: { value: new THREE.Color(0.8, 0.95, 0.5) } };
const CRUSH_VS = `
  { float cd = distance(ip0.xz, raceCar.xz); float ck = smoothstep(2.4, 3.6, cd); transformed = mix(vec3(transformed.x, transformed.y * 0.04, transformed.z), transformed, ck); }`;
export function foliage(map, o = {}) {
  const m = new THREE.MeshLambertMaterial({ map, alphaTest: o.alphaTest === undefined ? 0.42 : o.alphaTest, alphaToCoverage: true, side: THREE.DoubleSide, vertexColors: true });
  m.onBeforeCompile = (shader) => { patchShadow(shader, 4); windVertex(shader); if (o.crush) { shader.uniforms.raceCar = RT.car; shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 raceCar;').replace('#include <project_vertex>', `vec3 ip0 = instanceMatrix[3].xyz;${CRUSH_VS}\n#include <project_vertex>`); } shader.uniforms.uAmbU = AMB.up; shader.uniforms.uAmbD = AMB.down;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uAmbU, uAmbD;').replace('#include <lights_lambert_pars_fragment>', `varying vec3 vViewPosition;
struct LambertMaterial { vec3 diffuseColor; float specularStrength; };
#define Material_LightProbeLOD( material ) (0)
${LEAF_LIGHT}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  { vec2 q = vMapUv * 2048.0; vec2 dx = dFdx(q), dy = dFdy(q); float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy)))); diffuseColor.a *= 1.0 + mip * 0.26; }`)
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;')
      .replace('#include <lights_fragment_maps>', '{ vec3 wn = inverseTransformDirection( normal, viewMatrix ); irradiance += mix( uAmbD, uAmbU, wn.y * 0.5 + 0.5 ) * vColor.g; }\n#include <lights_fragment_maps>'); };
  m.customProgramCacheKey = () => 'foliage' + (o.crush ? 'c' : ''); return m;
}
