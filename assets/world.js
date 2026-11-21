// The ascii world: a real 3D arena rendered small, then redrawn as letters. One letter per cell, picked by how
// bright the scene is there, coloured by what's there. The camera moves with the scroll; letters near the
// pointer scramble. Everything the player would call UI (esp boxes, fov circle, the menu) is drawn elsewhere.
import * as THREE from './vendor/three.module.min.js';

const TAU = Math.PI * 2;
const RAMP = " .`'-,:;_~^\"!i|l/\\()1tr{}[]cvunxzjfLJYTCo?7+=<>*sZUXOQ0aewkhdbpqgmy%S23456&89$#@WMNB";
export const CHAPTERS = ['hero', 'combat', 'visuals', 'world', 'player', 'cosmetics', 'automation', 'settings', 'final'];
export const WRAPS = ['Hazard', 'Checker', 'Static', 'Waves', 'Digital', 'Aurora'];
const NAMES = ['toast_ttv', 'm1nty', 'kenji_04', 'ohnoitsdan', 'sleepyfox', 'w4ffle', 'pebble', 'nxtlvl', 'g0blin', 'yuzu', 'sh4rk', 'clementine', 'fishfood', 'lowtaperfade'];
const WEAPONS = ['assault rifle', 'katana', 'sniper', 'shotgun', 'revolver', 'handgun', 'bow', 'scythe', 'burst rifle'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapAng = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const lerpAng = (a, b, t) => a + wrapAng(b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CURVES = { 'Constant': () => 1, 'Linear': (x) => x, 'Ease In': (x) => x * x, 'Ease Out': (x) => 1 - (1 - x) * (1 - x), 'S-Curve': (x) => x * x * (3 - 2 * x) };

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
precision highp float;
uniform sampler2D tEnv;
uniform sampler2D tAtlas;
uniform vec2 uRes;
uniform vec2 uCell;
uniform float uCount;
uniform float uTime;
uniform vec3 uMouse;
uniform vec4 uMask[8];
uniform int uMaskN;
uniform float uFeather;
uniform float uDim;
uniform float uFlash;
uniform float uShimmer;
uniform vec3 uBgTop;
uniform vec3 uBgBot;
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 19.19); return fract(p.x * p.y); }

