/* Noor Parfum · Tienda 3D
   Una boutique circular: cada pared es una categoría, con repisas doradas e iluminación cálida.
   El cliente gira la tienda deslizando, acerca con dos dedos o la rueda, y toca un perfume para verlo y agregarlo al pedido.
   Se carga solo cuando el cliente abre la vista "Tienda 3D". */
import * as THREE from "./vendor/three.module.min.js";

const BAYS = [
  { c: "navidad", t: "NAVIDAD", s: "Regalos listos" },
  { c: "el", t: "PARA ÉL", s: "Fragancias masculinas" },
  { c: "ella", t: "PARA ELLA", s: "Fragancias femeninas" },
  { c: "unisex", t: "UNISEX", s: "Para compartir" },
  { c: "sets", t: "SETS Y MÁS", s: "Sets, body sprays y aceites" },
];
const GOLD = 0xd4af7c, INK = 0x0b0b0d;
const N = BAYS.length, STEP = (Math.PI * 2) / N;
const BAY_W = 3.6, APO = BAY_W / (2 * Math.tan(Math.PI / N)); // distancia del centro a cada pared
const SHELF_Y = [0.42, 1.04, 1.66], COLS = 4, SLOT_W = 0.78, SLOT_H = 0.45;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (t) => 1 - Math.pow(1 - t, 3);

let S = null; // estado de la tienda abierta

