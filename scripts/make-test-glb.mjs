/**
 * Gera arquivos de TESTE para o visualizador 3D — não são veículos.
 *  - seed/test-models/objeto-calibracao.glb : pedestal + bloco + esfera (geometria neutra, cores da marca)
 *  - seed/test-models/arquivo-invalido.glb  : texto com extensão .glb (deve ser recusado no upload)
 *
 * Servem para validar carregamento, rotação, zoom, limites, liberação de memória e mensagens de erro
 * sem usar nenhum modelo de terceiros e sem simular um carro.
 * Uso: node scripts/make-test-glb.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";

const parts = [
  { geo: new THREE.CylinderGeometry(1.6, 1.7, 0.12, 64), pos: [0, 0.06, 0], color: [0.08, 0.08, 0.09, 1], metal: 0.2, rough: 0.6 },
  { geo: new THREE.BoxGeometry(2.4, 0.7, 1.1), pos: [0, 0.47, 0], color: [0.75, 0.05, 0.07, 1], metal: 0.6, rough: 0.3 },
  { geo: new THREE.SphereGeometry(0.32, 48, 24), pos: [0.6, 1.14, 0], color: [0.9, 0.9, 0.92, 1], metal: 1, rough: 0.15 },
  { geo: new THREE.BoxGeometry(0.5, 0.5, 0.5), pos: [-0.7, 1.07, 0], color: [0.15, 0.15, 0.17, 1], metal: 0.1, rough: 0.8 },
];

const chunks = [];
let byteOffset = 0;
const bufferViews = [];
const accessors = [];
const meshes = [];
const materials = [];
const nodes = [];

function pushView(typed, target) {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (bytes.length % 4)) % 4;
  chunks.push(bytes, Buffer.alloc(pad));
  bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length, target });
  byteOffset += bytes.length + pad;
  return bufferViews.length - 1;
}

for (const [i, p] of parts.entries()) {
  const g = p.geo.toNonIndexed ? p.geo : p.geo;
  const pos = g.getAttribute("position").array;
  const nor = g.getAttribute("normal").array;
  const idx = g.getIndex() ? new Uint32Array(g.getIndex().array) : null;
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const posView = pushView(new Float32Array(pos), 34962);
  accessors.push({ bufferView: posView, componentType: 5126, count: pos.length / 3, type: "VEC3", min: bb.min.toArray(), max: bb.max.toArray() });
  const posAcc = accessors.length - 1;
  const norView = pushView(new Float32Array(nor), 34962);
  accessors.push({ bufferView: norView, componentType: 5126, count: nor.length / 3, type: "VEC3" });
  const norAcc = accessors.length - 1;
  let idxAcc;
  if (idx) {
    const idxView = pushView(idx, 34963);
    accessors.push({ bufferView: idxView, componentType: 5125, count: idx.length, type: "SCALAR" });
    idxAcc = accessors.length - 1;
  }
  materials.push({ name: `mat-${i}`, pbrMetallicRoughness: { baseColorFactor: p.color, metallicFactor: p.metal, roughnessFactor: p.rough } });
  meshes.push({ primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, ...(idxAcc != null ? { indices: idxAcc } : {}), material: i }] });
  nodes.push({ mesh: i, translation: p.pos, name: `parte-${i}` });
}

const bin = Buffer.concat(chunks);
const gltf = {
  asset: { version: "2.0", generator: "Bragatto — objeto de calibração (teste, não é um veículo)" },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);

const header = Buffer.alloc(12);
const total = 12 + 8 + json.length + 8 + bin.length;
header.write("glTF", 0, "ascii");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(json.length, 0);
jsonHeader.write("JSON", 4, "ascii");
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.write("BIN\0", 4, "ascii");

const dir = path.join("seed", "test-models");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "objeto-calibracao.glb"), Buffer.concat([header, jsonHeader, json, binHeader, bin]));
writeFileSync(path.join(dir, "arquivo-invalido.glb"), "isto não é um arquivo glTF\n");
console.log(`✓ ${dir}/objeto-calibracao.glb (${total} bytes) e arquivo-invalido.glb`);
