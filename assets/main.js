/* lxyhook site script: copy buttons, the fake menu switches, and the ascii scenes.
   no libraries. every scene draws characters into a grid, the grid paints itself onto a canvas. */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // edit these two
  // ---------------------------------------------------------------------------
  const CONFIG = {
    // your invite, e.g. "https://discord.gg/abc123". left empty, the discord buttons stay hidden
    discord: '',
    // the luarmor loader (same one the script queues for re-run after teleport)
    loader: 'https://api.luarmor.net/files/v4/loaders/d2b05e953ac72861d1cfd7e9297caccd.lua',
  };

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // ---------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function hash2(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const hash1 = (i) => hash2(i, 7919);
  function noise1(x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash1(i), hash1(i + 1), u);
  }
  const pad = (n) => String(n).padStart(2, '0');

  // colour slots used by the grid (index 0 = nothing)
  const K = { fg: 1, dim: 2, faint: 3, ghost: 4, acc: 5, accDim: 6, green: 7, red: 8, white: 9, yellow: 10 };
  const PAL = [];
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    PAL[K.fg] = v('--fg');
    PAL[K.dim] = v('--dim');
    PAL[K.faint] = v('--faint');
    PAL[K.ghost] = v('--ghost');
    PAL[K.acc] = v('--accent');
    PAL[K.accDim] = v('--accent-dim');
    PAL[K.green] = v('--green');
    PAL[K.red] = v('--red');
    PAL[K.white] = '#ffffff';
    PAL[K.yellow] = v('--yellow');
  }

  // ---------------------------------------------------------------------------
  // the character grid
  // ---------------------------------------------------------------------------
  class Grid {
    constructor(canvas, size, fixed) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.base = size;
      this.fixed = fixed || null;
      this.cols = 0;
      this.rows = 0;
      this.bg = null;
      this.flash = 0;
      this.changed = true;
    }
    measure() {
      const r = this.canvas.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return false;
      const ctx = this.ctx;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let cols, rows;
      if (this.fixed) {
        ctx.font = `100px ${FONT}`;
        const ratio = ctx.measureText('M').width / 100;
        cols = this.fixed.cols;
        rows = this.fixed.rows;
        this.cw = r.width / cols;
        this.ch = r.height / rows;
        this.size = Math.min(this.cw / ratio, this.ch * 0.95);
      } else {
        let size = r.width < 520 ? Math.max(10, this.base - 2) : this.base;
        ctx.font = `${size}px ${FONT}`;
        let cw = ctx.measureText('M').width;
        // some art needs a minimum width in characters; shrink the font until it fits
        if (this.minCols && r.width / cw < this.minCols) {
          size = Math.max(6, (r.width / this.minCols) * (size / cw));
          ctx.font = `${size}px ${FONT}`;
          cw = ctx.measureText('M').width;
        }
        this.size = size;
        this.cw = cw;
        this.ch = Math.round(size * 1.22);
        cols = Math.max(8, Math.floor(r.width / this.cw));
        rows = Math.max(4, Math.floor(r.height / this.ch));
      }
      this.w = r.width;
      this.h = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ox = (r.width - cols * this.cw) / 2;
      this.oy = (r.height - rows * this.ch) / 2;
      if (cols !== this.cols || rows !== this.rows) {
        this.cols = cols;
        this.rows = rows;
        this.chars = new Array(cols * rows).fill(' ');
        this.col = new Uint8Array(cols * rows);
        this.changed = true;
      }
      return true;
    }
    clear() {
      this.chars.fill(' ');
      this.col.fill(0);
    }
    put(x, y, c, k) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const i = y * this.cols + x;
      this.chars[i] = c;
      this.col[i] = k || K.fg;
    }
    at(x, y) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return ' ';
      return this.chars[y * this.cols + x];
    }
    text(x, y, s, k) {
      for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.put(x + i, y, s[i], k);
    }
    // a line made of one character picked from its slope
    line(x0, y0, x1, y1, k, ch) {
      const dx = x1 - x0, dy = y1 - y0;
      const n = Math.max(Math.abs(Math.round(dx)), Math.abs(Math.round(dy)), 1);
      if (!ch) {
        const ang = Math.abs(Math.atan2(dy * this.ch, dx * this.cw));
        const a = ang > Math.PI / 2 ? Math.PI - ang : ang;
        if (a < 0.35) ch = '-';
        else if (a > 1.2) ch = '|';
        else ch = dx * dy < 0 ? '/' : '\\';
      }
      for (let i = 0; i <= n; i++) this.put(x0 + (dx * i) / n, y0 + (dy * i) / n, ch, k);
    }
    render() {
      const { ctx, cols, chars, col, cw, ch, ox, oy } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      if (this.bg) {
        ctx.fillStyle = this.bg;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      if (this.flash > 0.01) {
        ctx.fillStyle = `rgba(255, 236, 220, ${(this.flash * 0.12).toFixed(3)})`;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      ctx.font = `${this.size}px ${FONT}`;
      ctx.textBaseline = 'middle';
      const yo = oy + ch / 2;
      for (let k = 1; k < PAL.length; k++) {
        let set = false;
        for (let i = 0; i < chars.length; i++) {
          if (col[i] !== k) continue;
          const c = chars[i];
          if (c === ' ') continue;
          if (!set) {
            ctx.fillStyle = PAL[k];
            set = true;
          }
          const x = i % cols, y = (i / cols) | 0;
          if (c === '█') {
            // snap to whole pixels so neighbouring blocks don't leave hairline seams
            const x0 = Math.floor(ox + x * cw), y0 = Math.floor(oy + y * ch);
            ctx.fillRect(x0, y0, Math.ceil(ox + (x + 1) * cw) - x0, Math.ceil(oy + (y + 1) * ch) - y0);
          } else ctx.fillText(c, ox + x * cw, yo + y * ch);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // state the fake menus write into
  // ---------------------------------------------------------------------------
  const flags = {
    arena: { silent: true, aimbot: false, circle: true, radius: 120, esp: true, health: true, chams: false, tracers: true, dmg: true },
    curve: { preset: 'EaseOut', smooth: 0, touched: false },
    sound: { on: true, esp: false },
    rain: { weather: true, lightning: true, clock: 22 },
    recorder: { trail: true, infinite: true },
    wrap: { runtime: true, unlock: true },
    log: { queue: true, hacker: true, mod: true },
  };

  const NAMES = ['toast_ttv', 'm1nty', 'kenji_04', 'ohnoitsdan', 'sleepyfox', 'w4ffle', 'pebble', 'nxtlvl', 'g0blin', 'yuzu', 'sh4rk', 'clementine', 'fishfood', 'lowtaperfade'];
  const WEAPONS = ['assault rifle', 'katana', 'sniper', 'shotgun', 'revolver', 'handgun', 'bow', 'scythe', 'burst rifle'];

  const SCENES = {};

  // ---------------------------------------------------------------------------
  // hero: a little arena, esp boxes, fov circle, silent aim
  // ---------------------------------------------------------------------------
  SCENES.arena = (g, F) => {
    let W, H, h0, lanes, sky, enemies, fx, feed, gun, three;
    const cross = { x: 0, y: 0 };
    let cool = 0.8, muzzle = 0, nameAt = Math.floor(Math.random() * NAMES.length);
    const nextName = () => NAMES[(nameAt = (nameAt + 1) % NAMES.length)];
    const laneScale = (l) => (three ? [0.55, 0.8, 1][l] : [0.75, 1][l]);
    const isBig = (e) => three && e.lane === 2;
    const headOf = (e) => ({ x: Math.round(e.x), y: lanes[e.lane] - (isBig(e) ? 3 : 2) });

    function spawn(lane, avoidX) {
      let x = rand(6, W - 7);
      if (avoidX != null && Math.abs(x - avoidX) < 10) x = (x + W / 2) % (W - 12) + 6;
      return {
        lane, x, dir: Math.random() < 0.5 ? -1 : 1, spd: rand(2.4, 4.4) * laneScale(lane),
        hp: 100, name: nextName(), wpn: pick(WEAPONS), phase: rand(0, 10),
        state: 'alive', t: 0, pause: 0, hit: 0, seed: (Math.random() * 1e6) | 0,
      };
    }

    function layout() {
      W = g.cols;
      H = g.rows;
      h0 = Math.max(4, Math.round(H * 0.3));
      const span = H - h0;
      three = span >= 17;
      lanes = three ? [h0 + Math.round(span * 0.36), h0 + Math.round(span * 0.64), H - 3] : [h0 + Math.round(span * 0.42), H - 3];
      // blocky skyline sitting on the horizon
      sky = new Array(W).fill(0);
      for (let x = 0; x < W;) {
        const w = 4 + Math.floor(hash1(x * 3 + 1) * 8);
        const r = hash1(x * 7 + 5);
        const hgt = r < 0.18 ? 0 : Math.round((0.25 + r * 0.75) * Math.max(1, h0 - 5));
        for (let i = 0; i < w && x + i < W; i++) sky[x + i] = hgt;
        x += w;
      }
      cross.x = W * 0.5;
      cross.y = h0 + span * 0.3;
      gun = { x: Math.round(W * 0.56), y: H - 1 };
      enemies = lanes.map((_, i) => spawn(i));
      const extra = W > 120 ? 2 : W > 84 ? 1 : 0;
      for (let i = 0; i < extra; i++) enemies.push(spawn(lanes.length - 1 - i, enemies[enemies.length - 1].x));
      fx = [];
      feed = [];
    }

    function shoot(e) {
      const h = headOf(e);
      const hs = Math.random() < 0.35;
      const dmg = Math.round(hs ? rand(48, 70) : rand(17, 34));
      e.hp -= dmg;
      e.hit = 0.12;
      muzzle = 0.06;
      if (F.tracers) fx.push({ k: 'tr', x0: gun.x, y0: gun.y, x1: h.x, y1: h.y, t: 0, life: 0.22 });
      fx.push({ k: 'hm', x: h.x, y: h.y, t: 0, life: 0.16 });
      if (F.dmg) fx.push({ k: 'dmg', x: h.x + 3, y: h.y - 1, s: String(dmg), hs, t: 0, life: 0.85 });
      if (e.hp <= 0) {
        e.hp = 0;
        e.state = 'dead';
        e.t = 0;
        fx.push({ k: 'boom', x: h.x, y: h.y + 1, t: 0, life: 0.55 });
        feed.unshift({ name: e.name, t: 0 });
        if (feed.length > 4) feed.pop();
      }
    }

    function missShot() {
      // nothing on: shoot wherever the crosshair is. sometimes that's a head anyway
      for (const e of enemies) {
        if (e.state !== 'alive') continue;
        const h = headOf(e);
        if (Math.abs(h.x - cross.x) <= 1.2 && Math.abs(h.y - cross.y) <= 0.8) return shoot(e);
      }
      muzzle = 0.06;
      if (F.tracers) fx.push({ k: 'tr', x0: gun.x, y0: gun.y, x1: cross.x, y1: cross.y, t: 0, life: 0.2 });
    }

    function drawWorld(t) {
      // stars
      for (let y = 0; y < h0 - 1; y++) {
        for (let x = 0; x < W; x++) {
          const r = hash2(x, y + 31);
          if (r > 0.986) g.put(x, y, (r * 1000 + t * 0.6) % 1 > 0.86 ? '+' : '.', K.ghost);
        }
      }
      // skyline
      for (let x = 0; x < W; x++) {
        const hgt = sky[x];
        if (hgt <= 0) continue;
        const top = h0 - hgt;
        const hl = x > 0 ? sky[x - 1] : 0, hr = x < W - 1 ? sky[x + 1] : 0;
        const wallL = hl < hgt, wallR = hr < hgt;
        if (!wallL && !wallR) g.put(x, top, '_', K.faint);
        for (let y = top + 1; y < h0; y++) {
          if ((wallL && y <= h0 - hl) || (wallR && y <= h0 - hr)) g.put(x, y, '|', K.faint);
          else if (hash2(x, y) > 0.9) g.put(x, y, (hash2(x, y) * 977 + t * 0.15) % 1 > 0.93 ? ':' : '.', K.ghost);
        }
      }
      // horizon + floor
      for (let x = 0; x < W; x++) if (g.at(x, h0) === ' ') g.put(x, h0, '_', K.faint);
      const vx = W / 2;
      for (let k = -8; k <= 8; k++) {
        const xb = vx + k * W * 0.12;
        for (let y = h0 + 1; y < H; y++) {
          const p = (y - h0) / (H - h0);
          g.put(vx + (xb - vx) * p, y, '.', K.ghost);
        }
      }
      let lastBand = -1;
      for (let y = h0 + 1; y < H; y++) {
        const p = (y - h0) / (H - h0);
        const band = Math.floor((1 / p) * 2.2);
        if (band !== lastBand && lastBand !== -1 && p > 0.3) {
          for (let x = (y * 2) % 3; x < W; x += 3) if (g.at(x, y) === ' ') g.put(x, y, '-', K.ghost);
        }
        lastBand = band;
      }
    }

    function drawEnemy(e, t) {
      const foot = lanes[e.lane];
      const big = isBig(e);
      const far = three ? e.lane === 0 : false;
      const x = Math.round(e.x);
      const step = Math.floor(e.phase * 2) % 2;
      const legs = e.pause > 0 ? '/ \\' : step ? '/ \\' : ' | ';
      const spr = big ? [' O ', '/|\\', ' | ', legs] : [' o ', '/|\\', legs];
      const top = foot - spr.length + 1;

      if (e.state === 'dead') {
        const k = clamp(e.t / 0.9, 0, 1);
        if (k >= 1) return;
        for (let j = 0; j < spr.length; j++) {
          for (let i = 0; i < 3; i++) {
            if (spr[j][i] === ' ') continue;
            if (hash2(e.seed + i, j) < k) continue;
            g.put(x - 1 + i, top + j + Math.round(k * (spr.length - 1 - j) * 0.6), pick(['.', ',', "'", '`']), K.dim);
          }
        }
        return;
      }

      const bodyK = e.hit > 0 ? K.white : far ? K.dim : K.fg;
      for (let j = 0; j < spr.length; j++) {
        for (let i = 0; i < 3; i++) {
          const c = spr[j][i];
          if (c === ' ') continue;
          if (F.chams) g.put(x - 1 + i, top + j, '█', e.hit > 0 ? K.white : far ? K.accDim : K.acc);
          else g.put(x - 1 + i, top + j, c, bodyK);
        }
      }

      if (!F.esp) return;
      const bk = far ? K.accDim : K.acc;
      const l = x - 2, r = x + 2, tp = top - 1, b = foot + 1;
      g.put(l, tp, '┌', bk); g.put(r, tp, '┐', bk); g.put(l, b, '└', bk); g.put(r, b, '┘', bk);
      for (let xx = l + 1; xx < r; xx++) { g.put(xx, tp, '─', bk); g.put(xx, b, '─', bk); }
      for (let yy = tp + 1; yy < b; yy++) { g.put(l, yy, '│', bk); g.put(r, yy, '│', bk); }
      g.text(x - Math.floor(e.name.length / 2), tp - 1, e.name, far ? K.dim : K.fg);
      if (F.health) {
        const total = b - tp + 1;
        const filled = Math.ceil((e.hp / 100) * total);
        const hk = e.hp > 60 ? K.green : e.hp > 30 ? K.yellow : K.red;
        for (let i = 0; i < total; i++) g.put(l - 1, b - i, i < filled ? '|' : ':', i < filled ? hk : K.ghost);
      }
      if (e.lane === lanes.length - 1 && b + 1 < H) g.text(x - Math.floor(e.wpn.length / 2), b + 1, e.wpn, K.faint);
    }

    function drawHud() {
      // keybind list, top left (the real menu has one too)
      if (W >= 60) {
        const rows = [['silent aim', F.silent], ['aimbot', F.aimbot]];
        const w = 24;
        for (let y = 1; y <= 4; y++) for (let x = 1; x <= w; x++) g.put(x, y, ' ', 0);
        g.put(1, 1, '┌', K.faint);
        g.text(2, 1, '─ keybinds ' + '─'.repeat(w - 13), K.faint);
        g.put(w, 1, '┐', K.faint);
        rows.forEach(([label, on], i) => {
          const y = 2 + i;
          g.put(1, y, '│', K.faint);
          g.put(w, y, '│', K.faint);
          g.text(3, y, label, on ? K.fg : K.dim);
          const v = on ? 'always' : 'off';
          g.text(w - 1 - v.length, y, v, on ? K.acc : K.faint);
        });
        g.put(1, 4, '└', K.faint);
        g.text(2, 4, '─'.repeat(w - 2), K.faint);
        g.put(w, 4, '┘', K.faint);
      }
      // kill feed, top right
      feed.forEach((f, i) => {
        const s = 'you > ' + f.name;
        const x = W - 2 - s.length;
        const old = f.t > 3.2;
        g.text(x, 1 + i, 'you', old ? K.faint : K.fg);
        g.text(x + 4, 1 + i, '>', old ? K.faint : K.acc);
        g.text(x + 6, 1 + i, f.name, old ? K.faint : K.dim);
      });
    }

    return {
      update(dt, t) {
        if (g.changed) { layout(); g.changed = false; }

        // enemies walk around
        for (const e of enemies) {
          if (e.state === 'alive') {
            e.hit = Math.max(0, e.hit - dt);
            if (e.pause > 0) e.pause -= dt;
            else {
              e.x += e.dir * e.spd * dt;
              e.phase += dt * e.spd * 0.9;
              if (Math.random() < dt * 0.25) e.pause = rand(0.3, 1.1);
              if (Math.random() < dt * 0.18) e.dir *= -1;
            }
            if (e.x < 5) { e.x = 5; e.dir = 1; }
            if (e.x > W - 6) { e.x = W - 6; e.dir = -1; }
          } else {
            e.t += dt;
            if (e.t > 1.7) Object.assign(e, spawn(e.lane));
          }
        }

        // closest head inside the fov circle
        const R = F.radius;
        let best = null, bestD = Infinity;
        for (const e of enemies) {
          if (e.state !== 'alive') continue;
          const h = headOf(e);
          const d = Math.hypot((h.x - cross.x) * g.cw, (h.y - cross.y) * g.ch);
          if (d <= R && d < bestD) { best = e; bestD = d; }
        }

        if (F.aimbot && best) {
          const h = headOf(best);
          const dx = (h.x - cross.x) * g.cw, dy = (h.y - cross.y) * g.ch;
          const d = Math.hypot(dx, dy);
          const stepPx = Math.min(d, 900 * dt) * 0.6;
          if (d > 0.5) { cross.x += (dx / d) * stepPx / g.cw; cross.y += (dy / d) * stepPx / g.ch; }
          bestD = Math.max(0, d - stepPx);
        } else {
          const tx = W * 0.5 + (noise1(t * 0.21) - 0.5) * W * 0.8;
          const ty = h0 + (H - h0) * 0.1 + noise1(t * 0.27 + 40) * (H - h0) * 0.7;
          const k = Math.min(1, dt * 1.6);
          cross.x += (tx - cross.x) * k;
          cross.y += (ty - cross.y) * k;
        }

        cool -= dt;
        muzzle = Math.max(0, muzzle - dt);
        if (cool <= 0) {
          if (best && F.silent) { shoot(best); cool = rand(0.28, 0.45); }
          else if (best && F.aimbot && bestD < g.cw * 1.3) { shoot(best); cool = rand(0.3, 0.45); }
          else if (!F.silent && !F.aimbot) { missShot(); cool = rand(0.55, 1.1); }
          else cool = 0.08;
        }

        for (const f of fx) f.t += dt;
        fx = fx.filter((f) => f.t < f.life);
        for (const f of feed) f.t += dt;
        feed = feed.filter((f) => f.t < 5);

        // draw
        drawWorld(t);
        const order = enemies.slice().sort((a, b) => a.lane - b.lane);
        for (const e of order) drawEnemy(e, t);

        for (const f of fx) {
          const k = f.t / f.life;
          if (f.k === 'tr') {
            const sx = f.x0 + (f.x1 - f.x0) * 0.04, sy = f.y0 + (f.y1 - f.y0) * 0.04;
            g.line(sx, sy, f.x1, f.y1, k < 0.5 ? K.acc : K.accDim);
          } else if (f.k === 'hm') {
            g.put(f.x - 1, f.y - 1, '\\', K.white); g.put(f.x + 1, f.y - 1, '/', K.white);
            g.put(f.x - 1, f.y + 1, '/', K.white); g.put(f.x + 1, f.y + 1, '\\', K.white);
          } else if (f.k === 'dmg') {
            g.text(f.x, f.y - k * 2, f.s, k > 0.65 ? K.dim : f.hs ? K.red : K.white);
          } else if (f.k === 'boom') {
            const r = 1 + k * 4;
            const n = 16;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              g.put(f.x + Math.cos(a) * r * 2, f.y + Math.sin(a) * r, k < 0.45 ? '*' : '.', k < 0.3 ? K.white : k < 0.6 ? K.acc : K.dim);
            }
          }
        }
        if (muzzle > 0) g.put(gun.x, gun.y, '*', K.yellow);

        if (F.circle) {
          const n = Math.max(24, Math.round((Math.PI * 2 * R) / (g.cw * 1.15)));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const x = cross.x + (Math.cos(a) * R) / g.cw, y = cross.y + (Math.sin(a) * R) / g.ch;
            if (g.at(x, y) === ' ' || g.at(x, y) === '.' || g.at(x, y) === '-') g.put(x, y, '·', K.accDim);
          }
        }
        const cx = Math.round(cross.x), cy = Math.round(cross.y);
        g.put(cx - 2, cy, '─', K.white); g.put(cx + 2, cy, '─', K.white);
        g.put(cx, cy - 1, '│', K.white); g.put(cx, cy + 1, '│', K.white);
        g.put(cx, cy, '·', K.white);

        drawHud();
      },
    };
  };

  // ---------------------------------------------------------------------------
  // combat: the five aim curves from the script, and a crosshair using one of them
  // ---------------------------------------------------------------------------
  SCENES.curve = (g, F) => {
    const FN = {
      Constant: () => 1,
      Linear: (x) => x,
      EaseIn: (x) => x * x,
      EaseOut: (x) => 1 - (1 - x) * (1 - x),
      SCurve: (x) => x * x * (3 - 2 * x),
    };
    const ORDER = ['Constant', 'Linear', 'EaseIn', 'EaseOut', 'SCurve'];
    const LABEL = { Constant: 'constant', Linear: 'linear', EaseIn: 'ease in', EaseOut: 'ease out', SCurve: 's-curve' };
    const FORMULA = { Constant: 'f(x) = 1', Linear: 'f(x) = x', EaseIn: 'f(x) = x²', EaseOut: 'f(x) = 1 - (1-x)²', SCurve: 'f(x) = x²(3 - 2x)' };
    const labelEl = document.querySelector('.js-curve-label');
    let W, H, x0, x1, y0, y1, ty;
    let d = 1, hold = 0, elapsed = 0, trail = [], sampleT = 0, lastPreset = null;

    function layout() {
      W = g.cols;
      H = g.rows;
      x0 = 7;
      x1 = W - 3;
      y0 = 2;
      y1 = H - 8;
      ty = H - 3;
    }
    const rowOf = (v) => y1 - Math.round(v * (y1 - y0));
    const colOf = (x) => Math.round(x0 + x * (x1 - x0));

    function drawCurve(fn, k, fancy) {
      for (let c = x0; c <= x1; c++) {
        const xx = (c - x0) / (x1 - x0);
        const r = rowOf(fn(xx));
        if (!fancy) { if (g.at(c, r) === ' ' || g.at(c, r) === '.') g.put(c, r, '·', k); continue; }
        const rn = c < x1 ? rowOf(fn((c + 1 - x0) / (x1 - x0))) : r;
        if (rn === r) g.put(c, r, '─', k);
        else if (rn < r) {
          g.put(c, r, '╱', k);
          for (let y = rn + 1; y < r; y++) g.put(c, y, '│', k);
        } else {
          g.put(c, r, '╲', k);
          for (let y = r + 1; y < rn; y++) g.put(c, y, '│', k);
        }
      }
    }

    function syncUi(preset) {
      if (labelEl) labelEl.textContent = LABEL[preset];
      document.querySelectorAll('[data-flag="curve.preset"] [role="radio"]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === preset)));
    }

    return {
      update(dt) {
        if (g.changed) { layout(); g.changed = false; }
        const preset = F.preset;
        if (preset !== lastPreset) { d = 1; hold = 0; elapsed = 0; trail = []; lastPreset = preset; syncUi(preset); }
        const fn = FN[preset];

        // move: each step is scaled by f(distance / fov), smoothing slows the whole pull
        if (hold > 0) {
          hold -= dt;
          if (hold <= 0) {
            if (!F.touched) F.preset = ORDER[(ORDER.indexOf(preset) + 1) % ORDER.length];
            d = 1; elapsed = 0; trail = []; lastPreset = F.preset; syncUi(F.preset);
          }
        } else {
          const speed = 0.95 * (1 - F.smooth / 100);
          d -= dt * speed * Math.max(fn(d), 0.12);
          elapsed += dt;
          sampleT += dt;
          if (sampleT > 0.07) { sampleT = 0; trail.push(d); }
          if (d <= 0.004) { d = 0; hold = 1.1; }
        }

        // axes + grid
        for (let y = y0; y <= y1; y++) g.put(x0 - 1, y, '│', K.faint);
        g.put(x0 - 1, y1 + 1, '└', K.faint);
        for (let x = x0; x <= x1; x++) g.put(x, y1 + 1, '─', K.faint);
        for (const v of [0.25, 0.5, 0.75]) {
          const r = rowOf(v);
          for (let x = x0; x <= x1; x += 2) g.put(x, r, '.', K.ghost);
        }
        g.text(1, y0, '1.0', K.faint);
        g.text(1, rowOf(0.5), '0.5', K.faint);
        g.text(1, y1, '0', K.faint);
        g.text(x0, y1 + 2, '0', K.faint);
        const xl = 'distance to target / fov';
        g.text(Math.max(x0 + 3, x1 - xl.length + 1), y1 + 2, xl, K.faint);
        g.text(x0 + 1, y0 - 1, 'step size', K.faint);

        for (const p of ORDER) if (p !== preset) drawCurve(FN[p], K.ghost, false);
        drawCurve(fn, K.acc, true);

        const f = FORMULA[preset];
        g.text(x1 - f.length, y1 - 1, f, K.dim);

        // where the crosshair is on the curve right now
        const mc = colOf(clamp(d, 0, 1)), mr = rowOf(fn(clamp(d, 0, 1)));
        g.put(mc, mr, '●', K.white);

        // the crosshair moving to a head, dots are spaced by speed
        const tx0 = x0, tx1 = x1 - 2;
        for (let x = tx0; x <= tx1; x += 1) g.put(x, ty, '.', K.ghost);
        for (const v of trail) g.put(tx1 - v * (tx1 - tx0), ty, '·', K.accDim);
        g.put(tx1 - 1, ty, '[', K.acc); g.put(tx1, ty, 'o', K.fg); g.put(tx1 + 1, ty, ']', K.acc);
        const cx = Math.round(tx1 - d * (tx1 - tx0));
        g.put(cx, ty, '+', K.white);
        if (hold > 0) {
          g.put(tx1 - 1, ty - 1, '\\', K.white); g.put(tx1 + 1, ty - 1, '/', K.white);
          g.put(tx1 - 1, ty + 1, '/', K.white); g.put(tx1 + 1, ty + 1, '\\', K.white);
        }
        g.text(tx0, ty - 1, 'crosshair', K.faint);
        const s = `${elapsed.toFixed(2)}s`;
        g.text(tx1 - 3 - s.length, ty - 1, s, hold > 0 ? K.acc : K.dim);
      },
    };
  };

  // ---------------------------------------------------------------------------
  // visuals: sound esp, top down
  // ---------------------------------------------------------------------------
  SCENES.sound = (g, F) => {
    let W, H, wall, me, bots, rings;

    function rect(x, y, w, h) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const xx = x + i, yy = y + j;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) wall[yy * W + xx] = 1;
      }
    }
    function layout() {
      W = g.cols;
      H = g.rows;
      wall = new Uint8Array(W * H);
      rect(0, 0, W, 1); rect(0, H - 1, W, 1); rect(0, 0, 1, H); rect(W - 1, 0, 1, H);
      const vx = Math.round(W * 0.38), mid = Math.round(H * 0.5);
      rect(vx, 0, 1, Math.round(H * 0.3));
      rect(vx, Math.round(H * 0.3) + 3, 1, Math.round(H * 0.34));
      rect(Math.round(W * 0.6), mid, Math.round(W * 0.16), 1);
      rect(Math.round(W * 0.84), mid, W, 1);
      rect(Math.round(W * 0.14), Math.round(H * 0.24), 6, 2);
      rect(Math.round(W * 0.66), Math.round(H * 0.72), 7, 2);
      rect(Math.round(W * 0.5), Math.round(H * 0.18), 3, 3);
      me = { x: Math.round(W * 0.2), y: Math.round(H * 0.74) };
      const P = (a, b) => ({ x: W * a, y: H * b });
      bots = [
        { path: [P(0.46, 0.14), P(0.92, 0.16), P(0.9, 0.38), P(0.5, 0.36)], i: 0, x: 0, y: 0, step: 0, ev: rand(2, 5), side: 1, name: pick(NAMES) },
        { path: [P(0.48, 0.66), P(0.92, 0.62), P(0.9, 0.88), P(0.46, 0.86)], i: 2, x: 0, y: 0, step: 0, ev: rand(3, 6), side: 1, name: pick(NAMES) },
      ];
      for (const b of bots) { b.x = b.path[b.i].x; b.y = b.path[b.i].y; }
      rings = [];
    }
    const metres = (x, y) => Math.round(Math.hypot((x - me.x) * g.cw, (y - me.y) * g.ch) / 9);

    function emit(b, kind, loud) {
      const off = kind === 'step' ? (b.side = -b.side) * 0.6 : 0;
      rings.push({ x: b.x + off, y: b.y, t: 0, life: 0.8 + loud * 0.7, loud, kind });
      b.label = { s: `${kind} ${metres(b.x, b.y)}m`, t: 0, loud };
    }

    return {
      update(dt) {
        if (g.changed) { layout(); g.changed = false; }

        for (const b of bots) {
          const tgt = b.path[(b.i + 1) % b.path.length];
          const dxp = (tgt.x - b.x) * g.cw, dyp = (tgt.y - b.y) * g.ch;
          const d = Math.hypot(dxp, dyp);
          const v = 55 * dt;
          if (d <= v) { b.i = (b.i + 1) % b.path.length; }
          else { b.x += (dxp / d) * v / g.cw; b.y += (dyp / d) * v / g.ch; }
          b.step += dt;
          if (b.step > 0.42) { b.step = 0; emit(b, 'step', rand(0.25, 0.4)); }
          b.ev -= dt;
          if (b.ev <= 0) {
            b.ev = rand(3, 7);
            if (Math.random() < 0.55) emit(b, 'shot', 1); else emit(b, 'reload', 0.6);
          }
          if (b.label) b.label.t += dt;
        }
        for (const r of rings) r.t += dt;
        rings = rings.filter((r) => r.t < r.life);

        // floor + walls (outer wall a shade darker than the inside ones)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (wall[y * W + x]) g.put(x, y, '#', x === 0 || y === 0 || x === W - 1 || y === H - 1 ? K.ghost : K.faint);
          else if (hash2(x, y) > 0.94) g.put(x, y, '.', K.ghost);
        }

        if (F.on) {
          for (const r of rings) {
            const k = r.t / r.life;
            const rp = k * (16 + r.loud * 80);
            const n = Math.max(6, Math.ceil((Math.PI * 2 * rp) / (g.cw * 1.3)));
            const col = r.loud >= 0.9 ? K.red : r.loud >= 0.5 ? K.yellow : k < 0.5 ? K.acc : K.accDim;
            const ch = r.loud >= 0.5 && k < 0.45 ? 'o' : '·';
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              g.put(r.x + (Math.cos(a) * rp) / g.cw, r.y + (Math.sin(a) * rp) / g.ch, ch, col);
            }
            if (k < 0.5) g.put(r.x, r.y, r.kind === 'shot' ? '*' : '·', col);
          }
          for (const b of bots) {
            if (!b.label || b.label.t > 1.1) continue;
            g.text(Math.round(b.x) + 2, Math.round(b.y) - 1, b.label.s, b.label.loud >= 0.9 ? K.red : K.dim);
          }
        } else {
          g.text(2, H - 2, 'sound esp off. good luck.', K.faint);
        }

        if (F.esp) {
          for (const b of bots) {
            const x = Math.round(b.x), y = Math.round(b.y);
            g.put(x - 1, y, '[', K.acc); g.put(x, y, 'x', K.red); g.put(x + 1, y, ']', K.acc);
            g.text(x - Math.floor(b.name.length / 2), y - 1, b.name, K.fg);
          }
        }

        g.put(me.x, me.y, '@', K.acc);
        g.text(me.x + 2, me.y, 'you', K.dim);
      },
    };
  };

  // ---------------------------------------------------------------------------
  // world: clock time, rain, lightning
  // ---------------------------------------------------------------------------
  SCENES.rain = (g, F) => {
    const clockEl = document.querySelector('.js-clock');
    const CLOUD = ['    .--.    ', ' .-(    ).  ', '(___.__)__) '];
    let W, H, sky, drops, splashes, clouds, bolt, sparks, timer = 2;

    function layout() {
      W = g.cols;
      H = g.rows;
      sky = new Array(W).fill(0);
      const maxH = Math.max(3, Math.round(H * 0.38));
      for (let x = 0; x < W;) {
        const w = 3 + Math.floor(hash1(x * 5 + 2) * 7);
        const r = hash1(x * 11 + 3);
        const hgt = r < 0.15 ? 1 : Math.round(2 + r * (maxH - 2));
        for (let i = 0; i < w && x + i < W; i++) sky[x + i] = hgt;
        x += w + (r > 0.7 ? 1 : 0);
      }
      const n = Math.round(W * H * 0.03);
      drops = Array.from({ length: n }, () => ({ x: rand(0, W * 1.3), y: rand(-H, H), v: rand(20, 30) }));
      splashes = [];
      clouds = [0, 1, 2, 3].map((i) => ({ x: (W / 4) * i + rand(-4, 4), y: i % 2 ? 1 : 3, v: rand(0.6, 1.4) }));
      bolt = null;
      sparks = [];
    }
    const surface = (x) => H - 1 - (sky[clamp(Math.round(x), 0, W - 1)] || 0);

    function strike() {
      let x = Math.round(rand(W * 0.15, W * 0.85)), y = 4;
      const pts = [];
      const end = surface(x);
      while (y < end) {
        const dx = pick([-1, 0, 0, 1]);
        pts.push({ x, y, c: dx < 0 ? '/' : dx > 0 ? '\\' : '|' });
        x += dx;
        y += 1;
        if (pts.length > 4 && Math.random() < 0.12) {
          let bx = x, by = y;
          const dir = pick([-1, 1]);
          for (let i = 0; i < 4 && by < surface(bx); i++) { pts.push({ x: bx, y: by, c: dir < 0 ? '/' : '\\' }); bx += dir; by++; }
        }
      }
      bolt = { pts, t: 0 };
      g.flash = 1;
      for (let i = 0; i < 9; i++) sparks.push({ x, y: surface(x) - 1, vx: rand(-9, 9), vy: rand(-10, -3), t: 0 });
    }

    return {
      update(dt, t) {
        if (g.changed) { layout(); g.changed = false; }
        const T = F.clock % 24;
        if (clockEl) clockEl.textContent = `${pad(Math.floor(T))}:${pad(Math.round((T % 1) * 60) % 60)}`;
        const day = T >= 6 && T < 18;
        const sun = Math.sin(((T - 6) / 12) * Math.PI); // >0 during the day
        const dusk = Math.max(0, 1 - Math.abs(T - 18.2) / 1.6) + Math.max(0, 1 - Math.abs(T - 5.8) / 1.6);
        g.bg = day ? (F.weather ? '#12110f' : '#16140f') : dusk > 0.1 ? '#140d0a' : '#0a0908';
        if (dusk > 0.2 && day) g.bg = '#1a100b';
        g.flash = Math.max(0, g.flash - dt * 5);

        // stars at night
        if (!day) {
          for (let y = 0; y < H - 2; y++) for (let x = 0; x < W; x++) {
            const r = hash2(x + 3, y * 7);
            if (r > 0.975 && y < surface(x) - 1) g.put(x, y, (r * 1000 + t * 0.8) % 1 > 0.8 ? '*' : '.', F.weather ? K.ghost : K.faint);
          }
        }
        // clouds go behind the sun / moon, otherwise they swallow it
        if (F.weather) {
          for (const c of clouds) {
            c.x += c.v * dt;
            if (c.x > W + 2) c.x = -CLOUD[0].length;
            CLOUD.forEach((row, j) => g.text(c.x, c.y + j, row, g.flash > 0.3 ? K.fg : K.dim));
          }
        }
        // sun / moon on an arc
        const arc =(p) => ({ x: 3 + p * (W - 12), y: 2 + (1 - Math.sin(p * Math.PI)) * Math.max(2, H * 0.32) });
        if (day) {
          const p = arc((T - 6) / 12);
          const k = F.weather ? K.dim : K.yellow;
          g.text(p.x, p.y - 1, '\\ | /', k);
          g.text(p.x - 1, p.y, '-- O --', k);
          g.text(p.x, p.y + 1, '/ | \\', k);
          g.put(p.x + 2, p.y, 'O', F.weather ? K.fg : K.yellow);
        } else {
          const p = arc(((T + 6) % 24) / 12);
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 3; i++) g.put(p.x + i, p.y + j, ' ', 0);
          g.text(p.x, p.y - 1, ',-.', K.dim);
          g.text(p.x - 1, p.y, '(  (', K.fg);
          g.text(p.x, p.y + 1, "`-'", K.dim);
        }

        // skyline: roof on the row above the first row inside the building, walls where the neighbour is lower
        for (let x = 0; x < W; x++) {
          const top = surface(x);
          if (top >= H - 1) continue;
          const tl = x > 0 ? surface(x - 1) : H - 1, tr = x < W - 1 ? surface(x + 1) : H - 1;
          const wallL = tl > top, wallR = tr > top;
          if (!wallL && !wallR) g.put(x, top - 1, '_', K.faint);
          for (let y = top; y < H - 1; y++) {
            if ((wallL && y < tl) || (wallR && y < tr)) { g.put(x, y, '|', K.faint); continue; }
            const r = hash2(x * 3, y * 5);
            if (r > 0.82) g.put(x, y, !day && r > 0.955 ? '▪' : '.', !day && r > 0.955 ? K.yellow : K.ghost);
          }
        }
        for (let x = 0; x < W; x++) g.put(x, H - 1, '_', K.faint);

        if (F.weather) {
          // rain
          for (const d of drops) {
            d.y += d.v * dt;
            d.x -= d.v * dt * 0.3;
            if (d.y >= surface(d.x) || d.x < -1) {
              if (d.x >= 0 && d.x < W) splashes.push({ x: d.x, y: surface(d.x) - 1, t: 0 });
              d.y = rand(-4, 0);
              d.x = rand(0, W * 1.3);
              continue;
            }
            if (d.y >= 0) g.put(d.x, d.y, '/', d.v > 26 ? K.dim : K.faint);
          }
          for (const s of splashes) { s.t += dt; if (s.t < 0.12) g.put(s.x, s.y, s.t < 0.06 ? '.' : ',', K.faint); }
          splashes = splashes.filter((s) => s.t < 0.12);

          // lightning
          if (F.lightning) {
            timer -= dt;
            if (timer <= 0) { timer = rand(2.5, 6); strike(); }
          }
          if (bolt) {
            bolt.t += dt;
            const bt = bolt.t;
            const vis = bt < 0.08 || (bt > 0.13 && bt < 0.34);
            if (vis) for (const p of bolt.pts) g.put(p.x, p.y, p.c, bt < 0.08 ? K.white : K.acc);
            if (bt > 0.13 && bt < 0.16) g.flash = Math.max(g.flash, 0.7);
            if (bt > 0.4) bolt = null;
          }
          for (const s of sparks) {
            s.t += dt;
            s.vy += 30 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.t < 0.6) g.put(s.x, s.y, s.t < 0.2 ? '*' : s.t < 0.4 ? '+' : '.', s.t < 0.25 ? K.yellow : K.acc);
          }
          sparks = sparks.filter((s) => s.t < 0.6);
        }
      },
    };
  };

  // ---------------------------------------------------------------------------
  // player: movement recorder, record then replay
  // ---------------------------------------------------------------------------
  SCENES.recorder = (g, F) => {
    const recEl = document.querySelector('.js-rec');
    let W, H, G, pit, plat, ledge, frames, jumpsUsed, phase = 'rec', clock = 0, wait = 0, simKey = '';
    const FPS = 60;

    function surfacesAt(x) {
      const c = Math.round(x);
      const out = [];
      if (!(c >= pit[0] && c < pit[1])) out.push(G);
      if (c >= plat[0] && c < plat[1]) out.push(G - plat[2]);
      if (ledge && c >= ledge[0]) out.push(G - ledge[2]);
      return out;
    }

    function simulate() {
      // run the route once with simple physics and keep every frame; the replay reads these back
      const gr = 70;
      const hop = Math.max(2.6, (plat[2] + 1.5) / 1.85); // first jump height, in rows
      const vJump = Math.sqrt(2 * gr * hop);
      const vExtra = vJump * 0.92;
      const hopExtra = (vExtra * vExtra) / (2 * gr);
      const tUp = vJump / gr, tUpExtra = vExtra / gr;
      const vx = W / 6;
      // where to leave the ground: over the pit, up onto the platform (one double jump), up the ledge (as many as it takes)
      const jumps = [
        { at: pit[0] - 1.5, extra: 0, target: G },
        { at: plat[0] - vx * (tUp + tUpExtra) + 1, extra: 1, target: G - plat[2] },
      ];
      if (ledge) {
        const n = Math.ceil(Math.max(0, ledge[2] + 1.2 - hop) / hopExtra);
        // with infinite double jumps you can start this one in the air, so it does
        jumps.push({ at: ledge[0] - vx * (tUp + n * tUpExtra) - 1, extra: n + 4, target: G - ledge[2], anyAir: true });
      }
      let x = 2, y = G - 1, vy = 0, air = false, used = 0, extraLeft = 0, next = 0, cur = null;
      const out = [];
      for (let i = 0; i < FPS * 14; i++) {
        const dt = 1 / FPS;
        if (next < jumps.length && x >= jumps[next].at && (!air || jumps[next].anyAir)) {
          cur = jumps[next];
          vy = -vJump; air = true; used++;
          extraLeft = cur.extra;
          next++;
        }
        // jump again at the top of the arc (or on the way down) while still below where we're headed
        if (air && vy >= 0 && extraLeft > 0 && cur && y > cur.target - 1.2) { vy = -vExtra; extraLeft--; used++; }
        let nx = x + vx * dt;
        // the ledge is a wall from the side until you're above it
        if (ledge && x < ledge[0] && nx >= ledge[0] && y > G - ledge[2] - 1 + 0.01) nx = ledge[0] - 0.01;
        x = nx;
        if (air) {
          const prev = y;
          vy += gr * dt;
          y += vy * dt;
          if (vy > 0) {
            for (const s of surfacesAt(x)) {
              if (prev <= s - 1 + 0.01 && y >= s - 1) { y = s - 1; vy = 0; air = false; extraLeft = 0; break; }
            }
          }
          if (y > H + 2) break;
        } else if (!surfacesAt(x).some((s) => Math.abs(s - 1 - y) < 0.01)) {
          air = true;
          vy = 0;
        }
        out.push({ x, y, air });
        if (x >= W - 4) break;
      }
      frames = out;
      jumpsUsed = used;
    }

    function layout() {
      W = g.cols;
      H = g.rows;
      G = H - 3;
      const ph = Math.max(3, Math.round((G - 2) * 0.34));
      const lh = Math.max(ph + 3, Math.round((G - 2) * 0.62));
      pit = [Math.round(W * 0.24), Math.round(W * 0.3)];
      plat = [Math.round(W * 0.44), Math.round(W * 0.6), ph];
      ledge = F.infinite ? [Math.round(W * 0.8), W, lh] : null;
      simulate();
      phase = 'rec';
      clock = 0;
    }

    function figure(p, i, k) {
      const x = Math.round(p.x), y = Math.round(p.y);
      const run = Math.floor(i / 6) % 2;
      const spr = p.air ? ['\\o/', ' | ', '/ \\'] : [' o ', '/|\\', run ? '/ \\' : ' | '];
      spr.forEach((row, j) => { for (let c = 0; c < 3; c++) if (row[c] !== ' ') g.put(x - 1 + c, y - 2 + j, row[c], k); });
    }

    return {
      update(dt, t) {
        const key = `${g.cols}x${g.rows}:${F.infinite}`;
        if (g.changed || key !== simKey) { simKey = key; layout(); g.changed = false; }

        const total = frames.length / FPS;
        if (wait > 0) {
          wait -= dt;
          if (wait <= 0) { phase = phase === 'rec' ? (F.trail ? 'play' : 'rec') : 'rec'; clock = 0; }
        } else {
          clock += dt;
          if (clock >= total) { clock = total; wait = 0.8; }
        }
        const idx = Math.min(frames.length - 1, Math.floor(clock * FPS));

        // level
        for (let x = 0; x < W; x++) {
          if (x >= pit[0] && x < pit[1]) { g.put(x, H - 1, '~', K.ghost); continue; }
          g.put(x, G, '=', K.faint);
          for (let y = G + 1; y < H; y++) if (hash2(x, y) > 0.55) g.put(x, y, ':', K.ghost);
        }
        const py = G - plat[2];
        g.put(plat[0], py, '[', K.faint); g.put(plat[1] - 1, py, ']', K.faint);
        for (let x = plat[0] + 1; x < plat[1] - 1; x++) g.put(x, py, '=', K.faint);
        if (ledge) {
          const ly = G - ledge[2];
          for (let x = ledge[0]; x < W; x++) g.put(x, ly, '=', K.faint);
          for (let y = ly + 1; y < G; y++) {
            g.put(ledge[0], y, '|', K.faint);
            for (let x = ledge[0] + 1; x < W; x++) if (hash2(x, y) > 0.7) g.put(x, y, ':', K.ghost);
          }
        }
        // markers at both ends of the route
        const first = frames[0], last = frames[frames.length - 1];
        g.text(Math.round(first.x) - 1, Math.round(first.y) - 4, '|>', K.green);
        g.put(Math.round(first.x) - 1, Math.round(first.y) - 3, '|', K.green);
        g.text(Math.round(last.x) - 1, Math.round(last.y) - 4, '|>', K.red);
        g.put(Math.round(last.x) - 1, Math.round(last.y) - 3, '|', K.red);

        if (F.trail) {
          const upto = phase === 'rec' ? idx : frames.length - 1;
          for (let i = 0; i <= upto; i += 3) {
            const p = frames[i];
            if (g.at(p.x, p.y - 1) === ' ') g.put(p.x, p.y - 1, '·', phase === 'rec' ? K.acc : K.accDim);
          }
        }
        figure(frames[idx], idx, phase === 'play' ? K.acc : K.fg);

        const s = `${pad(Math.floor(clock / 60))}:${(clock % 60).toFixed(1).padStart(4, '0')}`;
        let status;
        if (!F.trail) {
          status = 'recorder off';
          g.text(1, 1, status, K.faint);
          if (recEl) recEl.textContent = 'off';
        } else if (phase === 'rec') {
          if (Math.floor(t * 2) % 2 === 0) g.put(1, 1, '●', K.red);
          status = `  rec  ${s}`;
          g.text(1, 1, status, K.fg);
          if (recEl) recEl.textContent = 'recording';
        } else {
          g.put(1, 1, '▶', K.acc);
          status = `  replay  ${s} / ${total.toFixed(1)}s`;
          g.text(1, 1, status, K.fg);
          if (recEl) recEl.textContent = 'replaying';
        }
        g.text(1 + status.length + 4, 1, `jumps: ${jumpsUsed}`, K.dim);
      },
    };
  };

  // ---------------------------------------------------------------------------
  // cosmetics: one rifle, a wrap that keeps changing, a charm swinging on it
  // ---------------------------------------------------------------------------
  SCENES.wrap = (g, F) => {
    const GUN = [
      "                          .-----------------.",
      "                          |XXXXXXXXXXXXXXXXX|=",
      "   _______________________|___|_______|_____|_________________",
      "  /XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|===========o",
      " |XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|",
      " |XXXXXXX/'''''''''''\\XXXXXXXXXXXXXXXXXXXX|XXXXXXXX|'''''''''''",
      " |XXXXXX/             \\XXXXXXX\\'''''''''''|XXXXXXXX|",
      "  \\____/               \\XXXXXXX\\          |XXXXXXXX|",
      "                        \\XXXXXXX\\         |XXXXXXXX|",
      "                         '-------'        '--------'",
    ];
    const GW = Math.max(...GUN.map((r) => r.length));
    // made up patterns for the preview, not real in-game wraps
    const WRAPS = [
      { name: 'hazard', fn: (x, y, t) => ((x - y * 2 + Math.floor(t * 6)) % 6 + 6) % 6 < 3 ? ['/', K.acc] : [' ', 0] },
      { name: 'checker', fn: (x, y) => ((x >> 1) + y) % 2 ? ['▓', K.dim] : ['░', K.faint] },
      { name: 'static', fn: (x, y, t) => { const r = hash2(x + Math.floor(t * 8) * 131, y); return [r > 0.66 ? '▓' : r > 0.33 ? '▒' : '░', r > 0.9 ? K.acc : K.dim]; } },
      { name: 'waves', fn: (x, y, t) => Math.sin(x * 0.45 + y * 0.9 - t * 3) > 0.2 ? ['~', K.acc] : ['-', K.faint] },
      { name: 'binary', fn: (x, y, t) => [hash2(x, y + Math.floor(t * 5)) > 0.5 ? '1' : '0', hash2(x * 2, y) > 0.8 ? K.green : K.ghost] },
      { name: 'dots', fn: (x, y) => (x % 3 === 0 && y % 2 === 1 ? ['o', K.acc] : ['.', K.ghost]) },
    ];
    const wrapEl = document.querySelector('.js-wrap');
    let W, H, ox, oy, wi = 0, since = 0, wipe = 1;

    function layout() {
      W = g.cols;
      H = g.rows;
      ox = Math.max(0, Math.floor((W - GW) / 2) - 2);
      oy = Math.max(3, Math.floor((H - GUN.length) / 2));
    }

    return {
      update(dt, t) {
        if (g.changed) { layout(); g.changed = false; }
        const live = F.runtime && F.unlock;
        if (live) {
          since += dt;
          if (since > 2.2) { since = 0; wi = (wi + 1) % WRAPS.length; wipe = 0; }
          wipe = Math.min(1, wipe + dt * 2.4);
        }
        const cur = WRAPS[wi], prev = WRAPS[(wi + WRAPS.length - 1) % WRAPS.length];
        const front = wipe * (GW + 6) - 3;

        GUN.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const c = row[x];
            if (c === ' ') continue;
            const gx = ox + x, gy = oy + y;
            if (c !== 'X') { g.put(gx, gy, c, K.fg); continue; }
            if (!live) { g.put(gx, gy, '.', K.ghost); continue; }
            if (Math.abs(x - front) < 1.5) { g.put(gx, gy, pick(['#', '%', '&', '@', '?']), K.white); continue; }
            const [ch, k] = (x < front ? cur : prev).fn(x, y, t);
            if (ch !== ' ') g.put(gx, gy, ch, k);
          }
        });

        // charm on a short chain under the barrel
        const ax = ox + 58, ay = oy + 5;
        const ang = Math.sin(t * 2.4) * 0.55;
        for (let i = 1; i <= 2; i++) g.put(ax + Math.sin(ang) * i * 2, ay + Math.cos(ang) * i, ':', K.faint);
        const cx = ax + Math.sin(ang) * 6, cy = ay + Math.cos(ang) * 3;
        g.put(cx, cy, '@', live ? K.acc : K.faint);

        const label = live ? `skin: assault rifle   wrap: ${cur.name}   charm: on` : 'skin: default';
        g.text(2, 1, label, live ? K.dim : K.faint);
        if (!F.runtime) {
          g.text(2, H - 2, 'cosmetic features are paused until cosmetic changes are enabled.', K.yellow);
        } else if (!F.unlock) {
          g.text(2, H - 2, '[locked]  turn unlock all on to pick from the full catalog', K.faint);
        } else {
          g.text(2, H - 2, 'preview patterns, not actual in-game wraps', K.faint);
        }
        if (wrapEl) wrapEl.textContent = live ? cur.name : 'default';
      },
    };
  };

  // ---------------------------------------------------------------------------
  // automation: a log that writes itself
  // ---------------------------------------------------------------------------
  SCENES.log = (g, F) => {
    const LINES = [
      { tag: 'auto queue', s: 'queued again', need: 'queue' },
      { tag: 'map vote', s: 'voted for your pick' },
      { tag: 'auto ban', s: 'banned sniper, then rpg' },
      { tag: 'auto loadout', s: 'map loadout applied (try 1/3)' },
      { tag: 'hacker detector', s: 'w4ffle is hacking', need: 'hacker', warn: K.red },
      { tag: 'ragebot', s: 'target order: hackers first', need: 'hacker' },
      { tag: 'auto pickup', s: 'grabbed a drop' },
      { tag: 'rivals helper', s: 'yuzu is on a 14 win streak', warn: K.yellow },
      { tag: 'auto respawn', s: 'respawned' },
      { tag: 'mod detector', s: 'mod friend joined, sent you to lobby', need: 'mod', warn: K.yellow },
    ];
    let W, H, done = [], cur = null, li = 0, typed = 0, wait = 0.4, clock = 7;

    function layout() {
      W = g.cols;
      H = g.rows;
      // start with a few lines already there so the box isn't empty when you scroll to it
      done = [];
      for (let i = 0; i < Math.min(4, H - 3); i++) { const L = nextLine(); if (L) done.push(L); }
    }
    function nextLine() {
      for (let n = 0; n < LINES.length; n++) {
        const L = LINES[li];
        li = (li + 1) % LINES.length;
        if (!L.need || F[L.need]) {
          clock += Math.round(rand(3, 11));
          const time = `${pad(Math.floor(clock / 60) % 60)}:${pad(clock % 60)}`;
          const head = `${time}  [${L.tag}]`;
          const col = W >= 60 ? 26 : 0;
          return { ...L, time, full: head + ' '.repeat(Math.max(1, col - head.length)) + L.s };
        }
      }
      return null;
    }
    function drawLine(L, y, chars) {
      const s = L.full.slice(0, chars);
      for (let i = 0; i < s.length && i < W - 2; i++) {
        const c = s[i];
        if (c === ' ') continue;
        let k = K.fg;
        if (i < 5) k = K.faint;
        else if (i < 7 + L.tag.length + 2) k = c === '[' || c === ']' ? K.faint : K.acc;
        else k = L.warn || K.fg;
        g.put(1 + i, y, c, k);
      }
      return Math.min(s.length, W - 2);
    }

    return {
      update(dt, t) {
        if (g.changed) { layout(); g.changed = false; }
        const maxRows = H - 2;
        if (!cur) {
          wait -= dt;
          if (wait <= 0) { cur = nextLine(); typed = 0; }
        } else {
          typed += dt * 70;
          if (typed >= cur.full.length + 6) {
            done.push(cur);
            if (done.length > maxRows) done.shift();
            cur = null;
            wait = rand(0.25, 0.7);
          }
        }
        let y = 1;
        const visible = cur ? done.slice(-(maxRows - 1)) : done.slice(-maxRows);
        for (const L of visible) drawLine(L, y++, 999);
        let cx = 1;
        if (cur) cx = 1 + drawLine(cur, y, Math.floor(typed));
        if (Math.floor(t * 2.5) % 2 === 0) g.put(cx, y, '█', K.dim);
      },
    };
  };

  // ---------------------------------------------------------------------------
  // footer logo, with a slow shine across it
  // ---------------------------------------------------------------------------
  const LOGO = [
    ' █████                   █████ █████ █████   █████                   █████     ',
    '░░███                   ░░███ ░░███ ░░███   ░░███                   ░░███      ',
    ' ░███        █████ █████ ░░███ ███   ░███    ░███   ██████   ██████  ░███ █████',
    ' ░███       ░░███ ░░███   ░░█████    ░███████████  ███░░███ ███░░███ ░███░░███ ',
    ' ░███        ░░░█████░     ░░███     ░███░░░░░███ ░███ ░███░███ ░███ ░██████░  ',
    ' ░███      █  ███░░░███     ░███     ░███    ░███ ░███ ░███░███ ░███ ░███░░███ ',
    ' ███████████ █████ █████    █████    █████   █████░░██████ ░░██████  ████ █████',
    '░░░░░░░░░░░ ░░░░░ ░░░░░    ░░░░░    ░░░░░   ░░░░░  ░░░░░░   ░░░░░░  ░░░░ ░░░░░ ',
  ];
  SCENES.logo = (g) => ({
    update(dt, t) {
      g.changed = false;
      for (let y = 0; y < LOGO.length; y++) {
        const row = LOGO[y];
        for (let x = 0; x < row.length; x++) {
          const c = row[x];
          if (c === ' ') continue;
          const w = Math.sin(x * 0.09 - y * 0.22 - t * 1.4);
          if (hash2(x, y * 97 + Math.floor(t * 10)) > 0.998) { g.put(x, y, pick(['▓', '▒', '#']), K.acc); continue; }
          if (c === '█') g.put(x, y, '█', w > 0.975 ? K.acc : K.fg);
          else g.put(x, y, w > 0.86 ? '▒' : '░', w > 0.86 ? K.acc : K.faint);
        }
      }
    },
  });

  // ---------------------------------------------------------------------------
  // runner: one rAF loop, scenes only tick while on screen
  // ---------------------------------------------------------------------------
  const runners = [];
  const fpsEls = document.querySelectorAll('.js-fps');

  function tick(r, dt) {
    r.t += dt;
    r.g.clear();
    r.scene.update(dt, r.t);
    r.g.render();
  }

  function settle(r) {
    // a still frame for reduced motion: run the scene for a bit, then paint once
    for (let i = 0; i < 40; i++) {
      r.t += 0.05;
      r.g.clear();
      r.scene.update(0.05, r.t);
    }
    r.g.render();
  }

  function mount(canvas) {
    const name = canvas.dataset.scene;
    const factory = SCENES[name];
    if (!factory) return;
    const fixed = name === 'logo' ? { cols: LOGO[0].length, rows: LOGO.length } : null;
    const g = new Grid(canvas, Number(canvas.dataset.size) || 12, fixed);
    g.minCols = Number(canvas.dataset.minCols) || 0;
    const r = { name, g, scene: null, visible: false, acc: 0, t: Math.random() * 10, fps: name === 'arena' ? 30 : name === 'logo' ? 15 : 24 };
    r.start = () => {
      if (r.scene || !g.measure()) return;
      r.scene = factory(g, flags[name] || {}, r);
      if (REDUCE) settle(r); else tick(r, 0.016);
    };
    runners.push(r);
  }

  let last = performance.now(), fpsFrames = 0, fpsTime = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 0.5) {
      const v = Math.round(fpsFrames / fpsTime);
      fpsEls.forEach((el) => (el.textContent = v));
      fpsFrames = 0;
      fpsTime = 0;
    }
    for (const r of runners) {
      if (!r.visible || !r.scene) continue;
      r.acc += dt;
      if (r.acc < 1 / r.fps - 0.004) continue;
      const step = Math.min(r.acc, 0.1);
      r.acc = 0;
      tick(r, step);
    }
    requestAnimationFrame(loop);
  }

  function poke(name) {
    if (!REDUCE) return;
    for (const r of runners) if (r.name === name && r.scene) settle(r);
  }

  // ---------------------------------------------------------------------------
  // the fake menu
  // ---------------------------------------------------------------------------
  function fmtValue(scene, key, v) {
    if (scene === 'rain' && key === 'clock') return `${pad(Math.floor(v))}:${pad(Math.round((v % 1) * 60) % 60)}`;
    return String(v);
  }

  function bindMenus() {
    document.querySelectorAll('[data-flag]').forEach((el) => {
      const [scene, key] = el.dataset.flag.split('.');
      const store = flags[scene];
      if (!store) return;
      if (el.getAttribute('role') === 'switch') {
        store[key] = el.getAttribute('aria-checked') === 'true';
        el.addEventListener('click', () => {
          const v = el.getAttribute('aria-checked') !== 'true';
          el.setAttribute('aria-checked', String(v));
          store[key] = v;
          poke(scene);
        });
      } else if (el.matches('input[type="range"]')) {
        const out = el.closest('.sl') && el.closest('.sl').querySelector('output');
        const sync = () => {
          const v = Number(el.value);
          store[key] = v;
          el.style.setProperty('--p', `${((v - el.min) / (el.max - el.min)) * 100}%`);
          if (out) out.textContent = fmtValue(scene, key, v);
        };
        el.addEventListener('input', () => { sync(); poke(scene); });
        sync();
      } else if (el.getAttribute('role') === 'radiogroup') {
        const btns = el.querySelectorAll('[role="radio"]');
        btns.forEach((b) => {
          if (b.getAttribute('aria-checked') === 'true') store[key] = b.dataset.value;
          b.addEventListener('click', () => {
            btns.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
            store[key] = b.dataset.value;
            store.touched = true;
            poke(scene);
          });
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // copy buttons, discord link, nav
  // ---------------------------------------------------------------------------
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
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
      });
    });
    if (CONFIG.discord) {
      document.querySelectorAll('.js-discord').forEach((a) => { a.href = CONFIG.discord; a.hidden = false; });
      document.querySelectorAll('.js-discord-note, .js-discord-faq').forEach((el) => {
        const a = document.createElement('a');
        a.href = CONFIG.discord;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = el.textContent;
        el.textContent = '';
        el.appendChild(a);
      });
    }
  }

  function bindNav() {
    const links = new Map();
    document.querySelectorAll('.nav a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-on'));
        const a = links.get(e.target.id);
        if (a) a.classList.add('is-on');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
  }

  // ---------------------------------------------------------------------------
  // boot
  // ---------------------------------------------------------------------------
  function boot() {
    readPalette();
    bindMenus();
    bindLinks();
    bindNav();
    document.querySelectorAll('canvas[data-scene]').forEach(mount);

    const vis = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          for (const e of entries) {
            const r = runners.find((x) => x.g.canvas === e.target);
            if (!r) continue;
            r.visible = e.isIntersecting;
            if (r.visible) r.start();
          }
        }, { rootMargin: '120px 0px' })
      : null;

    for (const r of runners) {
      if (vis) vis.observe(r.g.canvas);
      else { r.visible = true; r.start(); }
    }

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const r = runners.find((x) => x.g.canvas === e.target);
          if (!r || !r.scene) continue;
          if (r.g.measure()) { if (REDUCE) settle(r); else tick(r, 0.001); }
        }
      });
      runners.forEach((r) => ro.observe(r.g.canvas));
    }

    if (!REDUCE) requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });
  }

  // wait for the mono font so the grid is measured with the right glyph width
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load(`12px ${FONT}`), new Promise((res) => setTimeout(res, 1500))])
    : Promise.resolve();
  const domReady = document.readyState === 'loading' ? new Promise((res) => document.addEventListener('DOMContentLoaded', res, { once: true })) : Promise.resolve();
  Promise.all([fontReady, domReady]).then(boot);
})();
