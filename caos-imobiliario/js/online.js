/* =====================================================================
   CAOS IMOBILIÁRIO — MODO ONLINE (cliente)
   Fluxo: aba Online → criar/entrar sala → lobby → partida.
   Na partida, o servidor manda `ask` (só para o jogador da vez) e `evt`
   (para todos). Este arquivo entrega isso às mesmas funções da UI
   (UI.io().ask / UI.io().animate) e devolve `answer` / `ack` pela rede.
   ===================================================================== */
(function () {
'use strict';
const { UI, showScreen, toast } = CaosUI;
const { CONFIG } = CaosEngine;
const $ = (s, r = document) => s[0] === '#' && !s.includes(' ') ? document.getElementById(s.slice(1)) : r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CHARS = (window.CaosChars && CaosChars.LIST) || [];

let net = null, lobby = null, myToken = null, isHost = false, modo = 'medio';
const me = { nome: '', tipo: 'humano', personagem: CHARS[0] && CHARS[0].id, avatar: CHARS[0] && CHARS[0].emoji, cor: CHARS[0] && CHARS[0].cor };

/* ---------- abas ---------- */
function tab(online) {
  $('#tab-local').classList.toggle('sel', !online); $('#tab-online').classList.toggle('sel', online);
  $('#panel-local').hidden = online; $('#panel-online').hidden = !online;
  localStorage.setItem('caos_tab', online ? 'online' : 'local');
}

/* ---------- aba Online: "você", modo, servidor ---------- */
function renderMe() {
  $('#online-avatar').innerHTML = CaosSetup.avHtml(me); $('#online-avatar').style.background = me.cor;
  $('#online-char-name').textContent = CaosChars.byId(me.personagem).nome;
}
function renderModeRow(el, sel, onPick, editable = true) {
  el.innerHTML = Object.entries(CONFIG.modos).map(([k, m]) => `<button class="mode-card ${k === sel ? 'sel' : ''}" data-m="${k}" ${editable ? '' : 'disabled'}><strong>${m.nome}</strong><span>${m.rodadas} volta${m.rodadas > 1 ? 's' : ''}</span><span>${m.tempo}</span></button>`).join('');
  if (editable) el.querySelectorAll('.mode-card').forEach((b) => (b.onclick = () => onPick(b.dataset.m)));
}
function status(txt, bad) { const el = $('#online-status'); el.textContent = txt; el.style.color = bad ? '#FF6B57' : ''; }
function badge(show, txt) { let b = $('#net-badge'); if (!b) { b = document.createElement('div'); b.id = 'net-badge'; b.className = 'net-badge'; document.body.appendChild(b); } b.textContent = txt || ''; b.classList.toggle('show', !!show); }

async function conectar() {
  const url = ($('#online-url').value || '').trim() || CaosNet.defaultUrl();
  localStorage.setItem('caos_server_url', url);
  if (net && net.ws && net.ws.readyState === 1 && net.url === url) return net;
  if (net) net.close();
  net = new CaosNet(); wire(net);
  status('Conectando em ' + url + '…');
  await net.connect(url);
  status('Conectado a ' + url); return net;
}

/* ---------- mensagens do servidor ---------- */
const fila = []; let processando = false;
async function processar() {
  if (processando) return; processando = true;
  while (fila.length) {
    const msg = fila.shift();
    try {
      if (msg.t === 'evt') { UI.applyState(msg.state); UI.renderPlayers(); await UI.io().animate(msg.evt); net.send({ t: 'ack', id: msg.id }); }
      else if (msg.t === 'ask') { UI.applyState(msg.state); UI.renderPlayers(); const v = await UI.io().ask(msg.pending); net.send({ t: 'answer', reqId: msg.reqId, value: v }); }
    } catch (e) { console.error(e); }
  }
  processando = false;
}
function wire(n) {
  n.on('error', (m) => { toast(esc(m.msg), 'bad', 3500); status(m.msg, true); });
  n.on('joined', (m) => { myToken = m.token; isHost = m.host; n.saveSession(m.code, m.token); lobby = m.lobby; if (!UI.online) mostrarLobby(); if (m.reconnected) toast('Reconectado à sala ' + m.code, 'good'); });
  n.on('lobby', (m) => { lobby = m.lobby; if (!UI.online) renderLobby(); });
  n.on('kicked', () => { toast('Você foi removido da sala.', 'bad'); sairDaSala(false); });
  n.on('start', async (m) => {
    fila.length = 0; processando = false;
    await UI.startOnline({ myId: m.you, state: m.state, personagens: m.personagens, net: n });
    if (m.resume) toast('Partida retomada.', 'good');
  });
  n.on('evt', (m) => { if (UI.online) { fila.push(m); processar(); } });
  n.on('ask', (m) => { if (UI.online) { fila.push(m); processar(); } });
  n.on('aguardando', (m) => { if (UI.online && m.exceto !== UI.online.myId) toast(`⏳ ${esc(m.nome)} está decidindo…`, '', 1800); });
  n.on('aviso', (m) => { if (UI.online && m.exceto !== UI.online.myId) toast(esc(m.texto), 'sys', 3000); });
  n.on('reconnecting', (m) => badge(true, 'Conexão perdida — reconectando…'));
  n.on('open', () => badge(false));
}

/* ---------- lobby ---------- */
function mostrarLobby() { $('#online-entry').hidden = true; $('#lobby').hidden = false; renderLobby(); }
function renderLobby() {
  if (!lobby) return;
  $('#lobby-code').textContent = lobby.code;
  $('#lobby-players').innerHTML = lobby.jogadores.map((j) => `<div class="lobby-row ${j.conectado ? '' : 'off'}"><div class="avatar-btn" style="background:${j.cor}">${CaosSetup.avHtml(j)}</div><div class="who"><b>${esc(j.nome)}${j.host ? ' 👑' : ''}</b><span>${j.tipo === 'bot' ? '🤖 ' + CaosBots.PERSONALIDADES[j.personalidade].nome : j.conectado ? '🙂 pessoa' : '⚠️ desconectado'}</span></div>${isHost && j.tipo === 'bot' ? `<button class="kick" data-idx="${lobby.jogadores.indexOf(j)}" title="Remover">✕</button>` : '<span></span>'}</div>`).join('');
  $('#lobby-host').hidden = !isHost; $('#lobby-wait').hidden = isHost;
  renderModeRow($('#lobby-mode-row'), lobby.modo, (m) => net.send({ t: 'modo', modo: m }), isHost);
  const n = lobby.jogadores.length; $('#btn-lobby-start').disabled = n < lobby.minJogadores; $('#btn-lobby-start').textContent = n < lobby.minJogadores ? `Começar (faltam ${lobby.minJogadores - n})` : `Começar partida (${n} jogadores)`;
  $('#btn-lobby-bot').disabled = n >= lobby.maxJogadores;
  $('#lobby-players').querySelectorAll('.kick').forEach((b) => (b.onclick = () => net.send({ t: 'remove_idx', idx: +b.dataset.idx })));
}
function sairDaSala(avisar = true) {
  if (net && avisar) net.send({ t: 'leave' });
  if (net) { net.close(); net = null; } CaosNet.clearSession(); lobby = null; myToken = null; isHost = false;
  $('#online-entry').hidden = false; $('#lobby').hidden = true; status('Desconectado.');
}

/* ---------- init ---------- */
function init() {
  if (!window.CaosNet) return;
  $('#tab-local').onclick = () => tab(false); $('#tab-online').onclick = () => tab(true);
  if (localStorage.getItem('caos_tab') === 'online') tab(true);
  me.nome = localStorage.getItem('caos_online_nome') || ''; $('#online-name').value = me.nome;
  $('#online-name').oninput = (e) => { me.nome = e.target.value; localStorage.setItem('caos_online_nome', me.nome); };
  const saved = localStorage.getItem('caos_online_personagem'); if (saved && CaosChars.byId(saved)) CaosSetup.setPersonagem(me, CaosChars.byId(saved));
  renderMe();
  $('#online-avatar').onclick = () => CaosSetup.openPicker(-1, { p: me, taken: () => new Set(), onChoose: () => { localStorage.setItem('caos_online_personagem', me.personagem); renderMe(); } });
  function init_mode() { renderModeRow($('#online-mode-row'), modo, (m) => { modo = m; init_mode(); }); }
  init_mode();
  $('#online-url').value = localStorage.getItem('caos_server_url') || CaosNet.defaultUrl();
  $('#btn-server-test').onclick = async () => { try { await conectar(); toast('Servidor respondeu 👍', 'good'); } catch (e) { status(e.message, true); } };
  const nome = () => (me.nome || '').trim().slice(0, 14) || 'Jogador';
  $('#btn-create').onclick = async () => { try { const n = await conectar(); n.send({ t: 'create', nome: nome(), personagem: me.personagem, modo }); } catch (e) { toast(esc(e.message), 'bad', 4000); status(e.message, true); } };
  $('#btn-join').onclick = async () => { const code = ($('#join-code').value || '').trim().toUpperCase(); if (!code) { toast('Digite o código da sala.', 'bad'); return; } try { const n = await conectar(); n.send({ t: 'join', code, nome: nome(), personagem: me.personagem }); } catch (e) { toast(esc(e.message), 'bad', 4000); status(e.message, true); } };
  $('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });
  $('#btn-copy-code').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(lobby.code).then(() => toast('Código copiado!', 'good')); };
  $('#btn-lobby-bot').onclick = () => net.send({ t: 'add_bot' });
  $('#btn-lobby-start').onclick = () => net.send({ t: 'start' });
  $('#btn-lobby-leave').onclick = () => sairDaSala(true);
  // reconexão automática se havia uma sessão recente
  const sess = CaosNet.savedSession();
  if (sess) { tab(true); $('#online-url').value = sess.url; conectar().then((n) => { n.session = { code: sess.code, token: sess.token }; n.send({ t: 'reconnect', code: sess.code, token: sess.token }); }).catch(() => CaosNet.clearSession()); }
}
document.addEventListener('DOMContentLoaded', init);
})();
