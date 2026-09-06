/* =====================================================================
   DADOS — EVENTOS DE NIVELAMENTO (TEXTOS FINAIS)
   Equivalente a eventos-fortes.json e eventos-leves.json.
   Tipos de efeito suportados pela engine:
     perde_fixo      { valor }           alvo perde R$ valor
     perde_fixo_bloqueio { valor, turnos } alvo perde R$ valor e fica sem comprar negócios nas próximas N jogadas dele
     ganha_fixo      { valor }           alvo ganha R$ valor
     perde_percent   { valor }           alvo perde valor% da reputação
     ganha_percent   { valor }           alvo ganha valor%
     paga_todos      { valor }           alvo paga R$ valor a cada outro jogador vivo
     perde_negocio   {}                  alvo perde 1 negócio (volta ao mercado)
     transfere       { valor }           alvo transfere R$ valor para quem tirou a carta
   Fortes → alvo = líder atual (casas raras, impacto grande).
   Leves  → alvo = quem parou na casa (casas frequentes, impacto pequeno).
   ===================================================================== */
window.CAOS_DATA = window.CAOS_DATA || {};

window.CAOS_DATA.eventosFortes = [
  {
    titulo: 'Crash do Mercado', emoji: '📉',
    texto: 'A bolsa desabou do nada e, coincidentemente, o líder tinha acabado de investir "tudo numa coisa segura".',
    efeito: { tipo: 'perde_percent', valor: 20 }
  },
  {
    titulo: 'CPI dos Famosos', emoji: '⚖️',
    texto: 'Uma comissão foi aberta pra investigar como o líder ficou rico tão rápido. Pra abafar o caso, distribui "acordos de silêncio" pra todo mundo.',
    efeito: { tipo: 'paga_todos', valor: 500 }
  },
  {
    titulo: 'Cancelamento Coletivo', emoji: '📵',
    texto: 'Um print antigo do líder vazou e a internet decidiu, por unanimidade, que hoje o dia é dele.',
    efeito: { tipo: 'perde_fixo', valor: 2000 }
  },
  {
    titulo: 'Fiscalização Surpresa', emoji: '🚨',
    texto: 'A fiscalização apareceu sem avisar e lacrou um dos negócios do líder "só até regularizar a papelada" (nunca mais abriu).',
    efeito: { tipo: 'perde_negocio' }
  },
  {
    titulo: 'Vazamento de Áudio', emoji: '🎙️',
    texto: 'Um áudio do líder falando mal de todo mundo vazou no grupo errado. Quem tirou essa carta virou o "amigo leal" recompensado.',
    efeito: { tipo: 'transfere', valor: 1500 }
  },
  {
    titulo: 'Golpe do Sócio', emoji: '🕶️',
    texto: 'O sócio "de confiança" do líder sumiu numa viagem de trabalho — e o caixa sumiu junto.',
    efeito: { tipo: 'perde_percent', valor: 15 }
  },
  {
    titulo: 'Herdeiro Aparece do Nada', emoji: '📜',
    texto: 'Um suposto parente distante do líder aparece com um advogado e uma história muito bem ensaiada sobre herança.',
    efeito: { tipo: 'perde_fixo', valor: 1800 }
  },
  {
    titulo: 'Documentário Revelador', emoji: '🎥',
    texto: 'Um documentário estilo true crime sobre a ascensão do líder estreia com detalhes que ele preferia que continuassem esquecidos.',
    efeito: { tipo: 'perde_percent', valor: 18 }
  },
];

