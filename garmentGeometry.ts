import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ProductType, CanvasArea } from '@/types';

// All print surfaces sample the same functions as their underlying cloth.
function surface(nu: number, nv: number, sample: (u: number, v: number) => THREE.Vector3) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const p = sample(i / nu, j / nv);
    positions.push(p.x, p.y, p.z); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

const profile = [[-1.12,.73,.27],[-.98,.77,.30],[-.7,.79,.31],[-.15,.78,.32],[.45,.83,.32],[.76,.85,.29],[.94,.70,.24],[1.08,.30,.21]];
function dimensions(y: number) {
  let i = 0;
  while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
  const a = profile[i], b = profile[i + 1];
  const t = THREE.MathUtils.smoothstep(y, a[0], b[0]);
  return [THREE.MathUtils.lerp(a[1],b[1],t), THREE.MathUtils.lerp(a[2],b[2],t)];
}
function wrinkles(x: number, y: number) {
  const edge = Math.pow(Math.min(1, Math.abs(x) / .85), 3);
  const hem = Math.exp(-Math.pow((y + .87) / .26, 2));
  return .009 * Math.sin(x * 19 + y * 4) + .007 * Math.cos(x * 29 - y * 5)
    + edge * .026 * Math.sin(y * 18 + Math.abs(x) * 7)
    + hem * .018 * Math.cos(x * 23 + y * 7);
}
function torso(x: number, y: number, side: number) {
  const [width, depth] = dimensions(y);
  const z = depth * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / width, 3.5)), 1 / 3.5);
  return new THREE.Vector3(x,y,side * (z + wrinkles(x,y)));
}

export function makeWeave() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(128,128);
  for (let y=0;y<128;y++) for(let x=0;x<128;x++) {
    const i=(y*128+x)*4;
    const value=128+16*Math.sin(x*Math.PI/2+y%4)+9*Math.cos(y*Math.PI/2);
    pixels.data.set([value,value,value,255],i);
  }
  ctx.putImageData(pixels,0,0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(12,12);
  return texture;
}

