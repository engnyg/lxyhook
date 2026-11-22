// The overlay the script draws in game: esp boxes, names, health bars, fov circle, tracers, hitmarkers, damage
// numbers, sound rings, the recorder's path. Plain vector drawing on a 2D canvas over the ascii world.

const ACC = ['#e6bafb', '#a1a9e1', '#8ac9f2'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createHud(canvas, world) {
  const ctx = canvas.getContext('2d');
  const THREE = world.THREE;
  const fade = {};
  let W = 1, H = 1, PR = 1;
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function ease(key, on, dt, rate = 7) {
    const v = fade[key] ?? 0;
    fade[key] = v + ((on ? 1 : 0) - v) * (1 - Math.exp(-dt * rate));
    return fade[key];
  }
  function inView(p, m = 40) { return p.on && p.x > -m && p.y > -m && p.x < W + m && p.y < H + m; }
  function text(s, x, y, { size = 11, weight = 600, color = '#fff', align = 'center', alpha = 1 } = {}) {
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.globalAlpha = 1;
  }
  function accentStroke(x0, y0, x1, y1, alpha) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(230,186,251,${alpha * 0.1})`);
    g.addColorStop(0.5, `rgba(161,169,225,${alpha * 0.8})`);
    g.addColorStop(1, `rgba(138,201,242,${alpha})`);
    return g;
  }

  function enemyBox(e) {
    const r = e.fig.root, p = r.position, yaw = r.rotation.y, h = e.fig.height + 0.1;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.45, 0.45]) for (const sy of [0, h]) {
      const q = world.project(v3(p.x + sx * cs + sz * sn, p.y + sy, p.z - sx * sn + sz * cs));
      if (!q.on) ok = false;
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
    return ok && x1 > 0 && y1 > 0 && x0 < W && y0 < H && x1 - x0 < W * 0.6 ? { x0, y0, x1, y1 } : null;
  }

  function drawEsp(dt, state, k) {
    const fEsp = ease('esp', state.esp, dt), fHp = ease('health', state.health, dt), fHack = ease('hacker', state.hacker, dt);
    if (fEsp < 0.01 || k < 0.01) return;
    const cam = world.camera.position;
    for (const e of world.enemies) {
      if (!e.alive) continue;
      const b = enemyBox(e);
      if (!b) continue;
      const a = fEsp * k;
      const x = Math.round(b.x0) + 0.5, y = Math.round(b.y0) + 0.5, w = Math.round(b.x1 - b.x0), h = Math.round(b.y1 - b.y0);
      ctx.globalAlpha = a;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeRect(x, y, w, h);
      ctx.lineWidth = 1; ctx.strokeStyle = e.hacker && fHack > 0.5 ? '#ff6b6b' : '#ffffff'; ctx.strokeRect(x, y, w, h);
      if (fHp > 0.01) {
        const bx = x - 5, hh = h * (e.hp / 100);
        ctx.globalAlpha = a * fHp;
        ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(bx - 1.5, y - 1, 4, h + 2);
        const g = ctx.createLinearGradient(0, y + h, 0, y);
        g.addColorStop(0, '#ff5b5b'); g.addColorStop(0.5, '#ffcf5c'); g.addColorStop(1, '#7ce06a');
        ctx.fillStyle = g; ctx.fillRect(bx - 0.5, y + h - hh, 2, hh);
      }
      ctx.globalAlpha = 1;
      text(e.name, x + w / 2, y - 5, { alpha: a });
      if (e.hacker && fHack > 0.01) text('hacker', x + w / 2, y - 18, { size: 10, weight: 700, color: '#ff6b6b', alpha: a * fHack });
      const dist = Math.round(cam.distanceTo(e.fig.root.position) * 0.9);
      text(`${e.weapon}  ${dist}m`, x + w / 2, y + h + 13, { size: 10, weight: 500, color: '#cfd2e0', alpha: a });
    }
  }

  function drawShots(dt, state, k) {
    if (k < 0.01) return;
    for (const s of world.shots) {
      const u = s.t / s.life;
      const a = world.project(s.from), b = world.project(s.to);
      if (!a.on || !b.on) continue;
      if (state.tracers) {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = accentStroke(a.x, a.y, b.x, b.y, (1 - u) * k);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      if (s.hit && s.t < 0.16) {
        ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.6;
        const r0 = 4, r1 = 9;
        ctx.beginPath();
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(b.x + dx * r0, b.y + dy * r0); ctx.lineTo(b.x + dx * r1, b.y + dy * r1); }
        ctx.stroke();
      }
      if (s.hit && state.dmg) text(String(s.dmg), b.x + 14, b.y - 6 - u * 26, { size: 13, weight: 700, color: s.hs ? '#ff6b6b' : '#ffffff', align: 'left', alpha: (1 - u * u) * k });
    }
  }

  function drawAim(dt, state, k) {
    const fc = ease('circle', state.circle, dt);
    if (k < 0.01) return;
    const e = world.eye, { yaw, pitch } = world.aim;
    const pt = e.clone().add(v3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(26));
    const p = world.project(pt);
    if (!inView(p, 0)) return;
    const R = (state.radius * H) / 1080 * 1.25;
    if (fc > 0.01) {
      ctx.globalAlpha = fc * k;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = k;
    ctx.lineCap = 'butt';
    for (const [w, c] of [[3, 'rgba(0,0,0,.8)'], [1, '#fff']]) {
      ctx.lineWidth = w; ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo(p.x - 11, p.y); ctx.lineTo(p.x - 4, p.y); ctx.moveTo(p.x + 4, p.y); ctx.lineTo(p.x + 11, p.y);
      ctx.moveTo(p.x, p.y - 11); ctx.lineTo(p.x, p.y - 4); ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x, p.y + 11);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSound(dt, state, k) {
    const f = ease('sound', state.sound, dt);
    if (f < 0.01 || k < 0.01) return;
    for (const s of world.steps) {
      const u = s.t / s.life;
      const rad = 0.35 + (0.9 + s.loud * 6) * u;
      const col = s.loud >= 0.9 ? [255, 107, 107] : s.loud >= 0.5 ? [255, 207, 92] : [230, 186, 251];
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - u) * 0.95 * f * k})`;
      ctx.lineWidth = s.loud >= 0.5 ? 1.6 : 1.1;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const q = world.project(v3(s.pos.x + Math.cos(a) * rad, 0.06, s.pos.z + Math.sin(a) * rad));
        if (!q.on) { started = false; continue; }
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      if (s.loud >= 0.5 && u < 0.6) {
        const c = world.project(s.pos.clone().setY(0.4));
        if (inView(c)) {
          const m = Math.round(world.camera.position.distanceTo(s.pos) * 0.9);
          text(`${s.loud >= 0.9 ? 'gunshot' : 'reload'} ${m}m`, c.x, c.y - 10, { size: 10, weight: 600, color: `rgb(${col.join(',')})`, alpha: (1 - u / 0.6) * f * k });
        }
      }
    }
  }

  function drawRecorder(dt, state, k) {
    const f = ease('recorder', state.recorder, dt);
    if (k < 0.01) return;
    const R = world.recorder;
    if (!R.frames.length) return;
    const o = R.origin;
    const at = (fr) => world.project(v3(o.x + fr.x, o.y + fr.y + 1.3, o.z));
    // start and end markers
    for (const [fr, col] of [[R.frames[0], '#7ce06a'], [R.frames[R.frames.length - 1], '#ff6b6b']]) {
      const base = world.project(v3(o.x + fr.x, o.y + fr.y, o.z)), top = world.project(v3(o.x + fr.x, o.y + fr.y + 4.2, o.z));
      if (!inView(base) || !inView(top)) continue;
      ctx.globalAlpha = k;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + 14, top.y + 5); ctx.lineTo(top.x, top.y + 10); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (f < 0.01) return;
    // R.t runs up to the full length, which is one past the last frame
    const upto = Math.min(R.frames.length - 1, R.phase === 'rec' ? Math.floor(R.t * 60) : R.frames.length - 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = R.phase === 'rec' ? `rgba(255,107,107,${0.9 * f * k})` : `rgba(161,169,225,${0.9 * f * k})`;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= upto; i += 2) {
      const q = at(R.frames[i]);
      if (!q.on) continue;
      if (first) { ctx.moveTo(q.x, q.y); first = false; } else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    for (let i = 0; i <= upto; i += 12) { const q = at(R.frames[i]); if (q.on) { ctx.beginPath(); ctx.arc(q.x, q.y, 2.2, 0, Math.PI * 2); ctx.fill(); } }

    // the recorder's own little panel, pinned above the start
    const anchor = world.project(v3(o.x + 13, o.y + 13, o.z));
    if (!inView(anchor, -20)) return;
    const total = R.frames.length / 60;
    const s = `${String(Math.floor(R.t / 60)).padStart(2, '0')}:${(R.t % 60).toFixed(1).padStart(4, '0')}`;
    const line = R.phase === 'rec' ? `REC  ${s}` : `REPLAY  ${s} / ${total.toFixed(1)}s`;
    ctx.globalAlpha = f * k;
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    const w = ctx.measureText(line).width + 44;
    const px = anchor.x, py = anchor.y;
    ctx.fillStyle = 'rgba(23,25,29,.82)';
    roundRect(px, py, w, 46, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; roundRect(px + 0.5, py + 0.5, w - 1, 45, 6); ctx.stroke();
    ctx.fillStyle = R.phase === 'rec' ? (Math.floor(performance.now() / 500) % 2 ? '#ff6b6b' : 'rgba(255,107,107,.35)') : '#a1a9e1';
    ctx.beginPath(); ctx.arc(px + 16, py + 17, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(line, px + 28, py + 17);
    ctx.font = '500 11px Inter, system-ui, sans-serif'; ctx.fillStyle = '#a5a5a5';
    ctx.fillText(`jumps ${R.jumps}  ·  parkour_02`, px + 28, py + 33);
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  return {
    resize(w, h, dpr) {
      W = w; H = h; PR = Math.min(dpr || 1, 2);
      canvas.width = Math.round(w * PR); canvas.height = Math.round(h * PR);
      ctx.setTransform(PR, 0, 0, PR, 0, 0);
    },
    draw(dt, state, mix, masks = []) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      for (const r of masks) ctx.rect(r.left - 10, r.top - 10, r.width + 20, r.height + 20);
      ctx.clip('evenodd');
      const arena = clamp(mix.arena, 0, 1), course = clamp(mix.course, 0, 1);
      // restore even if a draw throws, or the clip would pile up frame after frame
      try {
        drawSound(dt, state, arena);
        drawEsp(dt, state, arena);
        drawShots(dt, state, arena);
        drawAim(dt, state, clamp(mix.aim, 0, 1));
        drawRecorder(dt, state, course);
      } finally {
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    },
  };
}
