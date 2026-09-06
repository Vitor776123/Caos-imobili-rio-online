/* =====================================================================
   Teste de integração: 3 clientes falsos (sem navegador) na mesma sala.
   - Ana cria a sala (anfitriã), Bruno e Carla entram pelo código, + 1 bot.
   - Cada cliente responde os `ask` que recebe usando a lógica dos bots e
     dá `ack` em cada `evt`, como o navegador faria.
   Verifica: (1) `ask` chega SÓ no dono do turno; (2) todo `evt` chega nos
   3 com o mesmo estado; (3) a partida chega ao `fim`; (4) reconexão.
   Uso: node test-3clientes.js   (sobe o servidor sozinho na porta 8123)
   ===================================================================== */
const { spawn } = require('child_process'); const WebSocket = require('ws'); const crypto = require('crypto');
global.window = globalThis; require('../data/negocios.js'); require('../data/prendas.js'); require('../data/eventos.js'); require('../js/engine.js'); require('../js/bots.js');
const PORT = 8123;
const srv = spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT, SERVE_STATIC: '0', ACK_TIMEOUT_MS: '5000' }, stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (o) => crypto.createHash('md5').update(JSON.stringify(o)).digest('hex').slice(0, 8);
const stats = { askErrados: 0, evts: 0, fim: false, evtTypes: new Set() };
const porEvt = {}; let fimResolve; const fim = new Promise((r) => (fimResolve = r));

function cliente(nome, personagem, entrada) {
  return new Promise((resolve) => {
    const c = { nome, you: null, code: null, token: null, asks: 0 };
    const abrir = () => {
      const ws = new WebSocket('ws://localhost:' + PORT); c.ws = ws;
      ws.on('open', () => ws.send(JSON.stringify(c.token ? { t: 'reconnect', code: c.code, token: c.token } : entrada)));
      ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        if (m.t === 'joined') { c.code = m.code; c.token = m.token; if (m.reconnected) console.log('  … Bruno reconectou'); resolve(c); }
        if (m.t === 'start') c.you = m.you;
        if (m.t === 'ask') {
          if (m.pending.type !== 'decisao_grupo' && m.pending.playerId !== c.you) stats.askErrados++;
          c.asks++;
          const p = m.state.players.find((x) => x.id === (m.pending.playerId || c.you));
          const v = m.pending.type === 'decisao_grupo' ? 'continuar' : CaosBots.decidir(m.pending, m.state, p, Math.random);
          setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'answer', reqId: m.reqId, value: v })), 15);
        }
        if (m.t === 'evt') {
          stats.evts++; stats.evtTypes.add(m.evt.type);
          (porEvt[m.id] = porEvt[m.id] || {})[nome] = hash(m.state.players.map((p) => [p.reputacao, p.posicao, p.voltas, p.negocios]));
          if (m.evt.type === 'fim') { stats.fim = true; fimResolve(); }
          setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'ack', id: m.id })), 10);
        }
        if (m.t === 'error') console.log('  ERRO em', nome + ':', m.msg);
      });
    };
    c.reabrir = () => { c.ws.terminate(); abrir(); };
    c.send = (o) => c.ws.send(JSON.stringify(o));
    abrir();
  });
}

(async () => {
  await sleep(800);
  const ana = await cliente('Ana', 'gata', { t: 'create', nome: 'Ana', personagem: 'gata', modo: 'rapido' });
  console.log('sala criada:', ana.code);
  const bruno = await cliente('Bruno', 'robo', { t: 'join', code: ana.code, nome: 'Bruno', personagem: 'robo' });
  const carla = await cliente('Carla', 'urso', { t: 'join', code: ana.code, nome: 'Carla', personagem: 'urso' });
  ana.send({ t: 'add_bot' }); await sleep(100);
  ana.send({ t: 'start' });
  setTimeout(() => { console.log('  … Bruno caiu da rede'); bruno.reabrir(); }, 4000);
  const t0 = Date.now();
  await Promise.race([fim, sleep(240000)]);
  const completos = Object.values(porEvt).filter((h) => Object.keys(h).length === 3);
  const mismatches = completos.filter((h) => new Set(Object.values(h)).size !== 1).length;
  console.log(`\nfim=${stats.fim} em ${((Date.now() - t0) / 1000).toFixed(0)}s | evts recebidos=${stats.evts} | evts vistos pelos 3 com estado idêntico=${completos.length - mismatches}/${completos.length}`);
  console.log(`asks por cliente: Ana=${ana.asks} Bruno=${bruno.asks} Carla=${carla.asks} | asks entregues ao jogador errado=${stats.askErrados}`);
  console.log('tipos de evento:', [...stats.evtTypes].join(', '));
  const ok = stats.fim && stats.askErrados === 0 && mismatches === 0 && ana.asks > 0 && bruno.asks > 0 && carla.asks > 0;
  console.log(ok ? '\n✅ TESTE PASSOU' : '\n❌ TESTE FALHOU');
  srv.kill(); process.exit(ok ? 0 : 1);
})();