export function build(type: ProductType, color: string, area: CanvasArea, weave: THREE.Texture) {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness:.96, metalness:0,
    sheen:.32, sheenRoughness:.85, sheenColor:new THREE.Color('#dddddd'),
    bumpMap:weave, bumpScale:.008, side:THREE.DoubleSide });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material = mat) => {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.castShadow=mesh.receiveShadow=true; group.add(mesh); return mesh;
  };
  const seam = (points: THREE.Vector3[], radius=.005) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(32,points.length*2), radius, 5, false));
  const capPoint = (u: number,v: number) => {
    const a=u*Math.PI*2, theta=(1-v)*Math.PI/2;
    const rib=1+.004*Math.cos(a*6);
    return new THREE.Vector3(.9*Math.sin(theta)*Math.sin(a)*rib,
      -.42+.85*Math.cos(theta), .84*Math.sin(theta)*Math.cos(a)*rib);
  };
  if (type === 'cap') {
    add(surface(96,40,capPoint));
    // Curved, thick visor, with concentric rows of stitching.
    const visor=(u:number,v:number) => {
      const a=(u-.5)*Math.PI*1.03;
      return new THREE.Vector3(Math.sin(a)*(.86+v*.12),-.425-.15*v+.10*Math.pow(Math.sin(a),2),
        Math.cos(a)*(.73+v*.65));
    };
    add(surface(64,16,visor));
    const underside=add(surface(64,16,(u,v)=>visor(u,v).add(new THREE.Vector3(0,-.018,0))));
    underside.receiveShadow=true;
    for(const v of [.25,.45,.65,.85,1]) seam(Array.from({length:49},(_,i)=>visor(i/48,v)),.003);
    for(let i=0;i<6;i++) seam(Array.from({length:25},(_,j)=>capPoint(i/6,j/24).multiplyScalar(1.003)),.004);
    const button=add(new THREE.SphereGeometry(.055,20,12));button.position.y=.44;button.scale.y=.45;
    // Rear adjustment strap and buckle sit against the crown.
    const strap=add(new THREE.BoxGeometry(.44,.085,.027));strap.position.set(0,-.34,-.84);
    const buckle=add(new THREE.TorusGeometry(.047,.008,8,24));buckle.scale.x=.7;buckle.position.set(.12,-.34,-.866);
  } else {
    add(surface(112,100,(u,v)=>{
      const y=-1.12+v*2.2, [width]=dimensions(y), a=u*Math.PI*2;
      const x=width*Math.sin(a);
      return torso(x,y,Math.cos(a)>=0?1:-1);
    }));
    // Sleeves taper through the elbow into a cuff, with compressed fabric folds.
    const short=type==='tshirt', length=short?.67:1.66, angle=short?.98:.23;
    for(const sign of [-1,1]) {
      const sleeve=(u:number,v:number) => {
        const a=u*Math.PI*2;
        const radius=THREE.MathUtils.lerp(short?.28:.30,short?.23:.145,v)
          +.012*Math.sin(v*25+a*2)*Math.sin(v*Math.PI)
          +(short?0:.019*Math.sin(v*48)*Math.pow(v,3));
        const x=Math.cos(a)*radius,y=-v*length,z=Math.sin(a)*radius*.86;
        return new THREE.Vector3(sign*(.73+x*Math.cos(angle)-y*Math.sin(angle)),
          .84+x*Math.sin(angle)+y*Math.cos(angle),z);
      };
      add(surface(48,64,sleeve));
      for(const v of short?[.94,1]:[.90,.92,1]) seam(Array.from({length:49},(_,i)=>sleeve(i/48,v)),.006);
      if(!short) for(let i=0;i<48;i++) seam([sleeve(i/48,.92),sleeve(i/48,1)],.0025);
      seam(Array.from({length:30},(_,i)=>sleeve(.04+i*.015,.06)),.004);
    }
    // Neck binding and double-stitched hem.
    const collar=add(new THREE.TorusGeometry(.28,.026,12,64));
    collar.rotation.x=Math.PI/2;collar.scale.y=.75;collar.position.y=1.075;
    for(const y of [-1.10,-1.06,...(type==='tshirt'?[]:[-.96])]) {
      seam(Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;
        return torso(dimensions(y)[0]*Math.sin(a),y,Math.cos(a)>=0?1:-1);}),.006);
    }
    if(type!=='tshirt') for(let i=0;i<100;i++) {
      const a=i/100*Math.PI*2;
      seam([-.99,-1.10].map(y=>torso(dimensions(y)[0]*Math.sin(a),y,Math.cos(a)>=0?1:-1)),.002);
    }
    if(type==='hoodie') {
      // Open, double-sided cloth hood: a real opening instead of a solid sphere.
      const hood=(u:number,v:number)=>{
        const a=.9+u*(Math.PI*2-1.8), t=v*Math.PI*.90;
        return new THREE.Vector3(.40*Math.sin(t)*Math.sin(a),1.06+.51*Math.cos(t),
          -.16+.38*Math.sin(t)*Math.cos(a));
      };
      add(surface(64,40,hood));
      for(const u of [0,1]) seam(Array.from({length:40},(_,i)=>hood(u,i/39)),.013);
      for(const sign of [-1,1]) {
        seam([new THREE.Vector3(sign*.21,1.02,.24),new THREE.Vector3(sign*.24,.72,.37),new THREE.Vector3(sign*.22,.38,.36)],.012);
        const tip=add(new THREE.CylinderGeometry(.013,.013,.075,12));tip.position.set(sign*.22,.35,.36);
      }
      // Kangaroo pocket follows the lower torso, including folds.
      const pocket=(u:number,v:number)=>{
        const y=-.88+v*.49, width=.52-v*.15;
        return torso((u-.5)*2*width,y,1).add(new THREE.Vector3(0,0,.018));
      };
      add(surface(40,20,pocket));
      for(const v of [0,1]) seam(Array.from({length:30},(_,i)=>pocket(i/29,v)),.005);
      for(const u of [0,1]) seam(Array.from({length:20},(_,i)=>pocket(u,i/19)),.009);
    }
  }
  group.updateMatrixWorld(true);
  const cloth = group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && !(o.geometry instanceof THREE.TubeGeometry));
  const patch=(side:number)=>{
    const parts = cloth.map(mesh => {
      const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      const positions = g.getAttribute('position');
      const normals = g.getAttribute('normal');
      const uv: number[] = [];
      for (let i=0;i<positions.count;i++) {
        const x=positions.getX(i), y=positions.getY(i);
        // Match the photographic silhouette inside the 400 x 480 workspace.
        const px = type === 'cap' ? 200 + side*x*176 : 200 + side*x*(type==='tshirt'?113:118);
        const py = type === 'cap' ? 177-y*210 : (type==='hoodie'?248:253)-y*(type==='hoodie'?137:171);
        uv.push(px/400, 1-py/480);
        positions.setXYZ(i, x+normals.getX(i)*.004, y+normals.getY(i)*.004,
          positions.getZ(i)+normals.getZ(i)*.004);
      }
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      return g;
    });
    const geo=mergeGeometries(parts)!;
    parts.forEach(g=>g.dispose());
    const material=new THREE.MeshStandardMaterial({transparent:true,roughness:.95,side:THREE.DoubleSide,
      depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const mesh=add(geo,material);mesh.visible=false;mesh.castShadow=false;return mesh;
  };
  return {group,mat,patches:{front:patch(1),back:patch(-1)}};
}

