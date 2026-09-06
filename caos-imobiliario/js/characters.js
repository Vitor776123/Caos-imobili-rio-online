/* =====================================================================
   CAOS IMOBILIÁRIO — PERSONAGENS 3D (Three.js, só primitivas)
   ---------------------------------------------------------------------
   CaosChars.LIST                       -> os 12 (id, nome, emoji, cor, desc)
   CaosChars.build(id, detail)          -> { group, update(t, dt) }  detail: 'high'|'low'
   CaosChars.thumbnail(id, size)        -> dataURL (cache)
   new CaosChars.Viewer(canvas)         -> visualizador com arrasto (seleção)
   new CaosChars.PawnLayer(container, cb) -> camada WebGL sobre o tabuleiro
   Personagem: ~1 unidade de altura, pés em y=0, olhando para +z.
   ===================================================================== */
(function (global) {
'use strict';
const THREE = global.THREE;
if (!THREE) { global.CaosChars = null; return; }

const C = {
  ink: 0x1A0F26, cream: 0xFFF4E0, white: 0xFFFFFF, mustard: 0xF5C542, coral: 0xFF6B57, teal: 0x2BC4B6, lilac: 0xB48CFF,
  mint: 0x7BE495, brown: 0x9A6A3A, tan: 0xE8B98A, gray: 0x8E8E9E, rust: 0xB5552B, gold: 0xFFD54F, pink: 0xF7A1C4,
  orange: 0xFF8C42, navy: 0x2E3A7A, peach: 0xF6C9A8, lavender: 0x8B7BB8, red: 0xE0392B, sky: 0x4FC3F7, green: 0x6CC04A,
};

const LIST = [
  { id: 'cachorro', nome: 'Cachorro Magnata',     emoji: '🐶', cor: '#9A6A3A', desc: 'Atarracado, monóculo e gravata borboleta torta.' },
  { id: 'gata',     nome: 'Gata Diva',            emoji: '🐱', cor: '#B48CFF', desc: 'Óculos escuros enormes e rabo empinado.' },
  { id: 'pato',     nome: 'Pato Executivo',       emoji: '🦆', cor: '#F5C542', desc: 'Terno mal ajambrado e gravata puxada.' },
  { id: 'vovo',     nome: 'Vovó Milionária',      emoji: '👵', cor: '#8B7BB8', desc: 'Óculos coloridos e pérolas gigantes.' },
  { id: 'cavaleiro', nome: 'Cavaleiro Falido',    emoji: '⚔️', cor: '#8E8E9E', desc: 'Armadura enferrujada, capacete torto.' },
  { id: 'coelho',   nome: 'Coelho Nervoso',       emoji: '🐰', cor: '#FFF4E0', desc: 'Treme sem parar, maleta apertada no peito.' },
  { id: 'raposa',   nome: 'Raposa Golpista',      emoji: '🦊', cor: '#FF8C42', desc: 'Sorriso malicioso e cauda enrolada.' },
  { id: 'urso',     nome: 'Urso Fisiculturista',  emoji: '🐻', cor: '#7A4B2A', desc: 'Corpanzil e uma cartola pequena demais.' },
  { id: 'coruja',   nome: 'Coruja Contadora',     emoji: '🦉', cor: '#2BC4B6', desc: 'Óculos redondos e calculadora grudada na asa.' },
  { id: 'porco',    nome: 'Porco Chique',         emoji: '🐷', cor: '#F7A1C4', desc: 'Corrente de ouro grossa e cara de satisfeito.' },
  { id: 'camaleao', nome: 'Camaleão Oportunista', emoji: '🦎', cor: '#6CC04A', desc: 'Muda de cor o tempo todo. Olhos que giram.' },
  { id: 'robo',     nome: 'Robô Retrô Vintage',   emoji: '🤖', cor: '#4FC3F7', desc: 'Quadradão, antena torta, luzinhas piscando.' },
];
const byId = (id) => LIST.find((c) => c.id === id) || LIST[0];

/* ---------- materiais toon compartilhados ---------- */
let gradient = null;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat); gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  return gradient;
}
const matCache = new Map();
function mat(color) {
  if (typeof color === 'object') return color; // material pronto
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() }));
  return matCache.get(color);
}
const geoCache = new Map();
function cached(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }

/* ---------- caixa arredondada (extrusão com bevel) ---------- */
function roundedBoxGeo(w, h, d, r, H) {
  const shape = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, d - 2 * r), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: H ? 3 : 1, curveSegments: H ? 4 : 2 });
  g.center(); return g;
}

