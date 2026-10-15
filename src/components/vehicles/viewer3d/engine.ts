/**
 * Motor do visualizador 3D (Three.js). Este módulo é importado dinamicamente — só é baixado
 * quando o visitante pede para ver o modelo.
 *
 * Decisões:
 * - Tone mapping "Neutral" (Khronos PBR Neutral): preserva as cores do material do modelo,
 *   sem o contraste/saturação artificiais de outros operadores.
 * - Renderização sob demanda: só desenha quando a câmera se move (economia de bateria).
 * - Controles próprios: arrastar na horizontal gira; no toque, o gesto vertical continua rolando a página
 *   (touch-action: pan-y) e a pinça aproxima. A roda do mouse só aproxima com Ctrl/⌘, para não
 *   sequestrar a rolagem.
 * - Limites de zoom e de inclinação calculados a partir do tamanho do modelo: o carro nunca sai de quadro.
 * - dispose() libera geometrias, materiais, texturas, ambiente, decodificadores e o contexto WebGL.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type ViewerOptions = {
  url: string;
  container: HTMLElement;
  reducedMotion: boolean;
  /** Lado máximo das texturas (px). Texturas maiores são reduzidas. */
  maxTextureSize: number;
  pixelRatioCap: number;
  onProgress?: (ratio: number | null) => void;
  onInteract?: () => void;
  onWheelWithoutModifier?: () => void;
  onContextLost?: () => void;
};

export type ViewerStats = { geometries: number; textures: number; programs: number };

export type ViewerHandle = {
  reset(): void;
  zoomBy(factor: number): void;
  rotateBy(radians: number): void;
  stats(): ViewerStats;
  dispose(): void;
};

const DEG = Math.PI / 180;
const MIN_POLAR = 58 * DEG; // não deixa olhar "de cima" demais
const MAX_POLAR = 86 * DEG; // nem por baixo do chão
const INITIAL_AZIMUTH = 35 * DEG; // 3/4 dianteiro (convenção glTF: frente em +Z)
const INITIAL_POLAR = 74 * DEG;

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function makeContactShadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.65)");
  g.addColorStop(0.55, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TEXTURE_SLOTS = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "aoMap",
  "emissiveMap",
  "alphaMap",
  "bumpMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "specularColorMap",
  "specularIntensityMap",
  "transmissionMap",
  "thicknessMap",
  "iridescenceMap",
  "iridescenceThicknessMap",
  "anisotropyMap",
  "lightMap",
  "displacementMap",
] as const;

function materialTextures(material: THREE.Material): THREE.Texture[] {
  const out: THREE.Texture[] = [];
  const rec = material as unknown as Record<string, unknown>;
  for (const slot of TEXTURE_SLOTS) {
    const t = rec[slot];
    if (t instanceof THREE.Texture) out.push(t);
  }
  return out;
}

/** Reduz texturas acima do limite (protege a memória de celulares). */
function limitTexture(tex: THREE.Texture, max: number, anisotropy: number) {
  tex.anisotropy = anisotropy;
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img?.height) return;
  const largest = Math.max(img.width, img.height);
  if (largest <= max) return;
  const scale = max / largest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(tex.image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if (typeof (tex.image as ImageBitmap).close === "function") (tex.image as ImageBitmap).close();
  tex.image = canvas;
  tex.needsUpdate = true;
}

