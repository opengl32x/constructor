import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { build, makeWeave } from './garmentGeometry';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ProductType, CanvasArea, DesignSide } from '@/types';

interface Props {
  productType: ProductType;
  color: string;
  side: DesignSide;
  texture: string | null;
  canvasArea: CanvasArea;
  /** Called with UV (0..1) while the user drags the artwork over the garment. */
  onDrag?: (u: number, v: number) => void;
}

function disposeGarment(group: THREE.Group | null) {
  const materials = new Set<THREE.Material>();
  group?.traverse(o => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
    }
  });
  materials.forEach(m => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); });
}

interface State {
  holder: THREE.Group;
  mat: THREE.MeshPhysicalMaterial | null;
  patches: { front: THREE.Mesh; back: THREE.Mesh } | null;
  patch: THREE.Mesh | null;
  targetRot: number;
  garment: THREE.Group | null;
}

export default function Garment3D({ productType, color, side, texture, canvasArea, onDrag }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const st = useRef<State | null>(null);
  const weave = useRef<THREE.Texture | null>(null);
  const live = useRef({ color, area: canvasArea, onDrag });
  live.current = { color, area: canvasArea, onDrag };
  const areaKey = `${canvasArea.x},${canvasArea.y},${canvasArea.width},${canvasArea.height}`;

  // scene setup (once)
  useEffect(() => {
    const el = wrap.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pm.fromScene(room, .04);
    scene.environment = environment.texture;
    room.dispose();
    scene.environmentIntensity = .65;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-3, 4, 5);
    key.shadow.bias = -.0002;
    key.shadow.normalBias = .015;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, .5);
    fill.position.set(-4, 1, -2);
    scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.45;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camera.position.set(0, .25, 6.5);
    const controls = new OrbitControls(camera, dom);
    Object.assign(controls, { enablePan: false, enableDamping: true, minDistance: 2.5, maxDistance: 8, maxPolarAngle: Math.PI * .62 });
    controls.target.set(0, .1, 0);

    const holder = new THREE.Group();
    scene.add(holder);
    weave.current = makeWeave();
    const S: State = { holder, mat: null, patches: null, patch: null, targetRot: 0, garment: null };
    st.current = S;

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // drag artwork across the garment surface
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    const hit = (e: PointerEvent) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!S.patch?.visible) return null;
      return ray.intersectObject(S.patch, false)[0]?.uv ?? null;
    };
    const down = (e: PointerEvent) => {
      const uv = hit(e);
      if (uv && live.current.onDrag) {
        dragging = true;
        controls.enabled = false;
        live.current.onDrag(uv.x, uv.y);
      }
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const uv = hit(e);
      if (uv) live.current.onDrag?.(uv.x, uv.y);
    };
    const up = () => { if (dragging) { dragging = false; controls.enabled = true; } };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      holder.rotation.y += (S.targetRot - holder.rotation.y) * .12;
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      controls.dispose();
      disposeGarment(S.garment);
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      weave.current?.dispose();
      environment.dispose();
      key.shadow.dispose();
      pm.dispose();
      renderer.dispose();
      el.removeChild(dom);
      st.current = null;
    };
  }, []);

  // (re)build garment
  useEffect(() => {
    const S = st.current;
    if (!S || !weave.current) return;
    if (S.garment) {
      disposeGarment(S.garment);
      S.holder.remove(S.garment);
    }
    const { group, mat, patches } = build(productType, live.current.color, live.current.area, weave.current);
    S.holder.add(group);
    Object.assign(S, { garment: group, mat, patches, patch: patches[side] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType, areaKey]);

  // fabric colour
  useEffect(() => {
    const m = st.current?.mat;
    if (!m) return;
    m.color.set(color);
    m.sheenColor.set('#dddddd');
  }, [color, productType, areaKey]);

  // design texture + side
  useEffect(() => {
    const S = st.current;
    if (!S?.patches) return;
    S.targetRot = side === 'back' ? Math.PI : 0;
    S.patch = S.patches[side];
    S.patches.front.visible = S.patches.back.visible = false;
    if (!texture) return;
    let dead = false;
    new THREE.TextureLoader().load(texture, (t) => {
      if (dead || !S.patch) { t.dispose(); return; }
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const m = S.patch.material as THREE.MeshStandardMaterial;
      m.map?.dispose();
      m.map = t;
      m.needsUpdate = true;
      S.patch.visible = true;
    });
    return () => { dead = true; };
  }, [texture, side, productType, areaKey]);

  return <div ref={wrap} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}