export async function start(host, api) {
  if (S) { S.resume(); return S; }
  // los letreros se dibujan con las fuentes de la marca: esperarlas (máx. 2,5 s)
  try { await Promise.race([Promise.all(["700 92px Cinzel", "600 34px Cinzel", "500 40px Montserrat", "700 26px Montserrat"].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  S = build(host, api);
  return S;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function build(host, api) {
  const wrap = document.createElement("div"); wrap.className = "t3";
  wrap.innerHTML = `<canvas aria-label="Tienda 3D de Noor Parfum"></canvas>
    <div class="t3-hint" id="t3hint">Desliza para recorrer la tienda · toca un perfume</div>
    <button class="t3-arr l" aria-label="Pared anterior">‹</button><button class="t3-arr r" aria-label="Pared siguiente">›</button>
    <div class="t3-wall" id="t3wall"></div>
    <div class="t3-load" id="t3load"><span></span>Abriendo la tienda…</div>
    <div class="t3-sheet" id="t3sheet" role="dialog" aria-modal="false"></div>`;
  host.appendChild(wrap);
  const canvas = wrap.querySelector("canvas"), sheet = wrap.querySelector("#t3sheet"), hint = wrap.querySelector("#t3hint"), wallLbl = wrap.querySelector("#t3wall");

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { wrap.remove(); S = null; api.sinWebGL(); return null; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 6, 13);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 40);

  /* ---------- luz ---------- */
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a140c, 0.55));
  const key = new THREE.PointLight(0xffd9a0, 18, 9, 1.6); key.position.set(0, 3.2, 0); scene.add(key);

  /* ---------- piso, techo, anillo ---------- */
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2);
    r.addColorStop(0, "#2a2219"); r.addColorStop(0.55, "#16120d"); r.addColorStop(1, "#0b0b0d");
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(212,175,124,.55)"; g.lineWidth = 5;
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, w * 0.215, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.012 + Math.random() * 0.02})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 60 - Math.random() * 120, w * 0.7, y + 60 - Math.random() * 120, w, y + 40 - Math.random() * 80); g.stroke(); }
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(APO * 1.5, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(APO * 1.5, 48), new THREE.MeshBasicMaterial({ color: 0x0e0c0a }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.1; scene.add(ceil);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 3.05; scene.add(ring);

  /* ---------- paredes (una por categoría) ---------- */
  const shelfMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.28 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.85 });
  const glowTex = canvasTex(512, 512, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.62);
    r.addColorStop(0, "rgba(255,214,150,.42)"); r.addColorStop(0.55, "rgba(212,175,124,.12)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const loader = new THREE.TextureLoader();
  const pickables = []; const items = [];

  BAYS.forEach((B, bi) => {
    const yaw = bi * STEP;
    const grp = new THREE.Group(); grp.rotation.y = -yaw; scene.add(grp);
    // la pared mira al centro: está en z = -APO del grupo
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W + 0.02, 3.1), wallMat); wall.position.set(0, 1.55, -APO); grp.add(wall);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W * 0.95, 2.4), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
    glow.position.set(0, 1.4, -APO + 0.01); grp.add(glow);
    // pilastras doradas en los bordes
    for (const sx of [-1, 1]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.1, 0.06), shelfMat); pil.position.set(sx * BAY_W / 2, 1.55, -APO + 0.03); grp.add(pil);
    }
    // repisas
    for (const y of SHELF_Y) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(BAY_W * 0.9, 0.035, 0.32), shelfMat); sh.position.set(0, y, -APO + 0.17); grp.add(sh);
      const lip = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W * 0.88, 0.012), new THREE.MeshBasicMaterial({ color: 0xffe9c2 })); lip.position.set(0, y - 0.02, -APO + 0.335); grp.add(lip);
    }
    // letrero de la categoría
    const sign = canvasTex(1024, 220, (g, w, h) => {
      g.textAlign = "center"; g.fillStyle = "#ecd5a8"; g.font = "700 92px Cinzel, Georgia, serif";
      g.letterSpacing = "10px"; g.fillText(B.t, w / 2, 112); g.letterSpacing = "4px";
      g.fillStyle = "rgba(212,175,124,.75)"; g.font = "500 40px Montserrat, system-ui, sans-serif"; g.fillText(B.s.toUpperCase(), w / 2, 178);
      g.fillStyle = "#d4af7c"; g.fillRect(w / 2 - 60, 196, 120, 3);
    });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3 * 220 / 1024), new THREE.MeshBasicMaterial({ map: sign, transparent: true })); sg.position.set(0, 2.5, -APO + 0.02); grp.add(sg);

    // productos de esta categoría
    const L = api.P.filter((p) => p.c === B.c).slice(0, COLS * SHELF_Y.length);
    const rows = Math.ceil(L.length / COLS);
    L.forEach((p, i) => {
      const row = Math.floor(i / COLS), inRow = Math.min(COLS, L.length - row * COLS), col = i % COLS;
      const shelf = rows === 1 ? SHELF_Y[1] : SHELF_Y[2 - row];
      const x = (col - (inRow - 1) / 2) * SLOT_W;
      const g = new THREE.Group(); g.position.set(x, shelf + 0.018, -APO + 0.2); grp.add(g);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, toneMapped: false, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); g.add(mesh);
      const refl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      refl.scale.y = -1; g.add(refl);
      loader.load(`catalogo/img/${p.k}.webp`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        const a = t.image.width / t.image.height; let w = SLOT_W * 0.86, h = w / a; if (h > SLOT_H) { h = SLOT_H; w = h * a; }
        mat.map = t; mat.needsUpdate = true; mesh.scale.set(w, h, 1); mesh.position.y = h / 2;
        refl.material.map = t; refl.material.needsUpdate = true; refl.scale.set(w, -h * 0.35, 1); refl.position.y = -h * 0.175 - 0.02;
        it.ready = true; it.h = h; loaded++; progress();
      }, undefined, () => { loaded++; progress(); });
      // etiqueta de precio
      const tag = p.disp === 0 ? "A PEDIDO" : p.disp === 1 ? "ÚLTIMA UNIDAD" : "";
      const price = canvasTex(256, 72, (c, w, h) => {
        c.fillStyle = "rgba(11,11,13,.82)"; roundRect(c, 4, 6, w - 8, h - 12, 26); c.fill();
        c.strokeStyle = "rgba(212,175,124,.55)"; c.lineWidth = 2; c.stroke();
        c.fillStyle = "#ecd5a8"; c.textAlign = "center"; c.font = "600 34px Cinzel, Georgia, serif"; c.fillText(`S/ ${p.p}`, w / 2, 49);
      });
      const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.084), new THREE.MeshBasicMaterial({ map: price, transparent: true, toneMapped: false }));
      pt.position.set(0, -0.062, 0.14); g.add(pt);
      let badge = null;
      if (tag) {
        const bt = canvasTex(320, 64, (c, w, h) => {
          c.fillStyle = p.disp === 0 ? "#f1e7d3" : "#111"; roundRect(c, 2, 4, w - 4, h - 8, 28); c.fill();
          c.fillStyle = p.disp === 0 ? "#6b5634" : "#e8cf9c"; c.textAlign = "center"; c.font = "700 26px Montserrat, system-ui, sans-serif"; c.fillText(tag, w / 2, 42);
        });
        badge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), new THREE.MeshBasicMaterial({ map: bt, transparent: true, toneMapped: false }));
        badge.position.set(0, -0.15, 0.14); g.add(badge);
      }
      const it = { p, g, mesh, refl, pt, badge, bay: bi, x, yaw, ready: false, h: SLOT_H, lift: 0, dim: 1 };
      // zona táctil del tamaño de todo el espacio del perfume (incluye su precio)
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(SLOT_W * 0.96, SLOT_H + 0.16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
      hit.position.set(0, (SLOT_H + 0.16) / 2 - 0.13, 0.15); g.add(hit);
      hit.userData.it = it; pickables.push(hit); items.push(it);
    });
  });
  const total = items.length; let loaded = 0;
  const loadEl = wrap.querySelector("#t3load");
  function progress() { if (loaded >= total) loadEl.classList.add("off"); else loadEl.querySelector("span").style.width = (loaded / total * 100) + "%"; }

  /* ---------- cámara: girar (yaw), mirar arriba/abajo (pitch) y acercar (fov) ---------- */
  const view = { yaw: -0.55, pitch: -0.02, fov: 62, back: 0 };
  const goal = { yaw: 0, pitch: 0.02, fov: 52 };
  let vel = 0, dragging = false, focus = null;
  function sizeIt() {
    const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false);
    cam.aspect = w / h; view.back = cam.aspect < 0.8 ? 0.15 : cam.aspect < 1.2 ? 0.6 : 0.35;
    goal.fov = cam.aspect < 0.8 ? 58 : 50; cam.updateProjectionMatrix();
  }
  function placeCam() {
    const dx = Math.sin(view.yaw), dz = -Math.cos(view.yaw);
    let back = view.back, y = 1.32;
    const mob = cam.aspect < 0.8;
    if (focus) { back = -APO + (mob ? 1.55 : 2.2); y = focus.y0 + 0.28; }
    cam.position.set(-dx * back, y, -dz * back);
    if (focus) {
      const wp = new THREE.Vector3(); focus.mesh.getWorldPosition(wp);
      // encuadre: en computadora el perfume queda a la izquierda de la ficha; en celular, arriba de ella
      const right = new THREE.Vector3(Math.cos(view.yaw), 0, Math.sin(view.yaw));
      const aim = wp.clone().addScaledVector(right, mob ? 0 : 0.32); aim.y += mob ? -0.22 : 0.02;
      const t = new THREE.Vector3(dx * APO, y + Math.tan(view.pitch) * APO, dz * APO).lerp(aim, focusAmt);
      cam.lookAt(t);
    } else cam.lookAt(dx * APO, 1.32 + Math.tan(view.pitch) * APO, dz * APO);
    cam.fov = view.fov; cam.updateProjectionMatrix();
  }
  let focusAmt = 0;

  const bayOf = (yaw) => ((Math.round(yaw / STEP) % N) + N) % N;
  function snapTo(bi) { // gira al camino más corto hacia esa pared
    let t = bi * STEP; const d = ((t - view.yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; goal.yaw = view.yaw + d;
  }
  function showWall() { const B = BAYS[bayOf(goal.yaw)]; wallLbl.textContent = `${B.t} · ${api.P.filter((p) => p.c === B.c).length}`; api.onWall?.(B.c); }

  /* ---------- entrada: táctil y mouse ---------- */
  const ptrs = new Map(); let sx = 0, sy = 0, lx = 0, moved = 0, pinch0 = 0, fov0 = 0, lastT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = goal.fov; }
    sx = lx = e.clientX; sy = e.clientY; moved = 0; dragging = true; vel = 0; lastT = performance.now();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) { hover(e); return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); goal.fov = clamp(fov0 * pinch0 / Math.max(1, d), 30, 66); moved = 99; return; }
    if (focus) return;
    const dx = e.clientX - lx, now = performance.now(); lx = e.clientX; moved = Math.max(moved, Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy));
    const k = (view.fov / 50) * (cam.aspect < 0.8 ? 0.0032 : 0.0042); goal.yaw -= dx * k; view.yaw = goal.yaw; vel = (-dx * k) / Math.max(8, now - lastT) * 16; lastT = now;
    goal.pitch = clamp(goal.pitch + (e.movementY || 0) * -0.0012, -0.2, 0.22);
    if (moved > 12) hint.classList.add("off");
  });
  const up = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size) return; dragging = false;
    if (moved < 8) { tap(e); return; }
    if (!focus) { goal.yaw += vel * 9; if (cam.aspect >= 0.8) snapTo(bayOf(goal.yaw)); showWall(); }
  };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { goal.yaw += e.deltaX * 0.003; clearTimeout(wt); wt = setTimeout(() => { snapTo(bayOf(goal.yaw)); showWall(); }, 160); } else goal.fov = clamp(goal.fov + e.deltaY * 0.03, 30, 66); }, { passive: false });
  let wt;
  wrap.querySelector(".t3-arr.l").onclick = () => { closeSheet(); snapTo(bayOf(goal.yaw) - 1); showWall(); };
  wrap.querySelector(".t3-arr.r").onclick = () => { closeSheet(); snapTo(bayOf(goal.yaw) + 1); showWall(); };
  const onKey = (e) => {
    if (!S || !S.on || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") { closeSheet(); snapTo(bayOf(goal.yaw) - 1); showWall(); }
    if (e.key === "ArrowRight") { closeSheet(); snapTo(bayOf(goal.yaw) + 1); showWall(); }
    if (e.key === "Escape") closeSheet();
  };
  document.addEventListener("keydown", onKey);

  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(pickables.filter((m) => m.userData.it.dim > 0.5), false)[0];
    return hit ? hit.object.userData.it : null;
  }
  let hov = null;
  function hover(e) { if (e.pointerType !== "mouse") return; const it = pick(e); if (it !== hov) { hov = it; canvas.style.cursor = it ? "pointer" : "grab"; } }
  function tap(e) { const it = pick(e); if (it) openSheet(it); else if (focus) closeSheet(); }

  /* ---------- ficha del perfume ---------- */
  function openSheet(it) {
    focus = it; hint.classList.add("off"); snapTo(it.bay);
    const p = it.p; let o = p.o[0];
    const paint = () => {
      sheet.innerHTML = `<button class="t3-x" aria-label="Cerrar">×</button>
        <img src="catalogo/img/${p.k}.webp" alt="">
        <div class="t3-tx"><small>${p.b} · ${p.ml}</small><h3>${p.n}</h3>
        ${p.o.length > 1 ? `<div class="t3-opts">${p.o.map((x) => `<button data-o="${x.id}" class="${x.id === o.id ? "on" : ""}">${x.l}<b>S/ ${x.p}</b></button>`).join("")}</div>` : `<div class="t3-pr">S/ ${p.p}</div>`}
        <p>${p.notes ? `<b>Notas:</b> ${p.notes.join(" · ")}` : p.desc || ""}</p>
        <div class="t3-btns"><button class="t3-add">Agregar al pedido</button><button class="t3-more">Ver detalles</button></div></div>`;
      sheet.querySelector(".t3-x").onclick = closeSheet;
      sheet.querySelectorAll("[data-o]").forEach((b) => (b.onclick = () => { o = p.o.find((x) => x.id === b.dataset.o); paint(); }));
      sheet.querySelector(".t3-add").onclick = () => api.add(p.k, o.id);
      sheet.querySelector(".t3-more").onclick = () => api.verDetalle(p.k);
    };
    paint(); sheet.classList.add("on");
    try { history.replaceState(null, "", "#" + p.k); } catch (e) {}
  }
  function closeSheet() { if (!focus) return; focus = null; sheet.classList.remove("on"); }

  /* ---------- búsqueda: atenúa lo que no coincide ---------- */
  function filter(match) {
    let first = null;
    for (const it of items) { const ok = match(it.p); it.dimGoal = ok ? 1 : 0.12; if (ok && !first) first = it; }
    if (first && items.some((i) => i.dimGoal < 1)) { snapTo(first.bay); showWall(); }
  }
  function goCat(c) { const bi = BAYS.findIndex((b) => b.c === c); if (bi >= 0) { closeSheet(); snapTo(bi); showWall(); } }
  function goProduct(k) { const it = items.find((i) => i.p.k === k); if (it) { view.yaw = goal.yaw = it.bay * STEP; openSheet(it); } }

  /* ---------- animación ---------- */
  let raf = 0, on = true, t0 = performance.now(), intro = still ? 1 : 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (intro < 1) intro = Math.min(1, intro + dt / 1.6);
    const k = still ? 1 : 1 - Math.pow(0.0015, dt);
    if (!dragging) view.yaw += (goal.yaw - view.yaw) * k;
    view.pitch += (goal.pitch - view.pitch) * k;
    view.fov += ((focus ? (cam.aspect < 0.8 ? 50 : 48) : goal.fov) - view.fov) * k;
    focusAmt += ((focus ? 1 : 0) - focusAmt) * k;
    for (const it of items) {
      const tgt = it === focus ? 0.07 : it === hov ? 0.035 : 0; it.lift += (tgt - it.lift) * k;
      if (it.y0 === undefined) it.y0 = it.g.position.y;
      it.g.position.y = it.y0 + it.lift; it.g.scale.setScalar(1 + it.lift * 0.9);
      it.dim += ((it.dimGoal ?? 1) - it.dim) * k;
      const a = (it.ready ? 1 : 0) * it.dim * ease(Math.min(1, intro * 1.4));
      it.mesh.material.opacity = a; it.refl.material.opacity = a * 0.16; it.pt.material.opacity = a; if (it.badge) it.badge.material.opacity = a;
    }
    key.intensity = 18 * ease(intro);
    placeCam();
    renderer.render(scene, cam);
  }
  const ro = new ResizeObserver(sizeIt); ro.observe(host); sizeIt();
  goal.yaw = 0; showWall(); raf = requestAnimationFrame(frame);
  setTimeout(() => hint.classList.add("off"), 6000);

  return {
    get on() { return on; },
    pause() { on = false; cancelAnimationFrame(raf); closeSheet(); },
    resume() { if (on) return; on = true; t0 = performance.now(); sizeIt(); raf = requestAnimationFrame(frame); },
    filter, goCat, goProduct,
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
