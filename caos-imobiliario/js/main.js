/* CAOS IMOBILIÁRIO — tela inicial e ciclo de partidas */
(function () {
'use strict';
const { UI, showScreen, toast } = CaosUI;
const { CONFIG } = CaosEngine;
const $ = (s, r = document) => r.querySelector(s);

const CHARS = (window.CaosChars && CaosChars.LIST) || [];
const has3D = !!(window.CaosChars && CaosChars.webglOk());
const thumb = (id) => (has3D ? CaosChars.thumbnail(id, 96) : null);
const avHtml = (p) => { const u = p.personagem && thumb(p.personagem); return u ? `<img class="thumb" src="${u}" alt="">` : p.avatar; };
const NOMES_BOT = ['Dona Zilda', 'Seu Raimundo', 'Tia Marlene', 'Jorginho', 'Madame Ruth', 'Cleitão', 'Sr. Barbosa', 'Vovó Cida', 'Naldinho', 'Dra. Fátima', 'Bruxo Waldemar', 'Lurdinha'];
const PERS = Object.keys(CaosBots.PERSONALIDADES);

let modo = 'medio';
let players = [];
let lastSetup = null;

function livre() { const usados = new Set(players.map((p) => p.personagem)); return CHARS.find((c) => !usados.has(c.id)) || CHARS[players.length % CHARS.length]; }
function novoJogador(tipo) {
  const ch = livre(); const avatar = ch.emoji, cor = ch.cor;
  const nome = tipo === 'humano' ? '' : NOMES_BOT[players.filter((p) => p.tipo === 'bot').length % NOMES_BOT.length];
  return { nome, tipo, avatar, cor, personagem: ch.id, personalidade: PERS[players.length % PERS.length] };
}

/* nome digitado pelo humano; vazio → 'Jogador N' (N = posição entre os humanos) */
function nomePadrao(p) { return `Jogador ${players.filter((q) => q.tipo === 'humano').indexOf(p) + 1}`; }
function nomeFinal(p) { const n = (p.nome || '').trim().slice(0, 14); return n || (p.tipo === 'humano' ? nomePadrao(p) : p.nome); }

function renderModes() {
  $('#mode-row').innerHTML = Object.entries(CONFIG.modos).map(([k, m]) => `<button class="mode-card ${k === modo ? 'sel' : ''}" data-m="${k}"><strong>${m.nome}</strong><span>${m.rodadas} voltas</span><span>${m.tempo}</span></button>`).join('');
  $('#mode-row').querySelectorAll('.mode-card').forEach((b) => (b.onclick = () => { modo = b.dataset.m; renderModes(); }));
}

function renderPlayers() {
  const list = $('#player-list'); list.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'player-row';
    row.innerHTML = `<button class="avatar-btn" title="Trocar personagem" style="background:${p.cor}">${avHtml(p)}</button>
      ${p.tipo === 'humano' ? `<input type="text" maxlength="14" value="${p.nome.replace(/"/g, '&quot;')}" placeholder="Seu nome (ou ${nomePadrao(p)})" aria-label="Nome">` : `<span class="bot-name">${p.nome}</span>`}
      <div class="ctrl"><button class="type-toggle ${p.tipo}">${p.tipo === 'humano' ? '🙂 Pessoa' : '🤖 Bot'}</button>
      ${p.tipo === 'bot' ? `<select aria-label="Personalidade">${PERS.map((k) => `<option value="${k}" ${k === p.personalidade ? 'selected' : ''}>${CaosBots.PERSONALIDADES[k].emoji} ${CaosBots.PERSONALIDADES[k].nome}</option>`).join('')}</select>` : ''}</div>
      <button class="remove-btn" title="Remover">✕</button>`;
    $('.avatar-btn', row).onclick = () => openPicker(i);
    const inp = $('input', row); if (inp) inp.oninput = (e) => { p.nome = e.target.value; };
    $('.type-toggle', row).onclick = () => { p.tipo = p.tipo === 'humano' ? 'bot' : 'humano'; p.nome = p.tipo === 'bot' ? NOMES_BOT[i % NOMES_BOT.length] : ''; renderPlayers(); };
    const sel = $('select', row); if (sel) sel.onchange = (e) => { p.personalidade = e.target.value; };
    $('.remove-btn', row).onclick = () => { if (players.length <= 2) { toast('Precisa de pelo menos 2 jogadores.', 'bad'); return; } row.classList.add('leaving'); setTimeout(() => { players.splice(i, 1); renderPlayers(); }, 220); };
    list.appendChild(row);
  });
  $('#player-count').textContent = `${players.length}/${CONFIG.maxJogadores}`;
  const cheio = players.length >= CONFIG.maxJogadores || players.length >= CHARS.length; $('#add-human').disabled = cheio; $('#add-bot').disabled = cheio;
}

function validar() {
  if (players.length < 2) return 'Precisa de pelo menos 2 jogadores.';
  if (!players.some((p) => p.tipo === 'humano')) return 'Pelo menos uma pessoa precisa jogar.';
  return null;
}

/* ---------- seleção de personagem 3D ---------- */
let viewer = null, pickerIdx = -1, pickerSel = null, pickerCtx = null; // pickerCtx: {p, taken:()=>Set, onChoose} (usado pelo modo online)
function setPersonagem(p, ch) { p.personagem = ch.id; p.avatar = ch.emoji; p.cor = ch.cor; }
function openPicker(i, ctx) {
  pickerCtx = ctx || null; const p = ctx ? ctx.p : players[i]; pickerIdx = i; pickerSel = p.personagem;
  const el = $('#char-picker'); el.classList.add('show'); el.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  $('#picker-for').textContent = `Personagem de ${nomeFinal(p)}`;
  if (has3D) { if (!viewer) viewer = new CaosChars.Viewer($('#picker-canvas')); viewer.start(); }
  renderPicker();
}
function closePicker() { const el = $('#char-picker'); el.classList.remove('in'); if (viewer) viewer.stop(); setTimeout(() => { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }, 300); }
function taken() { return pickerCtx ? pickerCtx.taken() : new Set(players.filter((_, j) => j !== pickerIdx).map((p) => p.personagem)); }
function renderPicker() {
  const ch = CaosChars.byId(pickerSel); const tk = taken();
  if (viewer) { viewer.resize(); viewer.setCharacter(ch.id); }
  $('#picker-name').textContent = `${ch.emoji} ${ch.nome}`; $('#picker-desc').textContent = ch.desc;
  $('#picker-grid').innerHTML = CHARS.map((c) => `<button data-id="${c.id}" class="${c.id === pickerSel ? 'sel' : ''} ${tk.has(c.id) ? 'taken' : ''}" title="${c.nome}">${thumb(c.id) ? `<img class="thumb" src="${thumb(c.id)}" alt="">` : c.emoji}</button>`).join('');
  $('#picker-grid').querySelectorAll('button').forEach((b) => (b.onclick = () => { if (b.classList.contains('taken')) { toast('Esse já foi escolhido por outro jogador.', 'bad', 1500); return; } pickerSel = b.dataset.id; renderPicker(); }));
  const chooseBtn = $('#picker-choose'); chooseBtn.disabled = tk.has(pickerSel); chooseBtn.textContent = tk.has(pickerSel) ? 'Já escolhido' : `Escolher ${ch.nome}`;
}
function stepPicker(d) { const tk = taken(); let i = CHARS.findIndex((c) => c.id === pickerSel); for (let k = 0; k < CHARS.length; k++) { i = (i + d + CHARS.length) % CHARS.length; if (!tk.has(CHARS[i].id)) break; } pickerSel = CHARS[i].id; renderPicker(); }

async function iniciar(setup) {
  lastSetup = JSON.parse(JSON.stringify(setup));
  await UI.startGame(setup, () => {});
}

function init() {
  players = []; players.push(novoJogador('humano')); players.push(novoJogador('bot')); players.push(novoJogador('bot'));
  players[1].personalidade = 'agressivo'; players[2].personalidade = 'cauteloso';
  renderModes(); renderPlayers();
  $('#add-human').onclick = () => { players.push(novoJogador('humano')); renderPlayers(); };
  $('#add-bot').onclick = () => { players.push(novoJogador('bot')); renderPlayers(); };
  $('#btn-start').onclick = () => { const err = validar(); if (err) { toast(err, 'bad'); return; } iniciar({ modo, jogadores: players.map((p) => ({ ...p, nome: nomeFinal(p) })) }); };
  $('#picker-close').onclick = closePicker;
  $('#picker-prev').onclick = () => stepPicker(-1); $('#picker-next').onclick = () => stepPicker(1);
  $('#picker-choose').onclick = () => { if (pickerCtx) { setPersonagem(pickerCtx.p, CaosChars.byId(pickerSel)); closePicker(); pickerCtx.onChoose(pickerCtx.p); return; } if (pickerIdx < 0) return; setPersonagem(players[pickerIdx], CaosChars.byId(pickerSel)); closePicker(); renderPlayers(); };
  window.addEventListener('resize', () => viewer && viewer.resize());
  $('#btn-again').onclick = () => { if (lastSetup) iniciar(lastSetup); };
  $('#btn-home').onclick = () => location.reload();
  requestAnimationFrame(() => $('#screen-home').classList.add('in'));
}
document.addEventListener('DOMContentLoaded', init);
window.CaosSetup = { openPicker, avHtml, nomeFinal, thumb, setPersonagem };
})();
