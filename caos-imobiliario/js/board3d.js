/* =====================================================================
   CAOS IMOBILIÁRIO — TABULEIRO 3D (Three.js)
   ---------------------------------------------------------------------
   Loop fixo estilo "Monopoly Plus": casas em sequência, cenário low-poly
   em 7 distritos ao redor do trajeto, câmera angulada que segue o peão
   ativo, dado 3D e declínio visual progressivo (4 estágios).
   Nenhuma regra vive aqui — só apresentação.
   ===================================================================== */
(function (global) {
'use strict';
const T = global.THREE;
const CH = global.CaosChars;

const DISTRITOS = [
  { cor: 0xFF6B57, paleta: [0xFF6B57, 0xF5C542, 0xFFF4E0, 0xFF8C42], alturas: [30, 60], nome: 'Alimentação' },
  { cor: 0xF48FB1, paleta: [0xF48FB1, 0xB48CFF, 0xFFF4E0, 0xFF3FA4], alturas: [35, 75], nome: 'Beleza' },
  { cor: 0x2BC4B6, paleta: [0x3A4A6B, 0x4FC3F7, 0x2BC4B6, 0x5FB3C9], alturas: [80, 170], nome: 'Tecnologia' },
  { cor: 0xB48CFF, paleta: [0x8E44AD, 0xFF3FA4, 0xFFD23F, 0xB48CFF], alturas: [40, 100], nome: 'Entretenimento' },
  { cor: 0x7BE495, paleta: [0xFFFFFF, 0x7BE495, 0xC7CED6, 0xE8F4EA], alturas: [40, 90], nome: 'Saúde' },
  { cor: 0xFFC93C, paleta: [0xF5C542, 0x9AA0A6, 0x4A4F55, 0xFF8C42], alturas: [25, 55], nome: 'Transporte' },
  { cor: 0xFF3FA4, paleta: [0xFF3FA4, 0x8E44AD, 0xFFF4E0, 0xF48FB1], alturas: [35, 80], nome: 'Moda' },
];
const SKY = [0x9AD7F5, 0x7C9FC2, 0x5C5477, 0x2B1B3D];
const GROUND = [0x6CC04A, 0x8A9A4A, 0x7A7455, 0x4F4A4A];

const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const rr = (a, b) => a + rnd() * (b - a);
function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
function m(color, opts = {}) { return new T.MeshStandardMaterial({ color: lin(color), roughness: opts.roughness ?? .8, metalness: 0, emissive: opts.emissive ? lin(opts.emissive) : 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side || T.FrontSide }); }
const MC = {}; function mc(color, opts = {}) { const k = color + JSON.stringify(opts); if (!MC[k]) { MC[k] = m(color, opts); MC[k].userData.hex = color; MC[k].userData.plain = !opts.emissive && !opts.opacity; } return MC[k]; }
let STATIC = false; // quando true, mesh() com material cacheado e opaco vira instância (SI) em vez de malha própria
let WINDOWS = []; // {gr, local:Matrix4} — instanciadas no fim do init
/* Instanciador de geometria estática: blocos de prédio, telhados, árvores, faixas de rua…
   Um InstancedMesh por geometria, cor por instância. Matrizes recalculadas no setStage
   (quando prédios/árvores inclinam) — e não a cada quadro. */
const SI = {
  items: [], meshes: [],
  reset() { this.items = []; this.meshes = []; },
  add(geo, color, gr, local) { this.items.push({ geo, base: lin(color), gr, local }); },
  build(scene) {
    const groups = new Map(); this.items.forEach((it) => { if (!groups.has(it.geo)) groups.set(it.geo, []); groups.get(it.geo).push(it); });
    groups.forEach((items, geo) => { const im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0xFFFFFF, roughness: .8 }), items.length); im.userData.items = items; scene.add(im); this.meshes.push(im); });
    this.refresh(0);
  },
  refresh(stage) {
    const gray = new T.Color(0x6E6A72), M = new T.Matrix4(), C = new T.Color();
    this.meshes.forEach((im) => { im.userData.items.forEach((it, i) => { it.gr.updateWorldMatrix(true, false); M.multiplyMatrices(it.gr.matrixWorld, it.local); im.setMatrixAt(i, M); C.copy(it.base).lerp(gray, stage * .22); im.setColorAt(i, C); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  },
};
const LM = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) => { const m = new T.Matrix4(); m.makeRotationFromEuler(new T.Euler(rx, ry, rz)); m.scale(new T.Vector3(sx, sy, sz)); m.setPosition(x, y, z); return m; };
const UNIT_BOX = () => g('BoxGeometry', 1, 1, 1), UNIT_CONE4 = () => g('ConeGeometry', 1, 1, 4), UNIT_CONE5 = () => g('ConeGeometry', 1, 1, 5), UNIT_CYL = () => g('CylinderGeometry', 1, 1, 1, 6);
const G = {}; function g(kind, ...a) { const k = kind + a.join(','); return G[k] || (G[k] = new T[kind](...a)); }
function mesh(geo, mat, x, y, z, parent, rot) {
  if (STATIC && mat.userData && mat.userData.plain) { const M = new T.Matrix4().makeRotationFromEuler(new T.Euler(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0)); M.setPosition(x, y, z); SI.add(geo, mat.userData.hex, parent, M); return new T.Object3D(); }
  const o = new T.Mesh(geo, mat); o.position.set(x, y, z); if (rot) o.rotation.set(rot[0], rot[1], rot[2]); parent.add(o); return o;
}
function textTex(draw, w = 128, h = 128) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 2; return t; }

/* ---------- texturas das casas ---------- */
function tileTexture(cell, negocio, dcor) {
  return textTex((ctx, W, H) => {
    ctx.fillStyle = '#FFF4E0'; ctx.fillRect(0, 0, W, H);
    // conteúdo desenhado em paisagem (H x W) e girado 90°: o "cima" do texto fica no +x da casa (direção de avanço do loop)
    ctx.translate(W / 2, H / 2); ctx.rotate(Math.PI / 2); ctx.translate(-H / 2, -W / 2);
    const w = H, h = W;
    const band = cell.type === 'negocio' ? '#' + dcor.toString(16).padStart(6, '0') : cell.type === 'evento_forte' ? '#8E44AD' : cell.type === 'evento_leve' ? '#B48CFF' : '#F5C542';
    ctx.fillStyle = band; ctx.fillRect(0, 0, w, 34);
    ctx.strokeStyle = '#1A0F26'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1A0F26';
    const emoji = cell.type === 'negocio' ? negocio.emoji : cell.type === 'evento_forte' ? '⚡' : cell.type === 'evento_leve' ? '🎴' : '👑';
    ctx.font = '78px sans-serif'; ctx.fillText(emoji, w / 2, 94);
    ctx.font = 'bold 0px Fredoka, sans-serif';
    const nome = cell.type === 'negocio' ? negocio.nome : cell.type === 'evento_forte' ? 'EVENTO FORTE' : cell.type === 'evento_leve' ? 'Evento leve' : 'INÍCIO';
    const words = nome.toUpperCase().split(' '); const lines = []; let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).trim().length > 14 && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); } lines.push(cur);


  }, 128, 184);
}
/* etiqueta flutuante da casa: Sprite (sempre de frente para a câmera) com nome + preço */
function labelTex(nome, sub, cor) {
  return textTex((ctx, w, h) => {
    const r = 22; ctx.fillStyle = 'rgba(255,244,224,.96)'; ctx.strokeStyle = '#1A0F26'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(r, 4); ctx.lineTo(w - r, 4); ctx.quadraticCurveTo(w - 4, 4, w - 4, r); ctx.lineTo(w - 4, h - r - 14); ctx.quadraticCurveTo(w - 4, h - 14, w - r, h - 14); ctx.lineTo(w / 2 + 12, h - 14); ctx.lineTo(w / 2, h - 2); ctx.lineTo(w / 2 - 12, h - 14); ctx.lineTo(r, h - 14); ctx.quadraticCurveTo(4, h - 14, 4, h - r - 14); ctx.lineTo(4, r); ctx.quadraticCurveTo(4, 4, r, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cor; ctx.fillRect(4, 4, w - 8, 12);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1A0F26'; ctx.font = 'bold 30px Fredoka, sans-serif';
    const words = nome.toUpperCase().split(' '); const lines = []; let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).trim().length > 15 && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); } lines.push(cur);
    const y0 = lines.length > 1 ? 44 : 54; lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, w / 2, y0 + i * 32));
    if (sub) { ctx.font = '600 22px Fredoka, sans-serif'; ctx.fillStyle = '#7A6A8C'; ctx.fillText(sub, w / 2, h - 24); }
  }, 320, 128);
}
function diceFace(n) {
  return textTex((ctx, w, h) => {
    ctx.fillStyle = '#FFF4E0'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#1A0F26'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#1A0F26'; const dots = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
    dots.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(w / 2 + x * 30, h / 2 + y * 30, 11, 0, Math.PI * 2); ctx.fill(); });
  });
}
function signTex(txt, bg = '#FF6B57') {
  return textTex((ctx, w, h) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#1A0F26'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, w, h); ctx.fillStyle = '#FFF4E0'; ctx.font = 'bold 30px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, w / 2, h / 2 + 11); }, 256, 96);
}

/* ---------- props por distrito (low-poly) ---------- */
function tree(parent, x, z, s = 1) { const gr = new T.Group(); SI.add(UNIT_CYL(), 0x8B5A2B, gr, LM(0, 13, 0, 2.5, 26, 2.5)); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; SI.add(UNIT_CONE5(), 0x6CC04A, gr, LM(Math.cos(a) * 9, 26, Math.sin(a) * 9, 4, 18, 4, 0, Math.cos(a) * 1.1, -Math.sin(a) * 1.1)); } gr.position.set(x, 0, z); gr.scale.setScalar(s); parent.add(gr); return gr; }
function lamp(parent, x, z) { const gr = new T.Group(); mesh(g('CylinderGeometry', 1.2, 1.6, 34, 6), mc(0x4A4F55), 0, 17, 0, gr); gr.userData.bulb = mesh(g('SphereGeometry', 3.5, 8, 6), m(0xFFF4E0, { emissive: 0xFFD23F, ei: .8 }), 0, 36, 0, gr); gr.position.set(x, 0, z); parent.add(gr); return gr; }
/* janelas de um bloco (frente e fundo), registradas para instanciamento */
function windowsFor(gr, w, h, d, y0 = 0, cx = 0, cz = 0) {
  const floors = Math.max(1, Math.floor((h - 6) / 16)), cols = Math.max(1, Math.floor((w - 8) / 11));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) for (const side of [1, -1]) {
    const lx = cx - ((cols - 1) * 11) / 2 + c * 11, ly = y0 + 11 + f * 16, lz = cz + side * (d / 2 + .6);
    const local = new T.Matrix4().makeRotationY(side === 1 ? 0 : Math.PI); local.setPosition(lx, ly, lz);
    WINDOWS.push({ gr, local, r: rnd() });
  }
}
/* prédio com estilos variados: box | roof (telhado inclinado) | tower (recuos + antena) | L (em L) | awning (toldos e varandas)
   opts.windows=false para prédios distantes (LOD) */
