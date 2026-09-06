/* =====================================================================
   CAOS IMOBILIÁRIO — SERVIDOR MULTIPLAYER (Node.js + ws)
   ---------------------------------------------------------------------
   • Uma GameEngine (js/engine.js, sem alterações) por sala, rodando aqui.
   • io.ask(pending)  -> manda `ask` SÓ para o jogador da vez e espera a
                         resposta pela rede (bots são decididos aqui mesmo).
   • io.animate(evt)  -> broadcast para a sala + snapshot do estado; espera
                         o `ack` dos clientes humanos conectados (com timeout)
                         para manter todo mundo sincronizado.
   • Reconexão: código da sala + token salvo no navegador.
   • Também serve os arquivos estáticos do jogo (pasta raiz do projeto).
   Variáveis de ambiente: PORT (padrão 8080), ROOM_TTL_MIN (padrão 10),
   ACK_TIMEOUT_MS (padrão 45000), SERVE_STATIC (padrão 1).
   ===================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

// ---- carrega a engine, os bots e os dados (arquivos de navegador: usam window.*) ----
global.window = globalThis;
const ROOT = path.join(__dirname, '..');
for (const f of ['data/negocios.js', 'data/prendas.js', 'data/eventos.js', 'js/engine.js', 'js/bots.js']) require(path.join(ROOT, f));
const { GameEngine, CONFIG } = globalThis.CaosEngine;
const CaosBots = globalThis.CaosBots;
const DATA = globalThis.CAOS_DATA;
const PERSONAGENS = require(path.join(ROOT, 'server', 'personagens.json'));

const PORT = +(process.env.PORT || 8080);
const ROOM_TTL_MS = +(process.env.ROOM_TTL_MIN || 10) * 60 * 1000;
const ACK_TIMEOUT_MS = +(process.env.ACK_TIMEOUT_MS || 45000);
const SERVE_STATIC = process.env.SERVE_STATIC !== '0';
const NOMES_BOT = ['Dona Zilda', 'Seu Raimundo', 'Tia Marlene', 'Jorginho', 'Madame Ruth', 'Cleitão', 'Sr. Barbosa', 'Vovó Cida', 'Naldinho', 'Dra. Fátima', 'Bruxo Waldemar', 'Lurdinha'];
const PERS = Object.keys(CaosBots.PERSONALIDADES);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ---------------- salas ---------------- */
const rooms = new Map();
function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c; do { c = 'C' + Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join(''); } while (rooms.has(c)); return c; }
function token() { return crypto.randomBytes(12).toString('base64url'); }

class Room {
  constructor(hostToken) {
    this.code = newCode(); this.hostToken = hostToken; this.modo = 'medio'; this.fase = 'lobby';
    this.members = []; // {token, nome, tipo, personagem, avatar, cor, personalidade, ws|null, playerId|null}
    this.engine = null; this.pendings = new Map(); // playerId -> {reqId, resolve, pending}
    this.acks = null; this.evtSeq = 0; this.touch(); rooms.set(this.code, this);
  }
  touch() { this.lastActivity = Date.now(); }
  member(tok) { return this.members.find((m) => m.token === tok); }
  humans() { return this.members.filter((m) => m.tipo === 'humano'); }
  connectedHumans() { return this.humans().filter((m) => m.ws && m.ws.readyState === 1); }
  lobbyInfo() {
    return { code: this.code, modo: this.modo, fase: this.fase, minJogadores: CONFIG.minJogadores, maxJogadores: CONFIG.maxJogadores,
      jogadores: this.members.map((m) => ({ nome: m.nome, tipo: m.tipo, personagem: m.personagem, avatar: m.avatar, cor: m.cor, personalidade: m.personalidade, conectado: m.tipo === 'bot' || !!(m.ws && m.ws.readyState === 1), host: m.token === this.hostToken })) };
  }
  send(m, msg) { if (m.ws && m.ws.readyState === 1) m.ws.send(JSON.stringify(msg)); }
  broadcast(msg) { const s = JSON.stringify(msg); this.members.forEach((m) => { if (m.ws && m.ws.readyState === 1) m.ws.send(s); }); }
  broadcastLobby() { this.broadcast({ t: 'lobby', lobby: this.lobbyInfo() }); }
  addMember(m) {
    if (this.fase !== 'lobby') throw new Error('A partida já começou — essa sala está fechada.');
    if (this.members.length >= CONFIG.maxJogadores) throw new Error('Sala cheia.');
    if (this.members.some((x) => x.personagem === m.personagem)) throw new Error('Esse personagem já foi escolhido nessa sala.');
    this.members.push(m); this.touch(); this.broadcastLobby();
  }
  addBot() {
    const usados = new Set(this.members.map((m) => m.personagem));
    const ch = PERSONAGENS.find((c) => !usados.has(c.id)); if (!ch) throw new Error('Não há personagens livres.');
    const bots = this.members.filter((m) => m.tipo === 'bot');
    this.addMember({ token: token(), nome: NOMES_BOT[bots.length % NOMES_BOT.length], tipo: 'bot', personagem: ch.id, avatar: ch.emoji, cor: ch.cor, personalidade: PERS[bots.length % PERS.length], ws: null });
  }
  removeMember(tok) { if (this.fase !== 'lobby') return; this.members = this.members.filter((m) => m.token !== tok); this.broadcastLobby(); }

