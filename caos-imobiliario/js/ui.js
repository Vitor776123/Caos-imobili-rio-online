/* =====================================================================
   CAOS IMOBILIÁRIO — UI (v2: tudo acontece NO tabuleiro)
   Implementa o `io` da engine: ask() e animate(). Nenhuma regra aqui.
   - Balões ancorados ao peão/casa substituem os modais.
   - Decisões são botões pequenos dentro do balão.
   - Peão anda casa por casa com pulo animado em JS (rAF).
   - Modal só em momentos excepcionais: Última Cartada, decisão do grupo,
     sair da partida.
   ===================================================================== */
(function (global) {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = CaosEngine.util.fmt;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = (ms) => (reduced ? Math.min(ms, 40) : ms);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has3D = !!(window.CaosChars && CaosChars.webglOk());
const sfx = (n) => window.CaosAudio && CaosAudio.sfx(n);
const TIMING = { botLeitura: 4500, botFala: 2200, humanoMaxAuto: 0 }; // humano: 0 = só avança com toque
const thumbOf = (p) => (has3D && p.personagem ? CaosChars.thumbnail(p.personagem, 96) : null);
const av = (p) => { const u = thumbOf(p); return u ? `<img class="thumb" src="${u}" alt="">` : p.avatar; };

const ICONS = { topo: '👑', bifurcacao: '🔀', evento_forte: '⚡', evento_leve: '🎴', respiro: '☁️' };
const TIER_LETTER = { Barato: '$', Médio: '$$', Caro: '$$$' };
const CAMINHOS = {
  arriscado: { emoji: '🔥', nome: 'Arriscado', desc: 'caros + eventos' },
  neutro:    { emoji: '⚖️', nome: 'Neutro',    desc: 'um pouco de tudo' },
  seguro:    { emoji: '🛡️', nome: 'Seguro',    desc: 'baratos, calmo' },
};
const VIRADAS = {
  fiscalizacao: { emoji: '🚨', nome: 'Fiscalização Federal' },
  roubada:      { emoji: '🎯', nome: 'Roubada de Sorte' },
  imposto:      { emoji: '💸', nome: 'Imposto de Inveja' },
  fofoca:       { emoji: '🗣️', nome: 'Fofoca Destruidora' },
};

/* ---------------- telas ---------------- */
let currentScreen = 'screen-home';
async function showScreen(id) {
  if (id === currentScreen) return;
  const cur = document.getElementById(currentScreen), nxt = document.getElementById(id);
  cur.classList.remove('in'); await sleep(T(320)); cur.classList.remove('active');
  nxt.classList.add('active'); await sleep(20); nxt.classList.add('in');
  currentScreen = id;
}

/* ---------------- toasts (avisos de sistema, pequenos) ---------------- */
function toast(msg, cls = '', ms = 2000) {
  const box = $('#toasts'); const t = document.createElement('div');
  t.className = 'toast ' + cls; t.innerHTML = msg; box.appendChild(t);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

/* ---------------- modal (só para exceções) ---------------- */
let closeCurrentModal = null;
function showModal({ kind = '', html = '', buttons = [], onOpen = null }) {
  return new Promise(async (resolve) => {
    if (closeCurrentModal) await closeCurrentModal('replaced');
    const root = $('#modal-root'), m = $('.modal', root);
    m.className = 'modal' + (kind ? ' k-' + kind : '');
    const row = buttons.length > 1 && buttons.every((b) => b.row);
    m.innerHTML = html + (buttons.length ? `<div class="m-actions ${row ? 'row' : ''}">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>` : '');
    root.classList.remove('out'); root.classList.add('show'); root.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('in')));
    let done = false;
    const finish = async (v) => { if (done) return; done = true; closeCurrentModal = null; root.classList.add('out'); root.classList.remove('in'); await sleep(T(230)); root.classList.remove('show', 'out'); root.setAttribute('aria-hidden', 'true'); resolve(v); };
    closeCurrentModal = finish;
    m.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => finish(buttons[+b.dataset.i].value)));
    if (onOpen) onOpen(m, finish);
  });
}

