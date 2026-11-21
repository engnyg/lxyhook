// Glue: scroll chapters, what each chapter switches on, the menu copy, notifications, the copy button.
import { createWorld, CHAPTERS, WRAPS } from './world.js';
import { createHud } from './hud.js';
import { createMenu } from './menu.js';

// ---------------------------------------------------------------------------- edit these two
const CONFIG = {
  // your invite, e.g. 'https://discord.gg/abc123'. left empty, the discord buttons stay hidden
  discord: '',
  // the luarmor loader (same one the script queues itself with for re-run after teleport)
  loader: 'https://api.luarmor.net/files/v4/loaders/d2b05e953ac72861d1cfd7e9297caccd.lua',
};

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// everything the switches control, shared by the menu, the world and the overlay
const state = {
  silent: false, aimbot: false, circle: false, radius: 120, speed: 0.35, smooth: 0, curve: 'Ease Out',
  esp: false, health: false, chams: false, tracers: true, dmg: true, sound: false,
  weather: false, lightning: false, sparks: true, clock: 22,
  recorder: false, infjump: false,
  cosmetics: false, loadout: false, unlock: false, wrap: 'Hazard',
  hacker: false, mod: false, queue: false,
};

// what the menu shows and what gets switched on, by chapter and how far into it you are (0..1)
const STORY = {
  hero: () => ({ page: 'Silent Aim', set: { silent: true, circle: true, aimbot: false } }),
  combat: (l, t) => ({
    page: 'Aimbot',
    set: { silent: false, aimbot: l > 0.06, circle: true, curve: l < 0.42 ? 'Ease Out' : l < 0.7 ? 'S-Curve' : 'Constant', esp: false, health: false },
  }),
  visuals: (l) => ({ page: l < 0.62 ? 'Player ESP' : 'Sound ESP', set: { aimbot: false, silent: true, esp: l > 0.04, health: l > 0.16, chams: l > 0.34 && l < 0.62, sound: l > 0.62 } }),
  world: (l) => ({ page: l < 0.5 ? 'Sky & Weather' : 'Lighting', set: { esp: false, health: false, sound: false, chams: false, weather: l > 0.05 && l < 0.5, lightning: l > 0.16 && l < 0.5, clock: (22 + smooth(0.52, 0.96, l) * 14) % 24 } }),
  player: (l) => ({ page: l < 0.5 ? 'Movement Recorder' : 'Movement', set: { weather: false, recorder: l > 0.04, infjump: l > 0.5, clock: 22 } }),
  cosmetics: (l, t) => ({ page: l < 0.46 ? 'Overview' : 'Wraps', set: { clock: 22, cosmetics: l > 0.05, loadout: l > 0.12, unlock: l > 0.2, wrap: l < 0.46 ? 'Hazard' : WRAPS[Math.floor(t / 2.2) % WRAPS.length] } }),
  automation: (l) => ({ page: l < 0.5 ? 'Detection' : 'Match Flow', set: { clock: 22, silent: true, esp: true, health: true, hacker: l > 0.06, mod: l > 0.3, queue: l > 0.55 } }),
  settings: () => ({ page: null, set: { hacker: false } }),
  final: () => ({ page: null, set: {} }),
};
const ARENA = { hero: 1, combat: 1, visuals: 1, world: 0.6, player: 0, cosmetics: 0, automation: 1, settings: 0.35, final: 0 };
const AIM = { hero: 1, combat: 1, visuals: 0.6, world: 0, player: 0, cosmetics: 0, automation: 0.5, settings: 0, final: 0 };
const COURSE = { player: 1 };
const DIM = { settings: 0.55 };

// ---------------------------------------------------------------------------- notifications (Starlight style)
const toasts = document.querySelector('.sl-toasts');
function notify(title, html) {
  if (!toasts) return;
  const el = document.createElement('div');
  el.className = 'sl-toast';
  el.innerHTML = `<img src="assets/logo.png" alt="" width="28" height="28"><div><b>${title}</b><p>${html}</p></div>`;
  toasts.prepend(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 400); }, 4600);
  while (toasts.children.length > 3) toasts.lastChild.remove();
}

