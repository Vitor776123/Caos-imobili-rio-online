/* Teste: saída intencional vs queda acidental durante a partida.
   Ana (anfitriã), Bruno e Carla + 1 bot. Aos 3s Bruno clica em "Sair" (leave); aos 5s Carla cai e reconecta.
   Esperado: Bruno não recebe mais nada e sua reconexão é recusada; Carla reconecta; partida chega ao fim. */
const { spawn } = require('child_process'); const WebSocket = require('ws');
global.window = globalThis; require('../data/negocios.js'); require('../data/prendas.js'); require('../data/eventos.js'); require('../js/engine.js'); require('../js/bots.js');
const PORT = 8125; const srv = spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT, SERVE_STATIC: '0', ACK_TIMEOUT_MS: '5000' }, stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { fim: false, saiuAviso: 0, brunoDepois: 0, brunoRecon: null, carlaRecon: false, brunoAsksDepois: 0 }; let fimRes; const fim = new Promise((r) => (fimRes = r));
function cliente(nome, entrada) {
  return new Promise((resolve) => {
    const c = { nome, you: null, code: null, token: null, saiu: false };
    const abrir = () => { const ws = new WebSocket('ws://localhost:' + PORT); c.ws = ws;
      ws.on('open', () => ws.send(JSON.stringify(c.token ? { t: 'reconnect', code: c.code, token: c.token } : entrada)));
      ws.on('message', (raw) => { const m = JSON.parse(raw);
        if (m.t === 'joined') { c.code = m.code; c.token = m.token; if (m.reconnected && nome === 'Carla') R.carlaRecon = true; resolve(c); }
        if (m.t === 'error' && nome === 'Bruno' && c.saiu) R.brunoRecon = m.msg;
        if (m.t === 'start') c.you = m.you;
        if (c.saiu && (m.t === 'evt' || m.t === 'ask')) R.brunoDepois++;
        if (m.t === 'saiu') R.saiuAviso++;
        if (m.t === 'ask') { const p = m.state.players.find((x) => x.id === (m.pending.playerId || c.you)); const v = m.pending.type === 'decisao_grupo' ? 'continuar' : CaosBots.decidir(m.pending, m.state, p, Math.random); setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'answer', reqId: m.reqId, value: v })), 15); }
        if (m.t === 'evt') { if (m.evt.type === 'fim') { R.fim = true; fimRes(); } setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'ack', id: m.id })), 10); }
      }); };
    c.reabrir = () => { c.ws.terminate(); abrir(); }; c.send = (o) => c.ws.send(JSON.stringify(o)); abrir();
  });
}
(async () => {
  await sleep(800);
  const ana = await cliente('Ana', { t: 'create', nome: 'Ana', personagem: 'gata', modo: 'rapido' });
  const bruno = await cliente('Bruno', { t: 'join', code: ana.code, nome: 'Bruno', personagem: 'robo' });
  const carla = await cliente('Carla', { t: 'join', code: ana.code, nome: 'Carla', personagem: 'urso' });
  ana.send({ t: 'add_bot' }); await sleep(100); ana.send({ t: 'start' });
  setTimeout(() => { console.log('  … Bruno clica em Sair da partida'); bruno.saiu = true; bruno.send({ t: 'leave' }); bruno.ws.close(); }, 3000);
  setTimeout(() => { console.log('  … Carla cai da rede (sem clicar em sair)'); carla.reabrir(); }, 5000);
  setTimeout(() => { console.log('  … Bruno reabre o jogo e tenta reconectar'); bruno.token && (() => { const ws = new WebSocket('ws://localhost:' + PORT); ws.on('open', () => ws.send(JSON.stringify({ t: 'reconnect', code: bruno.code, token: bruno.token }))); ws.on('message', (raw) => { const m = JSON.parse(raw); if (m.t === 'error') R.brunoRecon = m.msg; if (m.t === 'joined') R.brunoRecon = 'RECONECTOU (errado)'; }); })(); }, 7000);
  await Promise.race([fim, sleep(180000)]);
  console.log(`\npartida terminou sem Bruno: ${R.fim} | aviso "saiu" recebido pelos outros: ${R.saiuAviso >= 2} | msgs para Bruno depois de sair: ${R.brunoDepois} | reconexão do Bruno: "${R.brunoRecon}" | Carla reconectou: ${R.carlaRecon}`);
  const ok = R.fim && R.saiuAviso >= 2 && R.brunoDepois === 0 && /saiu dessa partida/.test(R.brunoRecon || '') && R.carlaRecon;
  console.log(ok ? '✅ TESTE PASSOU' : '❌ TESTE FALHOU'); srv.kill(); process.exit(ok ? 0 : 1);
})();