  snapshot() { const S = this.engine.state; return { ...S, config: undefined, log: S.log.slice(-60) }; }

  /* ---- o io que a engine espera, mas pela rede ---- */
  io() {
    const room = this;
    return {
      onLog: (e) => log(`[${room.code}] ${e.texto}`),
      async ask(pending) {
        room.touch();
        if (pending.type === 'decisao_grupo') { // decisão do grupo: o anfitrião responde
          const host = room.member(room.hostToken); const alvo = host && host.ws ? host : room.connectedHumans()[0];
          if (!alvo) return 'continuar';
          room.broadcast({ t: 'aviso', texto: `Aguardando ${alvo.nome} decidir se a partida continua…`, exceto: alvo.playerId });
          return room.askPlayer(alvo, pending);
        }
        const m = room.members.find((x) => x.playerId === pending.playerId);
        const p = room.engine.player(pending.playerId);
        if (!m || m.tipo === 'bot') { // bot: decide aqui, mas dá tempo para os clientes verem
          await sleep(pending.type === 'prenda' ? 300 : 700);
          const c = CaosBots.decidir(pending, room.engine.state, p, room.engine.rng);
          if (pending.type === 'comprar' || (pending.type === 'acao_turno' && c === 'token')) {
            await room.io().animate({ type: 'bot_fala', player: p, texto: CaosBots.falar(p, pending.type === 'acao_turno' ? 'token' : pending.type, c), negocioId: pending.negocioId });
          }
          return c;
        }
        return room.askPlayer(m, pending);
      },
      async animate(evt) {
        room.touch();
        const id = ++room.evtSeq; const msg = { t: 'evt', id, evt, state: room.snapshot() };
        const esperados = room.connectedHumans();
        room.acks = { id, faltam: new Set(esperados.map((m) => m.token)), resolve: null };
        room.broadcast(msg);
        if (evt.type === 'fim') { room.fase = 'fim'; return; }
        if (!esperados.length) return sleep(300);
        await new Promise((res) => { room.acks.resolve = res; setTimeout(res, ACK_TIMEOUT_MS); });
        room.acks = null;
      },
    };
  }
  askPlayer(m, pending) {
    return new Promise((resolve) => {
      const reqId = token();
      this.pendings.set(m.token, { reqId, resolve, pending });
      this.send(m, { t: 'ask', reqId, pending, state: this.snapshot() });
      this.broadcast({ t: 'aguardando', playerId: m.playerId, nome: m.nome, exceto: m.playerId });
    });
  }
  onAnswer(m, reqId, value) {
    const pd = this.pendings.get(m.token); if (!pd || pd.reqId !== reqId) return;
    this.pendings.delete(m.token); pd.resolve(value);
  }
  onAck(m, id) { if (!this.acks || this.acks.id !== id) return; this.acks.faltam.delete(m.token); if (!this.acks.faltam.size && this.acks.resolve) this.acks.resolve(); }
  onDisconnect(m) { if (this.acks && this.acks.faltam.delete(m.token) && !this.acks.faltam.size && this.acks.resolve) this.acks.resolve(); this.broadcastLobby(); }

  start() {
    if (this.fase !== 'lobby') throw new Error('Partida já iniciada.');
    if (this.members.length < CONFIG.minJogadores) throw new Error(`Precisa de pelo menos ${CONFIG.minJogadores} jogadores.`);
    if (!this.humans().length) throw new Error('Pelo menos uma pessoa precisa jogar.');
    const setup = { modo: this.modo, jogadores: this.members.map((m) => ({ nome: m.nome, tipo: m.tipo, personagem: m.personagem, avatar: m.avatar, cor: m.cor, personalidade: m.personalidade })) };
    this.engine = new GameEngine(this.io(), DATA);
    const S = this.engine.iniciar(setup);
    this.members.forEach((m, i) => { m.playerId = S.players[i].id; });
    this.fase = 'jogando';
    const personagens = this.members.map((m) => m.personagem);
    this.members.forEach((m) => this.send(m, { t: 'start', setup, state: this.snapshot(), you: m.playerId, personagens }));
    log(`[${this.code}] partida iniciada: ${this.members.map((m) => m.nome).join(', ')}`);
    this.engine.rodar().catch((e) => { log(`[${this.code}] ERRO`, e); this.broadcast({ t: 'error', msg: 'Erro no servidor: ' + e.message }); });
  }
  resumeFor(m) { // reconexão: estado atual + pergunta pendente, se houver
    this.send(m, { t: 'start', setup: null, state: this.snapshot(), you: m.playerId, resume: true, personagens: this.members.map((x) => x.personagem) });
    const pd = this.pendings.get(m.token); if (pd) this.send(m, { t: 'ask', reqId: pd.reqId, pending: pd.pending, state: this.snapshot() });
    this.broadcastLobby();
  }
}

