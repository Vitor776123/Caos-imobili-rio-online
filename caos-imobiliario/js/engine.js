/* =====================================================================
   CAOS IMOBILIÁRIO — ENGINE (regras puras, sem DOM)
   ---------------------------------------------------------------------
   A engine conversa com o mundo por um objeto `io`:
     io.ask(pending)   -> Promise<escolha>   (decisões: humano, bot ou rede)
     io.animate(evt)   -> Promise<void>      (UI reproduz o evento e resolve)
     io.onLog(entry)   -> opcional
   Todo o estado fica em `engine.state` (serializável) — pronto para
   virar autoridade de servidor em uma versão multiplayer.
   ===================================================================== */
(function (global) {
'use strict';

const CONFIG = {
  reputacaoInicial: 20000,
  modos: {
    // rodadas = voltas completas que cada jogador precisa dar; tabuleiro = casas do loop
    rapido: { nome: 'Rápido', rodadas: 2, tempo: '15–25 min', tabuleiro: { negociosPorDistrito: 3, fortes: [1, 1, 1, 1, 1, 1, 1], leves: [1, 1, 1, 1, 1, 1, 1] } },   // 36 casas
    medio:  { nome: 'Médio',  rodadas: 3, tempo: '30–45 min', tabuleiro: { negociosPorDistrito: 4, fortes: [1, 1, 1, 2, 1, 1, 1], leves: [2, 2, 1, 2, 1, 2, 1] } },   // 48 casas
    longo:  { nome: 'Longo',  rodadas: 3, tempo: '60–90 min', tabuleiro: { negociosPorDistrito: 5, fortes: [1, 1, 1, 2, 1, 1, 1], leves: [3, 3, 2, 3, 2, 3, 2] } },   // 62 casas
  },
  taxaPercent: 0.12,            // taxa de visita = 12% do custo
  karmaMultMin: 2, karmaMultMax: 4,
  probKarmaBom: 0.5,
  rerollsPorPartida: 2,
  penalidadeRecusarPrenda: 300,
  karmaRuimPorToken: 3, maxTokens: 2,
  chanceUltimaCartada: 0.35, reputacaoRetorno: 2500,
  rendaVoltaTopo: 1000,         // ajuste de balanceamento: ao passar pelo Topo
  dividendoPorTier: { Barato: 200, 'Médio': 400, Caro: 600 }, // Plano A: dividendo de portfólio ao passar pelo Topo
  impostoInveja: 800,
  roubadaPercent: 0.10,
  fiscalizacaoSemNegocio: 1000,
  negociosIniciais: (n) => (n <= 8 ? 3 : 2),
  minJogadores: 2, maxJogadores: 12,
};

/* ---------- utilidades ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const util = {
  shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; },
  int(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); },
  fmt(v) { const n = Math.round(v); return (n < 0 ? '-' : '') + 'R$ ' + Math.abs(n).toLocaleString('pt-BR'); },
  tpl(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); },
};

/* ---------- tabuleiro ----------
   LOOP ÚNICO (estilo Monopoly): 1 casa Início + 35 negócios + 8 Eventos
   Fortes + 18 Eventos Leves = 62 casas, sem bifurcações. O loop é dividido
   em 7 distritos (um por categoria). Coordenadas x/y são o plano do chão
   (a UI 3D usa x e y→z). */
const CATEGORIAS = ['Alimentação', 'Beleza & Estética', 'Tecnologia', 'Entretenimento', 'Saúde', 'Transporte', 'Moda & Varejo'];
const FORTES_POR_DISTRITO = [1, 1, 1, 2, 1, 1, 1];   // 8
const LEVES_POR_DISTRITO  = [3, 3, 2, 3, 2, 3, 2];   // 18

function loopPath(n, W, H, R) {
  // retângulo com cantos arredondados, começando no meio da borda de baixo (z = +H/2), sentido horário visto de cima
  const segs = [];
  const straightW = W - 2 * R, straightH = H - 2 * R, arc = Math.PI * R / 2;
  const total = 2 * straightW + 2 * straightH + 4 * arc;
  const pts = [];
  for (let i = 0; i < n; i++) {
    let d = ((i / n) * total + straightW / 2) % total; // começa no meio de baixo
    let x, z, ang;
    const seq = [
      ['h', straightW, (t) => [-straightW / 2 + t, H / 2, 0]],
      ['a', arc, (t) => { const a = Math.PI / 2 - (t / R); return [W / 2 - R + Math.cos(a) * R, H / 2 - R + Math.sin(a) * R, 0]; }],
      ['v', straightH, (t) => [W / 2, H / 2 - R - t, 0]],
      ['a', arc, (t) => { const a = -(t / R); return [W / 2 - R + Math.cos(a) * R, -H / 2 + R + Math.sin(a) * R, 0]; }],
      ['h', straightW, (t) => [W / 2 - R - t, -H / 2, 0]],
      ['a', arc, (t) => { const a = -Math.PI / 2 - (t / R); return [-W / 2 + R + Math.cos(a) * R, -H / 2 + R + Math.sin(a) * R, 0]; }],
      ['v', straightH, (t) => [-W / 2, -H / 2 + R + t, 0]],
      ['a', arc, (t) => { const a = Math.PI - (t / R); return [-W / 2 + R + Math.cos(a) * R, H / 2 - R + Math.sin(a) * R, 0]; }],
    ];
    for (const [, len, f] of seq) { if (d <= len) { [x, z] = f(d); break; } d -= len; }
    pts.push({ x, y: z });
  }
  // tangente por diferença
  return pts.map((p, i) => { const q = pts[(i + 1) % n]; return { ...p, ang: Math.atan2(q.y - p.y, q.x - p.x) }; });
}

function buildBoard(negocios, cfg, rng) {
  cfg = cfg || CONFIG.modos.longo.tabuleiro;
  const cells = [];
  const add = (c) => { c.id = cells.length; c.next = []; cells.push(c); return c; };
  add({ type: 'topo', nome: 'Início', distrito: -1 });
  const distritos = [];
  CATEGORIAS.forEach((cat, di) => {
    let negs = negocios.filter((n) => n.categoria === cat);
    if (rng && negs.length > cfg.negociosPorDistrito) negs = util.shuffle(negs.slice(), rng).slice(0, cfg.negociosPorDistrito);
    const items = negs.map((n) => ({ type: 'negocio', negocioId: n.id }));
    const eventos = [];
    for (let i = 0; i < cfg.fortes[di]; i++) eventos.push({ type: 'evento_forte', nome: 'Evento Forte' });
    for (let i = 0; i < cfg.leves[di]; i++) eventos.push({ type: 'evento_leve', nome: 'Evento Leve' });
    // intercala: leve, forte, leve, leve... espalhados entre os negócios
    const ordem = []; let f = 0, l = 0;
    while (f + l < eventos.length) { if (l <= f * 2 && l < cfg.leves[di]) { ordem.push({ type: 'evento_leve', nome: 'Evento Leve' }); l++; } else { ordem.push({ type: 'evento_forte', nome: 'Evento Forte' }); f++; } }
    ordem.forEach((ev, i) => { const pos = Math.round(((i + 1) * (items.length + 1)) / (ordem.length + 1)); items.splice(Math.min(pos, items.length), 0, ev); });
    const from = cells.length;
    items.forEach((c) => { c.distrito = di; add(c); });
    distritos.push({ idx: di, nome: cat, from, to: cells.length - 1 });
  });
  for (let i = 0; i < cells.length; i++) cells[i].next.push((i + 1) % cells.length);
  const k = cells.length / 62; const W = Math.round(1180 * k), H = Math.round(760 * k), R = Math.round(150 * k); // passo entre casas constante
  const path = loopPath(cells.length, W, H, R);
  cells.forEach((c, i) => { c.x = path[i].x; c.y = path[i].y; c.ang = path[i].ang; });
  distritos.forEach((d) => { const cs = cells.slice(d.from, d.to + 1); d.cx = cs.reduce((s, c) => s + c.x, 0) / cs.length; d.cy = cs.reduce((s, c) => s + c.y, 0) / cs.length; });
  return { cells, distritos, W, H, R, loop: true };
}

/* ---------- engine ---------- */
class GameEngine {
  constructor(io, data, opts = {}) {
    this.io = io;
    this.data = data;
    this.seed = opts.seed != null ? opts.seed : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    this.rng = mulberry32(this.seed);
    this.state = null;
  }

  /* setup = { modo:'rapido'|'medio'|'longo', jogadores:[{nome,tipo:'humano'|'bot',personalidade,avatar,cor}] } */
  iniciar(setup) {
    const rng = this.rng;
    const negocios = {};
    this.data.negocios.forEach((n) => {
      const taxa = Math.round((n.custo * CONFIG.taxaPercent) / 50) * 50;
      negocios[n.id] = {
        ...n, taxa,
        taxas: n.taxas || this.data.textosPadrao.taxas,
        karmaBom: n.karmaBom || this.data.textosPadrao.karmaBom,
        karmaRuim: n.karmaRuim || this.data.textosPadrao.karmaRuim,
        dono: null, fechado: false,
      };
    });
    const board = buildBoard(this.data.negocios, CONFIG.modos[setup.modo].tabuleiro, rng);
    const players = setup.jogadores.map((j, i) => ({
      id: 'p' + i, idx: i, nome: j.nome, tipo: j.tipo, personalidade: j.personalidade || null,
      avatar: j.avatar, cor: j.cor,
      reputacao: CONFIG.reputacaoInicial, posicao: 0, negocios: [],
      rerolls: CONFIG.rerollsPorPartida, karmaRuim: 0, tokens: 0, tokensPendentes: 0,
      voltas: 0, concluiu: false, contaBloqueada: 0, bloqueioAtivo: false,
      eliminado: false, repFinal: null, rancor: {},
    }));
    // negócios iniciais sorteados
    const ids = util.shuffle(board.cells.filter((c) => c.type === 'negocio').map((c) => c.negocioId), rng);
    const qtd = CONFIG.negociosIniciais(players.length);
    players.forEach((p) => { for (let k = 0; k < qtd; k++) { const id = ids.pop(); if (!id) break; negocios[id].dono = p.id; p.negocios.push(id); } });

    this.state = {
      config: CONFIG, modo: setup.modo, rodadasTotais: CONFIG.modos[setup.modo].rodadas,
      rodada: 1, turnoIdx: 0, players, negocios, board, log: [], fase: 'jogando', pending: null, ranking: null, motivoFim: null,
    };
    this.log(`Partida iniciada — modo ${CONFIG.modos[setup.modo].nome}, ${players.length} jogadores.`, 'sistema');
    return this.state;
  }

  /* --- helpers --- */
  get S() { return this.state; }
  player(id) { return this.S.players.find((p) => p.id === id); }
  vivos() { return this.S.players.filter((p) => !p.eliminado); }
  lider(excluirId) {
    const cand = this.vivos().filter((p) => p.id !== excluirId);
    if (!cand.length) return null;
    return cand.reduce((a, b) => (b.reputacao > a.reputacao ? b : a));
  }
  log(texto, tipo = 'info', extra = {}) {
    const entry = { texto, tipo, rodada: this.S.rodada, t: this.S.log.length, ...extra };
    this.S.log.push(entry);
    if (this.io.onLog) this.io.onLog(entry);
  }
  async ask(pending) { this.S.pending = pending; const r = await this.io.ask(pending); this.S.pending = null; return r; }
  async anim(evt) { await this.io.animate(evt); }
  texto(arr, n) { return util.tpl(util.pick(arr, this.rng), { nome: n.nome }); }

  /* --- loop principal --- */
  async rodar() {
    while (this.S.fase === 'jogando') await this.jogarTurno();
    await this.anim({ type: 'fim', ranking: this.S.ranking, motivo: this.S.motivoFim });
  }

  async jogarTurno() {
    const S = this.S; const p = S.players[S.turnoIdx];
    // conta bloqueada (evento 'Esqueceu a Senha do Banco'): vale durante as próximas N jogadas do próprio jogador
    p.bloqueioAtivo = p.contaBloqueada > 0; if (p.contaBloqueada > 0) p.contaBloqueada--;
    // reabre negócios fechados por Fofoca
    p.negocios.forEach((id) => { if (S.negocios[id].fechado) { S.negocios[id].fechado = false; this.log(`${S.negocios[id].emoji} ${S.negocios[id].nome} reabriu.`, 'info'); } });
    await this.anim({ type: 'turno_inicio', player: p });
    for (;;) {
      const a = await this.ask({ type: 'acao_turno', playerId: p.id, podeToken: p.tokens > 0 });
      if (a === 'token' && p.tokens > 0) { await this.usarToken(p); continue; }
      break;
    }
    const dado = util.int(this.rng, 1, 6);
    this.log(`${p.avatar} ${p.nome} tirou ${dado} no dado.`, 'dado');
    await this.anim({ type: 'dado', player: p, valor: dado });
    await this.mover(p, dado);
    await this.resolverCasa(p);
    await this.checarQuebras();
    if (S.fase !== 'jogando') return;
    if (p.concluiu && !p.eliminado) { this.log(`🏁 ${p.nome} completou as ${S.rodadasTotais} voltas e agora só assiste.`, 'sistema'); await this.anim({ type: 'concluiu', player: p }); }
    await this.proximoTurno();
  }

  async mover(p, passos) {
    const cells = this.S.board.cells, S = this.S;
    for (let i = 0; i < passos; i++) {
      const cur = cells[p.posicao];
      let nextId;
      if (cur.type === 'bifurcacao') {
        const escolha = await this.ask({ type: 'bifurcacao', playerId: p.id, cellId: cur.id, opcoes: Object.keys(cur.branches) });
        const b = cur.branches[escolha] != null ? escolha : 'neutro';
        nextId = cur.branches[b];
        this.log(`${p.avatar} ${p.nome} escolheu o caminho ${b}.`, 'info');
        await this.anim({ type: 'caminho', player: p, caminho: b });
      } else nextId = cur.next[0];
      p.posicao = nextId;
      await this.anim({ type: 'passo', player: p, cellId: nextId, ultimo: i === passos - 1 });
      if (nextId === 0) {
        const dividendo = p.negocios.reduce((soma, id) => soma + (CONFIG.dividendoPorTier[S.negocios[id].tier] || 0), 0);
        const total = CONFIG.rendaVoltaTopo + dividendo;
        p.reputacao += total;
        p.voltas++;
        if (p.voltas >= S.rodadasTotais) p.concluiu = true;
        const detalheDividendo = dividendo > 0 ? ` (${util.fmt(CONFIG.rendaVoltaTopo)} fixos + ${util.fmt(dividendo)} de dividendo de portfólio)` : '';
        this.log(`${p.avatar} ${p.nome} passou pelo Início (volta ${p.voltas}/${S.rodadasTotais}) e recebeu ${util.fmt(total)}${detalheDividendo}.`, 'ganho');
        await this.anim({ type: 'passou_topo', player: p, valor: total, valorFixo: CONFIG.rendaVoltaTopo, dividendo, voltas: p.voltas, total: S.rodadasTotais, concluiu: p.concluiu });
      }
    }
  }

  async resolverCasa(p) {
    const cell = this.S.board.cells[p.posicao];
    switch (cell.type) {
      case 'negocio': return this.resolverNegocio(p, cell);
      case 'evento_forte': return this.evento(p, true);
      case 'evento_leve': return this.evento(p, false);
      case 'respiro': this.log(`${p.avatar} ${p.nome} parou num Respiro. Nada aconteceu. Suspeito.`, 'info'); return this.anim({ type: 'respiro', player: p });
      case 'topo': return this.anim({ type: 'no_topo', player: p });
      case 'bifurcacao': this.log(`${p.avatar} ${p.nome} parou na Encruzilhada. Decide no próximo turno.`, 'info'); return this.anim({ type: 'na_encruzilhada', player: p });
    }
  }

  async resolverNegocio(p, cell) {
    const n = this.S.negocios[cell.negocioId];
    if (!n.dono) {
      const podePagar = p.reputacao > n.custo && !p.bloqueioAtivo;
      const r = await this.ask({ type: 'comprar', playerId: p.id, negocioId: n.id, podePagar, bloqueado: !!p.bloqueioAtivo });
      if (r === 'sim' && podePagar) {
        p.reputacao -= n.custo; n.dono = p.id; p.negocios.push(n.id);
        this.log(`${p.avatar} ${p.nome} comprou ${n.emoji} ${n.nome} por ${util.fmt(n.custo)}.`, 'compra');
        await this.anim({ type: 'compra', player: p, negocio: n });
      } else {
        this.log(`${p.avatar} ${p.nome} passou batido por ${n.emoji} ${n.nome}.`, 'info');
        await this.anim({ type: 'nao_comprou', player: p, negocio: n });
      }
      return;
    }
    if (n.dono === p.id) { this.log(`${p.avatar} ${p.nome} visitou o próprio ${n.nome}. Tudo em ordem (por enquanto).`, 'info'); return this.anim({ type: 'proprio', player: p, negocio: n }); }
    const dono = this.player(n.dono);
    if (n.fechado) { this.log(`${n.emoji} ${n.nome} está fechado por fofoca. ${p.nome} não pagou nada.`, 'info'); return this.anim({ type: 'fechado', player: p, negocio: n, dono }); }
    // 1) taxa
    p.reputacao -= n.taxa; dono.reputacao += n.taxa;
    const textoTaxa = this.texto(n.taxas, n);
    this.log(`${p.avatar} ${p.nome} pagou ${util.fmt(n.taxa)} a ${dono.nome} em ${n.emoji} ${n.nome}.`, 'taxa');
    await this.anim({ type: 'taxa', player: p, dono, negocio: n, valor: n.taxa, texto: textoTaxa });
    // 2) karma
    await this.dispararKarma(p, dono, n, false);
  }

  async dispararKarma(visitante, dono, n, forcarRuim) {
    const bom = !forcarRuim && this.rng() < CONFIG.probKarmaBom;
    const mult = CONFIG.karmaMultMin + this.rng() * (CONFIG.karmaMultMax - CONFIG.karmaMultMin);
    let valor = Math.max(10, Math.round((n.taxa * mult) / 10) * 10);
    // O dono nunca pode perder, num único karma bom, mais do que acabou de ganhar com a taxa
    // dessa visita — senão possuir negócio vira prejuízo garantido e ninguém quer comprar.
    if (bom) valor = Math.min(valor, n.taxa);
    let alvo, texto;
    if (bom) { alvo = dono; texto = this.texto(n.karmaBom, n); dono.reputacao -= valor; this.rancor(dono, visitante); }
    else { alvo = visitante; texto = this.texto(n.karmaRuim, n); visitante.reputacao -= valor; this.rancor(visitante, dono); }
    this.log(`${bom ? '🍀 Karma bom' : '💀 Karma ruim'} em ${n.emoji} ${n.nome}: ${alvo.nome} perdeu ${util.fmt(valor)}.`, bom ? 'karma_bom' : 'karma_ruim');
    await this.anim({ type: 'karma', bom, visitante, dono, negocio: n, valor, texto, alvo });
    if (!bom) await this.contarKarmaRuim(visitante);
    await this.aplicarPrenda(alvo, bom ? 'karma_bom' : 'karma_ruim');
  }

  rancor(vitima, culpado) { if (vitima.id !== culpado.id) vitima.rancor[culpado.id] = (vitima.rancor[culpado.id] || 0) + 1; }

  async contarKarmaRuim(p) {
    p.karmaRuim++;
    if (p.karmaRuim % CONFIG.karmaRuimPorToken === 0) {
      if (p.tokens < CONFIG.maxTokens) p.tokens++; else p.tokensPendentes++;
      this.log(`🍀 ${p.nome} acumulou ${p.karmaRuim} karmas ruins e ganhou uma Virada de Sorte!`, 'token');
      await this.anim({ type: 'token_ganho', player: p, retido: p.tokens >= CONFIG.maxTokens && p.tokensPendentes > 0 });
    }
  }

  async aplicarPrenda(p, motivo) {
    const lista = this.data.prendas;
    let prenda = util.pick(lista, this.rng);
    for (;;) {
      const r = await this.ask({ type: 'prenda', playerId: p.id, prenda, rerolls: p.rerolls, motivo });
      if (r === 'reroll' && p.rerolls > 0) { p.rerolls--; let nova; do { nova = util.pick(lista, this.rng); } while (nova === prenda && lista.length > 1); prenda = nova; this.log(`🎲 ${p.nome} trocou a prenda (${p.rerolls} trocas restantes).`, 'info'); continue; }
      if (r === 'saude') { let nova; do { nova = util.pick(lista, this.rng); } while (nova === prenda && lista.length > 1); prenda = nova; this.log(`🩺 ${p.nome} não pode cumprir essa prenda; outra foi sorteada.`, 'info'); continue; }
      if (r === 'recusar') { p.reputacao -= CONFIG.penalidadeRecusarPrenda; this.log(`🙅 ${p.nome} recusou a prenda e perdeu ${util.fmt(CONFIG.penalidadeRecusarPrenda)}.`, 'karma_ruim'); await this.anim({ type: 'prenda_recusada', player: p, valor: CONFIG.penalidadeRecusarPrenda }); break; }
      this.log(`🎭 ${p.nome} cumpriu a prenda: ${prenda.texto}`, 'prenda');
      await this.anim({ type: 'prenda_cumprida', player: p, prenda });
      break;
    }
  }

  async evento(p, forte) {
    const carta = util.pick(forte ? this.data.eventosFortes : this.data.eventosLeves, this.rng);
    const alvo = forte ? (this.lider() || p) : p;
    const resumo = this.aplicarEfeito(carta.efeito, alvo, p);
    this.log(`${carta.emoji} ${forte ? 'EVENTO FORTE' : 'Evento leve'} — ${carta.titulo}: ${resumo}`, forte ? 'evento_forte' : 'evento_leve');
    await this.anim({ type: 'evento', forte, carta, alvo, player: p, resumo });
  }

  aplicarEfeito(ef, alvo, quemTirou) {
    const S = this.S;
    switch (ef.tipo) {
      case 'perde_fixo': alvo.reputacao -= ef.valor; return `${alvo.nome} perdeu ${util.fmt(ef.valor)}.`;
      case 'perde_fixo_bloqueio': alvo.reputacao -= ef.valor; alvo.contaBloqueada = Math.max(alvo.contaBloqueada, ef.turnos || 2); return `${alvo.nome} perdeu ${util.fmt(ef.valor)} e ficou com a conta bloqueada: não pode comprar negócios nas próximas ${ef.turnos || 2} jogadas.`;
      case 'ganha_fixo': alvo.reputacao += ef.valor; return `${alvo.nome} ganhou ${util.fmt(ef.valor)}.`;
      case 'perde_percent': { const v = Math.round(Math.max(0, alvo.reputacao) * ef.valor / 100); alvo.reputacao -= v; return `${alvo.nome} perdeu ${ef.valor}% (${util.fmt(v)}).`; }
      case 'ganha_percent': { const v = Math.round(Math.max(0, alvo.reputacao) * ef.valor / 100); alvo.reputacao += v; return `${alvo.nome} ganhou ${ef.valor}% (${util.fmt(v)}).`; }
      case 'paga_todos': { const outros = this.vivos().filter((x) => x.id !== alvo.id); outros.forEach((x) => { x.reputacao += ef.valor; }); alvo.reputacao -= ef.valor * outros.length; return `${alvo.nome} pagou ${util.fmt(ef.valor)} a cada um dos outros ${outros.length}.`; }
      case 'perde_negocio': { if (!alvo.negocios.length) { alvo.reputacao -= 1000; return `${alvo.nome} não tinha negócio pra perder — levou multa de R$ 1.000.`; } const id = util.pick(alvo.negocios, this.rng); alvo.negocios = alvo.negocios.filter((x) => x !== id); S.negocios[id].dono = null; S.negocios[id].fechado = false; return `${alvo.nome} perdeu ${S.negocios[id].emoji} ${S.negocios[id].nome}.`; }
      case 'transfere': { alvo.reputacao -= ef.valor; if (quemTirou.id !== alvo.id) quemTirou.reputacao += ef.valor; return `${alvo.nome} transferiu ${util.fmt(ef.valor)} para ${quemTirou.nome}.`; }
    }
    return '';
  }

  /* --- Virada de Sorte --- */
  async usarToken(p) {
    p.tokens--; if (p.tokensPendentes > 0) { p.tokensPendentes--; p.tokens++; }
    const alvo = this.lider(p.id);
    if (!alvo) return;
    const efeito = util.pick(['fiscalizacao', 'roubada', 'imposto', 'fofoca'], this.rng);
    const S = this.S; let detalhe = '', valor = 0, negocio = null;
    if (efeito === 'roubada') {
      valor = Math.max(0, Math.round((alvo.reputacao - p.reputacao) * CONFIG.roubadaPercent / 10) * 10);
      alvo.reputacao -= valor; p.reputacao += valor;
      detalhe = `${p.nome} roubou ${util.fmt(valor)} da diferença de reputação de ${alvo.nome}.`;
    } else if (efeito === 'imposto') {
      valor = CONFIG.impostoInveja; alvo.reputacao -= valor; p.reputacao += valor;
      detalhe = `${alvo.nome} pagou ${util.fmt(valor)} de Imposto de Inveja direto para ${p.nome}.`;
    } else if (efeito === 'fofoca') {
      if (alvo.negocios.length) { negocio = S.negocios[util.pick(alvo.negocios, this.rng)]; negocio.fechado = true; detalhe = `${negocio.emoji} ${negocio.nome} de ${alvo.nome} fechou até o próximo turno dele.`; }
      else { valor = 500; alvo.reputacao -= valor; detalhe = `${alvo.nome} não tem negócios — a fofoca custou ${util.fmt(valor)} mesmo assim.`; }
    } else {
      if (alvo.negocios.length) negocio = S.negocios[util.pick(alvo.negocios, this.rng)];
      detalhe = negocio ? `Fiscalização Federal bateu em ${negocio.emoji} ${negocio.nome} de ${alvo.nome}.` : `${alvo.nome} não tem negócios — multa direta de ${util.fmt(CONFIG.fiscalizacaoSemNegocio)}.`;
    }
    this.log(`🍀 ${p.nome} usou Virada de Sorte: ${detalhe}`, 'token');
    this.rancor(alvo, p);
    await this.anim({ type: 'virada', player: p, alvo, efeito, detalhe, valor, negocio });
    if (efeito === 'fiscalizacao') {
      if (negocio) await this.dispararKarma(alvo, alvo, negocio, true);
      else { alvo.reputacao -= CONFIG.fiscalizacaoSemNegocio; }
    }
    await this.checarQuebras();
  }

  /* --- quebra / Última Cartada / eliminação --- */
  async checarQuebras() {
    const S = this.S;
    for (const q of S.players) {
      if (S.fase !== 'jogando') return;
      if (q.eliminado || q.reputacao > 0) continue;
      const sucesso = this.rng() < CONFIG.chanceUltimaCartada;
      const repAntes = q.reputacao;
      let perdido = null;
      if (sucesso) {
        q.reputacao = CONFIG.reputacaoRetorno;
        if (q.negocios.length) { const id = util.pick(q.negocios, this.rng); q.negocios = q.negocios.filter((x) => x !== id); S.negocios[id].dono = null; S.negocios[id].fechado = false; perdido = S.negocios[id]; }
        this.log(`🃏 ÚLTIMA CARTADA: ${q.nome} deu a volta por cima! Voltou com ${util.fmt(CONFIG.reputacaoRetorno)}${perdido ? ` e perdeu ${perdido.emoji} ${perdido.nome}` : ''}.`, 'token');
      } else {
        this.log(`🃏 ÚLTIMA CARTADA: ${q.nome} falhou e foi eliminado.`, 'karma_ruim');
      }
      await this.anim({ type: 'ultima_cartada', player: q, sucesso, negocioPerdido: perdido, repAntes });
      if (!sucesso) {
        q.eliminado = true; q.repFinal = q.reputacao;
        const negociosPerdidos = q.negocios; q.negocios = [];
        if (this.vivos().length <= 1) {
          negociosPerdidos.forEach((id) => { S.negocios[id].dono = null; S.negocios[id].fechado = false; });
          this.encerrar('ultimo'); return;
        }
        const d = await this.ask({ type: 'decisao_grupo', eliminado: q });
        if (d === 'encerrar') {
          negociosPerdidos.forEach((id) => { S.negocios[id].dono = null; S.negocios[id].fechado = false; });
          this.encerrar('grupo'); return;
        }
        // Carta 5 — Falência Definitiva: se o jogo continua, os negócios do eliminado
        // vão inteiros para quem está com a pior reputação entre os jogadores ativos.
        if (negociosPerdidos.length) {
          const maisLascado = this.vivos().reduce((pior, cand) => (cand.reputacao < pior.reputacao ? cand : pior));
          negociosPerdidos.forEach((id) => {
            S.negocios[id].dono = maisLascado.id; S.negocios[id].fechado = false;
            maisLascado.negocios.push(id);
          });
          this.log(`💀 FALÊNCIA DEFINITIVA: os negócios de ${q.nome} foram herdados por ${maisLascado.avatar} ${maisLascado.nome} (o mais lascado da mesa).`, 'token');
          await this.anim({ type: 'heranca_falencia', de: q, para: maisLascado, negocios: negociosPerdidos });
        }
      }
    }
  }

  async proximoTurno() {
    const S = this.S; const n = S.players.length;
    // voltas são contadas por jogador: quem já concluiu as suas não joga mais, só espera os outros
    const ativos = S.players.filter((p) => !p.eliminado && !p.concluiu);
    if (!ativos.length) { this.encerrar('rodadas'); return; }
    let idx = S.turnoIdx, wrapped = false;
    do { idx++; if (idx >= n) { idx = 0; wrapped = true; } } while (S.players[idx].eliminado || S.players[idx].concluiu);
    if (wrapped) { S.rodada++; this.log(`— Ciclo ${S.rodada} da mesa —`, 'sistema'); }
    S.turnoIdx = idx;
  }

  encerrar(motivo) {
    const S = this.S; S.fase = 'fim'; S.motivoFim = motivo;
    S.players.forEach((p) => { if (!p.eliminado) p.repFinal = p.reputacao; });
    const vivos = S.players.filter((p) => !p.eliminado).sort((a, b) => b.repFinal - a.repFinal);
    const mortos = S.players.filter((p) => p.eliminado).sort((a, b) => b.repFinal - a.repFinal);
    S.ranking = [...vivos, ...mortos].map((p, i, arr) => ({
      id: p.id, nome: p.nome, avatar: p.avatar, cor: p.cor, reputacao: p.repFinal, eliminado: p.eliminado, negocios: p.negocios.length,
      posicao: i + 1, titulo: i === 0 ? 'Menos lascado(a) 👑' : i === arr.length - 1 ? 'Mais lascado(a) 💀' : '',
    }));
    this.log(`Fim de jogo (${motivo}).`, 'sistema');
  }
}

global.CaosEngine = { GameEngine, CONFIG, util, buildBoard, CATEGORIAS };
})(typeof window !== 'undefined' ? window : globalThis);