export async function createViewer(opts: ViewerOptions): Promise<ViewerHandle> {
  const { container } = opts;
  let disposed = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatioCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "pan-y";
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  const envTexture = envTarget.texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.9;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 6, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(5, 3, -6);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 500);

  // ---- carregamento ----
  const draco = new DRACOLoader().setDecoderPath("/vendor/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);

  let gltfScene: THREE.Object3D;
  try {
    const gltf = await loader.loadAsync(opts.url, (e) => opts.onProgress?.(e.lengthComputable && e.total ? e.loaded / e.total : null));
    gltfScene = gltf.scene;
  } catch (err) {
    draco.dispose();
    pmrem.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    throw err;
  }

  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  gltfScene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) for (const t of materialTextures(m)) limitTexture(t, opts.maxTextureSize, maxAniso);
  });

  // centraliza no chão e mede
  const box = new THREE.Box3().setFromObject(gltfScene);
  const center = box.getCenter(new THREE.Vector3());
  gltfScene.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  box.setFromObject(gltfScene);
  const size = box.getSize(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 1e-3);
  scene.add(gltfScene);

  // sombra de contato (barata, sem shadow map)
  const shadowTex = makeContactShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(size.x * 1.5 || radius * 2, size.z * 1.5 || radius * 2, 1);
  shadow.position.y = 0.001;
  scene.add(shadow);

  // ---- câmera orbital com limites ----
  const target = new THREE.Vector3(0, size.y * 0.42, 0);
  const fitDistance = (radius / Math.sin((camera.fov * DEG) / 2)) * 1.08;
  const minDistance = fitDistance * 0.55;
  const maxDistance = fitDistance * 1.45;
  camera.near = Math.max(0.01, fitDistance / 100);
  camera.far = fitDistance * 20;

  const state = { azimuth: INITIAL_AZIMUTH, polar: INITIAL_POLAR, distance: fitDistance };
  const goal = { ...state };
  let velocity = 0;

  const applyCamera = () => {
    const sinP = Math.sin(state.polar);
    camera.position.set(
      target.x + state.distance * sinP * Math.sin(state.azimuth),
      target.y + state.distance * Math.cos(state.polar),
      target.z + state.distance * sinP * Math.cos(state.azimuth),
    );
    camera.lookAt(target);
  };

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // em telas estreitas, recua a câmera para o carro caber na largura
    const narrow = camera.aspect < 1 ? 1 / camera.aspect : 1;
    camera.zoom = 1 / Math.min(narrow, 1.9);
    camera.updateProjectionMatrix();
    requestRender();
  };

  // ---- loop sob demanda ----
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (disposed) return;
    let moving = false;
    if (Math.abs(velocity) > 1e-4 && !dragging) {
      goal.azimuth += velocity;
      velocity *= 0.92;
      moving = true;
    }
    const k = opts.reducedMotion ? 1 : 0.18;
    for (const prop of ["azimuth", "polar", "distance"] as const) {
      const d = goal[prop] - state[prop];
      if (Math.abs(d) > 1e-4) {
        state[prop] += d * k;
        moving = true;
      } else state[prop] = goal[prop];
    }
    applyCamera();
    renderer.render(scene, camera);
    if (moving) requestRender();
  };
  function requestRender() {
    if (!raf && !disposed) raf = requestAnimationFrame(tick);
  }

  const clampGoal = () => {
    goal.polar = Math.min(MAX_POLAR, Math.max(MIN_POLAR, goal.polar));
    goal.distance = Math.min(maxDistance, Math.max(minDistance, goal.distance));
  };

  // ---- interação ----
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let lastPinch = 0;
  let lastMoveT = 0;

  const onPointerDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === "mouse") canvas.setPointerCapture(e.pointerId);
    dragging = true;
    velocity = 0;
    lastMoveT = performance.now();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    opts.onInteract?.();
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch > 0) goal.distance *= lastPinch / dist;
      lastPinch = dist;
      clampGoal();
      requestRender();
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    const width = canvas.clientWidth || 1;
    const dAz = (-dx / width) * Math.PI * 1.4;
    goal.azimuth += dAz;
    if (e.pointerType === "mouse") goal.polar -= (dy / (canvas.clientHeight || 1)) * Math.PI * 0.6;
    const now = performance.now();
    velocity = opts.reducedMotion ? 0 : dAz / Math.max(1, (now - lastMoveT) / 16);
    lastMoveT = now;
    clampGoal();
    requestRender();
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    if (pointers.size === 0) {
      dragging = false;
      if (performance.now() - lastMoveT > 80) velocity = 0;
      requestRender();
    }
  };
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) {
      opts.onWheelWithoutModifier?.();
      return; // deixa a página rolar
    }
    e.preventDefault();
    goal.distance *= Math.exp(e.deltaY * 0.0015);
    clampGoal();
    requestRender();
    opts.onInteract?.();
  };
  const onContextLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("webglcontextlost", onContextLost);

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  applyCamera();
  requestRender();

  return {
    reset() {
      velocity = 0;
      goal.azimuth = state.azimuth + (((INITIAL_AZIMUTH - state.azimuth + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      goal.polar = INITIAL_POLAR;
      goal.distance = fitDistance;
      requestRender();
    },
    zoomBy(factor) {
      goal.distance *= factor;
      clampGoal();
      requestRender();
    },
    rotateBy(radians) {
      velocity = 0;
      goal.azimuth += radians;
      requestRender();
    },
    stats() {
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onContextLost);

      const textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        for (const m of mats) {
          for (const t of materialTextures(m)) textures.add(t);
          m.dispose();
        }
      });
      textures.forEach((t) => {
        const img = t.image as ImageBitmap | undefined;
        if (img && typeof img.close === "function") img.close();
        t.dispose();
      });
      shadowTex.dispose();
      scene.environment = null;
      envTarget.dispose();
      pmrem.dispose();
      roomEnv.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        mats.forEach((m) => m.dispose());
      });
      draco.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