function building(parent, x, z, w, h, d, color, rotY, roofColor, style = 'box', opts = {}) {
  const gr = new T.Group(); const win = opts.windows !== false; const rc = roofColor || 0x4A4F55;
  const box = (bw, bh, bd, bx, by, bz, c) => SI.add(UNIT_BOX(), c, gr, LM(bx, by, bz, bw, bh, bd));
  if (style === 'roof') {
    box(w, h, d, 0, h / 2, 0, color); if (win) windowsFor(gr, w, h, d);
    SI.add(UNIT_CONE4(), rc, gr, LM(0, h + 9, 0, w * .78, 18, d * .78, Math.PI / 4));
    box(6, 12, 6, w * .3, h + 12, 0, 0x9AA0A6); // chaminé
  } else if (style === 'tower') {
    const w2 = w * .7, d2 = d * .7, h1 = h * .55, h2 = h * .45;
    box(w, h1, d, 0, h1 / 2, 0, color); box(w2, h2, d2, 0, h1 + h2 / 2, 0, color);
    if (win) { windowsFor(gr, w, h1, d); windowsFor(gr, w2, h2, d2, h1); }
    box(w2 * .9, 3, d2 * .9, 0, h + 1.5, 0, rc);
    mesh(g('CylinderGeometry', 1, 2, 30, 6), mc(0x9AA0A6), 0, h + 17, 0, gr); const l = mesh(g('SphereGeometry', 3, 6, 5), mc(0xE53935, { emissive: 0xE53935, ei: 1.4 }), 0, h + 33, 0, gr); gr.userData.blink = l;
  } else if (style === 'L') {
    box(w, h, d * .55, 0, h / 2, -d * .22, color); box(w * .5, h * .7, d, w * .25, h * .35, 0, color);
    if (win) { windowsFor(gr, w, h, d * .55, 0, 0, -d * .22); }
    box(w * .9, 3, d * .5, 0, h + 1.5, -d * .22, rc); box(w * .45, 3, d * .9, w * .25, h * .7 + 1.5, 0, rc);
  } else if (style === 'awning') {
    box(w, h, d, 0, h / 2, 0, color); if (win) windowsFor(gr, w, h, d);
    box(w * .9, 3, d * .9, 0, h + 1.5, 0, rc);
    const floors = Math.max(1, Math.floor((h - 6) / 16));
    for (let f = 0; f < floors; f++) { const y = 11 + f * 16 + 6; if (f === 0) SI.add(UNIT_BOX(), rc === 0x4A4F55 ? 0xFF6B57 : rc, gr, LM(0, y, d / 2 + 5, w * .8, 2, 10, 0, .35)); else { box(w * .6, 1.5, 6, 0, y - 8, d / 2 + 3, 0xFFF4E0); box(w * .6, 5, .8, 0, y - 5, d / 2 + 6, 0x1A0F26); } }
  } else {
    box(w, h, d, 0, h / 2, 0, color); if (win) windowsFor(gr, w, h, d);
    box(w * .9, 4, d * .9, 0, h + 2, 0, rc);
    if (opts.parapet) box(w, 3, d, 0, h + 4, 0, rc);
  }
  gr.position.set(x, 0, z); gr.rotation.y = rotY; parent.add(gr); gr.userData.base = h; return gr;
}
const STYLES = ['box', 'roof', 'awning', 'L', 'box', 'tower', 'roof', 'awning'];
/* ---------- decorações do miolo (cidade em miniatura), por distrito ---------- */
function grp(parent, x, z, rot) { const gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = rot || 0; parent.add(gr); return gr; }
const MIOLO = {
  cafeTable(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 1.5, 1.5, 18, 6), mc(0x4A4F55), 0, 9, 0, gr); mesh(g('CylinderGeometry', 10, 10, 2, 12), mc(0xFFF4E0), 0, 19, 0, gr); mesh(g('CylinderGeometry', 1, 1, 30, 6), mc(0x9AA0A6), 0, 34, 0, gr); mesh(g('ConeGeometry', 22, 10, 8), mc(rnd() > .5 ? 0xFF6B57 : 0xF5C542), 0, 50, 0, gr); [[14, 0], [-14, 0]].forEach(([a, b]) => mesh(g('CylinderGeometry', 4, 4, 8, 8), mc(0x8B5A2B), a, 4, b, gr)); return gr; },
  hotdogCart(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 36, 22, 18), mc(0xFFF4E0), 0, 17, 0, gr); [[-12], [12]].forEach(([a]) => mesh(g('CylinderGeometry', 6, 6, 4, 10), mc(0x1A0F26), a, 6, 10, gr, [Math.PI / 2, 0, 0])); [[-14, 0xFF6B57], [0, 0xFFF4E0], [14, 0xFF6B57]].forEach(([a, c]) => mesh(g('BoxGeometry', 14, 3, 24), mc(c), a, 44, 0, gr)); [[-19], [19]].forEach(([a]) => mesh(g('CylinderGeometry', 1, 1, 16, 6), mc(0x9AA0A6), a, 36, 0, gr)); mesh(g('CapsuleGeometry', 5, 18, 3, 8), mc(0xB5552B), 0, 34, 0, gr, [0, 0, Math.PI / 2]); return gr; },
  lipstick(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 9, 9, 26, 12), mc(0xFFD54F), 0, 13, 0, gr); mesh(g('CylinderGeometry', 7, 7, 14, 12), mc(0x1A0F26), 0, 33, 0, gr); mesh(g('CylinderGeometry', 6, 6, 18, 12), mc(0xFF3FA4), 0, 49, 0, gr); mesh(g('ConeGeometry', 6, 8, 12), mc(0xFF3FA4), 0, 62, 0, gr, [0, 0, .5]); return gr; },
  mirror(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 9, 10, 3, 10), mc(0xFFD54F), 0, 1.5, 0, gr); mesh(g('CylinderGeometry', 1.5, 1.5, 34, 6), mc(0xFFD54F), 0, 18, 0, gr); mesh(g('TorusGeometry', 16, 2.5, 8, 24), mc(0xFFD54F), 0, 50, 0, gr); mesh(g('CircleGeometry', 15, 24), mc(0xDDEEFF, { emissive: 0xFFFFFF, ei: .35, side: T.DoubleSide }), 0, 50, 0, gr); return gr; },
  hairDryer(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 8, 8, 30, 12), mc(0xF48FB1), 0, 30, 0, gr, [0, 0, Math.PI / 2]); mesh(g('ConeGeometry', 8, 14, 12), mc(0xF48FB1), 22, 30, 0, gr, [0, 0, -Math.PI / 2]); mesh(g('BoxGeometry', 8, 26, 8), mc(0xF48FB1), -4, 15, 0, gr, [0, 0, .25]); mesh(g('CylinderGeometry', 9, 9, 2, 12), mc(0x1A0F26), -15.5, 30, 0, gr, [0, 0, Math.PI / 2]); return gr; },
  antenna(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 2, 5, 80, 6), mc(0x9AA0A6), 0, 40, 0, gr); [20, 45, 65].forEach((y, i) => mesh(g('BoxGeometry', 26 - i * 6, 1.5, 1.5), mc(0x9AA0A6), 0, y, 0, gr, [0, i * .6, 0])); mesh(g('ConeGeometry', 10, 6, 12), mc(0xFFFFFF), 8, 70, 0, gr, [0, 0, -1]); const l = mesh(g('SphereGeometry', 3, 8, 6), mc(0xE53935, { emissive: 0xE53935, ei: 1.5 }), 0, 82, 0, gr); l.userData.blink = rnd() * 6; gr.userData.blink = l; return gr; },
  serverRack(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 20, 40, 14), mc(0x3A4A6B), 0, 20, 0, gr); for (let i = 0; i < 6; i++) mesh(g('BoxGeometry', 14, 2, 1), mc([0x2BC4B6, 0x7BE495][i % 2], { emissive: [0x2BC4B6, 0x7BE495][i % 2], ei: 1.2 }), 0, 6 + i * 6, 7.5, gr); return gr; },
  billboard(parent, x, z, rot, txt) { const gr = grp(parent, x, z, rot); [[-22], [22]].forEach(([a]) => mesh(g('CylinderGeometry', 1.5, 1.5, 36, 6), mc(0x4A4F55), a, 18, 0, gr)); const s = mesh(g('PlaneGeometry', 52, 22), new T.MeshBasicMaterial({ map: signTex(txt || 'NEON', '#2BC4B6'), side: T.DoubleSide }), 0, 44, 0, gr); mesh(g('BoxGeometry', 56, 26, 1), mc(0xFF3FA4, { emissive: 0xFF3FA4, ei: .8 }), 0, 44, -1, gr); return gr; },
  marquee(parent, x, z, rot) { const gr = grp(parent, x, z, rot); [[-30], [30]].forEach(([a]) => mesh(g('CylinderGeometry', 1.5, 1.5, 34, 6), mc(0x4A4F55), a, 17, 0, gr)); mesh(g('BoxGeometry', 66, 4, 4), mc(0x8E44AD), 0, 35, 0, gr); const bulbs = []; for (let i = 0; i < 7; i++) bulbs.push(mesh(g('SphereGeometry', 2.5, 8, 6), mc([0xFFD23F, 0xFF3FA4, 0x2BC4B6][i % 3], { emissive: [0xFFD23F, 0xFF3FA4, 0x2BC4B6][i % 3], ei: 1.2 }), -30 + i * 10, 39, 0, gr)); gr.userData.bulbs = bulbs; return gr; },
  carousel(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 24, 26, 4, 16), mc(0xFF6B57), 0, 2, 0, gr); mesh(g('CylinderGeometry', 3, 3, 40, 8), mc(0xFFD23F), 0, 24, 0, gr); mesh(g('ConeGeometry', 28, 14, 12), mc(0xFFF4E0), 0, 49, 0, gr); const spin = new T.Group(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mesh(g('CylinderGeometry', 1, 1, 30, 6), mc(0xFFD23F), Math.cos(a) * 16, 22, Math.sin(a) * 16, spin); mesh(g('SphereGeometry', 5, 8, 6), mc([0xB48CFF, 0x2BC4B6, 0xF5C542, 0xFF6B57][i]), Math.cos(a) * 16, 18, Math.sin(a) * 16, spin); } gr.add(spin); gr.userData.spin = spin; return gr; },
  popcorn(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 22, 30, 18), mc(0xFFF4E0), 0, 15, 0, gr); [-7, 7].forEach((a) => mesh(g('BoxGeometry', 4, 30, 18.5), mc(0xE53935), a, 15, 0, gr)); mesh(g('BoxGeometry', 26, 3, 22), mc(0xE53935), 0, 32, 0, gr); [[-4, 34], [3, 36], [0, 38]].forEach(([a, y]) => mesh(g('SphereGeometry', 3, 6, 5), mc(0xFFF4E0), a, y, 0, gr)); return gr; },
  pharmacyCross(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 2, 2, 34, 6), mc(0x9AA0A6), 0, 17, 0, gr); const c = mc(0x7BE495, { emissive: 0x7BE495, ei: .7 }); mesh(g('BoxGeometry', 30, 8, 6), c, 0, 44, 0, gr); mesh(g('BoxGeometry', 8, 30, 6), c, 0, 44, 0, gr); return gr; },
  pillBench(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CapsuleGeometry', 6, 26, 3, 10), mc(0xFFFFFF), 0, 10, 0, gr, [0, 0, Math.PI / 2]); mesh(g('CylinderGeometry', 6.2, 6.2, 13, 10), mc(0xFF6B57), 6.5, 10, 0, gr, [0, 0, Math.PI / 2]); [-10, 10].forEach((a) => mesh(g('BoxGeometry', 3, 6, 6), mc(0x4A4F55), a, 3, 0, gr)); return gr; },
  ambulance(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 34, 16, 18), mc(0xFFFFFF), 0, 13, 0, gr); mesh(g('BoxGeometry', 12, 10, 16), mc(0xDDEEFF), -20, 10, 0, gr); [[-14, 9], [10, 9], [-14, -9], [10, -9]].forEach(([a, b]) => mesh(g('CylinderGeometry', 4, 4, 4, 8), mc(0x1A0F26), a, 4, b, gr, [Math.PI / 2, 0, 0])); mesh(g('BoxGeometry', 10, 3, 1), mc(0xE53935), 0, 14, 9.5, gr); mesh(g('BoxGeometry', 3, 10, 1), mc(0xE53935), 0, 14, 9.5, gr); const l = mesh(g('BoxGeometry', 6, 3, 6), mc(0xE53935, { emissive: 0xE53935, ei: 1.5 }), 0, 22.5, 0, gr); gr.userData.blink = l; return gr; },
  trafficLight(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 2, 2, 44, 6), mc(0x4A4F55), 0, 22, 0, gr); mesh(g('BoxGeometry', 9, 26, 9), mc(0x1A0F26), 0, 46, 0, gr); const ls = [0xE53935, 0xF5C542, 0x7BE495].map((c, i) => mesh(g('SphereGeometry', 3, 8, 6), mc(c, { emissive: c, ei: 1 }), 0, 54 - i * 8, 5, gr)); gr.userData.lights = ls; gr.userData.phase = rnd() * 3; return gr; },
  roadSign(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 1.5, 1.5, 36, 6), mc(0x9AA0A6), 0, 18, 0, gr); mesh(g('CylinderGeometry', 10, 10, 2, 16), mc(0xE53935), 0, 40, 0, gr, [Math.PI / 2, 0, 0]); mesh(g('BoxGeometry', 12, 3, 3), mc(0xFFFFFF), 0, 40, 0, gr); return gr; },
  car(parent, x, z, rot, color) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 30, 10, 16), mc(color || 0x4FC3F7), 0, 9, 0, gr); mesh(g('BoxGeometry', 16, 8, 14), mc(0xDDEEFF), -2, 18, 0, gr); [[-9, 9], [9, 9], [-9, -9], [9, -9]].forEach(([a, b]) => mesh(g('CylinderGeometry', 4, 4, 4, 8), mc(0x1A0F26), a, 4, b, gr, [Math.PI / 2, 0, 0])); return gr; },
  mannequin(parent, x, z, rot, color) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 7, 8, 2, 10), mc(0x4A4F55), 0, 1, 0, gr); mesh(g('CylinderGeometry', 1, 1, 22, 6), mc(0x9AA0A6), 0, 12, 0, gr); mesh(g('ConeGeometry', 10, 20, 10), mc(color || 0xFF3FA4), 0, 26, 0, gr); mesh(g('CapsuleGeometry', 6, 12, 3, 8), mc(0xFFF4E0), 0, 40, 0, gr); mesh(g('SphereGeometry', 5.5, 10, 8), mc(0xFFF4E0), 0, 54, 0, gr); return gr; },
  hanger(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('CylinderGeometry', 2, 2, 30, 6), mc(0x9AA0A6), 0, 15, 0, gr); mesh(g('BoxGeometry', 44, 2.5, 2.5), mc(0x8B5A2B), 0, 32, 0, gr); [-1, 1].forEach((s) => mesh(g('BoxGeometry', 26, 2.5, 2.5), mc(0x8B5A2B), s * 11, 39, 0, gr, [0, 0, -s * .6])); mesh(g('TorusGeometry', 5, 1.2, 6, 12, Math.PI * 1.3), mc(0x9AA0A6), 0, 50, 0, gr, [0, 0, -.6]); return gr; },
  fountain(parent, x, z) { const gr = grp(parent, x, z, 0); mesh(g('CylinderGeometry', 58, 60, 2, 24), mc(0xF5C542), 0, 1, 0, gr); mesh(g('CylinderGeometry', 48, 50, 3, 24), mc(0xFF6B57), 0, 1.5, 0, gr); mesh(g('CylinderGeometry', 40, 42, 4, 24), mc(0x2BC4B6), 0, 2, 0, gr); mesh(g('CylinderGeometry', 34, 36, 6, 20), mc(0xC7CED6), 0, 3, 0, gr); const water = mesh(g('CylinderGeometry', 31, 31, 3, 20), mc(0x4FC3F7, { emissive: 0x4FC3F7, ei: .25 }), 0, 6, 0, gr); mesh(g('CylinderGeometry', 5, 8, 26, 10), mc(0xC7CED6), 0, 18, 0, gr); mesh(g('CylinderGeometry', 14, 14, 3, 14), mc(0xC7CED6), 0, 30, 0, gr); const jet = mesh(g('SphereGeometry', 6, 8, 6), mc(0x9AD7F5, { emissive: 0x9AD7F5, ei: .4 }), 0, 38, 0, gr); gr.userData.jet = jet; gr.userData.water = water; return gr; },
  bench(parent, x, z, rot) { const gr = grp(parent, x, z, rot); mesh(g('BoxGeometry', 26, 3, 9), mc(0x8B5A2B), 0, 10, 0, gr); mesh(g('BoxGeometry', 26, 9, 2), mc(0x8B5A2B), 0, 15, -4, gr, [-.2, 0, 0]); [-10, 10].forEach((a) => mesh(g('BoxGeometry', 3, 10, 8), mc(0x4A4F55), a, 5, 0, gr)); return gr; },
};
const MIOLO_POR_DISTRITO = [
  ['cafeTable', 'hotdogCart', 'cafeTable', 'cafeTable'],
  ['lipstick', 'mirror', 'hairDryer', 'mirror'],
  ['antenna', 'serverRack', 'billboard', 'serverRack'],
  ['marquee', 'carousel', 'popcorn', 'marquee'],
  ['pharmacyCross', 'pillBench', 'ambulance', 'pillBench'],
  ['trafficLight', 'car', 'roadSign', 'car'],
  ['mannequin', 'hanger', 'mannequin', 'mannequin'],
];

