/* =====================================================================
   CAOS IMOBILIÁRIO — BOTS
   decidir(pending, state, player, rng) -> escolha
   Personalidades influenciam: compra, caminho na encruzilhada, uso de
   Virada de Sorte. O Vingativo lê player.rancor (preenchido pela engine).
   ===================================================================== */
(function (global) {
'use strict';

const PERSONALIDADES = {
  agressivo:   { nome: 'Agressivo',   emoji: '😤', desc: 'Compra tudo, arrisca sempre.' },
  cauteloso:   { nome: 'Cauteloso',   emoji: '🧐', desc: 'Só negócio barato e caminho seguro.' },
  oportunista: { nome: 'Oportunista', emoji: '🦊', desc: 'Muda de tática conforme a maré.' },
  caotico:     { nome: 'Caótico',     emoji: '🎲', desc: 'Decide no cara-ou-coroa.' },
  vingativo:   { nome: 'Vingativo',   emoji: '😈', desc: 'Nunca esquece quem o prejudicou.' },
};

function media(state) { const v = state.players.filter((p) => !p.eliminado); return v.reduce((s, p) => s + p.reputacao, 0) / Math.max(1, v.length); }
function lider(state, me) { return state.players.filter((p) => !p.eliminado && p.id !== me.id).reduce((a, b) => (!a || b.reputacao > a.reputacao ? b : a), null); }
function piorRancor(me) { let best = null, n = 0; for (const k in me.rancor) if (me.rancor[k] > n) { n = me.rancor[k]; best = k; } return best; }

function decidir(pending, state, me, rng = Math.random) {
  const P = me.personalidade || 'caotico';
  switch (pending.type) {
    case 'acao_turno': {
      if (!pending.podeToken) return 'rolar';
      const L = lider(state, me); if (!L) return 'rolar';
      const gap = L.reputacao - me.reputacao;
      switch (P) {
        case 'agressivo': return 'token';
        case 'cauteloso': return me.reputacao < L.reputacao * 0.6 ? 'token' : 'rolar';
        case 'oportunista': return gap > me.reputacao * 0.5 || me.tokens >= 2 ? 'token' : 'rolar';
        case 'vingativo': { const r = piorRancor(me); return (r && r === L.id) || me.tokens >= 2 || me.reputacao < 3000 ? 'token' : 'rolar'; }
        default: return rng() < 0.5 ? 'token' : 'rolar';
      }
    }
    case 'bifurcacao': {
      switch (P) {
        case 'agressivo': return 'arriscado';
        case 'cauteloso': return 'seguro';
        case 'oportunista': return me.reputacao > media(state) * 1.15 ? 'arriscado' : me.reputacao < media(state) * 0.7 ? 'seguro' : 'neutro';
        case 'vingativo': return rng() < 0.35 ? 'arriscado' : 'neutro';
        default: return ['arriscado', 'neutro', 'seguro'][Math.floor(rng() * 3)];
      }
    }
    case 'comprar': {
      if (!pending.podePagar) return 'nao';
      const n = state.negocios[pending.negocioId]; const sobra = me.reputacao - n.custo;
      switch (P) {
        case 'agressivo': return sobra >= 500 ? 'sim' : 'nao';
        case 'cauteloso': return n.tier !== 'Caro' && sobra >= 5000 ? 'sim' : 'nao';
        case 'oportunista': return n.custo <= me.reputacao * 0.3 ? 'sim' : 'nao';
        case 'vingativo': return sobra >= 2500 ? 'sim' : 'nao';
        default: return rng() < 0.6 ? 'sim' : 'nao';
      }
    }
    case 'prenda': return 'cumprir';
    case 'decisao_grupo': return 'continuar';
  }
  return null;
}

/* Frases curtas para dar personalidade aos anúncios na UI */
function falar(me, contexto, escolha) {
  const P = me.personalidade || 'caotico';
  const f = {
    agressivo:   { bifurcacao: 'Medo é pra quem tem tempo.', comprar_sim: 'Compra, compra, compra!', comprar_nao: 'Nem esse eu quero.', token: 'Hora de derrubar o topo.' },
    cauteloso:   { bifurcacao: 'Devagar se vai longe.', comprar_sim: 'Investimento seguro. Aprovado.', comprar_nao: 'Caro demais, obrigado.', token: 'Só por precaução…' },
    oportunista: { bifurcacao: 'Depende do vento hoje.', comprar_sim: 'Oportunidade é oportunidade.', comprar_nao: 'Agora não compensa.', token: 'Senti a brecha.' },
    caotico:     { bifurcacao: 'Cara ou coroa!', comprar_sim: 'Por quê não?', comprar_nao: 'Hoje não tô afim.', token: 'YOLO.' },
    vingativo:   { bifurcacao: 'Anotado.', comprar_sim: 'Mais um pra coleção.', comprar_nao: 'Não preciso disso pra me vingar.', token: 'Você vai se lembrar de mim.' },
  }[P];
  if (contexto === 'comprar') return f[escolha === 'sim' ? 'comprar_sim' : 'comprar_nao'];
  return f[contexto] || '';
}

global.CaosBots = { PERSONALIDADES, decidir, falar };
})(typeof window !== 'undefined' ? window : globalThis);