/* ---------- kit de construção ---------- */
function kit(H) {
  const S = (r) => cached(`s${r}${H}`, () => new THREE.SphereGeometry(r, H ? 20 : 10, H ? 14 : 8));
  const CAP = (r, l) => cached(`c${r}_${l}${H}`, () => new THREE.CapsuleGeometry(r, l, H ? 6 : 2, H ? 14 : 8));
  const CONE = (r, h) => cached(`k${r}_${h}${H}`, () => new THREE.ConeGeometry(r, h, H ? 16 : 8));
  const CYL = (rt, rb, h) => cached(`y${rt}_${rb}_${h}${H}`, () => new THREE.CylinderGeometry(rt, rb, h, H ? 16 : 8));
  const TOR = (r, t, arc = Math.PI * 2) => cached(`t${r}_${t}_${arc}${H}`, () => new THREE.TorusGeometry(r, t, H ? 8 : 5, H ? 20 : 10, arc));
  const BOX = (w, h, d, r = 0.04) => cached(`b${w}_${h}_${d}_${r}${H}`, () => roundedBoxGeo(w, h, d, r, H));
  const M = (geom, color, o = {}) => {
    const m = new THREE.Mesh(geom, mat(color));
    if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]); if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s != null) { typeof o.s === 'number' ? m.scale.setScalar(o.s) : m.scale.set(o.s[0], o.s[1], o.s[2]); }
    return m;
  };
  /* olhos padrão: branco + pupila; dx = afastamento, y/z no espaço da cabeça */
  const EYES = (parent, { dx = 0.11, y = 0.02, z = 0.24, r = 0.07, pr = 0.035, white = C.white } = {}) => {
    const g = new THREE.Group(); g.name = 'eyes';
    [-1, 1].forEach((s) => { g.add(M(S(r), white, { p: [dx * s, y, z] })); g.add(M(S(pr), C.ink, { p: [dx * s, y, z + r * 0.75] })); });
    parent.add(g); return g;
  };
  const FEET = (parent, { dx = 0.13, r = 0.09, color = C.ink, z = 0.04 } = {}) => { [-1, 1].forEach((s) => parent.add(M(S(r), color, { p: [dx * s, r * 0.7, z], s: [1, 0.6, 1.2] }))); };
  return { S, CAP, CONE, CYL, TOR, BOX, M, EYES, FEET };
}