const HEROES = {
  0(parent) { const gr = new T.Group(); const truck = mesh(g('BoxGeometry', 60, 30, 34), m(0xFFF4E0), 0, 20, 0, gr); mesh(g('BoxGeometry', 24, 22, 34), m(0xFF6B57), -30, 16, 0, gr); [[-18, 18], [18, 18], [-18, -18], [18, -18]].forEach(([a, b]) => mesh(g('CylinderGeometry', 6, 6, 6, 10), m(0x1A0F26), a, 6, b, gr, [Math.PI / 2, 0, 0]));
    mesh(g('SphereGeometry', 16, 12, 8), m(0xF5C542), 8, 50, 0, gr).scale.set(1, .6, 1); mesh(g('CylinderGeometry', 15, 15, 5, 12), m(0x8B5A2B), 8, 42, 0, gr); mesh(g('CylinderGeometry', 16, 16, 3, 12), m(0x7BE495), 8, 45, 0, gr); mesh(g('SphereGeometry', 15, 12, 8), m(0xF5C542), 8, 38, 0, gr).scale.set(1, .5, 1);
    parent.add(gr); return gr; },
  1(parent) { const gr = new T.Group(); mesh(g('CylinderGeometry', 9, 9, 40, 12), m(0xFFC93C), 0, 20, 0, gr); mesh(g('CylinderGeometry', 8, 8, 30, 12), m(0xFF3FA4), 0, 55, 0, gr); mesh(g('CylinderGeometry', 0, 8, 14, 12), m(0xFF3FA4), 0, 77, 0, gr, [0, 0, .35]);
    mesh(g('TorusGeometry', 20, 3, 8, 20), m(0xFFC93C), 40, 40, 0, gr); mesh(g('CircleGeometry', 18, 20), m(0xDDEEFF, { emissive: 0xFFFFFF, ei: .3, side: T.DoubleSide }), 40, 40, 0, gr); parent.add(gr); return gr; },
  2(parent) { const gr = new T.Group(); const b = building(gr, 0, 0, 44, 210, 44, 0x3A4A6B, 0, 0x2BC4B6); for (let i = 0; i < 8; i++) mesh(g('BoxGeometry', 1, 1, 1), m(0x2BC4B6, { emissive: 0x2BC4B6, ei: 1.2 }), 0, 20 + i * 24, 23, b).scale.set(30, 2, 1);
    mesh(g('CylinderGeometry', 1, 2, 50, 6), m(0x9AA0A6), 0, 237, 0, gr); const orb = mesh(g('SphereGeometry', 6, 10, 8), m(0xFF3FA4, { emissive: 0xFF3FA4, ei: 1.5 }), 0, 264, 0, gr); gr.userData.orb = orb; parent.add(gr); return gr; },
  3(parent) { const gr = new T.Group(); mesh(g('BoxGeometry', 10, 90, 10), m(0x4A4F55), -40, 45, 0, gr, [0, 0, -.35]); mesh(g('BoxGeometry', 10, 90, 10), m(0x4A4F55), 40, 45, 0, gr, [0, 0, .35]);
    const wheel = new T.Group(); mesh(g('TorusGeometry', 62, 3, 8, 32), m(0xFF3FA4, { emissive: 0xFF3FA4, ei: .4 }), 0, 0, 0, wheel); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; mesh(g('BoxGeometry', 124, 2, 2), m(0xFFD23F), 0, 0, 0, wheel, [0, 0, a]); const cab = mesh(g('BoxGeometry', 12, 10, 8), m([0xFF6B57, 0x2BC4B6, 0xF5C542, 0xB48CFF][i % 4]), Math.cos(a) * 62, Math.sin(a) * 62, 0, wheel); cab.userData.cab = true; }
    wheel.position.y = 90; gr.add(wheel); gr.userData.wheel = wheel; parent.add(gr); return gr; },
  4(parent) { const gr = new T.Group(); building(gr, 0, 0, 90, 70, 50, 0xFFFFFF, 0, 0x7BE495); mesh(g('BoxGeometry', 8, 28, 4), m(0xE53935, { emissive: 0xE53935, ei: .5 }), 0, 55, 27, gr); mesh(g('BoxGeometry', 28, 8, 4), m(0xE53935, { emissive: 0xE53935, ei: .5 }), 0, 55, 27, gr); mesh(g('BoxGeometry', 30, 4, 20), m(0x7BE495), 0, 22, 36, gr); parent.add(gr); return gr; },
  5(parent) { const gr = new T.Group(); [[-40, -20], [40, -20], [-40, 20], [40, 20]].forEach(([a, b]) => mesh(g('CylinderGeometry', 2.5, 2.5, 40, 6), m(0x9AA0A6), a, 20, b, gr)); mesh(g('BoxGeometry', 110, 6, 60), m(0xF5C542), 0, 42, 0, gr); mesh(g('BoxGeometry', 110, 10, 4), m(0xFF6B57), 0, 40, 32, gr);
    [-25, 0, 25].forEach((a) => mesh(g('BoxGeometry', 10, 22, 8), m(0x4A4F55), a, 11, 0, gr)); const car = new T.Group(); mesh(g('BoxGeometry', 30, 10, 16), m(0x4FC3F7), 0, 9, 0, car); mesh(g('BoxGeometry', 16, 8, 14), m(0xDDEEFF), -2, 18, 0, car); [[-9, 9], [9, 9], [-9, -9], [9, -9]].forEach(([a, b]) => mesh(g('CylinderGeometry', 4, 4, 4, 8), m(0x1A0F26), a, 4, b, car, [Math.PI / 2, 0, 0])); car.position.set(0, 0, 60); gr.add(car); gr.userData.car = car; parent.add(gr); return gr; },
  6(parent) { const gr = new T.Group(); building(gr, 0, 0, 80, 50, 44, 0xFFF4E0, 0, 0x8E44AD); for (let i = 0; i < 6; i++) mesh(g('BoxGeometry', 12, 2, 20), m(i % 2 ? 0xFF3FA4 : 0xFFF4E0), -30 + i * 12, 30, 30, gr, [.3, 0, 0]);
    const man = new T.Group(); mesh(g('CylinderGeometry', 5, 5, 3, 10), m(0x4A4F55), 0, 1.5, 0, man); mesh(g('CylinderGeometry', 1, 1, 12, 6), m(0x9AA0A6), 0, 8, 0, man); mesh(g('CapsuleGeometry' in T ? 'CapsuleGeometry' : 'CylinderGeometry', 5, 5, 18, 8), m(0xFFF4E0), 0, 22, 0, man); mesh(g('SphereGeometry', 5, 10, 8), m(0xFFF4E0), 0, 36, 0, man); man.position.set(0, 0, 40); gr.add(man); parent.add(gr); return gr; },
};

