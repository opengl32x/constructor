import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

const K = 0.0058; // mockup px -> world units
interface Cfg { rx: number; rz: number; h: number; top: number; sleeve: number; ang: number; hood: boolean; cap: boolean }
const CFG: Record<ProductType, Cfg> = {
  tshirt:     { rx: .85, rz: .50, h: 2.2, top: .9, sleeve: .6,  ang: 1.0, hood: false, cap: false },
  sweatshirt: { rx: .88, rz: .52, h: 2.2, top: .9, sleeve: 1.7, ang: .3,  hood: false, cap: false },
  hoodie:     { rx: .92, rz: .58, h: 2.2, top: .9, sleeve: 1.7, ang: .3,  hood: true,  cap: false },
  cap:        { rx: .90, rz: .90, h: .55, top: 1,  sleeve: 0,   ang: 0,   hood: false, cap: true },
};

const fold = (x: number, y: number, z: number, a: number) =>
  a * (Math.sin(y * 9 + x * 3.1) * Math.cos(x * 5 - y * 2.3) + .5 * Math.sin(y * 21 + z * 4 + x * 2));

function displace(geo: THREE.BufferGeometry, yOff: number, amp: number) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const l = Math.hypot(x, z) || 1;
    const d = fold(x, y + yOff, z, amp);
    p.setX(i, x + (x / l) * d);
    p.setZ(i, z + (z / l) * d);
  }
  geo.computeVertexNormals();
}

function makeWeave() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080';
  x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 4) {
    const odd = (i / 4) % 2;
    x.fillStyle = odd ? '#9a9a9a' : '#6a6a6a';
    x.fillRect(i, 0, 2, 64);
    x.fillStyle = odd ? '#6a6a6a' : '#9a9a9a';
    x.fillRect(0, i, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(40, 14);
  return t;
}

function build(type: ProductType, color: string, area: CanvasArea, weave: THREE.Texture) {
  const c = CFG[type];
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  const mat = new THREE.MeshPhysicalMaterial({
    color: col, roughness: .9, sheen: 1, sheenRoughness: .5,
    sheenColor: col.clone().lerp(new THREE.Color('#ffffff'), .35),
    bumpMap: weave, bumpScale: .8, side: THREE.DoubleSide,
  });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // Tailored torso: a continuous, softly contoured fabric shell rather than
  // the old open cylinder + dome (which read as armour/body armour).
  if (!c.cap) {
    const rings = [
      [-c.h / 2, .82], [-c.h / 2 + .05, .86], [-.55, .90],
      [-.15, .94], [.25, 1.00], [.62, 1.04], [.82, .98],
      [c.h / 2 - .12, .78], [c.h / 2, .58],
    ];
    const radial = 96, positions: number[] = [], indices: number[] = [];
    rings.forEach(([y, width], ri) => {
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2;
        const ripple = .008 * Math.sin(a * 7 + ri * .4);
        positions.push(Math.cos(a) * c.rx * width * (1 + ripple), y,
          Math.sin(a) * c.rz * width * (1 + ripple));
      }
    });
    for (let r = 0; r < rings.length - 1; r++) {
      for (let j = 0; j < radial; j++) {
        const a = r * (radial + 1) + j, b = a + radial + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    tg.setIndex(indices);
    tg.computeVertexNormals();
    add(tg);
  } else {
    const crown = add(new THREE.SphereGeometry(.58, 64, 32));
    crown.scale.set(1.0, .68, .9);
    crown.position.y = .08;
  }

  // Ribbed collar sits at the actual neckline, not above a dome.

  if (c.cap) {
    const brim = add(new THREE.CircleGeometry(1, 40, 0, Math.PI));
    brim.rotation.x = Math.PI / 2;
    brim.scale.set(.8, 1.0, 1);
    brim.position.set(0, -c.h / 2 + .08, .4);
  } else {
    const dark = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(.35), roughness: 1 });
    const collar = add(new THREE.TorusGeometry(.2, .035, 16, 48), mat);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1, .6, 1);
    collar.position.y = c.h / 2 - .015;
    const hole = add(new THREE.CircleGeometry(.2, 32), dark);
    hole.rotation.x = -Math.PI / 2;
    hole.scale.set(1, .6, 1);
    hole.position.y = c.h / 2 - .02;
  }

  for (const s of c.sleeve ? [-1, 1] : []) {
    const geo = new THREE.CylinderGeometry(c.sleeve > 1 ? .22 : .27, c.sleeve > 1 ? .18 : .23, c.sleeve, 48, 24, false);
    displace(geo, 0, .015);
    const m = add(geo);
    const sx = s * c.rx * .79, sy = c.h / 2 - .12;
    m.rotation.z = s * c.ang;
    m.position.set(sx + (s * Math.sin(c.ang) * c.sleeve) / 2, sy - (Math.cos(c.ang) * c.sleeve) / 2, 0);
  }

  if (c.hood) {
    const hood = add(new THREE.SphereGeometry(.5, 32, 24));
    hood.scale.set(1, .9, .8);
    hood.position.set(0, c.h / 2 + .25, -.28);
  }

  // print patches: hug the torso surface, share the same fold function
  const w = (c.cap ? .6 : 1) * area.width * K;
  const ph = Math.min(c.h * .9, area.height * K * (c.cap ? .5 : 1));
  const cy = c.cap ? 0 : Math.max(-c.h / 2 + ph / 2, Math.min(c.h / 2 - ph / 2, 1.3 - (area.y + area.height / 2 - 60) * K));
  const rAt = (y: number) => 1 + (c.top - 1) * (y / c.h + .5) + .006;
  const th = 2 * Math.asin(Math.min(.98, w / (2 * c.rx)));
  const mkPatch = (start: number) => {
    const geo = new THREE.CylinderGeometry(rAt(cy + ph / 2), rAt(cy - ph / 2), ph, 48, 12, true, start, th);
    displace(geo, cy, .02);
    geo.translate(0, cy, 0);
    const m = new THREE.MeshStandardMaterial({
      transparent: true, roughness: .85, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.scale.set(c.rx, 1, c.rz);
    mesh.visible = false;
    g.add(mesh);
    return mesh;
  };
  const patches = { front: mkPatch(-th / 2), back: mkPatch(Math.PI - th / 2) };
  return { group: g, mat, patches };
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
    scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2.5, 4, 4);
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
    camera.position.set(0, .3, 5.2);
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
      S.garment.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
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
    m.sheenColor.copy(m.color).lerp(new THREE.Color('#ffffff'), .35);
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