// ---------------------------------------------------------------------------- copy button, discord
async function copyText(s) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(s); return true; } } catch (e) { /* fall back */ }
  const ta = document.createElement('textarea');
  ta.value = s; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}
function bindLinks() {
  const loader = `script_key = "your key here"\nloadstring(game:HttpGet("${CONFIG.loader}"))()`;
  document.querySelectorAll('.js-loader-url').forEach((el) => (el.textContent = `"${CONFIG.loader}"`));
  document.querySelectorAll('.js-copy').forEach((btn) => {
    const label = btn.querySelector('.js-copy-label');
    const orig = label.textContent;
    btn.addEventListener('click', async () => {
      const ok = await copyText(loader);
      label.textContent = ok ? 'copied' : 'select + copy it';
      btn.classList.toggle('is-done', ok);
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { label.textContent = orig; btn.classList.remove('is-done'); }, 1600);
      if (ok) notify('LxYHook', 'loader copied. paste your key between the quotes.');
    });
  });
  if (CONFIG.discord) {
    document.querySelectorAll('.js-discord').forEach((a) => { a.href = CONFIG.discord; a.hidden = false; });
    document.querySelectorAll('.js-discord-text').forEach((el) => {
      const a = document.createElement('a');
      a.href = CONFIG.discord; a.target = '_blank'; a.rel = 'noopener'; a.textContent = el.textContent;
      el.replaceChildren(a);
    });
  }
}

// ---------------------------------------------------------------------------- scroll position -> chapter
const sections = [...document.querySelectorAll('[data-chapter]')];
let metrics = [];
function measure() {
  const y = window.scrollY;
  metrics = sections.map((el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.chapter, top: r.top + y, height: Math.max(1, r.height) }; });
}
let sy = window.scrollY;
function story(dt) {
  sy += (window.scrollY - sy) * (1 - Math.exp(-dt * 14));
  if (Math.abs(sy - window.scrollY) < 0.5) sy = window.scrollY;
  const center = sy + window.innerHeight * 0.5;
  let c = 0;
  if (metrics.length && center >= metrics[0].top) {
    c = metrics.length;
    for (let k = 0; k < metrics.length; k++) { const m = metrics[k]; if (center < m.top + m.height) { c = k + (center - m.top) / m.height; break; } }
  }
  c = clamp(c, 0.001, metrics.length - 0.001);
  const idx = Math.floor(c);
  return { c, idx, id: metrics[idx] ? metrics[idx].id : 'hero', local: c - idx };
}
// a value that eases from one chapter's number to the next as the chapters swap
function weight(table, st) {
  const ids = metrics.map((m) => m.id);
  const p = clamp(st.c - 0.5, 0, ids.length - 1);
  const a = Math.min(Math.floor(p), ids.length - 2), u = smooth(0.3, 0.9, p - a);
  return (table[ids[a]] || 0) * (1 - u) + (table[ids[a + 1]] || 0) * u;
}

