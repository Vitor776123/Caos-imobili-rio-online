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
  reputacaoInicial: 30000,
  modos: {
    // rodadas = voltas completas que cada jogador precisa dar; tabuleiro = casas do loop
    rapido: { nome: 'Rápido', rodadas: 2, tempo: '15–25 min', tabuleiro: { negociosPorDistrito: 3, fortes: [1, 1, 1, 1, 1, 1, 1], leves: [1, 1, 1, 1, 1, 1, 1] } },   // 36 casas
    medio:  { nome: 'Médio',  rodadas: 3, tempo: '30–45 min', tabuleiro: { negociosPorDistrito: 4, fortes: [1, 1, 1, 2, 1, 1, 1], leves: [2, 2, 1, 2, 1, 2, 1] } },   // 48 casas
    longo:  { nome: 'Longo',  rodadas: 3, tempo: '60–90 min', tabuleiro: { negociosPorDistrito: 5, fortes: [1, 1, 1, 2, 1, 1, 1], leves: [3, 3, 2, 3, 2, 3, 2] } },   // 62 casas
  },
  taxaPercent: 0.12,            // taxa de visita = 12% do custo
  probKarmaTrigger: 0.35,       // chance de ALGUM karma acontecer ao visitar negócio de outro
  probKarmaBom: 0.5,            // dentro do trigger: chance de ser karma bom (visitante) vs ruim (dono ganha mais)
  rerollsPorPartida: 2,
  penalidadesRecusa: [300, 1300, 2300, 3000], // escalona por recusa (índice = nº de recusas anteriores; trava no último)
  karmaRuimPorToken: 3, // ainda usado só pra estatística/rancor, não gera mais token
  taxasPagasPorToken: 2, // a cada 2 taxas pagas (como visitante), ganha 1 Virada de Sorte — acumula sem limite
  chancesUltimaCartada: [0.40, 0.30, 0.15], // escalona por tentativa (índice = nº de usos anteriores); depois disso, sem chance
  reputacaoRetorno: 2500,
  rendaVoltaTopo: 1000,         // ajuste de balanceamento: ao passar pelo Topo
  dividendoPorTier: { Barato: 200, 'Médio': 400, Caro: 600 }, // Plano A: dividendo de portfólio ao passar pelo Topo
  impostoInveja: 800,
  roubadaPercent: 0.10,
  fiscalizacaoSemNegocio: 1000,
  negociosIniciais: () => 1,
  minJogadores: 2, maxJogadores: 12,
};

/* Descrição em linguagem simples do que cada efeito faz, pra mostrar ANTES de aplicar
   (sempre do ponto de vista de quem está vendo a tela — "você" = quem sofre o efeito). */
function descreverEfeito(item) {
  switch (item.tipo) {
    case 'perde_fixo': return `Você perde ${util.fmt(item.valor)}.`;
    case 'perde_percent': return `Você perde ${item.valor}% da sua reputação.`;
    case 'transfere_fixo': return `Você perde ${util.fmt(item.valor)} — vai pra quem causou isso.`;
    case 'transfere_percent': return `Você perde ${item.valor}% da sua reputação — vai pra quem causou isso.`;
    case 'perde_negocio': return 'Você perde um negócio aleatório seu (ele volta pro mercado).';
    case 'rouba_negocio': return 'Um negócio aleatório seu passa a ser de quem causou isso.';
    case 'rouba_negocio_especifico': return 'O negócio que acabou de ser visitado muda de dono.';
    case 'fecha_negocio': case 'fecha_negocio_proprio': return 'Um negócio aleatório seu fecha até sua próxima jogada.';
    case 'fecha_negocio_com_taxa': return 'Esse negócio fecha, e mesmo assim alguém recebe a taxa dele.';
    case 'bloqueia_dividendo': return 'Você não recebe o dividendo de portfólio na próxima volta pelo Início.';
    case 'reduz_dividendo': return `Seu próximo dividendo de portfólio fica ${item.percent}% menor.`;
    case 'transfere_dividendo_negocio': return `Você perde parte do valor desse negócio (${item.percent}% de um dividendo) pra quem causou isso.`;
    case 'forcar_karma_ruim': return `Você sofre karma ruim garantido na(s) próxima(s) ${item.vezes} visita(s) que fizer.`;
    case 'teleporte_casa_livre': case 'teleporte_prioridade': return 'Você teleporta pra perto de um negócio livre no tabuleiro.';
    case 'teleporte_relativo': return `Você é movido ${Math.abs(item.casas)} casa(s) ${item.casas < 0 ? 'pra trás' : 'pra frente'} agora mesmo.`;
    case 'troca_posicao': return 'Você troca de posição no tabuleiro com quem causou isso.';
    case 'troca_reputacao': return 'Você troca TODA a sua reputação com quem causou isso!';
    case 'volta_dado': return 'Você rola o dado e anda esse número de casas pra trás.';
    case 'compra_taxada': return `Sua próxima compra de negócio custa ${item.percent}% a mais.`;
    case 'taxa_dobrada_negocio': return 'Um negócio aleatório seu vai cobrar taxa em dobro na próxima visita.';
    case 'bloqueio_compra': case 'bloqueio_compra_outro': return `Você fica sem poder comprar negócios pelas próximas ${item.turnos} jogada(s).`;
    case 'restringe_dado': case 'restringe_dado_proprio': return `Seu próximo dado fica limitado entre ${item.min} e ${item.max}.`;
    case 'anda_menos': return `Você anda ${item.valor} casa(s) a menos na próxima rolagem de dado.`;
    case 'pula_dado': return 'Você perde a próxima rolagem de dado (fica parado esse turno).';
    case 'sem_reroll_token': case 'sem_reroll_token_outro': return `Você fica sem usar reroll nem token por ${item.turnos} jogada(s).`;
    case 'perde_reroll': return `Você perde ${item.valor} troca de prenda (reroll).`;
    case 'perde_token': return `Você perde ${item.valor} token de Virada de Sorte.`;
    case 'troca_reroll_token': return 'Você perde 1 reroll — quem causou isso ganha.';
    case 'transfere_token': return 'Você perde 1 token de Virada de Sorte pra quem causou isso (ou paga R$ 200 se não tiver nenhum).';
    case 'revela_reputacao': return 'Sua reputação total é revelada pra quem causou isso.';
    case 'desvaloriza_negocio': case 'desvaloriza_negocio_transfere': return `Um negócio seu perde ${item.percent}% de valor pra sempre.`;
    case 'fiscalizacao': return 'Um dos seus negócios sofre um karma ruim imediato.';
    case 'roubada': return 'Quem causou isso rouba parte da diferença de reputação entre vocês.';
  }
  return 'Efeito misterioso — só descobrindo na prática.';
}