/* ---------- os 12 ---------- */
const BUILDERS = {
  cachorro(K, H) {
    const { S, CAP, CONE, CYL, TOR, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(CAP(0.24, 0.16), C.brown, { p: [0, 0.33, 0], s: [1.15, 1, 1] }));
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); g.add(head);
    head.add(M(S(0.31), C.brown)); head.add(M(S(0.17), C.tan, { p: [0, -0.08, 0.22], s: [1.2, 0.8, 1] }));
    head.add(M(S(0.06), C.ink, { p: [0, -0.03, 0.37] }));
    EYES(head, { dx: 0.12, y: 0.07, z: 0.25 });
    [-1, 1].forEach((s) => head.add(M(CAP(0.07, 0.2), C.rust, { p: [0.3 * s, 0.02, -0.02], r: [0, 0, s * 0.35] })));
    if (H) { head.add(M(TOR(0.09, 0.015), C.gold, { p: [0.13, 0.07, 0.3] })); head.add(M(CYL(0.008, 0.008, 0.25), C.gold, { p: [0.26, -0.06, 0.3], r: [0, 0, 0.4] })); }
    const bow = new THREE.Group(); bow.position.set(0, 0.5, 0.24); bow.rotation.z = 0.35; g.add(bow);
    [-1, 1].forEach((s) => bow.add(M(CONE(0.07, 0.14), C.coral, { p: [0.09 * s, 0, 0], r: [0, 0, s * Math.PI / 2] }))); bow.add(M(S(0.035), C.coral));
    g.add(M(CAP(0.04, 0.12), C.brown, { p: [0, 0.25, -0.24], r: [0.6, 0, 0] })); FEET(g, { color: C.rust });
    const ears = head.children.filter((m) => m.geometry === CAP(0.07, 0.2));
    return { group: g, update: (t) => { head.rotation.z = Math.sin(t * 1.5) * 0.04; ears.forEach((e, i) => (e.rotation.z = (i ? 1 : -1) * (0.35 + Math.sin(t * 2 + i) * 0.06))); } };
  },
  gata(K, H) {
    const { S, CAP, CONE, TOR, CYL, M, FEET } = K; const g = new THREE.Group();
    g.add(M(CAP(0.2, 0.18), C.lilac, { p: [0, 0.33, 0], s: [0.95, 1, 0.95] }));
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); g.add(head);
    head.add(M(S(0.3), C.lilac)); head.add(M(S(0.1), C.white, { p: [0, -0.1, 0.24], s: [1.4, 0.7, 1] }));
    head.add(M(S(0.03), C.pink, { p: [0, -0.06, 0.32] }));
    [-1, 1].forEach((s) => head.add(M(CONE(0.1, 0.22), C.lilac, { p: [0.18 * s, 0.28, -0.02], r: [0, 0, s * -0.3] })));
    // óculos escuros enormes
    const gl = new THREE.Group(); gl.position.set(0, 0.05, 0.26); head.add(gl);
    [-1, 1].forEach((s) => gl.add(M(S(0.13), C.ink, { p: [0.14 * s, 0, 0], s: [1, 0.8, 0.35] })));
    gl.add(M(CYL(0.015, 0.015, 0.08), C.ink, { r: [0, 0, Math.PI / 2] }));
    g.add(M(TOR(0.16, 0.03), C.mustard, { p: [0, 0.52, 0], r: [Math.PI / 2, 0, 0] })); if (H) g.add(M(S(0.04), C.gold, { p: [0, 0.5, 0.17] }));
    const tail = M(TOR(0.16, 0.035, Math.PI * 0.9), C.lilac, { p: [0.05, 0.32, -0.2], r: [0, Math.PI / 2, 0] }); g.add(tail);
    FEET(g, { color: C.lavender });
    return { group: g, update: (t) => { tail.rotation.x = Math.sin(t * 2.2) * 0.25; head.rotation.y = Math.sin(t * 0.7) * 0.15; } };
  },
  pato(K, H) {
    const { S, CAP, CONE, BOX, CYL, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(BOX(0.42, 0.36, 0.34, 0.08), C.navy, { p: [0, 0.32, 0] }));
    g.add(M(BOX(0.16, 0.3, 0.02, 0.01), C.white, { p: [0, 0.34, 0.17] }));
    const tie = M(CONE(0.045, 0.22), C.coral, { p: [0.07, 0.3, 0.19], r: [Math.PI, 0, 0.35] }); g.add(tie);
    [-1, 1].forEach((s) => g.add(M(CAP(0.05, 0.16), C.navy, { p: [0.25 * s, 0.32, 0], r: [0, 0, s * 0.3] })));
    const head = new THREE.Group(); head.position.set(0, 0.76, 0); g.add(head);
    head.add(M(S(0.28), C.mustard));
    head.add(M(BOX(0.22, 0.08, 0.2, 0.03), C.orange, { p: [0, -0.06, 0.32] }));
    EYES(head, { dx: 0.1, y: 0.07, z: 0.23, r: 0.065 });
    [-1, 1].forEach((s) => head.add(M(BOX(0.11, 0.025, 0.02, 0.01), C.ink, { p: [0.1 * s, 0.15, 0.26], r: [0, 0, s * -0.4] })));
    if (H) head.add(M(S(0.05), C.mustard, { p: [0.02, 0.28, -0.05], s: [1, 1.6, 1] }));
    FEET(g, { color: C.orange, dx: 0.14, r: 0.1 });
    return { group: g, update: (t) => { tie.rotation.z = 0.35 + Math.sin(t * 3) * 0.1; head.position.x = Math.sin(t * 6) * 0.008; } };
  },
  vovo(K, H) {
    const { S, CONE, TOR, CYL, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(CONE(0.28, 0.5), C.lavender, { p: [0, 0.3, 0] }));
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); g.add(head);
    head.add(M(S(0.28), C.peach)); head.add(M(S(0.3), C.gray, { p: [0, 0.06, -0.06], s: [1, 0.9, 0.9] }));
    head.add(M(S(0.14), C.gray, { p: [0, 0.32, -0.08] }));
    head.add(M(S(0.28), C.peach, { p: [0, -0.02, 0.05], s: [0.95, 0.9, 0.9] }));
    EYES(head, { dx: 0.1, y: 0.03, z: 0.25, r: 0.06 });
    head.add(M(TOR(0.09, 0.02), C.coral, { p: [-0.11, 0.03, 0.3] })); head.add(M(TOR(0.09, 0.02), C.sky, { p: [0.11, 0.03, 0.3] }));
    head.add(M(CYL(0.015, 0.015, 0.05), C.mustard, { p: [0, 0.03, 0.3], r: [0, 0, Math.PI / 2] }));
    const pearls = new THREE.Group(); pearls.position.set(0, 0.5, 0.02); g.add(pearls);
    const n = H ? 10 : 6; for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * Math.PI - Math.PI; pearls.add(M(S(0.05), C.cream, { p: [Math.cos(a) * 0.22, Math.sin(a) * 0.12 - 0.02, Math.abs(Math.sin(a)) * 0.2 + 0.05] })); }
    if (H) head.add(M(S(0.045), C.coral, { p: [0, -0.12, 0.27], s: [1.6, 0.7, 1] }));
    FEET(g, { color: C.ink, r: 0.07 });
    return { group: g, update: (t) => { head.rotation.z = Math.sin(t * 1.3) * 0.05; g.rotation.y = Math.sin(t * 0.8) * 0.08; } };
  },
  cavaleiro(K, H) {
    const { S, CAP, CONE, CYL, BOX, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(CAP(0.22, 0.16), C.gray, { p: [0, 0.33, 0] })); g.add(M(S(0.07), C.rust, { p: [0.14, 0.3, 0.17] })); g.add(M(S(0.05), C.rust, { p: [-0.1, 0.42, 0.18] }));
    [-1, 1].forEach((s) => g.add(M(S(0.1), C.gray, { p: [0.26 * s, 0.46, 0] })));
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); g.add(head);
    head.add(M(S(0.28), C.peach));
    const helm = new THREE.Group(); helm.rotation.z = 0.28; helm.position.set(0.02, 0.14, 0); head.add(helm);
    helm.add(M(CYL(0.3, 0.3, 0.22), C.gray, { p: [0, 0.06, 0] })); helm.add(M(S(0.3), C.gray, { p: [0, 0.14, 0], s: [1, 0.7, 1] }));
    helm.add(M(BOX(0.5, 0.06, 0.12, 0.02), C.rust, { p: [0, -0.04, 0.26] }));
    helm.add(M(CONE(0.05, 0.28), C.coral, { p: [0, 0.48, -0.02], r: [-0.4, 0, 0] }));
    EYES(head, { dx: 0.1, y: -0.02, z: 0.24, r: 0.06 });
    if (H) { g.add(M(BOX(0.05, 0.5, 0.03, 0.01), C.gray, { p: [0.36, 0.45, 0.1], r: [0, 0, 0.5] })); g.add(M(BOX(0.16, 0.04, 0.05, 0.01), C.gold, { p: [0.28, 0.32, 0.1], r: [0, 0, 0.5] })); }
    FEET(g, { color: C.gray, r: 0.09 });
    return { group: g, update: (t) => { helm.rotation.z = 0.28 + Math.sin(t * 1.7) * 0.05; g.position.x = Math.sin(t * 1.1) * 0.01; } };
  },
  coelho(K, H) {
    const { S, CAP, BOX, CYL, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(CAP(0.2, 0.16), C.cream, { p: [0, 0.32, 0] }));
    const head = new THREE.Group(); head.position.set(0, 0.72, 0); g.add(head);
    head.add(M(S(0.29), C.cream)); head.add(M(S(0.04), C.pink, { p: [0, -0.04, 0.28] }));
    EYES(head, { dx: 0.11, y: 0.05, z: 0.24, r: 0.075, pr: 0.045 });
    const ears = [-1, 1].map((s) => { const e = M(CAP(0.06, 0.34), C.cream, { p: [0.16 * s, 0.2, -0.05], r: [0.5, 0, s * 1.3] }); head.add(e); return e; });
    ears.forEach((e) => e.add(M(CAP(0.03, 0.26), C.pink, { p: [0, 0, 0.035] })));
    const briefcase = M(BOX(0.28, 0.2, 0.08, 0.02), C.rust, { p: [0, 0.34, 0.24] }); g.add(briefcase);
    if (H) briefcase.add(M(CYL(0.015, 0.015, 0.1), C.ink, { p: [0, 0.12, 0], r: [0, 0, Math.PI / 2] }));
    [-1, 1].forEach((s) => g.add(M(CAP(0.05, 0.12), C.cream, { p: [0.2 * s, 0.36, 0.12], r: [1.2, 0, s * -0.6] })));
    if (H) [-1, 1].forEach((s) => head.add(M(BOX(0.1, 0.02, 0.02, 0.005), C.ink, { p: [0.11 * s, 0.14, 0.26], r: [0, 0, s * 0.5] })));
    FEET(g, { color: C.cream, r: 0.1 });
    return { group: g, update: (t) => { const j = () => (Math.random() - 0.5) * 0.02; g.position.x = j(); g.position.z = j(); head.rotation.z = Math.sin(t * 25) * 0.03; ears.forEach((e, i) => (e.rotation.x = 0.5 + Math.sin(t * 20 + i) * 0.05)); } };
  },
  raposa(K, H) {
    const { S, CAP, CONE, TOR, BOX, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(CAP(0.19, 0.2), C.orange, { p: [0, 0.34, 0] })); g.add(M(S(0.14), C.cream, { p: [0, 0.3, 0.12], s: [1, 1.3, 0.6] }));
    const head = new THREE.Group(); head.position.set(0, 0.76, 0); g.add(head);
    head.add(M(S(0.29), C.orange)); head.add(M(CONE(0.16, 0.3), C.cream, { p: [0, -0.08, 0.22], r: [Math.PI / 2 + 0.3, 0, 0] }));
    head.add(M(S(0.045), C.ink, { p: [0, -0.02, 0.4] }));
    [-1, 1].forEach((s) => head.add(M(CONE(0.1, 0.26), C.orange, { p: [0.19 * s, 0.28, -0.03], r: [0, 0, s * -0.25] })));
    EYES(head, { dx: 0.11, y: 0.07, z: 0.25, r: 0.065, pr: 0.03 });
    [-1, 1].forEach((s) => head.add(M(BOX(0.12, 0.025, 0.02, 0.005), C.ink, { p: [0.11 * s, 0.15, 0.27], r: [0, 0, s * -0.55] })));
    head.add(M(TOR(0.08, 0.018, Math.PI), C.ink, { p: [0.06, -0.14, 0.36], r: [0, 0, Math.PI + 0.3] }));
    const tail = M(TOR(0.17, 0.06, Math.PI * 1.5), C.orange, { p: [0.1, 0.3, -0.22], r: [0, Math.PI / 2, 0.3] }); g.add(tail);
    if (H) tail.add(M(S(0.07), C.cream, { p: [0.17, 0, 0] }));
    if (H) g.add(M(TOR(0.15, 0.025), C.gold, { p: [0, 0.54, 0], r: [Math.PI / 2, 0, 0] }));
    FEET(g, { color: C.ink, r: 0.08 });
    return { group: g, update: (t) => { tail.rotation.y = Math.PI / 2 + Math.sin(t * 1.6) * 0.3; head.rotation.y = Math.sin(t * 0.9) * 0.12; } };
  },
  urso(K, H) {
    const { S, CAP, CYL, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(S(0.34), C.brown, { p: [0, 0.4, 0], s: [1.15, 1, 0.95] })); g.add(M(S(0.18), C.tan, { p: [0, 0.36, 0.24], s: [1, 1.1, 0.6] }));
    [-1, 1].forEach((s) => { g.add(M(CAP(0.11, 0.16), C.brown, { p: [0.42 * s, 0.5, 0.02], r: [0, 0, s * -1.1] })); g.add(M(S(0.1), C.brown, { p: [0.5 * s, 0.68, 0.06] })); });
    const head = new THREE.Group(); head.position.set(0, 0.86, 0); g.add(head);
    head.add(M(S(0.27), C.brown)); head.add(M(S(0.13), C.tan, { p: [0, -0.07, 0.2], s: [1.2, 0.8, 1] })); head.add(M(S(0.05), C.ink, { p: [0, -0.03, 0.31] }));
    [-1, 1].forEach((s) => head.add(M(S(0.08), C.brown, { p: [0.2 * s, 0.2, -0.02] })));
    EYES(head, { dx: 0.1, y: 0.06, z: 0.22, r: 0.05, pr: 0.03 });
    const hat = new THREE.Group(); hat.position.set(0.04, 0.26, 0); hat.rotation.z = -0.2; head.add(hat);
    hat.add(M(CYL(0.13, 0.13, 0.02), C.ink)); hat.add(M(CYL(0.09, 0.09, 0.16), C.ink, { p: [0, 0.08, 0] })); if (H) hat.add(M(CYL(0.095, 0.095, 0.03), C.coral, { p: [0, 0.03, 0] }));
    FEET(g, { color: C.ink, dx: 0.18, r: 0.11 });
    return { group: g, update: (t) => { g.scale.y = 1 + Math.sin(t * 1.4) * 0.015; head.rotation.z = Math.sin(t * 1.2) * 0.03; } };
  },
  coruja(K, H) {
    const { S, CAP, CONE, TOR, BOX, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(S(0.3), C.teal, { p: [0, 0.4, 0], s: [1, 1.15, 0.95] })); g.add(M(S(0.2), C.cream, { p: [0, 0.34, 0.16], s: [1, 1.1, 0.5] }));
    const head = new THREE.Group(); head.position.set(0, 0.8, 0); g.add(head);
    head.add(M(S(0.3), C.teal, { s: [1.05, 0.9, 1] })); head.add(M(CONE(0.05, 0.12), C.orange, { p: [0, -0.06, 0.3], r: [Math.PI / 2, 0, 0] }));
    EYES(head, { dx: 0.12, y: 0.04, z: 0.24, r: 0.09, pr: 0.05 });
    [-1, 1].forEach((s) => head.add(M(TOR(0.11, 0.02), C.mustard, { p: [0.12 * s, 0.04, 0.3] })));
    [-1, 1].forEach((s) => head.add(M(CONE(0.06, 0.14), C.teal, { p: [0.2 * s, 0.26, 0], r: [0, 0, s * -0.4] })));
    const wing = M(CAP(0.07, 0.22), C.teal, { p: [-0.28, 0.42, 0.06], r: [0.3, 0, -0.5] }); g.add(wing);
    g.add(M(CAP(0.07, 0.22), C.teal, { p: [0.28, 0.42, 0], r: [0, 0, 0.4] }));
    const calc = M(BOX(0.16, 0.22, 0.04, 0.015), C.gray, { p: [-0.32, 0.3, 0.2], r: [0, 0.4, 0] }); g.add(calc);
    if (H) { calc.add(M(BOX(0.12, 0.05, 0.01, 0.005), C.mint, { p: [0, 0.07, 0.025] })); for (let i = 0; i < 6; i++) calc.add(M(S(0.014), C.ink, { p: [-0.04 + (i % 3) * 0.04, -0.02 - Math.floor(i / 3) * 0.05, 0.025] })); }
    FEET(g, { color: C.orange, r: 0.07 });
    return { group: g, update: (t) => { head.rotation.y = Math.sin(t * 0.6) * 0.5; wing.rotation.z = -0.5 + Math.sin(t * 8) * 0.03; } };
  },
  porco(K, H) {
    const { S, CAP, CYL, TOR, M, EYES, FEET } = K; const g = new THREE.Group();
    g.add(M(S(0.3), C.pink, { p: [0, 0.36, 0], s: [1.1, 0.95, 1] }));
    const head = new THREE.Group(); head.position.set(0, 0.76, 0); g.add(head);
    head.add(M(S(0.3), C.pink)); head.add(M(CYL(0.11, 0.12, 0.1), C.coral, { p: [0, -0.04, 0.3], r: [Math.PI / 2, 0, 0] }));
    [-1, 1].forEach((s) => head.add(M(S(0.025), C.ink, { p: [0.045 * s, -0.04, 0.35] })));
    [-1, 1].forEach((s) => head.add(M(S(0.09), C.pink, { p: [0.22 * s, 0.24, -0.02], s: [1, 1.2, 0.5] })));
    // olhos satisfeitos (fechados)
    [-1, 1].forEach((s) => head.add(M(TOR(0.06, 0.015, Math.PI), C.ink, { p: [0.12 * s, 0.08, 0.27] })));
    const chain = M(TOR(0.24, 0.035), C.gold, { p: [0, 0.54, 0.04], r: [Math.PI / 2 + 0.5, 0, 0] }); g.add(chain);
    g.add(M(CYL(0.09, 0.09, 0.03), C.gold, { p: [0, 0.4, 0.3], r: [Math.PI / 2 + 0.3, 0, 0] }));
    if (H) g.add(M(CYL(0.05, 0.05, 0.035), C.mustard, { p: [0, 0.4, 0.31], r: [Math.PI / 2 + 0.3, 0, 0] }));
    g.add(M(TOR(0.05, 0.02, Math.PI * 1.5), C.pink, { p: [0, 0.3, -0.3], r: [0, 0, 0.8] }));
    FEET(g, { color: C.coral, r: 0.09 });
    return { group: g, update: (t) => { g.scale.setScalar(1 + Math.sin(t * 1.3) * 0.012); head.rotation.z = Math.sin(t) * 0.05; } };
  },
  camaleao(K, H) {
    const { S, CAP, CONE, TOR, CYL, M, FEET } = K; const g = new THREE.Group();
    const skin = new THREE.MeshToonMaterial({ color: C.green, gradientMap: gradientMap() });
    g.add(M(CAP(0.19, 0.18), skin, { p: [0, 0.33, 0] }));
    const head = new THREE.Group(); head.position.set(0, 0.74, 0); g.add(head);
    head.add(M(S(0.28), skin, { s: [1, 0.9, 1.05] })); head.add(M(CONE(0.17, 0.22), skin, { p: [0, 0.2, -0.12], r: [-0.6, 0, 0] }));
    head.add(M(TOR(0.09, 0.015, Math.PI), C.ink, { p: [0, -0.08, 0.26], r: [0, 0, Math.PI] }));
    const eyes = [-1, 1].map((s) => { const e = new THREE.Group(); e.position.set(0.19 * s, 0.08, 0.16); head.add(e); e.add(M(CONE(0.1, 0.12), skin, { r: [Math.PI / 2, 0, 0] })); e.add(M(S(0.075), C.mustard, { p: [0, 0, 0.06] })); e.add(M(S(0.035), C.ink, { p: [0, 0, 0.13] })); return e; });
    g.add(M(TOR(0.13, 0.045, Math.PI * 1.7), skin, { p: [0.02, 0.28, -0.24], r: [0, Math.PI / 2, 0] }));
    if (H) for (let i = 0; i < 4; i++) g.add(M(S(0.03), C.mint, { p: [0.12 * (i % 2 ? 1 : -1), 0.4 + i * 0.05, 0.16] }));
    FEET(g, { color: C.mint, r: 0.08 });
    return { group: g, update: (t) => { skin.color.setHSL((t * 0.06) % 1, 0.65, 0.5); eyes[0].rotation.set(Math.sin(t * 1.3) * 0.5, Math.cos(t * 0.9) * 0.5, 0); eyes[1].rotation.set(Math.cos(t * 1.1) * 0.5, Math.sin(t * 1.7) * 0.5, 0); } };
  },
  robo(K, H) {
    const { S, BOX, CYL, M, FEET } = K; const g = new THREE.Group();
    g.add(M(BOX(0.42, 0.36, 0.34, 0.05), C.sky, { p: [0, 0.32, 0] }));
    const lights = [C.coral, C.mustard, C.mint].map((c, i) => { const l = new THREE.Mesh(S(0.035), new THREE.MeshBasicMaterial({ color: c })); l.position.set(-0.12 + i * 0.12, 0.34, 0.18); g.add(l); return l; });
    if (H) g.add(M(BOX(0.24, 0.08, 0.02, 0.01), C.ink, { p: [0, 0.2, 0.18] }));
    [-1, 1].forEach((s) => { g.add(M(CYL(0.05, 0.05, 0.22), C.gray, { p: [0.27 * s, 0.32, 0], r: [0, 0, s * 0.35] })); g.add(M(S(0.07), C.ink, { p: [0.31 * s, 0.2, 0] })); });
    const head = new THREE.Group(); head.position.set(0, 0.78, 0); g.add(head);
    head.add(M(BOX(0.5, 0.42, 0.42, 0.06), C.sky));
    head.add(M(BOX(0.36, 0.2, 0.03, 0.02), C.ink, { p: [0, 0.02, 0.21] }));
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(BOX(0.09, 0.09, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: C.mint })); e.position.set(0.1 * s, 0.03, 0.23); head.add(e); return e; });
    [-1, 1].forEach((s) => head.add(M(CYL(0.06, 0.06, 0.06), C.gray, { p: [0.27 * s, 0.02, 0], r: [0, 0, Math.PI / 2] })));
    const ant = new THREE.Group(); ant.position.set(0.08, 0.2, 0); ant.rotation.z = -0.5; head.add(ant);
    ant.add(M(CYL(0.02, 0.02, 0.26), C.gray, { p: [0, 0.13, 0] })); const bulb = new THREE.Mesh(S(0.05), new THREE.MeshBasicMaterial({ color: C.coral })); bulb.position.set(0, 0.28, 0); ant.add(bulb);
    FEET(g, { color: C.gray, r: 0.1, dx: 0.15 });
    return { group: g, update: (t) => { lights.forEach((l, i) => (l.visible = Math.sin(t * 4 + i * 2) > 0)); bulb.material.color.setHex(Math.sin(t * 6) > 0 ? C.coral : C.rust); ant.rotation.z = -0.5 + Math.sin(t * 2.5) * 0.08; eyes.forEach((e) => (e.scale.y = Math.sin(t * 3) > 0.95 ? 0.15 : 1)); } };
  },
};