// 0 inside a block of page copy (and fading out around it), 1 everywhere else: no letter lands in a sentence
float keepAt(vec2 c) {
  float k = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uMaskN) break;
    vec4 r = uMask[i];
    vec2 d = max(r.xy - c, c - r.zw);
    float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    k = min(k, smoothstep(0.0, uFeather, sd));
  }
  return k;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cell = floor(frag / uCell);
  vec2 local = frag / uCell - cell;
  vec2 cc = (cell + 0.5) * uCell;
  vec3 c = texture2D(tEnv, cc / uRes).rgb;
  float I = max(max(c.r, c.g), c.b);
  float p = pow(clamp(I, 0.0, 1.0), 1.0 / 1.6);
  vec3 hue = pow(clamp(c / max(I, 1e-4), 0.0, 1.0), vec3(1.0 / 2.2));
  hue = mix(vec3(0.72, 0.7, 0.88), hue, smoothstep(0.01, 0.06, I));

  float md = length(cc - uMouse.xy) / (uCell.y * 9.0);
  float lens = uMouse.z * (1.0 - smoothstep(0.2, 1.0, md));
  float idx = floor(clamp((p - 0.08) / 0.8, 0.0, 1.0) * (uCount - 1.0) + 0.5);
  float tq = floor(uTime * 12.0);
  if (lens > 0.02 && hash(cell + tq) < lens * 0.85) idx = 1.0 + floor(hash(cell * 1.31 + tq) * (uCount - 1.0));
  else if (hash(cell * 1.7 + floor(uTime * 7.0)) < uShimmer * p) idx = 1.0 + floor(hash(cell + tq * 0.37) * (uCount - 1.0));

  float cov = texture2D(tAtlas, vec2((idx + local.x) / uCount, local.y)).r;
  float alpha = max(smoothstep(0.07, 0.17, p), lens * 0.6);
  vec3 ink = hue * (0.32 + 0.95 * p);
  ink = mix(ink, vec3(0.94, 0.86, 1.0), lens * 0.4);
  float a = cov * alpha * keepAt(cc) * (1.0 - uDim);
  vec3 bg = mix(uBgBot, uBgTop, vUv.y) + uFlash * vec3(0.07, 0.065, 0.09);
  gl_FragColor = vec4(mix(bg, ink, a), 1.0);
}`;

function buildAtlas(cw, ch) {
  // measure every candidate glyph, sort by how much ink it has, keep an even spread of them
  const probe = document.createElement('canvas');
  probe.width = cw; probe.height = ch;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  const font = `500 ${Math.round(ch * 0.82)}px "JetBrains Mono", ui-monospace, monospace`;
  const measured = [];
  for (const g of RAMP) {
    pc.clearRect(0, 0, cw, ch);
    pc.font = font; pc.textAlign = 'center'; pc.textBaseline = 'middle'; pc.fillStyle = '#fff';
    pc.fillText(g, cw / 2, ch / 2 + ch * 0.04);
    const data = pc.getImageData(0, 0, cw, ch).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    measured.push({ g, cov: sum });
  }
  measured.sort((a, b) => a.cov - b.cov);
  const N = 44;
  const pickd = [' '];
  for (let k = 1; k < N; k++) {
    const g = measured[Math.round(1 + ((measured.length - 2) * (k - 1)) / (N - 2))].g;
    if (!pickd.includes(g)) pickd.push(g);
  }
  const can = document.createElement('canvas');
  can.width = cw * pickd.length; can.height = ch;
  const ctx = can.getContext('2d');
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  pickd.forEach((g, i) => ctx.fillText(g, i * cw + cw / 2, ch / 2 + ch * 0.04));
  const tex = new THREE.CanvasTexture(can);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return { tex, count: pickd.length };
}

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#16181e'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#1b1e25'; x.fillRect(6, 6, 116, 116);
  x.strokeStyle = '#7c83a3'; x.lineWidth = 4; x.strokeRect(2, 2, 124, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(80, 80);
  t.anisotropy = 4;
  return t;
}

// a blocky avatar: legs, torso, arms, head, every limb on a pivot at its top
function makeFigure({ shirt, pants, skin }, scale = 1.1) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mats = { shirt: new THREE.MeshStandardMaterial({ color: shirt, emissive: new THREE.Color(shirt).multiplyScalar(0.22), roughness: 0.85 }), pants: new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 }) };
  const limb = (w, h, dpt, mat, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), mat);
    m.position.y = -h / 2;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const legL = limb(0.48, 1.0, 0.5, mats.pants, -0.25, 1.0);
  const legR = limb(0.48, 1.0, 0.5, mats.pants, 0.25, 1.0);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.5), mats.shirt);
  torso.position.y = 1.5;
  body.add(torso);
  const armL = limb(0.48, 1.0, 0.48, mats.shirt, -0.75, 2.0);
  const armR = limb(0.48, 1.0, 0.48, mats.shirt, 0.75, 2.0);
  armL.children[0].material = mats.skin; armR.children[0].material = mats.skin;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), mats.skin);
  head.position.y = 2.33;
  body.add(head);
  root.scale.setScalar(scale);
  return { root, body, legL, legR, armL, armR, head, torso, mats, scale, height: 2.65 * scale };
}

function makeRifle(mat, accent) {
  const g = new THREE.Group();
  const box = (w, h, dpt, x, y, z, m = mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), m); b.position.set(x, y, z); g.add(b); return b; };
  box(0.16, 0.22, 0.9, 0, 0, 0.1);            // receiver
  box(0.08, 0.08, 0.7, 0, 0.03, 0.85);        // barrel
  box(0.14, 0.3, 0.12, 0, -0.22, 0.2, accent); // magazine
  box(0.12, 0.2, 0.32, 0, -0.04, -0.48);      // stock
  box(0.1, 0.1, 0.3, 0, 0.17, 0.12, accent);  // scope
  return g;
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1500);
  const envTarget = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });

  // ---------------------------------------------------------------- the ascii pass
  const uniforms = {
    tEnv: { value: envTarget.texture }, tAtlas: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uCell: { value: new THREE.Vector2(7, 13) },
    uCount: { value: 1 }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector3(-999, -999, 0) },
    uMask: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uMaskN: { value: 0 }, uFeather: { value: 30 },
    uDim: { value: 0 }, uFlash: { value: 0 }, uShimmer: { value: 0.02 },
    uBgTop: { value: new THREE.Color(0.035, 0.037, 0.05) }, uBgBot: { value: new THREE.Color(0.02, 0.021, 0.03) },
  };
  const post = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false })));

  // ---------------------------------------------------------------- sky, light, fog
  const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uHor; varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); gl_FragColor = vec4(mix(uHor, uTop, pow(h, 0.55)), 1.0); }',
  }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry();
  { const r = rng(3), pts = []; for (let k = 0; k < 520; k++) { const a = r() * TAU, e = 0.08 + r() * 1.4; pts.push(Math.cos(a) * Math.cos(e) * 800, Math.sin(e) * 800, Math.sin(a) * Math.cos(e) * 800); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); }
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc9ccff, size: 1.3, sizeAttenuation: false, transparent: true, fog: false }));
  scene.add(stars);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffe6b0, fog: false }));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 12), new THREE.MeshBasicMaterial({ color: 0xdfe4ff, fog: false }));
  scene.add(sun, moon);

  const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x2a2638, 1.6);
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(30, 60, 20);
  scene.add(hemi, dir, dir.target);
  scene.fog = new THREE.Fog(0x05060a, 40, 170);

  // ---------------------------------------------------------------- the arena
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshStandardMaterial({ color: 0xffffff, map: gridTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const obstacles = [];
  {
    const r = rng(11);
    const mats = {
      crate: new THREE.MeshStandardMaterial({ color: 0xc9a77a, roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x8c92ab, roughness: 0.9 }),
      pillar: new THREE.MeshStandardMaterial({ color: 0xa9aec6, roughness: 0.8 }),
      pink: new THREE.MeshStandardMaterial({ color: 0xe6bafb, emissive: 0x3a2a44, roughness: 0.7 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x8ac9f2, emissive: 0x1d3344, roughness: 0.7 }),
    };
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); obstacles.push(m); return m; };
    for (let k = 0; k < 30; k++) {
      const a = r() * TAU, d = 13 + r() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d, kind = r();
      if (kind < 0.45) {
        add(new THREE.BoxGeometry(2, 2, 2), mats.crate, x, 1, z, r() * 0.6);
        if (r() < 0.4) add(new THREE.BoxGeometry(2, 2, 2), mats.crate, x + 0.2, 3, z + 0.1, r());
        if (r() < 0.5) add(new THREE.BoxGeometry(2, 2, 2), mats.crate, x + 2.1, 1, z, r() * 0.3);
      } else if (kind < 0.75) add(new THREE.BoxGeometry(7, 1.5, 1), mats.wall, x, 0.75, z, a + Math.PI / 2);
      else if (kind < 0.92) add(new THREE.BoxGeometry(1.6, 8, 1.6), mats.pillar, x, 4, z);
      else add(new THREE.BoxGeometry(3, 3, 3), r() < 0.5 ? mats.pink : mats.blue, x, 1.5, z, r());
    }
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * TAU, h = 6 + (k % 5 === 0 ? 6 : 0) + (k % 3) * 1.5;
      add(new THREE.BoxGeometry(9.5, h, 2.2), mats.wall, Math.cos(a) * 54, h / 2, Math.sin(a) * 54, -a + Math.PI / 2);
    }
    // the raised middle
    add(new THREE.BoxGeometry(8, 0.6, 8), mats.pillar, 0, 0.3, 0);
  }

  // ---------------------------------------------------------------- the player (us) and the enemies
  const player = makeFigure({ shirt: 0xe9e3ff, pants: 0x3a3e52, skin: 0xf3e4d6 }, 1.35);
  const rifleMat = new THREE.MeshStandardMaterial({ color: 0x2c2f3d, roughness: 0.6 });
  const rifleAccent = new THREE.MeshStandardMaterial({ color: 0xe6bafb, emissive: 0x4a3060 });
  const prifle = makeRifle(rifleMat, rifleAccent);
  prifle.position.set(0, -0.95, 0.35);
  prifle.rotation.x = Math.PI / 2;
  player.armR.add(prifle);
  player.root.position.set(0, 0.6, 0);
  scene.add(player.root);
  const muzzleLocal = new THREE.Vector3(0, 0.03, 1.2);
  let aimYaw = 0.4, aimPitch = 0, wanderT = 0, cool = 0.6;

  const SHIRTS = [0xe0735c, 0x5ab0e0, 0xe0c65c, 0x7ce06a, 0xb36ae0, 0xe06aa8];
  const enemies = [];
  const ringPoint = (min = 10, max = 30) => { const a = Math.random() * TAU, d = min + Math.random() * (max - min); return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d); };
  for (let k = 0; k < 6; k++) {
    const fig = makeFigure({ shirt: SHIRTS[k], pants: 0x34343f, skin: 0xe8c39e });
    const e = { fig, pos: ringPoint(), goal: ringPoint(), speed: 2.4 + Math.random() * 1.6, hp: 100, alive: true, deadT: 0, phase: Math.random() * 10, name: NAMES[k * 2 % NAMES.length], weapon: pick(WEAPONS), flash: 0, stepT: 0, sndT: 2 + Math.random() * 5, pause: 0, hacker: false, chamsMats: null };
    fig.root.position.copy(e.pos);
    scene.add(fig.root);
    enemies.push(e);
  }
  const chamsMat = new THREE.MeshBasicMaterial({ color: 0xe6bafb, depthTest: false, transparent: true, opacity: 0.95, fog: false });
  const chamsMatHead = new THREE.MeshBasicMaterial({ color: 0x8ac9f2, depthTest: false, transparent: true, opacity: 0.95, fog: false });
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const shots = [];   // {from, to, hit, dmg, hs, t, life}
  const steps = [];   // {pos, loud, t, life}
  const kills = [];   // {name, t}

  // ---------------------------------------------------------------- movement recorder course
  const P0 = new THREE.Vector3(95, 0, 0);
  const course = new THREE.Group();
  course.position.copy(P0);
  scene.add(course);
  const courseMat = new THREE.MeshStandardMaterial({ color: 0x555b72, roughness: 0.9 });
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8ac9f2, emissive: 0x16303f, roughness: 0.7 });
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0xe6bafb, emissive: 0x2c1c38, roughness: 0.7 });
  const SURF = { pads: [[0, 8, 0], [12, 46, 0]], plat: [21, 29, 3.6], ledge: [34, 46, 8.6] };
  const addBlock = (x0, x1, y0, y1, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 3), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); course.add(m); };
  addBlock(0, 8, -6, 0, courseMat); addBlock(12, 46, -6, 0, courseMat);
  addBlock(SURF.plat[0], SURF.plat[1], SURF.plat[2] - 0.7, SURF.plat[2], platMat);
  addBlock(SURF.ledge[0], SURF.ledge[1], 0, SURF.ledge[2], ledgeMat);
  const runner = makeFigure({ shirt: 0xe9e3ff, pants: 0x3a3e52, skin: 0xf3e4d6 }, 1.0);
  const ghost = makeFigure({ shirt: 0x8ac9f2, pants: 0x6f84a8, skin: 0xbfd8ee }, 1.0);
  course.add(runner.root, ghost.root);
  let courseFrames = [], courseKey = '', rec = { phase: 'rec', t: 0, wait: 0, jumps: 0 };

  function simulateCourse(infinite) {
    const g = 34, vJ = 12.4, vX = 8, vE = vJ * 0.93;
    const surfaces = (x) => {
      const out = [];
      for (const [a, b2, y] of SURF.pads) if (x >= a && x < b2) out.push(y);
      if (x >= SURF.plat[0] && x < SURF.plat[1]) out.push(SURF.plat[2]);
      if (x >= SURF.ledge[0] && x < SURF.ledge[1]) out.push(SURF.ledge[2]);
      return out;
    };
    const jumps = [{ at: 6.6, extra: 0, target: 0 }, { at: 16.2, extra: 1, target: SURF.plat[2] }, { at: 29.2, extra: infinite ? 6 : 1, target: SURF.ledge[2], anyAir: true }];
    let x = 1.5, y = 0, vy = 0, air = false, next = 0, extra = 0, cur = null, used = 0, t = 0;
    const out = [];
    for (let k = 0; k < 60 * 10; k++) {
      const dt = 1 / 60;
      t += dt;
      if (next < jumps.length && x >= jumps[next].at && (!air || jumps[next].anyAir)) { cur = jumps[next++]; vy = vJ; air = true; extra = cur.extra; used++; }
      if (air && vy <= 0 && extra > 0 && cur && y < cur.target + 1.0) { vy = vE; extra--; used++; }
      let nx = x + vX * dt;
      if (x < SURF.ledge[0] && nx >= SURF.ledge[0] && y < SURF.ledge[2] - 0.01) nx = SURF.ledge[0] - 0.01;
      x = nx;
      if (air) {
        const prev = y;
        vy -= g * dt;
        y += vy * dt;
        if (vy < 0) for (const s of surfaces(x)) if (prev >= s - 0.01 && y <= s) { y = s; vy = 0; air = false; extra = 0; break; }
      } else if (!surfaces(x).some((s) => Math.abs(s - y) < 0.01)) { air = true; vy = 0; }
      out.push({ x, y, air });
      if (x >= 44 || (out.length > 120 && Math.abs(out[out.length - 1].x - out[out.length - 90].x) < 0.01)) break;
    }
    return { frames: out, jumps: used };
  }

  // ---------------------------------------------------------------- cosmetics: a big rifle on a stand
  const Q0 = new THREE.Vector3(-95, 0, 0);
  const wrapCanvas = document.createElement('canvas');
  wrapCanvas.width = 256; wrapCanvas.height = 128;
  const wrapTex = new THREE.CanvasTexture(wrapCanvas);
  wrapTex.colorSpace = THREE.SRGBColorSpace;
  wrapTex.wrapS = wrapTex.wrapT = THREE.RepeatWrapping;
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wrapTex, emissive: 0xffffff, emissiveMap: wrapTex, emissiveIntensity: 0.35, roughness: 0.6 });
  const plainMat = new THREE.MeshStandardMaterial({ color: 0x4a4f63, roughness: 0.7 });
  const showcase = new THREE.Group();
  showcase.position.copy(Q0);
  scene.add(showcase);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 2, 32), new THREE.MeshStandardMaterial({ color: 0x8c92ab }));
  stand.position.y = 1;
  showcase.add(stand);
  const bigRifle = makeRifle(wrapMat, new THREE.MeshStandardMaterial({ color: 0x2c2f3d }));
  bigRifle.scale.setScalar(7);
  bigRifle.position.y = 6.5;
  showcase.add(bigRifle);
  const charmPivot = new THREE.Group();
  charmPivot.position.set(0, -0.12, 0.55);
  bigRifle.add(charmPivot);
  const charm = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshStandardMaterial({ color: 0x8ac9f2, emissive: 0x2a4a60 }));
  charm.position.y = -0.3;
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.015), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  chain.position.y = -0.15;
  charmPivot.add(charm, chain);
  let wrapName = '', wrapT = 0;

  function paintWrap(name, progress = 1) {
    const x = wrapCanvas.getContext('2d');
    const W = 256, H = 128, cut = Math.floor(W * progress);
    x.save();
    x.beginPath(); x.rect(0, 0, cut, H); x.clip();
    const fill = (c) => { x.fillStyle = c; x.fillRect(0, 0, W, H); };
    if (name === 'Hazard') { fill('#1c1820'); x.fillStyle = '#ffcf5c'; for (let k = -H; k < W; k += 28) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 14, 0); x.lineTo(k + 14 + H, H); x.lineTo(k + H, H); x.fill(); } }
    else if (name === 'Checker') { for (let yy = 0; yy < H; yy += 16) for (let xx = 0; xx < W; xx += 16) { x.fillStyle = ((xx + yy) / 16) % 2 ? '#e6bafb' : '#24202c'; x.fillRect(xx, yy, 16, 16); } }
    else if (name === 'Static') { const r = rng(7); for (let yy = 0; yy < H; yy += 4) for (let xx = 0; xx < W; xx += 4) { const v = Math.floor(r() * 255); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(xx, yy, 4, 4); } }
    else if (name === 'Waves') { fill('#101826'); x.strokeStyle = '#8ac9f2'; x.lineWidth = 6; for (let yy = -10; yy < H + 20; yy += 18) { x.beginPath(); for (let xx = 0; xx <= W; xx += 4) x.lineTo(xx, yy + Math.sin(xx / 16) * 6); x.stroke(); } }
    else if (name === 'Digital') { const r = rng(21); const cols = ['#2d3a2a', '#5a7a4e', '#9fb48a', '#1c241b']; for (let yy = 0; yy < H; yy += 8) for (let xx = 0; xx < W; xx += 8) { x.fillStyle = cols[Math.floor(r() * 4)]; x.fillRect(xx, yy, 8, 8); } }
    else { const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#e6bafb'); gr.addColorStop(0.5, '#a1a9e1'); gr.addColorStop(1, '#8ac9f2'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }
    x.restore();
    if (progress < 1) { x.fillStyle = '#ffffff'; x.fillRect(cut - 3, 0, 4, H); }
    wrapTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the logo, high above everything
  const G0 = new THREE.Vector3(0, 70, -150);
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 1024; logoCanvas.height = 384;
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ map: logoTex, fog: false }));
  logo.position.copy(G0);
  scene.add(logo);
  function paintLogo(img) {
    const x = logoCanvas.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 384);
    if (img) x.drawImage(img, 10, 52, 280, 280);
    x.fillStyle = '#fff';
    x.font = '800 190px Inter, "JetBrains Mono", sans-serif';
    x.textBaseline = 'middle';
    x.fillText('LxYHook', img ? 290 : 60, 200);
    logoTex.needsUpdate = true;
  }
  paintLogo(null);
  { const img = new Image(); img.onload = () => paintLogo(img); img.src = 'assets/logo.png'; }

  // ---------------------------------------------------------------- weather
  const RAIN = 2600;
  const rainPos = new Float32Array(RAIN * 6);
  const rainVel = new Float32Array(RAIN);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb4c6ff, transparent: true, opacity: 0.9 }));
  rain.frustumCulled = false;
  scene.add(rain);
  for (let k = 0; k < RAIN; k++) { rainVel[k] = 40 + Math.random() * 25; const x = (Math.random() - 0.5) * 140, y = Math.random() * 60, z = (Math.random() - 0.5) * 140; rainPos.set([x, y, z, x - 0.25, y + 1.4, z], k * 6); }
  const clouds = new THREE.Group();
  {
    const r = rng(5), mat = new THREE.MeshStandardMaterial({ color: 0x5a6078, roughness: 1, emissive: 0x0c0e14 });
    for (let k = 0; k < 14; k++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(7 + r() * 6, 1), mat); m.position.set(j * 9 - 13, r() * 3, r() * 6); m.scale.y = 0.42; c.add(m); }
      c.position.set((r() - 0.5) * 300, 46 + r() * 14, (r() - 0.5) * 300);
      clouds.add(c);
    }
  }
  scene.add(clouds);
  const boltMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const bolt = new THREE.Line(new THREE.BufferGeometry(), boltMat);
  bolt.frustumCulled = false;
  scene.add(bolt);
  const boltLight = new THREE.PointLight(0xdfe6ff, 0, 220, 1.2);
  scene.add(boltLight);
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(40 * 3), sparkVel = new Float32Array(40 * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffcf5c, size: 3, sizeAttenuation: false, fog: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let boltT = 9, boltTimer = 3, sparkT = 9, flash = 0;

  function strike(center) {
    const pts = [];
    let x = center.x + (Math.random() - 0.5) * 50, z = center.z - 10 - Math.random() * 30, y = 52;
    while (y > 0) { pts.push(x, y, z); y -= 3 + Math.random() * 3; x += (Math.random() - 0.5) * 7; z += (Math.random() - 0.5) * 4; }
    pts.push(x, 0, z);
    bolt.geometry.dispose();
    bolt.geometry = new THREE.BufferGeometry();
    bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    boltT = 0;
    flash = 1;
    boltLight.position.set(x, 20, z);
    for (let k = 0; k < 40; k++) { sparkPos.set([x, 0.5, z], k * 3); sparkVel.set([(Math.random() - 0.5) * 14, 6 + Math.random() * 10, (Math.random() - 0.5) * 14], k * 3); }
    sparkT = 0;
  }

  // ---------------------------------------------------------------- camera keyframes, one per chapter
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function eye() { return player.root.position.clone().add(tmp.set(0, 2.35 * player.scale, 0)); }
  function aimDir() { return tmp2.set(Math.sin(aimYaw) * Math.cos(aimPitch), Math.sin(aimPitch), Math.cos(aimYaw) * Math.cos(aimPitch)).clone(); }
  const KEYS = {
    hero: (t) => ({ t: [0, 2.6, 0], yaw: 0.7 + t * 0.03, pitch: 0.28, dist: 19, fov: 40, sx: 0.11, sy: -0.15 }),
    combat: () => { const e = eye(), a = aimDir(); const tg = e.clone().addScaledVector(a, 28); return { t: [tg.x, tg.y, tg.z], yaw: aimYaw + Math.PI + 0.09, pitch: 0.06 - aimPitch, dist: 34, fov: 50, sx: 0.06, sy: -0.1 }; },
    visuals: (t) => ({ t: [0, 1.5, 0], yaw: 2.3 + t * 0.02, pitch: 0.3, dist: 27, fov: 42, sx: 0.1, sy: -0.12 }),
    world: (t) => ({ t: [0, 9, 0], yaw: 3.7 + t * 0.015, pitch: 0.04, dist: 38, fov: 60, sx: 0.08, sy: -0.12 }),
    player: () => ({ t: [P0.x + 23, 4, 0], yaw: 0.12, pitch: 0.16, dist: 44, fov: 44, sx: 0.12, sy: -0.1 }),
    cosmetics: (t) => ({ t: [Q0.x, 6.5, 0], yaw: t * 0.12, pitch: 0.14, dist: 15, fov: 38, sx: 0.1, sy: -0.12 }),
    automation: (t) => ({ t: [0, 1, 0], yaw: 5.0 + t * 0.03, pitch: 0.62, dist: 46, fov: 42, sx: 0.1, sy: -0.1 }),
    settings: (t) => ({ t: [0, 1, 0], yaw: 5.6 + t * 0.02, pitch: 0.8, dist: 64, fov: 40, sx: 0, sy: 0 }),
    final: () => ({ t: [G0.x, G0.y, G0.z], yaw: 0, pitch: 0.02, dist: 84, fov: 42, sx: 0, sy: -0.14 }),
  };
  const cam = { t: new THREE.Vector3(0, 2, 0), yaw: 0.7, pitch: 0.4, dist: 33, fov: 40, sx: 0, sy: 0, init: false };
  let W = 1, H = 1, PR = 1;

  function blendKeys(story, time) {
    const p = clamp(story.c - 0.5, 0, CHAPTERS.length - 1);
    const a = Math.min(Math.floor(p), CHAPTERS.length - 2), u = smooth(0.3, 0.95, p - a);
    const A = KEYS[CHAPTERS[a]](time), B = KEYS[CHAPTERS[a + 1]](time);
    return {
      t: new THREE.Vector3(lerp(A.t[0], B.t[0], u), lerp(A.t[1], B.t[1], u), lerp(A.t[2], B.t[2], u)),
      yaw: lerpAng(A.yaw, B.yaw, u), pitch: lerp(A.pitch, B.pitch, u), dist: lerp(A.dist, B.dist, u), fov: lerp(A.fov, B.fov, u), sx: lerp(A.sx, B.sx, u), sy: lerp(A.sy, B.sy, u),
      fast: (CHAPTERS[a] === 'combat' && u < 0.5) || (CHAPTERS[a + 1] === 'combat' && u > 0.5),
    };
  }

  // ---------------------------------------------------------------- per-frame simulation
  const headOf = (e) => e.fig.root.position.clone().add(tmp.set(0, 2.35 * e.fig.scale, 0));
  function aimAt(v, from) { const d = v.clone().sub(from); return { yaw: Math.atan2(d.x, d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; }

  function shoot(e) {
    player.root.updateMatrixWorld(true);
    const muzzle = prifle.localToWorld(muzzleLocal.clone());
    if (!e) {
      const to = muzzle.clone().addScaledVector(aimDir(), 60);
      shots.push({ from: muzzle, to, hit: false, t: 0, life: 0.25 });
      return;
    }
    const hs = Math.random() < 0.35;
    const dmg = Math.round(hs ? 48 + Math.random() * 22 : 17 + Math.random() * 17);
    const to = headOf(e).add(tmp.set((Math.random() - 0.5) * 0.3, hs ? 0 : -0.9, 0));
    e.hp -= dmg;
    e.flash = 0.12;
    shots.push({ from: muzzle, to, hit: true, dmg, hs, t: 0, life: 0.3, name: e.name });
    if (e.hp <= 0) { e.hp = 0; e.alive = false; e.deadT = 0; kills.push({ name: e.name, t: 0 }); }
  }

  function updateEnemies(dt, state) {
    for (const e of enemies) {
      const f = e.fig;
      e.flash = Math.max(0, e.flash - dt);
      if (e.alive) {
        if (e.pause > 0) e.pause -= dt;
        else {
          const d = e.goal.clone().sub(e.pos);
          d.y = 0;
          const len = d.length();
          if (len < 0.6) { e.goal = ringPoint(); if (Math.random() < 0.35) e.pause = 0.4 + Math.random() * 1.2; }
          else {
            d.multiplyScalar(1 / len);
            e.pos.addScaledVector(d, e.speed * dt);
            f.root.rotation.y = lerpAng(f.root.rotation.y, Math.atan2(d.x, d.z), 1 - Math.exp(-dt * 10));
            e.phase += dt * e.speed * 2.3;
            e.stepT += dt;
            if (e.stepT > 0.36) { e.stepT = 0; steps.push({ pos: e.pos.clone().add(tmp.set(Math.cos(e.phase) * 0.3, 0.05, 0)), loud: 0.3, t: 0, life: 1.0 }); }
          }
        }
        e.sndT -= dt;
        if (e.sndT <= 0) { e.sndT = 3 + Math.random() * 5; steps.push({ pos: e.pos.clone().setY(0.05), loud: Math.random() < 0.6 ? 1 : 0.6, t: 0, life: 1.6 }); }
        const sw = e.pause > 0 ? 0 : Math.sin(e.phase) * 0.7;
        f.legL.rotation.x = sw; f.legR.rotation.x = -sw; f.armL.rotation.x = -sw * 0.8; f.armR.rotation.x = sw * 0.8;
        f.root.position.set(e.pos.x, 0, e.pos.z);
        f.body.rotation.x = 0;
        f.body.position.y = 0;
      } else {
        e.deadT += dt;
        f.body.rotation.x = -Math.min(1, e.deadT / 0.35) * Math.PI / 2;
        if (e.deadT > 0.9) f.body.position.y = -(e.deadT - 0.9) * 2;
        if (e.deadT > 2.2) {
          e.alive = true; e.hp = 100; e.pos = ringPoint(); e.goal = ringPoint(); e.name = pick(NAMES); e.weapon = pick(WEAPONS);
          f.body.rotation.x = 0; f.body.position.y = 0;
        }
      }
      // chams: draw through walls in a flat colour; a hit flashes white
      const want = e.flash > 0 ? 'flash' : state.chams && e.alive ? 'chams' : 'normal';
      if (e.chamsMats !== want) {
        e.chamsMats = want;
        f.root.traverse((o) => {
          if (!o.isMesh) return;
          if (!o.userData.base) o.userData.base = o.material;
          o.material = want === 'flash' ? flashMat : want === 'chams' ? (o === f.head ? chamsMatHead : chamsMat) : o.userData.base;
          o.renderOrder = want === 'chams' ? 10 : 0;
        });
      }
      f.root.visible = e.alive || e.deadT < 2.0;
    }
  }

  function updatePlayer(dt, state, time) {
    const e0 = eye();
    const fovAng = THREE.MathUtils.degToRad(6 + (state.radius / 600) * 70);
    let best = null, bestErr = Infinity, nearest = null, nearestErr = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const a = aimAt(headOf(e), e0);
      const err = Math.hypot(wrapAng(a.yaw - aimYaw), a.pitch - aimPitch);
      if (err < nearestErr) { nearest = { e, a }; nearestErr = err; }
      if (err < fovAng && err < bestErr) { best = { e, a }; bestErr = err; }
    }
    cool -= dt;
    const curve = CURVES[state.curve] || CURVES['Ease Out'];
    if (state.aimbot && (best || nearest)) {
      const tgt = best || nearest;
      const dy = wrapAng(tgt.a.yaw - aimYaw), dp = tgt.a.pitch - aimPitch, err = Math.hypot(dy, dp);
      // inside the fov the aimbot pulls with the chosen curve; outside it, a person turns toward someone
      const speed = best ? 9 * state.speed * (1 - state.smooth / 100) * Math.max(curve(clamp(err / fovAng, 0, 1)), 0.06) : 1.1;
      const stepA = Math.min(err, speed * dt);
      if (err > 1e-4) { aimYaw += (dy / err) * stepA; aimPitch += (dp / err) * stepA; }
      if (best && err < 0.03 && cool <= 0) { shoot(best.e); cool = 0.32 + Math.random() * 0.12; }
    } else {
      wanderT += dt;
      // a person looking around: drift toward whoever is closest to where we're facing, with some sway
      const sway = Math.sin(time * 0.53) * 0.35;
      const target = nearest ? nearest.a.yaw + sway : 0.4 + Math.sin(time * 0.21) * 1.6 + sway;
      aimYaw = lerpAng(aimYaw, target, 1 - Math.exp(-dt * 0.8));
      aimPitch = lerp(aimPitch, -0.04, 1 - Math.exp(-dt * 2));
      if (cool <= 0) {
        if (state.silent && best) { shoot(best.e); cool = 0.42 + Math.random() * 0.25; }
        else if (!state.silent && Math.random() < dt * 1.5) { shoot(null); cool = 0.7; }
      }
    }
    player.root.rotation.y = aimYaw;
    player.armR.rotation.x = -Math.PI / 2 - aimPitch;
    player.armL.rotation.x = -Math.PI / 2.4 - aimPitch;
    player.armL.rotation.z = -0.35;
    player.head.rotation.x = -aimPitch * 0.6;
    player.body.position.y = Math.sin(time * 2.1) * 0.03;
  }

  function updateCourse(dt, state, time) {
    const key = String(!!state.infjump);
    if (key !== courseKey) {
      courseKey = key;
      const r = simulateCourse(!!state.infjump);
      courseFrames = r.frames; rec = { phase: 'rec', t: 0, wait: 0, jumps: r.jumps };
    }
    const total = courseFrames.length / 60;
    if (rec.wait > 0) { rec.wait -= dt; if (rec.wait <= 0) { rec.phase = rec.phase === 'rec' && state.recorder ? 'replay' : 'rec'; rec.t = 0; } }
    else { rec.t += dt; if (rec.t >= total) { rec.t = total; rec.wait = 0.9; } }
    const idx = Math.min(courseFrames.length - 1, Math.floor(rec.t * 60));
    const place = (fig, fr, k) => {
      fig.root.position.set(fr.x, fr.y, 0);
      fig.root.rotation.y = Math.PI / 2;
      const sw = fr.air ? 0 : Math.sin(k * 0.32) * 0.8;
      fig.legL.rotation.x = fr.air ? -0.5 : sw; fig.legR.rotation.x = fr.air ? 0.3 : -sw;
      fig.armL.rotation.x = fr.air ? -2.6 : -sw; fig.armR.rotation.x = fr.air ? -2.6 : sw;
    };
    if (rec.phase === 'rec') { place(runner, courseFrames[idx], idx); ghost.root.visible = false; runner.root.visible = true; }
    else { place(ghost, courseFrames[idx], idx); ghost.root.visible = true; place(runner, courseFrames[courseFrames.length - 1], 0); }
    void time;
  }

  function updateShowcase(dt, state, time) {
    const live = state.cosmetics && state.unlock;
    bigRifle.rotation.y = time * 0.35;
    bigRifle.rotation.x = Math.sin(time * 0.5) * 0.08;
    charmPivot.rotation.x = Math.sin(time * 2.6) * 0.45;
    charmPivot.rotation.z = Math.cos(time * 1.9) * 0.2;
    const name = live ? state.wrap : '';
    if (name !== wrapName) { wrapName = name; wrapT = 0; }
    if (live) {
      if (wrapT < 1) { wrapT = Math.min(1, wrapT + dt * 1.8); paintWrap(name, wrapT); }
      bigRifle.children[0].material = wrapMat; bigRifle.children[3].material = wrapMat; bigRifle.children[1].material = wrapMat;
    } else {
      bigRifle.children[0].material = plainMat; bigRifle.children[3].material = plainMat; bigRifle.children[1].material = plainMat;
    }
  }

  function updateSky(dt, state, time) {
    const clock = ((state.clock % 24) + 24) % 24;
    const el = Math.sin(((clock - 6) / 12) * Math.PI);
    const day = smooth(-0.12, 0.35, el);
    const dusk = Math.max(0, 1 - Math.abs(el) / 0.3) * (el > -0.25 ? 1 : 0);
    const wet = state.weather ? 1 : 0;
    const top = new THREE.Color(0.002, 0.002, 0.006).lerp(new THREE.Color(0.03, 0.055, 0.12), day);
    const hor = new THREE.Color(0.006, 0.006, 0.014).lerp(new THREE.Color(0.11, 0.13, 0.19), day).lerp(new THREE.Color(0.42, 0.17, 0.07), dusk * 0.7);
    top.multiplyScalar(1 - wet * 0.45); hor.multiplyScalar(1 - wet * 0.4);
    skyU.uTop.value.copy(top); skyU.uHor.value.copy(hor);
    stars.material.opacity = (1 - day) * (1 - wet * 0.7);
    const ang = ((clock - 6) / 12) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), -0.35).normalize();
    sun.position.copy(sunDir).multiplyScalar(820); moon.position.copy(sunDir).multiplyScalar(-820);
    sun.visible = el > -0.1; moon.visible = el < 0.1;
    dir.position.copy(el > 0 ? sunDir : sunDir.clone().negate()).multiplyScalar(80);
    dir.color.set(0xffffff).lerp(new THREE.Color(1, 0.6, 0.35), dusk);
    dir.intensity = (0.9 + 1.6 * day) * (1 - wet * 0.4);
    hemi.color.set(0xa9b6ff).lerp(new THREE.Color(0xdfe8ff), day);
    hemi.intensity = (0.85 + 0.9 * day) * (1 - wet * 0.25) + flash * 4;
    scene.fog.color.copy(hor).multiplyScalar(0.5);
    rain.visible = !!state.weather;
    clouds.visible = !!state.weather;
    clouds.children.forEach((c, k) => { c.position.x += dt * (1.5 + (k % 3)); if (c.position.x > 160) c.position.x = -160; });
    if (state.weather) {
      const cx = cam.t.x, cz = cam.t.z;
      for (let k = 0; k < RAIN; k++) {
        const o = k * 6;
        let y = rainPos[o + 1] - rainVel[k] * dt;
        let x = rainPos[o] - rainVel[k] * dt * 0.18;
        let z = rainPos[o + 2];
        if (y < 0 || Math.abs(x - cx) > 75 || Math.abs(z - cz) > 75) { y = 30 + Math.random() * 30; x = cx + (Math.random() - 0.5) * 140; z = cz + (Math.random() - 0.5) * 140; }
        rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
        rainPos[o + 3] = x + 0.25; rainPos[o + 4] = y + 1.5; rainPos[o + 5] = z;
      }
      rainGeo.attributes.position.needsUpdate = true;
      if (state.lightning) { boltTimer -= dt; if (boltTimer <= 0) { boltTimer = 2.5 + Math.random() * 4; strike(cam.t); } }
    }
    boltT += dt;
    bolt.visible = boltT < 0.09 || (boltT > 0.14 && boltT < 0.3);
    if (boltT > 0.13 && boltT < 0.16) flash = Math.max(flash, 0.75);
    boltLight.intensity = bolt.visible ? 3000 : 0;
    flash = Math.max(0, flash - dt * 4);
    sparkT += dt;
    sparks.visible = !!state.sparks && sparkT < 0.7;
    if (sparks.visible) {
      for (let k = 0; k < 40; k++) { const o = k * 3; sparkVel[o + 1] -= 30 * dt; sparkPos[o] += sparkVel[o] * dt; sparkPos[o + 1] = Math.max(0, sparkPos[o + 1] + sparkVel[o + 1] * dt); sparkPos[o + 2] += sparkVel[o + 2] * dt; }
      sparkGeo.attributes.position.needsUpdate = true;
    }
    void time;
  }

  // ---------------------------------------------------------------- public api
  const api = {
    THREE, camera, enemies, shots, steps, kills, player, CHAPTERS,
    get recorder() { return { frames: courseFrames, phase: rec.phase, t: rec.t, wait: rec.wait, jumps: rec.jumps, origin: P0 }; },
    get muzzle() { return prifle.localToWorld(muzzleLocal.clone()); },
    get aim() { return { yaw: aimYaw, pitch: aimPitch }; },
    get eye() { return eye(); },
    headOf,
    resize(w, h, dpr) {
      W = w; H = h; PR = Math.min(dpr || 1, 2);
      renderer.setPixelRatio(PR);
      renderer.setSize(w, h, false);
      const cw = w < 700 ? 6 : 7, ch = w < 700 ? 11 : 13;
      const cwd = Math.round(cw * PR), chd = Math.round(ch * PR);
      const cols = Math.ceil((w * PR) / cwd), rows = Math.ceil((h * PR) / chd);
      envTarget.setSize(cols * 2, rows * 2);
      uniforms.uRes.value.set(cols * cwd, rows * chd);
      uniforms.uCell.value.set(cwd, chd);
      uniforms.uFeather.value = 46 * PR;
      const at = buildAtlas(cwd, chd);
      if (uniforms.tAtlas.value) uniforms.tAtlas.value.dispose();
      uniforms.tAtlas.value = at.tex;
      uniforms.uCount.value = at.count;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setMasks(rects) {
      const n = Math.min(8, rects.length);
      for (let k = 0; k < n; k++) { const r = rects[k]; uniforms.uMask.value[k].set(r.left * PR, (H - r.bottom) * PR, r.right * PR, (H - r.top) * PR); }
      uniforms.uMaskN.value = n;
    },
    setPointer(x, y, strength) { uniforms.uMouse.value.set(x * PR, (H - y) * PR, strength); },
    project(v) {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, on: p.z > -1 && p.z < 1 };
    },
    update(dt, time, state, story, opts) {
      updateEnemies(dt, state);
      updatePlayer(dt, state, time);
      updateCourse(dt, state, time);
      updateShowcase(dt, state, time);
      updateSky(dt, state, time);
      for (const s of shots) s.t += dt;
      for (const s of steps) s.t += dt;
      for (const k of kills) k.t += dt;
      while (shots.length && shots[0].t > shots[0].life) shots.shift();
      for (let k = steps.length - 1; k >= 0; k--) if (steps[k].t > steps[k].life) steps.splice(k, 1);
      while (kills.length && kills[0].t > 4) kills.shift();

      // camera: chase the blended keyframe, faster while the aimbot is flicking it around
      const goal = blendKeys(story, time);
      const k = cam.init ? 1 - Math.exp(-dt * (goal.fast ? 10 : 3.2)) : 1;
      cam.init = true;
      cam.t.lerp(goal.t, k);
      cam.yaw = lerpAng(cam.yaw, goal.yaw + (opts.px || 0) * 0.08, k);
      cam.pitch = lerp(cam.pitch, goal.pitch + (opts.py || 0) * 0.04, k);
      cam.dist = lerp(cam.dist, goal.dist, k);
      cam.fov = lerp(cam.fov, goal.fov, k);
      cam.sx = lerp(cam.sx, goal.sx + (opts.sx || 0), k);
      cam.sy = lerp(cam.sy, goal.sy + (opts.sy || 0), k);
      const cp = Math.cos(cam.pitch);
      camera.position.set(cam.t.x + Math.sin(cam.yaw) * cp * cam.dist, cam.t.y + Math.sin(cam.pitch) * cam.dist, cam.t.z + Math.cos(cam.yaw) * cp * cam.dist);
      camera.lookAt(cam.t);
      camera.fov = cam.fov;
      camera.setViewOffset(W, H, -cam.sx * W, -cam.sy * H, W, H);
      camera.updateProjectionMatrix();
      scene.fog.far = Math.max(62, cam.dist * 3.2);
      scene.fog.near = Math.max(8, cam.dist * 0.45);

      uniforms.uTime.value = time;
      uniforms.uFlash.value = flash;
      uniforms.uDim.value = opts.dim || 0;
      uniforms.uShimmer.value = opts.reduce ? 0 : 0.025;
    },
    render() {
      renderer.setRenderTarget(envTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post, postCam);
    },
  };
  return api;
}
