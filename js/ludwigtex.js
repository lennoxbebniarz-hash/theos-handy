// Theos Seitenscheidel - Ludwig Zigaretti: echte Oberflächen aus Blender (2026-11-20).
// In Blender prozedural gebaut und gebacken (spiele/ludwig-blender/ludwig_texturen.blend): Ziegel, Putz, Asphalt, Gehwegplatten, Kopfstein, Rasen, Kies
// jeweils als Farbe (…_farbe.jpg) und Relief (…_relief.jpg, Normal-Map). Dazu freigestellte Pflanzen (laub.png, efeu.png, gras.png).
// Alle Kacheln sind nahtlos. Maßstab einer Kachel: Ziegel/Putz 2,5 m, Asphalt 4 m, Gehweg/Kopfstein/Rasen/Kies 2 m.
// Falle: Texture.clone() vor dem Laden wird nie hochgeladen. Deshalb lädt jede Wiederholung ihr eigenes Textur-Objekt (der Browser hat das Bild dann im Speicher).
import * as THREE from './vendor/three.module.min.js';

const BASE = 'media/ludwig/tex/';
const cache = new Map();
const loader = new THREE.TextureLoader();
function load(file, srgb, rx = 1, ry = 1) {
  const key = `${file}:${srgb ? 's' : 'l'}:${rx}:${ry}`; if (cache.has(key)) return cache.get(key);
  const t = loader.load(BASE + file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t); return t;
}
// Oberfläche: Farbe + Relief, rx × ry Wiederholungen
export function surface(name, rx = 1, ry = 1) { return { map: load(`${name}_farbe.jpg`, true, rx, ry), normalMap: load(`${name}_relief.jpg`, false, rx, ry) }; }
export const plant = (name) => load(`${name}.png`, true);
// UV einer flachen Fläche auf Weltmaß bringen: eine Kachel = tile Meter (für PlaneGeometry, die sonst 0..1 über die ganze Fläche spannt)
export function worldUV(meshOrGeo, tile) {
  const g = meshOrGeo.isMesh ? meshOrGeo.geometry : meshOrGeo; const p = g.parameters || {}; const w = p.width || 1; const h = p.height || 1; const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (h / tile)); uv.needsUpdate = true; return meshOrGeo;
}