/* ---------------- UI ---------------- */
const UI = {
  engine: null, S: null, board: null, shownRep: {}, followMode: true, humanCount: 0,
  anchors: new Set(), onEnd: null, online: null,

  /* ---------- modo ONLINE: a engine roda no servidor; aqui só há um espelho do estado ----------
     ctx = { myId, state, personagens[], net }. As mesmas funções de UI (askX / animate) são reutilizadas:
     online.js chama UI.io().ask / UI.io().animate com o que chega pela rede. */
  async startOnline(ctx) {
    this.online = ctx; this.onEnd = null; this.humanCount = 1;
    this.engine = new CaosEngine.GameEngine(null, window.CAOS_DATA); // só como fachada (player/lider/vivos)
    this.applyState(ctx.state);
    this.shownRep = {}; this.S.players.forEach((p) => (this.shownRep[p.id] = p.reputacao));
    $('#log').innerHTML = ''; $('#players-strip').innerHTML = ''; $('#anchor-layer').innerHTML = ''; this.anchors.clear();
    $('#mode-pill').textContent = CaosEngine.CONFIG.modos[this.S.modo].nome;
    this.renderPlayers(); this.updateRound(); this.bindGameButtons();
    await showScreen('screen-game');
    this.renderBoard(); this.board.resize(); this.updateRound(); this.updateCells(); this.focusPlayer(this.current(), true);
    if (window.CaosAudio) CaosAudio.music.start();
  },
  applyState(state) {
    if (this.online) state.players.forEach((p, i) => { p.personagem = this.online.personagens[i] || 'cachorro'; });
    this.S = state; if (this.engine) this.engine.state = state; if (this.board) this.board.S = state;
    if (this.online) { const seen = this.online.logSeen || 0; (state.log || []).forEach((e) => { if (e.t >= seen) this.appendLog(e); }); this.online.logSeen = state.log && state.log.length ? state.log[state.log.length - 1].t + 1 : seen; }
    if (this.online) { this.charOf = {}; state.players.forEach((p) => (this.charOf[p.id] = p.personagem)); }
  },
  isMe(p) { return this.online ? p.id === this.online.myId : this.isHuman(p); },

  async startGame(setup, onEnd) {
    this.onEnd = onEnd; this.online = null;
    this.humanCount = setup.jogadores.filter((j) => j.tipo === 'humano').length;
    this.engine = new CaosEngine.GameEngine(this.io(), window.CAOS_DATA);
    this.S = this.engine.iniciar(setup);
    this.charOf = {}; this.S.players.forEach((p, i) => { p.personagem = setup.jogadores[i].personagem || CaosChars.LIST[i % CaosChars.LIST.length].id; this.charOf[p.id] = p.personagem; }); // só apresentação
    this.shownRep = {}; this.S.players.forEach((p) => (this.shownRep[p.id] = p.reputacao));
    $('#log').innerHTML = ''; $('#players-strip').innerHTML = ''; $('#anchor-layer').innerHTML = ''; this.anchors.clear();
    $('#mode-pill').textContent = CaosEngine.CONFIG.modos[setup.modo].nome;
    this.renderPlayers(); this.updateRound(); this.bindGameButtons();
    await showScreen('screen-game');
    this.renderBoard(); this.board.resize(); this.updateRound(); this.updateCells();
    if (window.CaosAudio) CaosAudio.music.start();
    this.engine.rodar().catch((e) => { console.error(e); toast('Algo quebrou de verdade: ' + esc(e.message), 'bad', 6000); });
  },

  bindGameButtons() {
    this.bindAudioButtons();
    $('#btn-camera').onclick = () => { this.followMode = !this.followMode; $('#btn-camera').textContent = this.followMode ? '🎯' : '🗺️'; this.focusPlayer(this.current()); };
    $('#btn-log').onclick = () => $('#drawer').classList.toggle('open');
    $('#btn-drawer-close').onclick = () => $('#drawer').classList.remove('open');
    $('#board-wrap').addEventListener('pointerdown', () => $('#drawer').classList.remove('open'));
    $('#btn-quit').onclick = async () => { const r = await showModal({ kind: 'dark', html: `<div class="m-title">Sair da partida?</div><p class="m-text">${this.online ? 'Tem certeza? Um bot assume o seu lugar e você não volta mais para esta sala.' : 'O jogo atual será perdido.'}</p>`, buttons: [{ label: 'Continuar jogando', value: 'nao', cls: 'primary', row: true }, { label: 'Sair', value: 'sim', cls: 'coral', row: true }] }); if (r === 'sim') { if (this.online && window.CaosOnline) CaosOnline.abandonarPartida(); else location.reload(); } };
    window.addEventListener('resize', () => { if (this.board) { this.board.resize(); this.focusPlayer(this.current(), true); } }, { passive: true });
  },

  bindAudioButtons() {
    if (!window.CaosAudio) return;
    const paint = (p) => { $('#btn-sfx').textContent = p.sfx ? '🔊' : '🔇'; $('#btn-sfx').title = p.sfx ? 'Efeitos: ligados' : 'Efeitos: desligados'; $('#btn-music').textContent = p.music ? '🎵' : '🎵̸'; $('#btn-music').classList.toggle('off', !p.music); $('#btn-sfx').classList.toggle('off', !p.sfx); $('#btn-music').title = p.music ? 'Música: ligada' : 'Música: desligada'; };
    paint(CaosAudio.pref); CaosAudio.onChange(paint);
    $('#btn-sfx').onclick = () => { CaosAudio.toggle('sfx'); sfx('click'); };
    $('#btn-music').onclick = () => CaosAudio.toggle('music');
  },
  current() { return this.S.players[this.S.turnoIdx]; },

  av(p) { const t = thumbOf(p); return t ? `<img class="thumb" src="${t}" alt="">` : p.avatar; },
  isHuman(p) { return p.tipo === 'humano'; },

  /* ---------- tabuleiro 3D (delegado a CaosBoard3D) ---------- */
  renderBoard() {
    if (this.board) this.board.destroy();
    this.board = new CaosBoard3D.Board3D($('#board-wrap'), this);
    this.board.init(this.S, this.charOf); this.board.placeAll();
  },
  updateCells() { if (this.board) this.board.updateCells(this.S); },
  placeTokens() { if (this.board) this.board.placeAll(); this.repositionAll(); },
  hopTo(p, cellId, ms) { return this.board.hop(p.id, cellId, T(ms)); },
  pulseCell(cellId) { this.board.pulse(cellId); },
  /* texto flutuante (+R$/−R$) ancorado a um ponto 3D, sobe/desce em HTML */
  floatText(playerOrCell, text, cls) {
    const world = typeof playerOrCell === 'number' ? this.board.cellWorld(playerOrCell).setY(30) : this.board.pawnWorld(playerOrCell);
    const el = document.createElement('div'); el.className = 'float-html ' + cls; el.textContent = text; $('#anchor-layer').appendChild(el);
    const a = { el, world, float: true }; this.anchors.add(a); this.reposition(a);
    setTimeout(() => { this.anchors.delete(a); el.remove(); }, 1400);
  },
  cellInfo(c) {
    if (c.type !== 'negocio') { this.bubble({ cellId: c.id, kind: 'info', html: `<div class="b-head"><span class="e">${ICONS[c.type]}</span>${esc(c.nome)}</div>`, duration: 1500 }); return; }
    const n = this.S.negocios[c.negocioId]; const dono = n.dono ? this.engine.player(n.dono) : null;
    this.bubble({ cellId: c.id, kind: 'info', html: `<div class="b-head"><span class="e">${n.emoji}</span>${esc(n.nome)}</div><div class="b-eyebrow">${esc(n.categoria)} · ${n.tier}</div><p class="b-text">Compra ${fmt(n.custo)} · taxa ${fmt(n.taxa)} · karma ${fmt(n.taxa * 2)}–${fmt(n.taxa * 4)}</p><div class="b-eyebrow">${dono ? `Dono: ${dono.avatar} ${esc(dono.nome)}${n.fechado ? ' · fechado' : ''}` : 'À venda'}</div>`, duration: 3200 });
  },

  /* ---------- câmera ---------- */
  focusPlayer(p, instant = false) { if (!p || !this.board) return; if (!this.followMode) this.board.focusAll(instant); else this.board.focusPlayer(p, instant); },

  /* ---------- balões ancorados (posição = projeção 3D → pixels) ---------- */
  anchorPoint(a) {
    if (a.world) return this.board.project(a.world);
    if (a.playerId) return this.board.project(this.board.pawnWorld(a.playerId));
    return this.board.project(this.board.cellWorld(a.cellId).setY(14));
  },

  reposition(a) {
    const wrap = $('#board-wrap'); const W = wrap.clientWidth, H = wrap.clientHeight; const el = a.el;
    const p = this.anchorPoint(a); const w = el.offsetWidth, h = el.offsetHeight;
    if (a.float) { el.style.left = (p.x - w / 2) + 'px'; el.style.top = (p.y - h) + 'px'; el.style.visibility = p.behind ? 'hidden' : ''; return; }
    const left = clamp(p.x - w / 2, 6, Math.max(6, W - w - 6));
    let top = p.y - h - 14, above = true;
    if (top < 56) { top = p.y + 40; above = false; }
    if (top + h > H - 80) { top = Math.max(56, H - 80 - h); }
    el.style.left = left + 'px'; el.style.top = top + 'px';
    el.classList.toggle('above', above); el.classList.toggle('below', !above);
    el.style.setProperty('--tail-x', clamp(p.x - left, 14, w - 14) + 'px');
  },
  repositionAll() { if (!this.board) return; this.anchors.forEach((a) => this.reposition(a)); },
  /* bubble({playerId|cellId, kind, html, buttons:[{label,value,cls}], duration}) -> Promise */
  bubble(opts) {
    return new Promise((resolve) => {
      const layer = $('#anchor-layer'); const el = document.createElement('div');
      el.className = 'bubble k-' + (opts.kind || 'info');
      const btns = opts.buttons || [];
      el.innerHTML = opts.html + (btns.length ? `<div class="b-actions">${btns.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>` : '')
        + (opts.duration && !btns.length ? `<div class="timer" style="animation-duration:${T(opts.duration)}ms"></div>` : '');
      const a = { el, playerId: opts.playerId, cellId: opts.cellId }; this.anchors.add(a); layer.appendChild(el); this.reposition(a);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); this.reposition(a); }));
      let done = false;
      const finish = async (v) => { if (done) return; done = true; el.classList.add('out'); await sleep(T(180)); this.anchors.delete(a); el.remove(); resolve(v); };
      a.close = finish;
      el.querySelectorAll('[data-i]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); finish(btns[+b.dataset.i].value); }));
      if (!btns.length) {
        el.onclick = () => finish('tap');
        if (opts.duration) setTimeout(() => finish('auto'), T(opts.duration));
        if (opts.tapAnywhere) { // qualquer toque na tela avança (humano)
          const h = (e) => { if (e.target.closest('.hud-top, .hud-bottom, .drawer, #modal-root')) return; document.removeEventListener('pointerdown', h, true); finish('tap'); };
          setTimeout(() => document.addEventListener('pointerdown', h, true), 150);
          el.insertAdjacentHTML('beforeend', '<div class="b-tap">toque para continuar</div>');
        }
      }
    });
  },
  /* balão informativo: humano lê (toque fecha), bot fecha mais rápido */
  /* balão informativo: humano fica até tocar na tela; bot avança sozinho após TIMING.botLeitura */
  info(p, opts) {
    if (this.isMe(p)) return this.bubble({ playerId: p.id, ...opts, duration: TIMING.humanoMaxAuto, tapAnywhere: true });
    return this.bubble({ playerId: p.id, ...opts, duration: TIMING.botLeitura });
  },
  botSays(p, texto) { return this.bubble({ playerId: p.id, kind: 'bot', html: `🤖 "${esc(texto)}"`, duration: TIMING.botFala }); },
  negHead(n, eyebrow) { return `<div class="b-head"><span class="e">${n.emoji}</span>${esc(n.nome)}</div>${eyebrow ? `<div class="b-eyebrow">${eyebrow}</div>` : ''}`; },

  /* ---------- HUD ---------- */
  renderPlayers() {
    const strip = $('#players-strip'); const cur = this.current(); const lider = this.engine.lider();
    this.S.players.forEach((p) => {
      let chip = strip.querySelector(`[data-id="${p.id}"]`);
      if (!chip) {
        chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.id = p.id;
        chip.innerHTML = `<div class="av" style="background:${p.cor}">${this.av(p)}</div><div><div class="nm">${esc(p.nome)}</div><div class="rep"></div><div class="meta"></div></div>`;
        chip.onclick = () => this.playerInfo(p);
        strip.appendChild(chip);
      }
      chip.classList.toggle('cur', cur && cur.id === p.id); chip.classList.toggle('dead', p.eliminado); chip.classList.toggle('lider', !!lider && lider.id === p.id);
      const target = p.eliminado ? p.repFinal : p.reputacao;
      if (this.shownRep[p.id] !== target) { this.animateNumber($('.rep', chip), this.shownRep[p.id], target); this.shownRep[p.id] = target; chip.classList.remove('hit'); void chip.offsetWidth; chip.classList.add('hit'); }
      else $('.rep', chip).textContent = fmt(target);
      const bloq = (p.contaBloqueada || 0) + (p.bloqueioAtivo ? 1 : 0);
      $('.meta', chip).innerHTML = p.eliminado ? '💀 eliminado' : `<span class="volta">${p.concluiu ? '🏁 concluiu' : `🔁 Volta ${p.voltas}/${this.S.rodadasTotais}`}</span> 🏪${p.negocios.length} 🍀${p.tokens}${p.tokensPendentes ? '+' + p.tokensPendentes : ''} 🎲${p.rerolls}${bloq > 0 ? `<span class="bloq">🔒 Conta bloqueada (${bloq})</span>` : ''}`;
      chip.classList.toggle('concluiu', !!p.concluiu);
    });
    // rola SÓ a faixa de cards (scrollIntoView rolava também o #screen-game e revelava o drawer fechado)
    if (cur) { const chip = strip.querySelector(`[data-id="${cur.id}"]`); if (chip) strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' }); }
    this.updateCells();
  },
  playerInfo(p) {
    const negs = p.negocios.map((id) => this.S.negocios[id]).map((n) => `${n.emoji} ${esc(n.nome)}`).join(', ') || 'nenhum';
    this.bubble({ playerId: p.id, kind: 'info', html: `<div class="b-head"><span class="e">${this.av(p)}</span>${esc(p.nome)}</div><div class="b-eyebrow">${p.tipo === 'bot' ? '🤖 ' + CaosBots.PERSONALIDADES[p.personalidade].nome : 'pessoa'} · ${fmt(p.eliminado ? p.repFinal : p.reputacao)}</div><p class="b-text">Negócios: ${negs}</p><div class="b-eyebrow">🍀 ${p.tokens} Virada(s) · 🎲 ${p.rerolls} troca(s) de prenda · 💀 ${p.karmaRuim} karma(s) ruim(ns)</div>`, duration: 3800 });
    this.focusPlayer(p);
  },
  animateNumber(el, from, to) {
    const ms = T(550), t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 2); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  },
  updateRound() {
    const S = this.S; const cur = this.current();
    $('#round-pill').textContent = cur ? `${cur.concluiu ? '🏁' : '🔁'} Volta ${Math.min(cur.voltas + 1, S.rodadasTotais)}/${S.rodadasTotais}` : '';
    // declínio do cenário acompanha o jogador mais adiantado
    const maxV = Math.max(0, ...S.players.filter((p) => !p.eliminado).map((p) => p.voltas));
    const stage = Math.min(3, Math.floor((maxV / S.rodadasTotais) * 4));
    if (this.board && this.board.stage !== stage) this.board.setStage(stage);
    if (window.CaosAudio) CaosAudio.music.setStage(stage);
  },
  appendLog(entry) {
    const log = $('#log'); const p = document.createElement('p'); p.className = entry.tipo; p.textContent = entry.texto; log.appendChild(p);
    while (log.children.length > 80) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
  },

  /* =====================================================================
     IO — a ponte com a engine
     ===================================================================== */
  io() {
    const ui = this;
    return {
      onLog: (e) => ui.appendLog(e),

      async ask(pending) {
        ui.renderPlayers();
        if (pending.type === 'decisao_grupo') return ui.askDecisaoGrupo(pending);
        const p = ui.engine.player(pending.playerId);
        if (!ui.isHuman(p)) return ui.botAsk(pending, p);
        switch (pending.type) {
          case 'acao_turno': return ui.askAcao(p, pending);
          case 'bifurcacao': return ui.askBifurcacao(p, pending);
          case 'comprar': return ui.askComprar(p, pending);
          case 'prenda': return ui.askPrenda(p, pending);
        }
        return null;
      },

      async animate(evt) {
        ui.renderPlayers();
        const p = evt.player;
        switch (evt.type) {
          case 'turno_inicio':
            ui.placeTokens(); ui.focusPlayer(p); ui.updateRound();
            if (ui.online) toast(ui.isMe(p) ? '🎲 <b>Sua vez!</b>' : `⏳ Vez de ${p.avatar} <b>${esc(p.nome)}</b>`, 'sys', 2000);
            else if (ui.isHuman(p) && ui.humanCount >= 2) toast(`📱 Passe o aparelho para ${p.avatar} <b>${esc(p.nome)}</b>`, 'sys', 2200);
            await sleep(T(ui.isHuman(p) ? 450 : 600)); return;
          case 'bot_fala': { if (evt.negocioId) { const n = ui.S.negocios[evt.negocioId]; ui.pulseCell(p.posicao); await ui.bubble({ playerId: p.id, kind: 'bot', html: `${n.emoji} ${esc(n.nome)} à venda — 🤖 "${esc(evt.texto)}"`, duration: TIMING.botFala }); } else await ui.botSays(p, evt.texto); return; }
          case 'dado': sfx('dice'); await ui.board.dice(p.id, evt.valor); ui.floatText(p, '🎲 ' + evt.valor, 'pos'); await sleep(T(250)); return;
          case 'passo':
            sfx(evt.ultimo ? 'land' : 'step');
            await ui.hopTo(p, evt.cellId, evt.ultimo ? 420 : 300);
            ui.focusPlayer(p);
            if (evt.ultimo) { ui.pulseCell(evt.cellId); ui.placeTokens(); await sleep(T(240)); } else await sleep(T(40));
            return;
          case 'passou_topo': sfx('coins'); ui.floatText(0, '+' + fmt(evt.valor), 'pos'); ui.updateRound(); toast(`🔁 ${esc(p.nome)}: volta ${evt.voltas}/${evt.total} · +${fmt(evt.valor)}`, 'sys', 2200); await sleep(T(350)); return;
          case 'concluiu': await ui.info(p, { kind: 'token', html: `<div class="b-head"><span class="e">🏁</span>${esc(p.nome)} completou as voltas!</div><p class="b-text">Agora só assiste e torce (ou não) pelos outros.</p>` }); return;
          case 'respiro': await ui.info(p, { kind: 'info', html: `<div class="b-head"><span class="e">☁️</span>Respiro</div><p class="b-text">Nada aconteceu. Suspeito.</p>`, max: 1600 }); return;
          case 'no_topo': await ui.info(p, { kind: 'info', html: `<div class="b-head"><span class="e">👑</span>No topo</div><p class="b-text">Por enquanto.</p>`, max: 1500 }); return;
          case 'na_encruzilhada': await ui.info(p, { kind: 'info', html: `<div class="b-head"><span class="e">🔀</span>Encruzilhada</div><p class="b-text">Escolhe o caminho na próxima jogada.</p>`, max: 1800 }); return;
          case 'proprio': await ui.info(p, { kind: 'info', html: ui.negHead(evt.negocio, 'seu próprio negócio') + `<p class="b-text">Café grátis. Nada a pagar.</p>`, max: 1800 }); return;
          case 'fechado': await ui.info(p, { kind: 'info', html: ui.negHead(evt.negocio, '🔒 fechado por fofoca') + `<p class="b-text">Ninguém paga nada aqui hoje.</p>`, max: 2000 }); return;
          case 'compra': sfx('chaching'); ui.floatText(p, '-' + fmt(evt.negocio.custo), 'neg'); ui.updateCells(); ui.pulseCell(p.posicao); await ui.info(p, { kind: 'token', html: ui.negHead(evt.negocio, 'comprado!') + `<div class="b-money neg">-${fmt(evt.negocio.custo)}</div>`, max: 1800 }); return;
          case 'nao_comprou': await ui.info(p, { kind: 'info', html: ui.negHead(evt.negocio) + `<p class="b-text">Só olhou a vitrine.</p>`, max: 1300 }); return;
          case 'taxa':
            sfx('pay');
            ui.floatText(p, '-' + fmt(evt.valor), 'neg'); ui.floatText(evt.dono, '+' + fmt(evt.valor), 'pos');
            await ui.info(p, { kind: 'taxa', html: ui.negHead(evt.negocio, `taxa · dono ${evt.dono.avatar} ${esc(evt.dono.nome)}`) + `<p class="b-text">${esc(evt.texto)}</p><div class="b-money neg">-${fmt(evt.valor)} <small style="font-weight:500;font-size:.72rem">→ ${esc(evt.dono.nome)}</small></div>` });
            return;
          case 'karma':
            sfx(evt.bom ? 'karmaBom' : 'karmaRuim');
            ui.floatText(evt.alvo, '-' + fmt(evt.valor), 'neg'); ui.pulseCell(evt.alvo.posicao);
            await ui.info(evt.alvo, { kind: evt.bom ? 'karma_bom' : 'karma_ruim', html: `<div class="b-head"><span class="e">${evt.bom ? '🍀' : '💀'}</span>${evt.bom ? 'Karma bom' : 'Karma ruim'}</div><div class="b-eyebrow">${evt.negocio.emoji} ${esc(evt.negocio.nome)} · ${esc(evt.alvo.nome)} se ferrou</div><p class="b-text">${esc(evt.texto)}</p><div class="b-money neg">-${fmt(evt.valor)}</div>` });
            return;
          case 'evento': {
            sfx(evt.forte ? 'eventoForte' : 'evento');
            const ganha = evt.carta.efeito.tipo.startsWith('ganha');
            ui.pulseCell(p.posicao); if (evt.alvo.id !== p.id) ui.focusPlayer(evt.alvo);
            ui.floatText(evt.alvo, ganha ? '+' : '−', ganha ? 'pos' : 'neg');
            await ui.info(p, { playerId: evt.alvo.id, kind: evt.forte ? 'evento_forte' : 'evento_leve', html: `<div class="b-head"><span class="e">${evt.carta.emoji}</span>${esc(evt.carta.titulo)}</div><div class="b-eyebrow">${evt.forte ? '⚡ evento forte — atinge o líder' : '🎴 evento leve'}</div><p class="b-text">${esc(evt.carta.texto)}</p><div class="b-money ${ganha ? 'pos' : 'neg'}" style="font-size:.9rem">${esc(evt.resumo)}</div>` });
            if (evt.alvo.id !== p.id) ui.focusPlayer(p);
            return;
          }
          case 'token_ganho': sfx('powerup'); ui.floatText(p, '🍀 +1', 'pos'); await ui.info(p, { kind: 'token', html: `<div class="b-head"><span class="e">🍀</span>Virada de Sorte!</div><p class="b-text">3 karmas ruins = 1 token. ${evt.retido ? 'Já tem 2 — esse fica retido.' : 'Use no início de um turno contra o líder.'}</p>`, max: 3200 }); return;
          case 'prenda_cumprida': if (!ui.isHuman(p)) await ui.botSays(p, 'Cumpri a prenda. Ninguém viu, mas cumpri.'); else ui.floatText(p, '🎭', 'pos'); return;
          case 'prenda_recusada': ui.floatText(p, '-' + fmt(evt.valor), 'neg'); await sleep(T(400)); return;
          case 'virada': {
            sfx('whoosh');
            const v = VIRADAS[evt.efeito]; ui.updateCells(); ui.focusPlayer(evt.alvo);
            if (evt.valor) { ui.floatText(evt.alvo, '-' + fmt(evt.valor), 'neg'); if (evt.efeito !== 'fofoca') ui.floatText(p, '+' + fmt(evt.valor), 'pos'); }
            await ui.info(p, { playerId: evt.alvo.id, kind: 'token', html: `<div class="b-head"><span class="e">${v.emoji}</span>${v.nome}</div><div class="b-eyebrow">🍀 Virada de ${esc(p.nome)} contra ${evt.alvo.avatar} ${esc(evt.alvo.nome)}</div><p class="b-text">${esc(evt.detalhe)}</p>` });
            ui.focusPlayer(p); return;
          }
          case 'ultima_cartada': {
            ui.focusPlayer(p);
            await showModal({ kind: 'ultima', html: `<div class="ultima-draw"><div class="m-eyebrow">${p.avatar} ${esc(p.nome)} quebrou (${fmt(evt.repAntes)})</div><div class="m-title">Última Cartada</div><div class="ultima-card" id="ultima-card">🃏</div><p class="m-text" id="ultima-text">35% de chance de voltar…</p></div>`,
              onOpen: async (m, finish) => {
                const card = $('#ultima-card', m), txt = $('#ultima-text', m); await sleep(T(300)); sfx('suspense'); card.classList.add('spin'); await sleep(T(1650));
                sfx(evt.sucesso ? 'fanfare' : 'gameover'); card.classList.add(evt.sucesso ? 'ok' : 'fail'); card.textContent = evt.sucesso ? '🎉' : '💀';
                txt.innerHTML = evt.sucesso ? `<b>Deu certo!</b> ${esc(p.nome)} volta com ${fmt(CaosEngine.CONFIG.reputacaoRetorno)}${evt.negocioPerdido ? ` e perde ${evt.negocioPerdido.emoji} ${esc(evt.negocioPerdido.nome)}` : ''}.` : `<b>Falhou.</b> ${esc(p.nome)} está fora do jogo.`;
                const b = document.createElement('div'); b.className = 'm-actions'; b.innerHTML = `<button class="btn ${evt.sucesso ? 'teal' : 'coral'}">${evt.sucesso ? 'De volta ao caos' : 'Descanse em paz'}</button>`; m.appendChild(b); b.querySelector('button').onclick = () => finish('ok');
              } });
            ui.renderPlayers(); ui.placeTokens(); return;
          }
          case 'heranca_falencia': {
            sfx('dundundun');
            const nomes = evt.negocios.map((id) => ui.engine.state.negocios[id]).map((n) => `${n.emoji} ${esc(n.nome)}`).join(', ');
            toast(`💀 Falência Definitiva: os negócios de ${esc(evt.de.nome)} (${nomes}) foram herdados por ${esc(evt.para.nome)}, o mais lascado da mesa.`, 'bad', 3600);
            ui.renderPlayers(); ui.placeTokens(); await sleep(T(400)); return;
          }
          case 'rodada': ui.updateRound(); return;
          case 'fim': ui.showEnd(evt); return;
        }
      },
    };
  },

  /* ---------- perguntas: humano (botões ancorados) ---------- */
  async askAcao(p, pending) {
    for (;;) {
      const L = this.engine.lider(p.id);
      const r = await this.bubble({ playerId: p.id, kind: 'turn', html: `<div class="b-eyebrow">${this.humanCount >= 2 ? 'sua vez' : 'seu turno'}</div><div class="b-head"><span class="e">${this.av(p)}</span>${esc(p.nome)}</div>`, buttons: [
        { label: '🎲 Rolar o dado', value: 'rolar', cls: 'primary' },
        ...(pending.podeToken ? [{ label: `🍀 Virada de Sorte (${p.tokens})`, value: 'token', cls: 'teal' }] : []),
      ] });
      if (r !== 'token') return r;
      const c = await this.bubble({ playerId: p.id, kind: 'token', html: `<div class="b-head"><span class="e">🍀</span>Usar Virada?</div><p class="b-text">Efeito sorteado entre 4, contra o líder: <b>${L ? L.avatar + ' ' + esc(L.nome) : '—'}</b> (${L ? fmt(L.reputacao) : ''}).</p>`, buttons: [{ label: 'Usar agora', value: 'sim', cls: 'primary' }, { label: 'Guardar', value: 'nao', cls: 'ghost', }] });
      if (c === 'sim') return 'token';
    }
  },
  askBifurcacao(p, pending) {
    return this.bubble({ playerId: p.id, kind: 'turn', html: `<div class="b-head"><span class="e">🔀</span>Por onde?</div>`, buttons: pending.opcoes.map((o) => ({ value: o, cls: 'path-btn ' + (o === 'arriscado' ? 'coral' : o === 'seguro' ? 'teal' : 'primary'), label: `<i>${CAMINHOS[o].emoji}</i><div>${CAMINHOS[o].nome}<span>${CAMINHOS[o].desc}</span></div>` })) });
  },
  askComprar(p, pending) {
    const n = this.S.negocios[pending.negocioId];
    return this.bubble({ playerId: p.id, kind: 'taxa', html: this.negHead(n, `à venda · ${esc(n.categoria)} · ${n.tier}`) + `<p class="b-text">Taxa de visita ${fmt(n.taxa)}. Você tem ${fmt(p.reputacao)}.${pending.bloqueado ? ' 🔒 Sua conta está bloqueada — sem compras por enquanto.' : pending.podePagar ? '' : ' Não dá pra pagar.'}</p>`, buttons: [...(pending.bloqueado ? [] : [{ label: `Comprar ${fmt(n.custo)}`, value: 'sim', cls: 'primary', disabled: !pending.podePagar }]), { label: pending.bloqueado ? 'Seguir em frente' : 'Passar', value: 'nao', cls: 'ghost' }] });
  },
  askPrenda(p, pending) {
    return this.bubble({ playerId: p.id, kind: 'prenda', html: `<div class="b-head"><span class="e">🎭</span>Prenda de ${esc(p.nome)}</div><div class="prenda-line"><small>${esc(pending.prenda.grupo)}</small>${esc(pending.prenda.texto)}</div>`, buttons: [
      { label: 'Cumpri ✔', value: 'cumprir', cls: 'teal' },
      { label: `🎲 Trocar (${pending.rerolls})`, value: 'reroll', cls: 'lilac', disabled: pending.rerolls <= 0 },
      { label: `Recusar −${fmt(CaosEngine.CONFIG.penalidadeRecusarPrenda)}`, value: 'recusar', cls: 'coral' },
      { label: 'Não posso (saúde/alergia) — sortear outra', value: 'saude', cls: 'tiny' },
    ] });
  },
  askDecisaoGrupo(pending) {
    const q = pending.eliminado; const vivos = this.engine.vivos();
    return showModal({ kind: 'dark', html: `<span class="m-emoji">💀</span><div class="m-title">${esc(q.nome)} foi eliminado(a)</div><p class="m-text">Decisão do grupo: seguir até o fim (${esc(q.nome)} vira espectador) ou encerrar agora com o ranking atual?</p><div class="rank-mini">${[...vivos].sort((a, b) => b.reputacao - a.reputacao).map((x) => `<div><span>${x.avatar} ${esc(x.nome)}</span><span>${fmt(x.reputacao)}</span></div>`).join('')}</div>`, buttons: [{ label: 'Continuar a partida', value: 'continuar', cls: 'primary' }, { label: 'Encerrar e ver o ranking', value: 'encerrar', cls: 'coral' }] });
  },

  /* ---------- perguntas: bot ---------- */
  async botAsk(pending, p) {
    if (pending.type === 'prenda') { await sleep(T(200)); return 'cumprir'; }
    await sleep(T(pending.type === 'acao_turno' ? 350 : 500));
    const c = CaosBots.decidir(pending, this.S, p, this.engine.rng);
    if (pending.type === 'bifurcacao' || pending.type === 'comprar' || (pending.type === 'acao_turno' && c === 'token')) {
      const fala = CaosBots.falar(p, pending.type === 'acao_turno' ? 'token' : pending.type, c);
      if (pending.type === 'comprar') { const n = this.S.negocios[pending.negocioId]; this.pulseCell(p.posicao); await this.bubble({ playerId: p.id, kind: 'bot', html: `${n.emoji} ${esc(n.nome)} à venda — 🤖 "${esc(fala)}"`, duration: TIMING.botFala }); }
      else await this.botSays(p, fala);
    }
    return c;
  },

  /* ---------- fim ---------- */
  async showEnd(evt) {
    const r = evt.ranking.map((x) => ({ ...x, personagem: (this.engine.player(x.id) || {}).personagem })); const motivo = { rodadas: 'Todo mundo completou suas voltas.', ultimo: 'Sobrou só uma pessoa em pé.', grupo: 'O grupo decidiu encerrar.' }[evt.motivo];
    $('#end-title').textContent = r.length ? `${r[0].avatar} ${r[0].nome} se deu menos mal` : 'Acabou.';
    $('#end-sub').textContent = `${motivo} ${r.length > 1 ? `E ${r[r.length - 1].nome} foi quem mais se lascou.` : ''}`;
    $('#ranking').innerHTML = r.map((x, i) => `<li class="${i === 0 ? 'first' : ''} ${i === r.length - 1 && r.length > 1 ? 'last' : ''} ${x.eliminado ? 'dead' : ''}" style="animation-delay:${i * 90}ms"><span class="pos">${x.posicao}º</span><span class="av" style="background:${x.cor}">${this.av(x)}</span><span class="nm"><b>${esc(x.nome)}</b><span>${x.eliminado ? 'eliminado(a)' : `${x.negocios} negócio(s)`}${x.titulo ? ' · ' + x.titulo : ''}</span></span><span class="rp">${fmt(x.reputacao)}</span></li>`).join('');
    if (window.CaosAudio) { CaosAudio.music.stop(); sfx('finale'); }
    $('#btn-again').style.display = this.online ? 'none' : '';
    await sleep(T(600)); await showScreen('screen-end');
    if (this.board) { this.board.destroy(); this.board = null; }
    if (this.onEnd) this.onEnd();
  },
};

global.CaosUI = { UI, showScreen, showModal, toast };
})(window);