// ---------------------------------------------------------------------------- boot
async function boot() {
  bindLinks();
  const menuRoot = document.getElementById('menu');
  const menu = createMenu(menuRoot, state);
  menu.show('Silent Aim');
  let manualPage = null, manualAt = 0;
  menu.on((type, a) => {
    if (type === 'page') { manualPage = a; manualAt = performance.now(); }
    if (type === 'button' && a === 'Test Popup') notify('Hacker Detector', '<span class="acc">Test</span> is hacking');
    if (type === 'button' && a === 'Clear Hacker Tags') notify('Ragebot', 'Cleared 1 hacker tag(s)');
  });

  // nav highlight
  const navLinks = new Map([...document.querySelectorAll('.nav a')].map((a) => [a.getAttribute('href').slice(1), a]));

  let world = null, hud = null;
  try {
    world = createWorld(document.getElementById('stage'));
    hud = createHud(document.getElementById('overlay'), world);
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
  }

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
    if (world) world.resize(w, h, dpr);
    if (hud) hud.resize(w, h, dpr);
    measure();
    const s = clamp(Math.min((w * 0.5) / 930, (h * 0.6) / 560), 0.45, 0.82);
    menuRoot.style.setProperty('--s', s.toFixed(3));
  };
  if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load('500 13px "JetBrains Mono"'), document.fonts.load('600 12px Inter')]), new Promise((r) => setTimeout(r, 1500))]);
  resize();
  window.addEventListener('resize', resize);
  new ResizeObserver(measure).observe(document.querySelector('main'));

  // pointer: a scramble lens around it, and a little parallax
  const ptr = { x: -999, y: -999, s: 0, want: 0, px: 0, py: 0 };
  window.addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.want = e.pointerType === 'mouse' ? 1 : 0.8; });
  window.addEventListener('pointerdown', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.want = 1; });
  document.documentElement.addEventListener('pointerleave', () => (ptr.want = 0));
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') ptr.want = 0; });

  const cards = [...document.querySelectorAll('[data-pocket]')];
  const prev = {};
  let last = performance.now(), time = 0, wasId = '';

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt * (REDUCE ? 0.35 : 1);
    const st = story(dt);

    // what this chapter turns on
    const plan = (STORY[st.id] || STORY.hero)(st.local, time);
    for (const [k, v] of Object.entries(plan.set)) menu.auto(k, v);
    const keepManual = manualPage && performance.now() - manualAt < 9000 && st.id === wasId;
    if (!keepManual) manualPage = null;
    if (plan.page && !manualPage) menu.show(plan.page);
    menuRoot.classList.toggle('is-hidden', !plan.page || (window.innerWidth < 900 && st.id === 'hero'));
    if (st.id !== wasId) {
      wasId = st.id;
      navLinks.forEach((a, id) => a.classList.toggle('is-on', id === st.id));
    }

    // notifications for things that just switched on
    const rise = (k) => state[k] && !prev[k];
    if (rise('hacker')) { const e = world && world.enemies.find((x) => x.alive); if (e) { world.enemies.forEach((x) => (x.hacker = false)); e.hacker = true; notify('Hacker Detector', `<span class="acc">${e.name}</span> is hacking`); } }
    if (!state.hacker && world) world.enemies.forEach((x) => (x.hacker = false));
    if (rise('mod')) notify('Moderator Detector', 'a mod\'s friend joined. responses: notify, to lobby');
    if (rise('queue')) notify('Auto Queue', 'queued for 1v1');
    if (rise('recorder')) notify('Movement Recorder', 'recording parkour_02');
    if (rise('unlock')) notify('Unlock All', 'every cosmetic unlocked (client side)');
    for (const k of Object.keys(state)) prev[k] = state[k];

    ptr.s += (ptr.want - ptr.s) * (1 - Math.exp(-dt * 6));
    ptr.px += ((ptr.x > 0 ? ptr.x / window.innerWidth - 0.5 : 0) - ptr.px) * (1 - Math.exp(-dt * 3));
    ptr.py += ((ptr.y > 0 ? ptr.y / window.innerHeight - 0.5 : 0) - ptr.py) * (1 - Math.exp(-dt * 3));

    if (world) {
      const vh = window.innerHeight;
      const masks = cards.map((el) => el.getBoundingClientRect()).filter((r) => r.bottom > 0 && r.top < vh && r.width > 0);
      world.setMasks(masks);
      world.setPointer(ptr.x, ptr.y, REDUCE ? 0 : ptr.s);
      const mobile = window.innerWidth < 900;
      world.update(dt, time, state, st, { px: ptr.px, py: ptr.py, dim: weight(DIM, st), reduce: REDUCE, sy: mobile ? 0.05 : 0, sx: mobile ? 0.05 : 0 });
      world.render();
      hud.draw(dt, state, { arena: weight(ARENA, st), aim: weight(AIM, st), course: weight(COURSE, st) }, masks);
    }
    if (Math.floor(time) !== Math.floor(time - dt)) menu.tickClock();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((t) => { last = t; frame(t); });
}

boot();