window.CAOS_DATA.eventosLeves = [
  {
    titulo: 'Multa de Trânsito', emoji: '🚔',
    texto: 'Estacionou na vaga de carga e descarga "só um minutinho" de novo.',
    efeito: { tipo: 'perde_fixo', valor: 300 }
  },
  {
    titulo: 'Achou Dinheiro na Rua', emoji: '💵',
    texto: 'Uma nota amassada apareceu no bolso de um casaco que você não usava há meses.',
    efeito: { tipo: 'ganha_fixo', valor: 400 }
  },
  {
    titulo: 'Assinatura Esquecida', emoji: '💳',
    texto: 'Aquele streaming que ninguém mais usa cobrou o plano anual inteiro de uma vez.',
    efeito: { tipo: 'perde_fixo', valor: 250 }
  },
  {
    titulo: 'Viralizou de Graça', emoji: '📈',
    texto: 'Um vídeo seu tropeçando na calçada virou meme nacional — e, de alguma forma, isso rendeu.',
    efeito: { tipo: 'ganha_percent', valor: 5 }
  },
  {
    titulo: 'Conta de Luz Assustadora', emoji: '💡',
    texto: 'Alguém deixou o ar-condicionado ligado o mês inteiro e ninguém assume a culpa.',
    efeito: { tipo: 'perde_percent', valor: 4 }
  },
  {
    titulo: 'Presente do Tio Rico', emoji: '🎁',
    texto: 'O tio distante lembrou que você existe bem na época de imposto de renda dele.',
    efeito: { tipo: 'ganha_fixo', valor: 500 }
  },
  {
    titulo: 'Pneu Furado', emoji: '🛞',
    texto: 'Bem em cima da hora do compromisso mais importante da semana.',
    efeito: { tipo: 'perde_fixo', valor: 200 }
  },
  {
    titulo: 'Cashback Misterioso', emoji: '🪙',
    texto: 'O aplicativo do banco devolveu um valor que nem você lembra ter gastado.',
    efeito: { tipo: 'ganha_fixo', valor: 300 }
  },
  {
    titulo: 'Multa Dobrada no Estacionamento', emoji: '🅿️',
    texto: 'Voltou pro carro e tinha duas multas: uma sua, outra "de brinde" por reincidência.',
    efeito: { tipo: 'perde_fixo', valor: 350 }
  },
  {
    titulo: 'Restituição Caiu', emoji: '🧾',
    texto: 'A restituição do imposto de renda caiu num dia completamente aleatório, do nada.',
    efeito: { tipo: 'ganha_fixo', valor: 600 }
  },
  {
    titulo: 'Esqueceu a Senha do Banco', emoji: '🔒',
    texto: 'Bloqueou a própria conta tentando adivinhar a senha e teve que pagar taxa de desbloqueio.',
    efeito: { tipo: 'perde_fixo_bloqueio', valor: 150, turnos: 2 }   // conta bloqueada: sem comprar negócios nas próximas 2 jogadas
  },
  {
    titulo: 'Raspadinha Premiada', emoji: '🎟️',
    texto: 'Comprou por impulso na fila do mercado e, contra todas as probabilidades, ganhou.',
    efeito: { tipo: 'ganha_fixo', valor: 250 }
  },
  {
    titulo: 'Foto Constrangedora Reapareceu', emoji: '📸',
    texto: 'O "não me marca" chegou tarde demais — mas pelo menos ninguém repostou.',
    efeito: { tipo: 'perde_fixo', valor: 200 }
  },
  {
    titulo: 'Herança da Tia Distante', emoji: '🏺',
    texto: 'Uma tia que você mal lembra o nome deixou uma coleção de porcelanas... e uma graninha de brinde.',
    efeito: { tipo: 'ganha_percent', valor: 6 }
  },
  {
    titulo: 'Vizinho Processou por Barulho', emoji: '🔇',
    texto: 'A festa de "só os amigos mais próximos" virou processo por perturbação do sossego.',
    efeito: { tipo: 'perde_fixo', valor: 400 }
  },
  {
    titulo: 'Prêmio de Fidelidade', emoji: '🏆',
    texto: 'O cartão de crédito lembrou que você existe e mandou um cashback de agradecimento.',
    efeito: { tipo: 'ganha_fixo', valor: 350 }
  },
  {
    titulo: 'Carro Rebocado', emoji: '🚗',
    texto: 'Estacionou "só cinco minutinhos" em local proibido. O guincho discordou.',
    efeito: { tipo: 'perde_fixo', valor: 300 }
  },
  {
    titulo: 'Ação Bombou do Nada', emoji: '📊',
    texto: 'Aquele investimento esquecido que você fez "só pra testar" decidiu bombar hoje.',
    efeito: { tipo: 'ganha_percent', valor: 5 }
  },
];