/* ====================================================================== */
class Board3D {
  constructor(container, ui) {
    this.ui = ui; this.container = container;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'board3d'; container.appendChild(this.canvas);
    this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputEncoding = T.sRGBEncoding; this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.5));
    this.scene = new T.Scene();
    this.cam = new T.PerspectiveCamera(46, 1, 1, 6000);
    this.camPos = new T.Vector3(0, 900, 900); this.camLook = new T.Vector3(0, 0, 0); this.camTargetPos = this.camPos.clone(); this.camTargetLook = this.camLook.clone();
    this.pawns = {}; this.tiles = {}; this.anchorsWorld = []; this.stage = 0; this.time = 0; this.running = true; this.props = { tilt: [], cracks: [[], [], []], trash: [], smoke: [], signs: [], colored: [], heroes: {} };
    this.raycaster = new T.Raycaster(); this.mouse = new T.Vector2();
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.resize(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() { const W = this.container.clientWidth || 1, H = this.container.clientHeight || 1; this.renderer.setSize(W, H, false); this.cam.aspect = W / H; this.cam.fov = W < H ? 64 : 50; this.cam.updateProjectionMatrix(); this.W = W; this.H = H; }
  destroy() { this.running = false; this.renderer.dispose(); this.canvas.remove(); }

  /* ---------- construção ---------- */
  init(state, charOf) {
    this.S = state; const B = state.board; const sc = this.scene; sc.clear();
    this.hemi = new T.HemisphereLight(0xffffff, 0x6CC04A, .85); sc.add(this.hemi);
    this.sun = new T.DirectionalLight(0xffffff, .9); this.sun.position.set(-400, 700, 500); sc.add(this.sun);
    this.fill = new T.DirectionalLight(0xB48CFF, .25); this.fill.position.set(500, 300, -600); sc.add(this.fill);
    sc.fog = new T.Fog(SKY[0], 900, 2600); sc.background = lin(SKY[0]);
    // chão e mesa
    this.groundMat = m(GROUND[0]); const ground = mesh(g('PlaneGeometry', 6000, 6000), this.groundMat, 0, -12, 0, sc, [-Math.PI / 2, 0, 0]);
    this.plateMat = m(0xE9DDC6); const plate = mesh(g('BoxGeometry', 1, 1, 1), this.plateMat, 0, -6, 0, sc); plate.scale.set(B.W + 230, 12, B.H + 230);
    this.grassMat = m(0x6CC04A); const inner = mesh(g('BoxGeometry', 1, 1, 1), this.grassMat, 0, 0.5, 0, sc); inner.scale.set(B.W - 90, 1, B.H - 90);
    WINDOWS = []; SI.reset(); this.props.miolo = [];
    // logo central (placa menor, ao sul da praça)

    // casas
    B.cells.forEach((c) => this.makeTile(c));
    // cenário por distrito
    B.distritos.forEach((d, di) => this.makeDistrict(d, di));
    // árvores e postes no lado interno do loop
    B.cells.forEach((c, i) => { const { ix, iz } = this.inward(c); if (i % 4 === 1) { const t = tree(sc, c.x + ix * 62, c.y + iz * 62, rr(.8, 1.15)); this.props.tilt.push(t); } if (i % 7 === 3) this.props.tilt.push(lamp(sc, c.x + ix * 50, c.y + iz * 50)); });
    // rachaduras / lixo / fumaça (invisíveis até o estágio correspondente)
    for (let s = 0; s < 3; s++) for (let i = 0; i < 10; i++) { const c = mesh(g('BoxGeometry', rr(30, 90), .8, 2), m(0x2B1B3D), rr(-B.W / 2, B.W / 2), 1.2, rr(-B.H / 2 - 100, B.H / 2 + 100), sc, [0, rnd() * Math.PI, 0]); c.visible = false; this.props.cracks[s].push(c); }
    B.cells.forEach((c, i) => { if (i % 3 === 0) { const { ix, iz } = this.inward(c); const t = mesh(g('BoxGeometry', rr(4, 9), rr(3, 6), rr(4, 9)), m([0x9AA0A6, 0x8B5A2B, 0x4A4F55][i % 3]), c.x + ix * rr(38, 46) + rr(-10, 10), 2, c.y + iz * rr(38, 46) + rr(-10, 10), sc, [0, rnd() * 3, 0]); t.visible = false; this.props.trash.push(t); } });
    // peões
    this.pawns = {}; state.players.forEach((p) => { const root = new T.Group(); const loC = CH.build(charOf[p.id], 'low'), hiC = CH.build(charOf[p.id], 'high'); const lo = loC.group, hi = hiC.group; hi.visible = false; root.add(lo, hi); const sh = mesh(g('CircleGeometry', .6, 14), m(0x000000, { opacity: .3 }), 0, .04, 0, root, [-Math.PI / 2, 0, 0]); const ring = mesh(g('RingGeometry', .7, .9, 24), m(0xF5C542, { emissive: 0xF5C542, ei: .8, side: T.DoubleSide }), 0, .05, 0, root, [-Math.PI / 2, 0, 0]); ring.visible = false; sc.add(root); this.pawns[p.id] = { root, lo, hi, loC, hiC, sh, ring, pos: new T.Vector3(), lift: 0, hop: 0, faded: false, phase: Math.random() * 6 }; });
    this.makeMiolo(); this.makeWindows(); SI.build(sc);
    this.setStage(0); this.focusAll(true);
  }
  inward(c) { const len = Math.hypot(c.x, c.y) || 1; return { ix: -c.x / len, iz: -c.y / len }; }
  makeTile(c) {
    const n = c.type === 'negocio' ? this.S.negocios[c.negocioId] : null;
    const dcor = c.distrito >= 0 ? DISTRITOS[c.distrito].cor : 0xF5C542;
    const grp = new T.Group(); grp.position.set(c.x, 0, c.y);
    // orienta: local +x = tangente; local -z = normal do trajeto apontando PARA FORA do loop
    // (o "cima" do texto fica sempre para fora — legível pela câmera de jogo, que anda por dentro)
    let nx = -Math.sin(c.ang), nz = Math.cos(c.ang); if (nx * c.x + nz * c.y < 0) { nx = -nx; nz = -nz; }
    grp.rotation.y = Math.atan2(-nx, -nz); grp.userData.n = { x: nx, z: nz };
    const th = grp.rotation.y; const lx = Math.cos(th), lz = -Math.sin(th); // direção mundial do +x local
    const tx = Math.cos(c.ang), tz = Math.sin(c.ang); const base = lx * tx + lz * tz < 0 ? Math.PI : 0; // garante +x = avanço
    const side = m(0xD9C9AE);
    const top = new T.MeshStandardMaterial({ map: tileTexture(c, n, dcor), roughness: .85 });
    const box = new T.Mesh(g('BoxGeometry', 46, 4, 66), [side, side, top, side, side, side]); box.position.y = 2; grp.add(box);
    SI.add(UNIT_BOX(), 0x1A0F26, grp, LM(0, 0.2, 0, 50, 1.5, 70)); const rim = grp;
    const owner = mesh(g('BoxGeometry', 46, 6, 6), m(0xFFFFFF, { emissive: 0xFFFFFF, ei: .3 }), 0, 4, 30, grp); owner.visible = false;
    const lock = mesh(g('BoxGeometry', 14, 14, 14), m(0x4A4F55), 0, 11, 0, grp); lock.visible = false;
    // etiqueta billboard: sempre encara a câmera, legível em qualquer ponto do loop e ângulo
    const nomeL = c.type === 'negocio' ? n.nome : c.type === 'evento_forte' ? 'Evento Forte' : c.type === 'evento_leve' ? 'Evento Leve' : 'Início';
    const subL = c.type === 'negocio' ? 'R$ ' + n.custo.toLocaleString('pt-BR') : c.type === 'topo' ? '+ dividendos' : '';
    const sprMat = new T.SpriteMaterial({ map: labelTex(nomeL, subL, '#' + (c.type === 'negocio' ? dcor : c.type === 'evento_forte' ? 0x8E44AD : c.type === 'evento_leve' ? 0xB48CFF : 0xF5C542).toString(16).padStart(6, '0')), transparent: true, depthTest: true, depthWrite: false });
    const label = new T.Sprite(sprMat); label.scale.set(56, 22.4, 1); label.position.set(0, 4, -38); label.center.set(.5, 0); grp.add(label); // na borda externa da casa, como uma placa
    box.userData.cellId = c.id;
    this.scene.add(grp); box.rotation.y = base; this.tiles[c.id] = { grp, box, top, owner, lock, label, ownerMat: owner.material.clone(), pulse: 0, n: { x: nx, z: nz }, t: { x: tx, z: tz }, base, cx: c.x, cz: c.y };
    owner.material = this.tiles[c.id].ownerMat;
  }
  /* cidade em miniatura dentro do loop: props temáticos perto de cada distrito + praça central */
  /* Miolo: cidade organizada — grama de base, ruas em cruz asfaltadas com calçadas, praça circular de pedra
     com fonte + monumento, quarteirões nos 4 cantos com a paleta do distrito mais próximo, árvores e postes
     alinhados às calçadas, carros circulando. */
  makeMiolo() {
    const B = this.S.board, sc = this.scene, small = B.H < 600; STATIC = true;
    const IW = B.W - 100, IH = B.H - 100; const cz0 = 0; this.props.cz0 = cz0;
    const RW = small ? 26 : 34;         // largura da rua
    const SW = 9;                       // calçada
    const plazaR = small ? 78 : Math.min(128, IH * .19);
    // --- chão: grama já é o `inner`; ruas em cruz (asfalto bege-cinza) com calçadas claras e faixa tracejada
    const asphalt = 0x8A8478, walk = 0xE9DDC6;
    const strip = (x, z, sx, sz, c, y = .9, h = 1.2) => SI.add(UNIT_BOX(), c, sc, LM(x, y, z, sx, h, sz));
    strip(0, cz0, IW, RW, asphalt); strip(0, cz0, RW, IH, asphalt);
    strip(0, cz0 - RW / 2 - SW / 2, IW, SW, walk, 1.1, 1.6); strip(0, cz0 + RW / 2 + SW / 2, IW, SW, walk, 1.1, 1.6);
    strip(-RW / 2 - SW / 2, cz0, SW, IH, walk, 1.1, 1.6); strip(RW / 2 + SW / 2, cz0, SW, IH, walk, 1.1, 1.6);
    for (let k = -IW / 2 + 16; k < IW / 2; k += 28) if (Math.abs(k) > plazaR) SI.add(UNIT_BOX(), 0xFFF4E0, sc, LM(k, 1.6, cz0, 12, .6, 2.2));
    for (let k = -IH / 2 + 16; k < IH / 2; k += 28) if (Math.abs(k) > plazaR) SI.add(UNIT_BOX(), 0xFFF4E0, sc, LM(0, 1.6, cz0 + k, 2.2, .6, 12));
    // --- praça circular de pedra clara (calçada) com anel de meio-fio
    SI.add(g('CylinderGeometry', 1, 1, 1, 40), 0x1A0F26, sc, LM(0, 1.2, cz0, plazaR + 4, 1.4, plazaR + 4));
    SI.add(g('CylinderGeometry', 1, 1, 1, 40), walk, sc, LM(0, 1.7, cz0, plazaR, 1.8, plazaR));
    SI.add(g('CylinderGeometry', 1, 1, 1, 40), 0xD9C9AE, sc, LM(0, 2.4, cz0, plazaR * .62, 1.2, plazaR * .62));
    // --- fonte + monumento (pedestal e estátua do "magnata")
    STATIC = false;
    const f = MIOLO.fountain(sc, 0, cz0); f.scale.setScalar(small ? .7 : .85); this.props.miolo.push(f); this.props.fountain = f;
    const mon = new T.Group(); mon.position.set(0, small ? 22 : 26, cz0); mon.scale.setScalar(small ? .75 : .9); sc.add(mon);
    const st = mc(0x9AA0A6);
    mesh(g('BoxGeometry', 22, 10, 22), st, 0, 5, 0, mon); mesh(g('BoxGeometry', 16, 22, 16), st, 0, 21, 0, mon); mesh(g('BoxGeometry', 20, 3, 20), st, 0, 33.5, 0, mon);
    mesh(g('CapsuleGeometry', 7, 12, 4, 10), st, 0, 45, 0, mon); mesh(g('SphereGeometry', 7, 12, 10), st, 0, 60, 0, mon);
    mesh(g('CylinderGeometry', 7.5, 7.5, 2, 12), st, 0, 66, 0, mon); mesh(g('CylinderGeometry', 5, 5, 9, 12), st, 0, 71, 0, mon);
    mesh(g('CapsuleGeometry', 2.2, 12, 3, 8), st, 9, 50, 3, mon, [0, 0, -1.9]); mesh(g('CapsuleGeometry', 2.2, 10, 3, 8), st, -8, 44, 0, mon, [0, 0, .6]);
    mesh(g('CylinderGeometry', 2.5, 2.5, 16, 8), st, 14, 49, 8, mon, [0, 0, .25]); // bengala
    // ondulações na água (anéis que crescem e somem)
    this.props.ripples = []; for (let i = 0; i < 3; i++) { const rp = mesh(g('TorusGeometry', 1, .8, 6, 32), new T.MeshBasicMaterial({ color: 0xDDEEFF, transparent: true, opacity: .6 }), 0, 8.2, cz0, sc, [-Math.PI / 2, 0, 0]); rp.userData.phase = i / 3; this.props.ripples.push(rp); }
    STATIC = true;
    // --- quarteirões nos 4 cantos (lotes de grama com prédios em grade), paleta do distrito mais próximo
    const lotX0 = RW / 2 + SW + 28, lotZ0 = RW / 2 + SW + 28; // borda interna do lote
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], ci) => {
      const cx = sx * (lotX0 + (IW / 2 - lotX0) / 2), cz = cz0 + sz * (lotZ0 + (IH / 2 - lotZ0) / 2);
      const near = B.distritos.reduce((a, d) => (Math.hypot(d.cx - cx, d.cy - cz) < Math.hypot(a.cx - cx, a.cy - cz) ? d : a)); const pal = DISTRITOS[near.idx].paleta;
      const cols = small ? 3 : 5, rows = small ? 2 : 3; const gx = (IW / 2 - lotX0 - 30) / cols, gz = (IH / 2 - lotZ0 - 30) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const bx = sx * (lotX0 + 15 + gx * (i + .5)), bz = cz0 + sz * (lotZ0 + 15 + gz * (j + .5));
        const b = building(sc, bx, bz, gx * rr(.68, .86), rr(20, 50) + (i + j) * 4, gz * rr(.68, .86), pal[(i * rows + j + ci) % pal.length], 0, pal[(i + 1) % pal.length], ['box', 'roof', 'awning', 'roof', 'L', 'box', 'roof', 'awning', 'tower'][(i * rows + j + ci) % 9], { windows: !small });
        this.props.colored.push(b); if ((i + j) % 2) this.props.tilt.push(b);
      }
      // prop temático do distrito na frente do lote, virado para a rua
      const names = MIOLO_POR_DISTRITO[near.idx]; STATIC = !['carousel', 'car', 'ambulance'].includes(names[0]);
      const pr = MIOLO[names[0]](sc, sx * (lotX0 - 2), cz0 + sz * (lotZ0 + 40), Math.atan2(-sx, 0), near.idx === 5 ? 0xFF6B57 : near.idx === 6 ? 0xFF3FA4 : undefined); this.props.miolo.push(pr); this.props.colored.push(pr); STATIC = true;
    });
    // --- árvores e postes alinhados às calçadas (alternados), e árvores ao redor da praça
    this.props.lamps = [];
    const lampAt = (x, z) => { const lp = lamp(sc, x, z); lp.userData.phase = rnd() * 6.28; lp.userData.rate = 1.5 + rnd() * 2; this.props.lamps.push(lp); this.props.tilt.push(lp); };
    const edge = RW / 2 + SW + 6;
    for (let k = plazaR + 30; k < IW / 2 - 20; k += 52) { const idx = Math.round(k / 52) % 2; for (const s of [1, -1]) { for (const side of [1, -1]) { if (idx) this.props.tilt.push(tree(sc, s * k, cz0 + side * edge, .7)); else if (side === 1) lampAt(s * k, cz0 + side * edge); } } }
    for (let k = plazaR + 30; k < IH / 2 - 20; k += 52) { const idx = Math.round(k / 52) % 2; for (const s of [1, -1]) { for (const side of [1, -1]) { if (idx) this.props.tilt.push(tree(sc, side * edge, cz0 + s * k, .7)); else if (side === 1) lampAt(side * edge, cz0 + s * k); } } }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; if (Math.abs(Math.cos(a)) < .5 || Math.abs(Math.sin(a)) < .5) continue; this.props.tilt.push(tree(sc, Math.cos(a) * (plazaR - 14), cz0 + Math.sin(a) * (plazaR - 14), .65)); MIOLO.bench(sc, Math.cos(a) * (plazaR - 34), cz0 + Math.sin(a) * (plazaR - 34), -a + Math.PI / 2); }
    // --- carros circulando nas ruas (cada um numa faixa), desviando da praça
    STATIC = false; this.props.cars = [];
    const carCols = [0x4FC3F7, 0xFF6B57, 0xF5C542, 0x7BE495, 0xB48CFF];
    for (let i = 0; i < (small ? 3 : 5); i++) { const horiz = i % 2 === 0; const lane = (i % 4 < 2 ? 1 : -1) * 8; const car = MIOLO.car(sc, 0, 0, 0, carCols[i]); car.scale.setScalar(.8); car.userData.car = { horiz, lane, len: (horiz ? IW : IH) * .46, speed: .3 + i * .1, phase: i * 1.3, minR: plazaR + 14 }; this.props.cars.push(car); this.props.colored.push(car); }
    STATIC = false;
  }
  /* todas as janelas dos prédios em UM InstancedMesh; a cor por instância muda com o estágio */
  makeWindows() {
    if (this.windows) { this.scene.remove(this.windows); }
    const n = WINDOWS.length; if (!n) return;
    const geo = g('PlaneGeometry', 6, 8); const mat = new T.MeshBasicMaterial({ color: 0xFFFFFF, side: T.DoubleSide });
    const im = new T.InstancedMesh(geo, mat, n); const M = new T.Matrix4();
    WINDOWS.forEach((w, i) => { w.gr.updateWorldMatrix(true, false); M.multiplyMatrices(w.gr.matrixWorld, w.local); im.setMatrixAt(i, M); });
    im.instanceMatrix.needsUpdate = true; this.windows = im; this.windowSeeds = WINDOWS.map((w) => w.r); this.scene.add(im);
  }
  colorWindows(stage) {
    const im = this.windows; if (!im) return;
    const lit = [0, .12, .5, .75][stage]; const day = lin(0xBFE9FF), dark = lin(stage >= 2 ? 0x2A2440 : 0x8FB4C9), on = lin(0xFFD23F), warm = lin(0xFFF1B8);
    this.windowSeeds.forEach((r, i) => im.setColorAt(i, r < lit ? (r < lit * .5 ? on : warm) : stage === 0 ? day : dark));
    im.instanceColor.needsUpdate = true;
  }
  makeDistrict(d, di) {
    const D = DISTRITOS[di]; const cells = this.S.board.cells.slice(d.from, d.to + 1); const sc = this.scene;
    cells.forEach((c, i) => {
      const { ix, iz } = this.inward(c); const ox = -ix, oz = -iz; // para fora
      const dist = 95 + rr(0, 30); const h = rr(D.alturas[0], D.alturas[1]) * (this.S.board.H < 600 ? .85 : 1);
      const col = D.paleta[i % D.paleta.length]; const st = STYLES[(i + di) % STYLES.length];
      const b = building(sc, c.x + ox * dist, c.y + oz * dist, rr(34, 48), h * (st === 'tower' ? 1.5 : 1), rr(30, 44), col, -c.ang + rr(-.1, .1), D.paleta[(i + 1) % D.paleta.length], st);
      this.props.colored.push(b); if (i % 3 === 0) this.props.tilt.push(b); if (b.userData.blink) this.props.miolo.push(b);
      if (di === 2 && i % 2 === 0) { const neon = mesh(g('BoxGeometry', 1, 1, 1), m(0x2BC4B6, { emissive: 0x2BC4B6, ei: 1.2 }), 0, h + 1, 0, b); neon.scale.set(40, 2, 36); }
      if (i % 4 === 2) { const sign = mesh(g('PlaneGeometry', 40, 15), new T.MeshBasicMaterial({ map: signTex('FALÊNCIA', '#E53935'), transparent: true }), 0, h * .5, 24, b); sign.visible = false; this.props.signs.push(sign); }
      if (i % 3 === 1) { const s = mesh(g('SphereGeometry', 6, 8, 6), m(0x4A4F55, { opacity: .55 }), 0, h + 6, 0, b); s.visible = false; s.userData.base = h + 6; s.userData.phase = rnd() * 6; this.props.smoke.push(s); }
      // segunda fileira (todas as casas) e terceira (alternada, sem janelas: LOD) para densidade urbana
      const b2 = building(sc, c.x + ox * (dist + 72) + rr(-8, 8), c.y + oz * (dist + 72) + rr(-8, 8), rr(36, 58), h * rr(.9, 1.5), rr(34, 50), D.paleta[(i + 2) % D.paleta.length], -c.ang + rr(-.15, .15), 0x4A4F55, STYLES[(i * 3 + di) % STYLES.length]); this.props.colored.push(b2);
      if (i % 2 === 0) { const b3 = building(sc, c.x + ox * (dist + 145), c.y + oz * (dist + 145), rr(44, 70), h * rr(1.2, 2.2), rr(40, 60), D.paleta[(i + 3) % D.paleta.length], -c.ang, 0x4A4F55, 'box', { windows: false }); this.props.colored.push(b3); }
    });
    // hero prop no centro do distrito, atrás dos prédios
    const cx = d.cx, cz = d.cy; const len = Math.hypot(cx, cz) || 1; const ox = cx / len, oz = cz / len;
    const hero = HEROES[di](sc); hero.position.set(cx + ox * 250, 0, cz + oz * 250); hero.rotation.y = Math.atan2(-ox, -oz); hero.scale.setScalar(1.35); this.props.heroes[di] = hero;
    // prédio-marco do distrito: torre alta atrás da placa
    const tw = rr(56, 70); const marco = building(sc, cx + ox * 190 + oz * 90, cz + oz * 190 - ox * 90, tw, rr(230, 300), tw, D.paleta[0], Math.atan2(-ox, -oz), D.cor, 'tower'); this.props.colored.push(marco); this.props.miolo.push(marco);
    // placa do distrito
    const tex = signTex(D.nome.toUpperCase(), '#' + D.cor.toString(16).padStart(6, '0'));
    const sign = mesh(g('PlaneGeometry', 90, 34), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }), cx + ox * 60, 52, cz + oz * 60, sc); sign.rotation.y = Math.atan2(-ox, -oz); mesh(g('CylinderGeometry', 1.5, 1.5, 40, 6), m(0x4A4F55), cx + ox * 60, 20, cz + oz * 60, sc); this.props.tilt.push(sign);
  }

  /* ---------- estado visual das casas ---------- */
  updateCells(state) {
    state.board.cells.forEach((c) => {
      if (c.type !== 'negocio') return; const n = state.negocios[c.negocioId]; const t = this.tiles[c.id];
      const dono = n.dono ? state.players.find((p) => p.id === n.dono) : null;
      t.owner.visible = !!dono; if (dono) { t.ownerMat.color = lin(dono.cor); t.ownerMat.emissive = lin(dono.cor); }
      t.lock.visible = !!n.fechado; t.top.color = lin(n.fechado ? 0x9AA0A6 : 0xFFFFFF);
    });
  }
  pulse(cellId) { this.tiles[cellId].pulse = 1; }

  /* ---------- peões ---------- */
  cellWorld(cellId, playerId) {
    const c = this.S.board.cells[cellId]; const v = new T.Vector3(c.x, 4, c.y);
    if (playerId) { // agrupamento na casa
      const grp = this.S.players.filter((q) => q.posicao === cellId && !q.eliminado); const k = grp.findIndex((q) => q.id === playerId), n = grp.length;
      if (n > 1) { const a = (k / n) * Math.PI * 2; v.x += Math.cos(a) * 16; v.z += Math.sin(a) * 16; }
    }
    return v;
  }
  place(playerId, cellId) { const pw = this.pawns[playerId]; pw.pos.copy(this.cellWorld(cellId, playerId)); }
  placeAll() { this.S.players.forEach((p) => this.place(p.id, p.posicao)); }
  hop(playerId, toCell, ms) {
    return new Promise((resolve) => {
      const pw = this.pawns[playerId]; const from = pw.pos.clone(), to = this.cellWorld(toCell, playerId); const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 2); pw.pos.lerpVectors(from, to, e); pw.hop = Math.sin(Math.PI * k); pw.lift = pw.hop * 20; if (k < 1) requestAnimationFrame(step); else { pw.hop = 0; pw.lift = 0; pw.pos.copy(to); resolve(); } };
      requestAnimationFrame(step);
    });
  }
  pawnWorld(playerId) { const pw = this.pawns[playerId]; const cur = this.ui.current && this.ui.S ? this.ui.current() : null; return pw ? pw.pos.clone().setY(pw.pos.y + pw.lift + (cur && cur.id === playerId ? 56 : 36)) : new T.Vector3(); }

  /* ---------- câmera ---------- */
  focusPlayer(p, instant) {
    const pw = this.pawns[p.id]; if (!pw) return; this.follow = p.id; this.allView = false;
    const c = this.S.board.cells[p.posicao]; const { ix, iz } = this.inward(c);
    const pos = pw.pos.clone();
    const narrow = this.W < this.H;
    const dist = narrow ? 220 : 245, h = narrow ? 150 : 132;
    const tx = Math.cos(c.ang), tz = Math.sin(c.ang); // direção de avanço no loop
    // câmera BAIXA, por dentro do loop, atrás e um pouco ao lado do peão, olhando ao longo do trajeto e ligeiramente para cima:
    // peão grande em primeiro plano, casa em jogo à frente, prédios do distrito se erguendo ao fundo
    this.camTargetPos.set(pos.x + ix * dist * .5 - tx * dist * .85, h, pos.z + iz * dist * .5 - tz * dist * .85);
    this.camTargetLook.set(pos.x + tx * 140 - ix * 36, 30, pos.z + tz * 140 - iz * 36);
    if (instant) { this.camPos.copy(this.camTargetPos); this.camLook.copy(this.camTargetLook); }
  }
  focusAll(instant) { this.allView = true; const narrow = this.W < this.H; this.camTargetPos.set(0, narrow ? 2100 : 1150, narrow ? 1000 : 900); this.camTargetLook.set(0, 0, -40); if (instant) { this.camPos.copy(this.camTargetPos); this.camLook.copy(this.camTargetLook); } }
  project(v) { const p = v.clone().project(this.cam); return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H, behind: p.z > 1 }; }
  onClick(e) {
    const r = this.canvas.getBoundingClientRect(); this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.cam);
    const hits = this.raycaster.intersectObjects(Object.values(this.tiles).map((t) => t.box));
    if (hits.length && this.ui.cellInfo) this.ui.cellInfo(this.S.board.cells[hits[0].object.userData.cellId]);
  }

  /* ---------- dado 3D ---------- */
  dice(playerId, value) {
    return new Promise((resolve) => {
      const faces = [1, 6, 2, 5, 3, 4].map((n) => new T.MeshStandardMaterial({ map: diceFace(n), roughness: .6 }));
      // face +z (índice 4) mostra o valor
      faces[4] = new T.MeshStandardMaterial({ map: diceFace(value), roughness: .6 });
      const d = new T.Mesh(g('BoxGeometry', 16, 16, 16), faces); this.scene.add(d);
      const base = this.pawnWorld(playerId); const t0 = performance.now(); const av = new T.Vector3(rr(6, 10), rr(6, 10), rr(4, 8));
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 900);
        d.position.set(base.x, base.y + 30 + Math.sin(k * Math.PI) * 40 - k * 20, base.z + 10);
        if (k < .8) d.rotation.set(av.x * k * 2, av.y * k * 2, av.z * k * 2); else { d.lookAt(this.cam.position); }
        if (k < 1) requestAnimationFrame(step); else { setTimeout(() => { this.scene.remove(d); resolve(); }, 550); }
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- declínio progressivo ---------- */
  setStage(s) {
    this.stage = s;
    const sky = lin(SKY[s]); this.scene.background = sky; this.scene.fog.color = sky; this.scene.fog.near = [900, 850, 800, 750][s]; this.scene.fog.far = [2600, 2400, 2200, 2000][s];
    this.groundMat.color = lin(GROUND[s]); if (this.grassMat) this.grassMat.color = lin([0x6CC04A, 0x7FAA4A, 0x8A8A55, 0x5C5A4A][s]); this.plateMat.color = lin([0xE9DDC6, 0xD9CDB6, 0xBDB39E, 0x8F8878][s]);
    this.hemi.intensity = [.85, .75, .6, .5][s]; this.sun.intensity = [.9, .8, .65, .55][s]; this.sun.color = lin([0xFFFFFF, 0xFFE9C8, 0xD9C6FF, 0x9A8CB0][s]);
    const gray = new T.Color(0x6E6A72);
    this.props.colored.forEach((o) => o.traverse((c) => { if (c.material && c.material.color && !c.material.map) { if (!c.userData.base0) c.userData.base0 = c.material.color.clone(); if (!c.userData.own) { c.material = c.material.clone(); c.userData.own = true; } c.material.color.copy(c.userData.base0).lerp(gray, s * .22); } }));
    this.props.cracks.forEach((set, i) => set.forEach((c) => (c.visible = s > i)));
    this.props.trash.forEach((t, i) => (t.visible = s >= 2 && (s === 3 || i % 2 === 0)));
    this.props.signs.forEach((x, i) => (x.visible = s >= 2 && (s === 3 || i % 2 === 0)));
    this.props.smoke.forEach((x) => (x.visible = s >= 2));
    this.props.tilt.forEach((o, i) => { o.rotation.z = (i % 2 ? 1 : -1) * [0, .05, .11, .2][s] * (1 + (i % 3) * .3); });
    this.colorWindows(s); SI.refresh(s);
    if (this.props.fountain) { const w = this.props.fountain.userData.water; if (w) w.material = w.material.clone(), w.material.color = lin([0x4FC3F7, 0x5BB3D8, 0x6E9A8C, 0x6B7A5A][s]), w.material.emissiveIntensity = [.25, .15, .05, 0][s]; }
  }

  /* ---------- loop ---------- */
  loop(t) {
    if (!this.running) return; const dt = this.time ? Math.min(.05, (t - this.time) / 1000) : .016; this.time = t; const ts = t / 1000;
    // câmera suave
    this.camPos.lerp(this.camTargetPos, .06); this.camLook.lerp(this.camTargetLook, .08);
    this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook);
    // peões
    const cur = this.ui.current && this.ui.S ? this.ui.current() : null;
    for (const p of this.S ? this.S.players : []) {
      const pw = this.pawns[p.id]; const isCur = cur && cur.id === p.id;
      pw.root.position.copy(pw.pos); const SC = isCur ? 54 : 34; pw.root.scale.setScalar(SC);
      // vira o boneco para a câmera (mantém o rosto visível)
      pw.root.rotation.y = Math.atan2(this.cam.position.x - pw.pos.x, this.cam.position.z - pw.pos.z);
      pw.lo.visible = !isCur; pw.hi.visible = !!isCur; pw.ring.visible = !!isCur && !p.eliminado;
      const actC = isCur ? pw.hiC : pw.loC; const act = actC.group; act.position.y = pw.lift / SC; actC.update(ts + pw.phase, dt); act.scale.set(1 - pw.hop * .15, 1 + pw.hop * .25, 1 - pw.hop * .15);
      pw.sh.scale.setScalar(1 - pw.hop * .35);
      if (p.eliminado && !pw.faded) { pw.faded = true; pw.root.traverse((o) => { if (o.material && !o.userData.f) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .3; o.userData.f = 1; } }); }
      if (p.eliminado) act.rotation.z = Math.PI / 2; // caído
    }
    // legibilidade: se a câmera está do lado de fora da casa, vira o topo 180° (texto nunca fica de cabeça para baixo)
    // etiquetas: as mais próximas da câmera ficam um pouco maiores; a da casa do peão ativo em destaque
    for (const id in this.tiles) { const tl = this.tiles[id]; const d = Math.hypot(this.cam.position.x - tl.cx, this.cam.position.z - tl.cz); const ativa = cur && cur.posicao == id; const k = ativa ? 1.2 : Math.max(.7, Math.min(1, 280 / Math.max(140, d))); tl.label.position.y = ativa ? 46 : 4; tl.label.scale.set(56 * k, 22.4 * k, 1); tl.label.material.opacity = this.allView ? 1 : ativa ? 1 : Math.max(0, Math.min(1, (620 - d) / 260)); tl.label.visible = tl.label.material.opacity > .02; }
    // pulsos de casa
    for (const id in this.tiles) { const tl = this.tiles[id]; if (tl.pulse > 0) { tl.pulse = Math.max(0, tl.pulse - dt * 1.6); const s = 1 + Math.sin(tl.pulse * Math.PI) * .12; tl.grp.scale.set(s, 1 + (s - 1) * 4, s); } }
    // cenário vivo
    const H = this.props.heroes; if (H[3]) H[3].userData.wheel.rotation.z += dt * [.5, .35, .15, 0][this.stage]; if (H[2]) H[2].userData.orb.material.emissiveIntensity = 1 + Math.sin(ts * 3) * .6; if (H[5]) { const car = H[5].userData.car; car.position.x = Math.sin(ts * .7) * 70; car.rotation.y = Math.cos(ts * .7) > 0 ? 0 : Math.PI; }
    const spd = [1, .8, .45, 0][this.stage];
    (this.props.cars || []).forEach((car) => { const u = car.userData.car; const k = Math.sin(ts * u.speed * spd + u.phase); const along = k * u.len; const dir = Math.cos(ts * u.speed * spd + u.phase) >= 0 ? 1 : -1; car.visible = Math.abs(along) > (u.minR || 0); if (u.horiz) { car.position.set(along, 0, (this.props.cz0 || 0) + u.lane); car.rotation.y = dir > 0 ? 0 : Math.PI; } else { car.position.set(u.lane, 0, (this.props.cz0 || 0) + along); car.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; } });
    (this.props.ripples || []).forEach((rp) => { const k = ((ts * .35 + rp.userData.phase) % 1); const R = 12 + k * 24; rp.scale.set(R, R, 1); rp.material.opacity = this.stage >= 3 ? 0 : (1 - k) * .55; });
    (this.props.lamps || []).forEach((lp) => { const bulb = lp.userData.bulb; const on = this.stage >= 3 ? Math.sin(ts * lp.userData.rate * 2 + lp.userData.phase) > -.2 && Math.random() > .05 : Math.sin(ts * lp.userData.rate + lp.userData.phase) > -.6; bulb.material.emissiveIntensity = on ? .9 : .05; });
    if (this.props.heroes.miolo) this.props.heroes.miolo.userData.wheel.rotation.z += dt * [.5, .35, .15, 0][this.stage];
    (this.props.miolo || []).forEach((o) => { const u = o.userData; if (u.spin) u.spin.rotation.y += dt * [.8, .6, .3, 0][this.stage]; if (u.jet) { u.jet.position.y = 38 + Math.sin(ts * 4) * 3; u.jet.scale.setScalar(1 + Math.sin(ts * 4) * .2); } if (u.blink) u.blink.visible = Math.sin(ts * 5 + (u.blink.userData.blink || 0)) > 0; if (u.bulbs) u.bulbs.forEach((b, i) => (b.visible = Math.sin(ts * 6 + i) > -.3)); if (u.lights) { const ph = Math.floor((ts * .6 + u.phase) % 3); u.lights.forEach((l, i) => (l.visible = i === ph)); } });
    this.props.smoke.forEach((s) => { if (!s.visible) return; const k = ((ts * .4 + s.userData.phase) % 1); s.position.y = s.userData.base + k * 60; s.scale.setScalar(.6 + k * 1.6); s.material.opacity = .55 * (1 - k); });
    this.renderer.render(this.scene, this.cam);
    if (this.ui.repositionAll) this.ui.repositionAll();
    requestAnimationFrame(this.loop);
  }
}
global.CaosBoard3D = { Board3D, DISTRITOS };
})(window);