function build(id, detail = 'high') {
  const H = detail === 'high'; const b = BUILDERS[id] || BUILDERS.cachorro;
  const r = b(kit(H), H); r.group.name = id; r.detail = detail;
  return r;
}

/* ---------- luzes padrão ---------- */
function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xFFF4E0, 0x3A2653, 1.1));
  const d = new THREE.DirectionalLight(0xFFFFFF, 1.4); d.position.set(2, 4, 3); scene.add(d);
  return scene;
}
function makeRenderer(canvas, alpha = true) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'low-power' });
  r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.5)); r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

/* ---------- thumbnails (um renderer offscreen compartilhado) ---------- */
const thumbCache = new Map(); let thumbRig = null;
function thumbnail(id, size = 96) {
  const key = id + '@' + size; if (thumbCache.has(key)) return thumbCache.get(key);
  if (!webglOk()) return null;
  if (!thumbRig) {
    const canvas = document.createElement('canvas'); const renderer = makeRenderer(canvas);
    const scene = addLights(new THREE.Scene()); const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0.35, 1.05, 2.6); camera.lookAt(0, 0.55, 0);
    thumbRig = { canvas, renderer, scene, camera };
  }
  const { renderer, scene, camera, canvas } = thumbRig;
  renderer.setPixelRatio(1); renderer.setSize(size, size, false);
  const ch = build(id, 'high'); ch.update(1.3, 0); ch.group.rotation.y = -0.35; scene.add(ch.group);
  renderer.render(scene, camera); const url = canvas.toDataURL('image/png'); scene.remove(ch.group);
  thumbCache.set(key, url); return url;
}