/* ---------------- HTTP (estático) + WS ---------------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, salas: rooms.size })); }
  if (!SERVE_STATIC) { res.writeHead(404); return res.end(); }
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || file.includes(path.sep + 'server' + path.sep) || file.includes('node_modules')) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end('não encontrado'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); });
});
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let room = null, me = null;
  const reply = (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
  const fail = (e) => reply({ t: 'error', msg: e.message || String(e) });
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    try {
      switch (msg.t) {
        case 'ping': return reply({ t: 'pong' });
        case 'personagens': return reply({ t: 'personagens', lista: PERSONAGENS });
        case 'create': {
          const tok = token(); room = new Room(tok); const ch = PERSONAGENS.find((c) => c.id === msg.personagem) || PERSONAGENS[0];
          if (CONFIG.modos[msg.modo]) room.modo = msg.modo;
          me = { token: tok, nome: String(msg.nome || 'Anfitrião').slice(0, 14), tipo: 'humano', personagem: ch.id, avatar: ch.emoji, cor: ch.cor, ws };
          room.addMember(me); log(`[${room.code}] criada por ${me.nome}`);
          return reply({ t: 'joined', code: room.code, token: tok, host: true, lobby: room.lobbyInfo() });
        }
        case 'join': {
          const r = rooms.get(String(msg.code || '').toUpperCase().trim()); if (!r) throw new Error('Sala não encontrada. Confere o código?');
          const ch = PERSONAGENS.find((c) => c.id === msg.personagem) || PERSONAGENS.find((c) => !r.members.some((m) => m.personagem === c.id));
          const tok = token(); me = { token: tok, nome: String(msg.nome || 'Jogador').slice(0, 14), tipo: 'humano', personagem: ch.id, avatar: ch.emoji, cor: ch.cor, ws };
          r.addMember(me); room = r; log(`[${room.code}] ${me.nome} entrou`);
          return reply({ t: 'joined', code: room.code, token: tok, host: false, lobby: room.lobbyInfo() });
        }
        case 'reconnect': {
          const r = rooms.get(String(msg.code || '').toUpperCase()); const m = r && r.member(msg.token); if (!m) throw new Error('Não deu para reconectar: sala expirou.');
          if (m.ws && m.ws !== ws && m.ws.readyState === 1) m.ws.close();
          m.ws = ws; me = m; room = r; log(`[${room.code}] ${me.nome} reconectou`);
          reply({ t: 'joined', code: room.code, token: m.token, host: m.token === room.hostToken, lobby: room.lobbyInfo(), reconnected: true });
          if (room.fase !== 'lobby') room.resumeFor(m); else room.broadcastLobby();
          return;
        }
      }
      if (!room || !me) throw new Error('Entre numa sala primeiro.');
      const isHost = me.token === room.hostToken;
      switch (msg.t) {
        case 'modo': if (!isHost) throw new Error('Só o anfitrião muda o modo.'); if (CONFIG.modos[msg.modo]) { room.modo = msg.modo; room.broadcastLobby(); } return;
        case 'add_bot': if (!isHost) throw new Error('Só o anfitrião adiciona bots.'); return room.addBot();
        case 'remove': { const tok = msg.token || me.token; if (!isHost && tok !== me.token) throw new Error('Sem permissão.'); if (tok === room.hostToken) throw new Error('O anfitrião não pode ser removido.'); const m = room.member(tok); room.removeMember(tok); if (m && m.ws && m.ws !== ws && m.ws.readyState === 1) m.ws.send(JSON.stringify({ t: 'kicked' })); return; }
        case 'remove_idx': { if (!isHost) throw new Error('Só o anfitrião remove.'); const m = room.members[msg.idx]; if (m && m.tipo === 'bot') room.removeMember(m.token); return; }
        case 'start': if (!isHost) throw new Error('Só o anfitrião começa.'); return room.start();
        case 'answer': return room.onAnswer(me, msg.reqId, msg.value);
        case 'ack': return room.onAck(me, msg.id);
        case 'leave': room.removeMember(me.token); me = null; room = null; return;
      }
    } catch (e) { fail(e); }
  });
  ws.on('close', () => { if (room && me) { if (me.ws === ws) me.ws = null; if (room.fase === 'lobby' && me.token !== room.hostToken) room.removeMember(me.token); else room.onDisconnect(me); } });
});

// limpeza de salas inativas
setInterval(() => { const now = Date.now(); for (const [code, r] of rooms) { const ttl = r.fase === 'jogando' && r.connectedHumans().length ? Infinity : ROOM_TTL_MS; if (now - r.lastActivity > ttl) { rooms.delete(code); log(`[${code}] sala removida por inatividade`); } } }, 30000);

server.listen(PORT, () => log(`Caos Imobiliário online em http://localhost:${PORT}  (WebSocket no mesmo endereço)`));