// tipos genéricos usados pelos 3 catálogos abaixo — ver aplicarEfeitoGenerico()
const VIRADA_EFEITOS = [
  { titulo: 'Fiscalização Federal', tipo: 'fiscalizacao' },
  { titulo: 'Roubada de Sorte', tipo: 'roubada' },
  { titulo: 'Imposto de Inveja', tipo: 'transfere_fixo', valor: 800 },
  { titulo: 'Fofoca Destruidora', tipo: 'fecha_negocio', turnos: 1 },
  { titulo: 'Investigação da Receita', tipo: 'perde_percent', valor: 15 },
  { titulo: 'Chantagem Anônima', tipo: 'transfere_fixo', valor: 1000 },
  { titulo: 'Boicote Popular', tipo: 'bloqueia_dividendo', vezes: 1 },
  { titulo: 'Sabotagem Silenciosa', tipo: 'forcar_karma_ruim', vezes: 1 },
  { titulo: 'Golpe Duplo', tipo: 'rouba_negocio' },
  { titulo: 'Fuga Estratégica', tipo: 'teleporte_casa_livre' },
  { titulo: 'Herança Contestada', tipo: 'troca_posicao' },
  { titulo: 'Estrada Torta', tipo: 'volta_dado' },
  { titulo: 'Taxa Extra pro Rival', tipo: 'compra_taxada', percent: 20 },
  { titulo: 'Praga da Vizinhança', tipo: 'taxa_dobrada_negocio' },
  { titulo: 'Reviravolta Total', tipo: 'troca_reputacao' },
  { titulo: 'Provocação Cármica', tipo: 'forcar_karma_ruim', vezes: 2 },
  { titulo: 'Fama Negativa', tipo: 'reduz_dividendo', percent: 50, vezes: 1 },
  { titulo: 'Golpe do Silêncio', tipo: 'bloqueio_compra', turnos: 1 },
  { titulo: 'Dado Trancado', tipo: 'restringe_dado', min: 1, max: 3 },
  { titulo: 'Bloqueio Bancário', tipo: 'sem_reroll_token', turnos: 1 },
];
const KARMA_RUIM_ONLINE = [
  { titulo: 'Atraso no trânsito', tipo: 'anda_menos', valor: 1 },
  { titulo: 'Reroll perdido', tipo: 'perde_reroll', valor: 1 },
  { titulo: 'Multa simples', tipo: 'perde_fixo', valor: 100 },
  { titulo: 'Atalho Torto', tipo: 'teleporte_relativo', casas: -1 },
  { titulo: 'Dado capado', tipo: 'restringe_dado_proprio', min: 1, max: 4 },
  { titulo: 'Dividendo pela metade', tipo: 'reduz_dividendo', percent: 50, vezes: 1 },
  { titulo: 'Turno perdido', tipo: 'pula_dado' },
  { titulo: 'Compras bloqueadas', tipo: 'bloqueio_compra', turnos: 1 },
  { titulo: 'Negócio fechado', tipo: 'fecha_negocio_proprio', turnos: 1 },
  { titulo: 'Token confiscado', tipo: 'perde_token', valor: 1 },
  { titulo: 'Multa pesada', tipo: 'perde_fixo', valor: 500 },
  { titulo: 'Compra Cara', tipo: 'compra_taxada', percent: 20, beneficiario: 'dono' },
  { titulo: 'Dividendo confiscado de novo', tipo: 'reduz_dividendo', percent: 50, vezes: 1 },
  { titulo: 'Estrada Torta Pessoal', tipo: 'volta_dado' },
  { titulo: 'Negócio confiscado', tipo: 'perde_negocio' },
  { titulo: 'Confisco parcial', tipo: 'perde_percent', valor: 10 },
  { titulo: 'Conta bem bloqueada', tipo: 'bloqueio_compra', turnos: 2 },
  { titulo: 'Negócio interditado', tipo: 'fecha_negocio_proprio', turnos: 3 },
  { titulo: 'Azar contagioso', tipo: 'forcar_karma_ruim', vezes: 1, alvoProprio: true },
  { titulo: 'Desvalorização', tipo: 'desvaloriza_negocio', percent: 20 },
];
const KARMA_BOM_ONLINE = [
  { titulo: 'Reembolso simples', tipo: 'transfere_fixo', valor: 100 },
  { titulo: 'Meio dividendo alheio', tipo: 'transfere_dividendo_negocio', percent: 50 },
  { titulo: 'Reroll de presente', tipo: 'troca_reroll_token' },
  { titulo: 'Indenização', tipo: 'transfere_fixo', valor: 150 },
  { titulo: 'Meia taxa futura', tipo: 'transfere_dividendo_negocio', percent: 50 },
  { titulo: 'Sorte emprestada', tipo: 'transfere_token' },
  { titulo: 'Bloqueio de compra do dono', tipo: 'bloqueio_compra_outro', turnos: 1 },
  { titulo: 'Cobrança fantasma', tipo: 'fecha_negocio_com_taxa', turnos: 1 },
  { titulo: 'Indenização pesada', tipo: 'transfere_fixo', valor: 500 },
  { titulo: 'Espionagem', tipo: 'revela_reputacao' },
  { titulo: 'Compra Cara ao Contrário', tipo: 'compra_taxada', percent: 20, beneficiario: 'visitante' },
  { titulo: 'Bloqueio banc. do dono', tipo: 'sem_reroll_token_outro', turnos: 1 },
  { titulo: 'Rodada perdida do dono', tipo: 'fecha_negocio_com_taxa', turnos: 1 },
  { titulo: 'Golpe de Sorte', tipo: 'rouba_negocio_especifico' },
  { titulo: 'Confisco a seu favor', tipo: 'transfere_percent', valor: 10 },
  { titulo: 'Bloqueio duplo', tipo: 'bloqueio_compra_outro', turnos: 2 },
  { titulo: 'Desvalorização a seu favor', tipo: 'desvaloriza_negocio_transfere', percent: 20 },
  { titulo: 'Indenização máxima', tipo: 'transfere_fixo', valor: 1000 },
  { titulo: 'Taxa reduzida geral', tipo: 'transfere_dividendo_negocio', percent: 50 },
  { titulo: 'Teleporte de Sorte', tipo: 'teleporte_prioridade' },
];

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
        dono: null, fechado: false, nivel: 1,
      };
    });
    const board = buildBoard(this.data.negocios, CONFIG.modos[setup.modo].tabuleiro, rng);
    const players = setup.jogadores.map((j, i) => ({
      id: 'p' + i, idx: i, nome: j.nome, tipo: j.tipo, personalidade: j.personalidade || null,
      avatar: j.avatar, cor: j.cor,
      reputacao: CONFIG.reputacaoInicial, posicao: 0, negocios: [],
      rerolls: CONFIG.rerollsPorPartida, karmaRuim: 0, tokens: 0, taxasPagas: 0, usouTokenNesteTurno: false,
      voltas: 0, concluiu: false, contaBloqueada: 0, bloqueioAtivo: false,
      eliminado: false, repFinal: null, rancor: {},
      ultimaCartadaUsos: 0, recusasPrenda: 0,
      flags: { forcarKarmaRuim: 0, dividendoBloqueadoVezes: 0, dividendoReduzidoVezes: 0, dividendoReduzidoPercent: 0,
        andaMenos: 0, pulaDado: 0, dadoMin: null, dadoMax: null, semRerollToken: 0,
        compraTaxadaPercent: 0, compraTaxadaPara: null, compraTaxadaVezes: 0 },
    }));
    // negócios iniciais sorteados
    const ids = util.shuffle(board.cells.filter((c) => c.type === 'negocio').map((c) => c.negocioId), rng);
    const qtd = CONFIG.negociosIniciais(players.length);
    players.forEach((p) => { for (let k = 0; k < qtd; k++) { const id = ids.pop(); if (!id) break; negocios[id].dono = p.id; p.negocios.push(id); } });

    this.state = {
      config: CONFIG, modo: setup.modo, rodadasTotais: CONFIG.modos[setup.modo].rodadas, online: !!setup.online,
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
    const semRerollToken = p.flags.semRerollToken > 0; if (p.flags.semRerollToken > 0) p.flags.semRerollToken--;
    p._semRerollTurno = semRerollToken;
    p.usouTokenNesteTurno = false;
    // reabre negócios fechados por Fofoca
    p.negocios.forEach((id) => { if (S.negocios[id].fechado) { S.negocios[id].fechado = false; this.log(`${S.negocios[id].emoji} ${S.negocios[id].nome} reabriu.`, 'info'); } });
    await this.anim({ type: 'turno_inicio', player: p });
    for (;;) {
      const a = await this.ask({ type: 'acao_turno', playerId: p.id, podeToken: p.tokens > 0 && !semRerollToken && !p.usouTokenNesteTurno });
      if (a === 'token' && p.tokens > 0 && !semRerollToken && !p.usouTokenNesteTurno) { await this.usarToken(p); continue; }
      break;
    }
    if (p.flags.pulaDado > 0) {
      p.flags.pulaDado--;
      this.log(`${p.avatar} ${p.nome} perdeu a rolagem de dado dessa vez.`, 'sistema');
      await this.anim({ type: 'pulou_dado', player: p });
    } else {
      let jogarDeNovo = true;
      while (jogarDeNovo) {
        jogarDeNovo = false;
        let min = 1, max = 6;
        if (p.flags.dadoMin || p.flags.dadoMax) { min = p.flags.dadoMin || 1; max = p.flags.dadoMax || 6; p.flags.dadoMin = null; p.flags.dadoMax = null; }
        let dado = util.int(this.rng, min, max);
        if (p.flags.andaMenos > 0) { dado = Math.max(1, dado - p.flags.andaMenos); p.flags.andaMenos = 0; }
        this.log(`${p.avatar} ${p.nome} tirou ${dado} no dado.`, 'dado');
        await this.anim({ type: 'dado', player: p, valor: dado });
        await this.mover(p, dado);
        await this.resolverCasa(p);
        await this.checarQuebras();
        if (S.fase !== 'jogando') return;
        if (p.eliminado) break;
        if (dado === 6) { jogarDeNovo = true; this.log(`🎲 ${p.nome} tirou 6 e joga de novo!`, 'sistema'); await this.anim({ type: 'joga_de_novo', player: p }); }
      }
    }
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
        let dividendo = p.negocios.reduce((soma, id) => soma + (CONFIG.dividendoPorTier[S.negocios[id].tier] || 0), 0);
        let obs = '';
        if (p.flags.dividendoBloqueadoVezes > 0) { p.flags.dividendoBloqueadoVezes--; obs = ' (dividendo bloqueado dessa vez!)'; dividendo = 0; }
        else if (p.flags.dividendoReduzidoVezes > 0) { p.flags.dividendoReduzidoVezes--; const corte = Math.round(dividendo * p.flags.dividendoReduzidoPercent / 100); obs = ` (dividendo reduzido em ${p.flags.dividendoReduzidoPercent}%!)`; dividendo -= corte; }
        const total = CONFIG.rendaVoltaTopo + dividendo;
        p.reputacao += total;
        p.voltas++;
        if (p.voltas >= S.rodadasTotais) p.concluiu = true;
        const detalheDividendo = dividendo > 0 ? ` (${util.fmt(CONFIG.rendaVoltaTopo)} fixos + ${util.fmt(dividendo)} de dividendo de portfólio)` : '';
        this.log(`${p.avatar} ${p.nome} passou pelo Início (volta ${p.voltas}/${S.rodadasTotais}) e recebeu ${util.fmt(total)}${detalheDividendo}${obs}.`, 'ganho');
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
        let custo = n.custo, obs = '';
        if (p.flags.compraTaxadaVezes > 0) {
          const extra = Math.round(custo * p.flags.compraTaxadaPercent / 100);
          custo += extra; p.flags.compraTaxadaVezes = 0;
          const beneficiario = this.player(p.flags.compraTaxadaPara);
          if (beneficiario) beneficiario.reputacao += extra;
          obs = ` (+${util.fmt(extra)} de taxa extra${beneficiario ? ` pra ${beneficiario.nome}` : ''})`;
        }
        p.reputacao -= custo; n.dono = p.id; p.negocios.push(n.id);
        this.log(`${p.avatar} ${p.nome} comprou ${n.emoji} ${n.nome} por ${util.fmt(custo)}${obs}.`, 'compra');
        await this.anim({ type: 'compra', player: p, negocio: n });
      } else {
        this.log(`${p.avatar} ${p.nome} passou batido por ${n.emoji} ${n.nome}.`, 'info');
        await this.anim({ type: 'nao_comprou', player: p, negocio: n });
      }
      return;
    }
    if (n.dono === p.id) {
      const podePagar = p.reputacao > n.custo;
      const r = await this.ask({ type: 'melhorar', playerId: p.id, negocioId: n.id, custo: n.custo, taxaAtual: n.taxa, novaTaxa: n.taxa * 2, nivel: n.nivel, podePagar });
      if (r === 'sim' && podePagar) {
        p.reputacao -= n.custo; n.nivel = (n.nivel || 1) + 1; n.taxa *= 2;
        this.log(`${p.avatar} ${p.nome} melhorou ${n.emoji} ${n.nome} pagando ${util.fmt(n.custo)} de novo — a taxa dobrou pra ${util.fmt(n.taxa)}!`, 'compra');
        await this.anim({ type: 'melhorou', player: p, negocio: n });
      } else {
        this.log(`${p.avatar} ${p.nome} visitou o próprio ${n.nome}. Tudo em ordem (por enquanto).`, 'info');
        await this.anim({ type: 'proprio', player: p, negocio: n });
      }
      return;
    }
    const dono = this.player(n.dono);
    if (n.fechado) { this.log(`${n.emoji} ${n.nome} está fechado por fofoca. ${p.nome} não pagou nada.`, 'info'); return this.anim({ type: 'fechado', player: p, negocio: n, dono }); }
    // 1) taxa
    let taxa = n.taxa, obsTaxa = '';
    if (n.taxaDobradaProxima) { taxa *= 2; n.taxaDobradaProxima = false; obsTaxa = ' (taxa em dobro — praga da vizinhança!)'; }
    p.reputacao -= taxa; dono.reputacao += taxa;
    const textoTaxa = this.texto(n.taxas, n);
    this.log(`${p.avatar} ${p.nome} pagou ${util.fmt(taxa)} a ${dono.nome} em ${n.emoji} ${n.nome}${obsTaxa}.`, 'taxa');
    await this.anim({ type: 'taxa', player: p, dono, negocio: n, valor: taxa, texto: textoTaxa });
    await this.contarTaxaPaga(p);
    // 2) karma
    await this.dispararKarma(p, dono, n, false);
  }

  async dispararKarma(visitante, dono, n, forcarRuim) {
    if (!forcarRuim && visitante.flags.forcarKarmaRuim > 0) { forcarRuim = true; visitante.flags.forcarKarmaRuim--; }
    const disparou = forcarRuim || this.rng() < CONFIG.probKarmaTrigger;
    if (!disparou) return; // maioria das visitas: só a taxa mesmo, sem karma
    const bom = !forcarRuim && this.rng() < CONFIG.probKarmaBom;
    const valor = n.taxa; // agora é sempre exatamente a taxa que acabou de ser paga
    const alvo = bom ? dono : visitante;
    let texto;
    if (bom) { texto = this.texto(n.karmaBom, n); dono.reputacao -= valor; visitante.reputacao += valor; this.rancor(dono, visitante); }
    else { texto = this.texto(n.karmaRuim, n); visitante.reputacao -= valor; dono.reputacao += valor; this.rancor(visitante, dono); }
    const quemGanha = bom ? visitante : dono, quemPerde = bom ? dono : visitante;
    this.log(`${bom ? '🍀 Karma bom' : '💀 Karma ruim'} em ${n.emoji} ${n.nome}: ${quemPerde.nome} perdeu ${util.fmt(valor)} para ${quemGanha.nome}.`, bom ? 'karma_bom' : 'karma_ruim');
    await this.anim({ type: 'karma', bom, visitante, dono, negocio: n, valor, texto, alvo });
    if (!bom) await this.contarKarmaRuim(alvo);
    if (this.S.online) await this.aplicarEfeitoOnlineKarma(bom, visitante, dono, n);
    else await this.aplicarPrenda(alvo, bom ? 'karma_bom' : 'karma_ruim');
  }

  rancor(vitima, culpado) { if (vitima.id !== culpado.id) vitima.rancor[culpado.id] = (vitima.rancor[culpado.id] || 0) + 1; }

  async contarKarmaRuim(p) {
    p.karmaRuim++; // mantido só pra estatística/rancor; não concede mais Virada de Sorte
  }

  async contarTaxaPaga(p) {
    p.taxasPagas++;
    if (p.taxasPagas % CONFIG.taxasPagasPorToken === 0) {
      p.tokens++;
      this.log(`🍀 ${p.nome} pagou ${p.taxasPagas} taxas e ganhou uma Virada de Sorte!`, 'token');
      await this.anim({ type: 'token_ganho', player: p });
    }
  }

  penalidadeRecusa(p) { const i = Math.min(p.recusasPrenda, CONFIG.penalidadesRecusa.length - 1); return CONFIG.penalidadesRecusa[i]; }

  async aplicarPrenda(p, motivo) {
    const lista = this.data.prendas;
    let prenda = util.pick(lista, this.rng);
    for (;;) {
      const r = await this.ask({ type: 'prenda', playerId: p.id, prenda, rerolls: p.rerolls, motivo });
      if (r === 'reroll' && p.rerolls > 0 && !p._semRerollTurno) { p.rerolls--; let nova; do { nova = util.pick(lista, this.rng); } while (nova === prenda && lista.length > 1); prenda = nova; this.log(`🎲 ${p.nome} trocou a prenda (${p.rerolls} trocas restantes).`, 'info'); continue; }
      if (r === 'saude') { let nova; do { nova = util.pick(lista, this.rng); } while (nova === prenda && lista.length > 1); prenda = nova; this.log(`🩺 ${p.nome} não pode cumprir essa prenda; outra foi sorteada.`, 'info'); continue; }
      if (r === 'recusar') {
        const valor = this.penalidadeRecusa(p); p.recusasPrenda++;
        p.reputacao -= valor;
        this.log(`🙅 ${p.nome} recusou a prenda e perdeu ${util.fmt(valor)}.`, 'karma_ruim');
        await this.anim({ type: 'prenda_recusada', player: p, valor });
        break;
      }
      this.log(`🎭 ${p.nome} cumpriu a prenda: ${prenda.texto}`, 'prenda');
      await this.anim({ type: 'prenda_cumprida', player: p, prenda });
      break;
    }
  }

  /* --- Karma online: penalidades/efeitos leves em vez de prenda física --- */
  async aplicarEfeitoOnlineKarma(bom, visitante, dono, n) {
    const lista = bom ? KARMA_BOM_ONLINE : KARMA_RUIM_ONLINE;
    const alvo = bom ? dono : visitante; // quem sofre o efeito extra
    let item = util.pick(lista, this.rng);
    for (;;) {
      const r = await this.ask({ type: 'efeito_online', playerId: alvo.id, item, rerolls: alvo.rerolls, bom });
      if (r === 'reroll' && alvo.rerolls > 0 && !alvo._semRerollTurno) { alvo.rerolls--; let novo; do { novo = util.pick(lista, this.rng); } while (novo === item && lista.length > 1); item = novo; this.log(`🎲 ${alvo.nome} trocou o efeito (${alvo.rerolls} trocas restantes).`, 'info'); continue; }
      if (r === 'recusar') {
        const valor = this.penalidadeRecusa(alvo); alvo.recusasPrenda++;
        alvo.reputacao -= valor;
        this.log(`🙅 ${alvo.nome} recusou o efeito e perdeu ${util.fmt(valor)}.`, 'karma_ruim');
        await this.anim({ type: 'prenda_recusada', player: alvo, valor });
        return;
      }
      break;
    }
    const detalhe = this.aplicarEfeitoGenerico(item, alvo, bom ? visitante : dono, { negocio: n });
    this.log(`${item.titulo}: ${detalhe}`, bom ? 'karma_bom' : 'karma_ruim');
    await this.anim({ type: 'efeito_online', player: alvo, item, bom, detalhe });
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
    p.tokens--; p.usouTokenNesteTurno = true;
    const alvo = this.lider(p.id);
    if (!alvo) return;
    const item = util.pick(VIRADA_EFEITOS, this.rng);
    this.rancor(alvo, p);
    let detalhe;
    if (item.tipo === 'fiscalizacao') {
      const S = this.S; const negocio = alvo.negocios.length ? S.negocios[util.pick(alvo.negocios, this.rng)] : null;
      detalhe = negocio ? `Fiscalização Federal bateu em ${negocio.emoji} ${negocio.nome} de ${alvo.nome}.` : `${alvo.nome} não tem negócios — multa direta de ${util.fmt(CONFIG.fiscalizacaoSemNegocio)}.`;
      this.log(`🍀 ${p.nome} usou Virada de Sorte: ${detalhe}`, 'token');
      await this.anim({ type: 'virada', player: p, alvo, item, detalhe });
      if (negocio) await this.dispararKarma(alvo, alvo, negocio, true); else alvo.reputacao -= CONFIG.fiscalizacaoSemNegocio;
    } else if (item.tipo === 'roubada') {
      const valor = Math.max(0, Math.round((alvo.reputacao - p.reputacao) * CONFIG.roubadaPercent / 10) * 10);
      alvo.reputacao -= valor; p.reputacao += valor;
      detalhe = `${p.nome} roubou ${util.fmt(valor)} da diferença de reputação de ${alvo.nome}.`;
      this.log(`🍀 ${p.nome} usou Virada de Sorte: ${detalhe}`, 'token');
      await this.anim({ type: 'virada', player: p, alvo, item, detalhe });
    } else {
      detalhe = this.aplicarEfeitoGenerico(item, alvo, p, {});
      this.log(`🍀 ${p.nome} usou Virada de Sorte — ${item.titulo}: ${detalhe}`, 'token');
      await this.anim({ type: 'virada', player: p, alvo, item, detalhe });
    }
    await this.checarQuebras();
  }

  /* --- executor genérico de efeitos (Virada de Sorte + Karma Online) --- */
  aplicarEfeitoGenerico(item, alvo, ator, ctx) {
    const S = this.S;
    switch (item.tipo) {
      case 'perde_fixo': alvo.reputacao -= item.valor; return `${alvo.nome} perdeu ${util.fmt(item.valor)}.`;
      case 'perde_percent': { const v = Math.round(Math.max(0, alvo.reputacao) * item.valor / 100); alvo.reputacao -= v; return `${alvo.nome} perdeu ${item.valor}% (${util.fmt(v)}).`; }
      case 'transfere_fixo': alvo.reputacao -= item.valor; if (ator && ator.id !== alvo.id) ator.reputacao += item.valor; return `${alvo.nome} perdeu ${util.fmt(item.valor)} para ${ator ? ator.nome : 'o banco'}.`;
      case 'transfere_percent': { const v = Math.round(Math.max(0, alvo.reputacao) * item.valor / 100); alvo.reputacao -= v; if (ator) ator.reputacao += v; return `${alvo.nome} perdeu ${item.valor}% (${util.fmt(v)}) para ${ator ? ator.nome : 'o banco'}.`; }
      case 'perde_negocio': { if (!alvo.negocios.length) { alvo.reputacao -= 1000; return `${alvo.nome} não tinha negócio pra perder — multa de R$ 1.000.`; } const id = util.pick(alvo.negocios, this.rng); alvo.negocios = alvo.negocios.filter((x) => x !== id); S.negocios[id].dono = null; S.negocios[id].fechado = false; return `${alvo.nome} perdeu ${S.negocios[id].emoji} ${S.negocios[id].nome}.`; }
      case 'rouba_negocio': { if (!alvo.negocios.length) { alvo.reputacao -= 500; return `${alvo.nome} não tinha negócio — multa de R$ 500.`; } const id = util.pick(alvo.negocios, this.rng); alvo.negocios = alvo.negocios.filter((x) => x !== id); S.negocios[id].dono = ator.id; ator.negocios.push(id); return `${ator.nome} roubou ${S.negocios[id].emoji} ${S.negocios[id].nome} de ${alvo.nome}.`; }
      case 'rouba_negocio_especifico': { const n = ctx.negocio; if (!n) return 'nada aconteceu.'; alvo.negocios = alvo.negocios.filter((x) => x !== n.id); n.dono = ator.id; ator.negocios.push(n.id); return `${ator.nome} ficou com ${n.emoji} ${n.nome} de ${alvo.nome}.`; }
      case 'fecha_negocio': case 'fecha_negocio_proprio': { if (!alvo.negocios.length) return `${alvo.nome} não tem negócio pra fechar.`; const id = util.pick(alvo.negocios, this.rng); S.negocios[id].fechado = true; return `${S.negocios[id].emoji} ${S.negocios[id].nome} de ${alvo.nome} fechou até a próxima jogada dele.`; }
      case 'fecha_negocio_com_taxa': { const n = ctx.negocio; if (!n) return 'nada aconteceu.'; n.fechado = true; alvo.reputacao -= n.taxa; if (ator) ator.reputacao += n.taxa; return `${n.emoji} ${n.nome} fechou, e ${ator ? ator.nome : 'o visitante'} recebeu ${util.fmt(n.taxa)} mesmo assim.`; }
      case 'bloqueia_dividendo': alvo.flags.dividendoBloqueadoVezes = (alvo.flags.dividendoBloqueadoVezes || 0) + item.vezes; return `${alvo.nome} não vai receber dividendo de portfólio na próxima volta.`;
      case 'reduz_dividendo': alvo.flags.dividendoReduzidoPercent = item.percent; alvo.flags.dividendoReduzidoVezes = (alvo.flags.dividendoReduzidoVezes || 0) + item.vezes; return `${alvo.nome} vai receber só ${100 - item.percent}% do próximo dividendo.`;
      case 'transfere_dividendo_negocio': { const n = ctx.negocio; const tier = n ? n.tier : 'Barato'; const v = Math.round((CONFIG.dividendoPorTier[tier] || 200) * item.percent / 100); alvo.reputacao -= v; if (ator) ator.reputacao += v; return `${alvo.nome} perdeu ${util.fmt(v)} de dividendo para ${ator ? ator.nome : 'o banco'}.`; }
      case 'forcar_karma_ruim': { const alvoReal = item.alvoProprio ? alvo : alvo; alvoReal.flags.forcarKarmaRuim = (alvoReal.flags.forcarKarmaRuim || 0) + item.vezes; return `${alvoReal.nome} vai sofrer karma ruim garantido na(s) próxima(s) ${item.vezes} visita(s).`; }
      case 'teleporte_casa_livre': case 'teleporte_prioridade': { const livres = S.board.cells.filter((c) => c.type === 'negocio' && !S.negocios[c.negocioId].dono); if (!livres.length) return `${ator.nome} não encontrou nenhuma casa livre pra teleportar.`; const c = util.pick(livres, this.rng); ator.posicao = c.id; return `${ator.nome} teleportou pra perto de ${S.negocios[c.negocioId].emoji} ${S.negocios[c.negocioId].nome}.`; }
      case 'teleporte_relativo': { const cells = S.board.cells; let novaPos = alvo.posicao + item.casas; novaPos = ((novaPos % cells.length) + cells.length) % cells.length; alvo.posicao = novaPos; return `${alvo.nome} foi empurrado ${item.casas < 0 ? Math.abs(item.casas) + ' casa(s) pra trás' : item.casas + ' casa(s) pra frente'}.`; }
      case 'troca_posicao': { const tmp = ator.posicao; ator.posicao = alvo.posicao; alvo.posicao = tmp; return `${ator.nome} e ${alvo.nome} trocaram de lugar no tabuleiro.`; }
      case 'troca_reputacao': { const tmp = ator.reputacao; ator.reputacao = alvo.reputacao; alvo.reputacao = tmp; return `${ator.nome} e ${alvo.nome} trocaram toda a reputação!`; }
      case 'volta_dado': { const passos = util.int(this.rng, 1, 6); const cells = S.board.cells; alvo.posicao = ((alvo.posicao - passos) % cells.length + cells.length) % cells.length; return `${alvo.nome} tirou ${passos} e andou ${passos} casa(s) pra trás.`; }
      case 'compra_taxada': { const paraId = item.beneficiario === 'dono' ? ctx.dono?.id : item.beneficiario === 'visitante' ? ctx.visitante?.id : ator.id; alvo.flags.compraTaxadaPercent = item.percent; alvo.flags.compraTaxadaPara = paraId; alvo.flags.compraTaxadaVezes = 1; return `A próxima compra de ${alvo.nome} vai custar ${item.percent}% a mais.`; }
      case 'taxa_dobrada_negocio': { if (!alvo.negocios.length) return `${alvo.nome} não tem negócio pra praguejar.`; const id = util.pick(alvo.negocios, this.rng); S.negocios[id].taxaDobradaProxima = true; return `${S.negocios[id].emoji} ${S.negocios[id].nome} vai cobrar taxa em dobro na próxima visita.`; }
      case 'bloqueio_compra': case 'bloqueio_compra_outro': alvo.contaBloqueada = Math.max(alvo.contaBloqueada, item.turnos); return `${alvo.nome} não pode comprar negócios pelas próximas ${item.turnos} jogada(s).`;
      case 'restringe_dado': case 'restringe_dado_proprio': alvo.flags.dadoMin = item.min; alvo.flags.dadoMax = item.max; return `O próximo dado de ${alvo.nome} fica limitado entre ${item.min} e ${item.max}.`;
      case 'anda_menos': alvo.flags.andaMenos = (alvo.flags.andaMenos || 0) + item.valor; return `${alvo.nome} vai andar ${item.valor} casa(s) a menos na próxima rolagem.`;
      case 'pula_dado': alvo.flags.pulaDado = (alvo.flags.pulaDado || 0) + 1; return `${alvo.nome} vai perder a próxima rolagem de dado.`;
      case 'sem_reroll_token': case 'sem_reroll_token_outro': alvo.flags.semRerollToken = (alvo.flags.semRerollToken || 0) + item.turnos; return `${alvo.nome} fica sem reroll nem token por ${item.turnos} jogada(s).`;
      case 'perde_reroll': alvo.rerolls = Math.max(0, alvo.rerolls - item.valor); return `${alvo.nome} perdeu ${item.valor} reroll.`;
      case 'perde_token': alvo.tokens = Math.max(0, alvo.tokens - item.valor); return `${alvo.nome} perdeu ${item.valor} token de Virada de Sorte.`;
      case 'troca_reroll_token': { alvo.rerolls = Math.max(0, alvo.rerolls - 1); ator.rerolls++; return `${ator.nome} ganhou 1 reroll de ${alvo.nome}.`; }
      case 'transfere_token': { if (alvo.tokens > 0) { alvo.tokens--; ator.tokens++; return `${ator.nome} ganhou 1 token de Virada de Sorte de ${alvo.nome}.`; } alvo.reputacao -= 200; if (ator) ator.reputacao += 200; return `${alvo.nome} não tinha token — pagou R$ 200 pra ${ator.nome} no lugar.`; }
      case 'revela_reputacao': return `${alvo.nome} teve a reputação revelada: ${util.fmt(alvo.reputacao)}.`;
      case 'desvaloriza_negocio': { if (!alvo.negocios.length) return `${alvo.nome} não tem negócio pra desvalorizar.`; const id = util.pick(alvo.negocios, this.rng); const n = S.negocios[id]; const corte = Math.round(n.custo * item.percent / 100); n.custo -= corte; n.taxa = Math.round((n.custo * CONFIG.taxaPercent) / 50) * 50; return `${n.emoji} ${n.nome} perdeu ${item.percent}% de valor.`; }
      case 'desvaloriza_negocio_transfere': { const n = ctx.negocio; if (!n) return 'nada aconteceu.'; const corte = Math.round(n.custo * item.percent / 100); n.custo -= corte; n.taxa = Math.round((n.custo * CONFIG.taxaPercent) / 50) * 50; alvo.reputacao -= corte; if (ator) ator.reputacao += corte; return `${n.emoji} ${n.nome} perdeu ${item.percent}% de valor, e ${ator ? ator.nome : 'o visitante'} embolsou a diferença.`; }
    }
    return 'nada aconteceu.';
  }

  /* --- quebra / Última Cartada / eliminação --- */
  async checarQuebras() {
    const S = this.S;
    for (const q of S.players) {
      if (S.fase !== 'jogando') return;
      if (q.eliminado || q.reputacao > 0) continue;
      const chances = CONFIG.chancesUltimaCartada;
      const temChance = q.ultimaCartadaUsos < chances.length;
      const sucesso = temChance && this.rng() < chances[q.ultimaCartadaUsos];
      if (temChance) q.ultimaCartadaUsos++;
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

global.CaosEngine = { GameEngine, CONFIG, util, buildBoard, CATEGORIAS, VIRADA_EFEITOS, KARMA_RUIM_ONLINE, KARMA_BOM_ONLINE, descreverEfeito };
})(typeof window !== 'undefined' ? window : globalThis);