/* ---------- visualizador (tela de seleção) ---------- */
class Viewer {
  constructor(canvas) {
    this.canvas = canvas; this.renderer = makeRenderer(canvas);
    this.scene = addLights(new THREE.Scene()); this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    this.camera.position.set(0, 1.0, 2.9); this.camera.lookAt(0, 0.5, 0);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 32), new THREE.MeshToonMaterial({ color: 0x3A2653, gradientMap: gradientMap() })); disc.position.y = -0.05; this.scene.add(disc);
    this.char = null; this.rotY = 0; this.vel = 0.6; this.dragging = false; this.running = false; this.t0 = performance.now();
    canvas.addEventListener('pointerdown', (e) => { this.dragging = true; this.lastX = e.clientX; this.vel = 0; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!this.dragging) return; const dx = e.clientX - this.lastX; this.lastX = e.clientX; this.rotY += dx * 0.012; this.vel = dx * 0.4; });
    const up = () => { this.dragging = false; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  }
  resize() { const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 300; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  setCharacter(id) {
    if (this.char) this.scene.remove(this.char.group);
    this.char = build(id, 'high'); this.char.group.position.y = -0.02; this.scene.add(this.char.group);
    this.char.group.scale.setScalar(0.01); this.popT = performance.now();
  }
  start() { if (this.running) return; this.running = true; this.resize(); const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  stop() { this.running = false; }
  frame() {
    const t = (performance.now() - this.t0) / 1000;
    if (this.char) {
      const k = Math.min(1, (performance.now() - this.popT) / 450); const s = 1 + Math.sin(k * Math.PI) * 0.12 * (1 - k); this.char.group.scale.setScalar(k < 1 ? k * s : 1);
      if (!this.dragging) { this.rotY += this.vel * 0.016; this.vel += (0.6 - this.vel) * 0.03; }
      this.char.group.rotation.y = this.rotY; this.char.update(t, 0.016);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

/* ---------- peões sobre o tabuleiro ----------
   Câmera ortográfica em espaço de pixels; a UI informa posição (em px do
   container) e escala (px por unidade do tabuleiro). Os modelos ficam
   inclinados para simular a vista em ângulo. */
class PawnLayer {
  constructor(container, project) {
    this.container = container; this.project = project; // project() -> { positions:{id:{x,y,hop}}, scale:number }
    this.canvas = document.createElement('canvas'); this.canvas.className = 'pawn-layer'; container.appendChild(this.canvas);
    this.renderer = makeRenderer(this.canvas); this.scene = addLights(new THREE.Scene());
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -500, 500); this.camera.position.z = 100;
    this.pawns = new Map(); this.activeId = null; this.running = false; this.t0 = performance.now(); this.W = 0; this.H = 0;
    this.shadowGeo = new THREE.CircleGeometry(0.42, 16); this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x1A0F26, transparent: true, opacity: 0.35 });
  }
  add(id, charId) {
    const hi = build(charId, 'high'), lo = build(charId, 'low');
    const root = new THREE.Group(); const tilt = new THREE.Group(); tilt.rotation.x = 0.55; root.add(tilt);
    tilt.add(hi.group); tilt.add(lo.group); lo.group.visible = false;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; tilt.add(shadow);
    this.scene.add(root); this.pawns.set(id, { root, tilt, hi, lo, shadow, dead: false, phase: Math.random() * 6 });
  }
  setActive(id) { this.activeId = id; }
  setDead(id, dead) { const p = this.pawns.get(id); if (p) p.dead = dead; }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (w === this.W && h === this.H) return;
    this.W = w; this.H = h; this.renderer.setSize(w, h, false); this.camera.left = 0; this.camera.right = w; this.camera.top = 0; this.camera.bottom = -h; this.camera.updateProjectionMatrix();
  }
  start() { if (this.running) return; this.running = true; const loop = () => { if (!this.running) return; if (!document.hidden) this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  stop() { this.running = false; }
  frame() {
    this.resize(); const t = (performance.now() - this.t0) / 1000;
    const { positions, scale } = this.project(); const S = scale * 46; // peão ≈ 46 unidades do tabuleiro de altura
    this.pawns.forEach((p, id) => {
      const pos = positions[id]; if (!pos) { p.root.visible = false; return; } p.root.visible = true;
      const active = id === this.activeId;
      p.hi.group.visible = active; p.lo.group.visible = !active;
      const ch = active ? p.hi : p.lo; ch.update(t + p.phase, 0.016);
      const bob = active ? Math.sin(t * 2.4 + p.phase) * 0.02 : 0;
      p.root.position.set(pos.x, -pos.y, pos.y * 0.01 + (active ? 5 : 0));
      p.root.scale.setScalar(S * (active ? 1.15 : 1) * (pos.s || 1));
      const hop = pos.hop || 0; p.tilt.position.y = bob + hop; p.shadow.position.y = -hop + 0.01; p.shadow.scale.setScalar(1 - hop * 0.4);
      ch.group.scale.set(1 - hop * 0.15, 1 + hop * 0.25, 1 - hop * 0.15);
      p.tilt.rotation.z = p.dead ? Math.PI / 2 : 0; p.tilt.rotation.y = active ? Math.sin(t * 0.8) * 0.35 : 0.2;
    });
    this.renderer.render(this.scene, this.camera);
  }
}

global.CaosChars = { LIST, byId, build, thumbnail, Viewer, PawnLayer, webglOk, THREE };
})(window);
