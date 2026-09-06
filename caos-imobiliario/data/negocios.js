/* =====================================================================
   DADOS — NEGÓCIOS (35)
   ---------------------------------------------------------------------
   Cada negócio tem: id, nome, categoria, emoji, tier, custo,
   taxas:[5 textos], karmaBom:[5 textos — prejudica o DONO], karmaRuim:[5 textos — prejudica o VISITANTE]
   ===================================================================== */
window.CAOS_DATA = window.CAOS_DATA || {};

window.CAOS_DATA.negocios = [
  // 🍕 Alimentação
  {
    id: 'pizzaria', nome: 'Pizzaria', categoria: 'Alimentação', emoji: '🍕', tier: 'Caro', custo: 4000,
    taxas: [
      'Pediu borda recheada, refri grátis e guardanapo extra pra levar pra casa. Pague a conta completa.',
      'Chamou 3 amigos "de surpresa" pra dividir a mesa. Pague por todo mundo.',
      'Ficou 2 horas "só conversando" depois de comer. Pague a taxa de ocupação de mesa.',
      'Pediu a pizza doce de sobremesa e "esqueceu" de avisar que só tinha trocado.',
      'Levou a pizza pra viagem e insistiu na caixa personalizada de brinde.'
    ],
    karmaRuim: [
      'Achou um fio de cabelo na muçarela. Perdeu o apetite e a fé na humanidade.',
      'Reclamou tanto da demora que foi filmado e virou meme de "cliente do mal" nas redes.',
      'Engasgou com uma azeitona na frente de todo mundo.',
      'Cartão recusado na hora de pagar, na frente da fila toda.',
      'Derrubou molho de pimenta na camisa branca minutos antes de uma reunião importante.'
    ],
    karmaBom: [
      'Vídeo elogiando viralizou, mas mostrou a bagunça da cozinha ao fundo — vigilância sanitária multou.',
      'Cliente satisfeito virou "vitalício com pizza grátis pra sempre" — promessa feita, promessa cumprida (a contragosto).',
      'Deu 5 estrelas mencionando "preço camarada" e agora o bairro inteiro cobra o mesmo desconto.',
      'Indicou o local pra prefeita, que decidiu fazer uma "visitinha surpresa" de fiscalização.',
      'Fez tanta propaganda boca a boca que a fila ficou enorme e os vizinhos processaram por barulho.'
    ]
  },
  {
    id: 'hamburgueria', nome: 'Hamburgueria', categoria: 'Alimentação', emoji: '🍔', tier: 'Médio', custo: 2500,
    taxas: [
      'Pediu o combo mais caro e ainda quis batata dupla.',
      'Trocou o hambúrguer de sabor três vezes até decidir. Pague a taxa de paciência do garçom.',
      'Levou o cachorro e ele "só cheirou" o balcão inteiro. Pague a taxa de limpeza.',
      'Pediu pra tirar TUDO do hambúrguer, deixando só o pão. Pague preço cheio mesmo assim.',
      'Usou 6 guardanapos pra uma batata frita. Taxa de sustentabilidade.'
    ],
    karmaRuim: [
      'O hambúrguer veio cru por dentro. Passou a noite toda mal.',
      'Mordeu forte demais e o molho esguichou na roupa nova.',
      'Pediu picante "nível máximo" por bravata e agora está chorando.',
      'Perdeu a aposta de "comer em 3 minutos" e pagou por todo mundo.',
      'Engasgou tentando falar com a boca cheia pra impressionar alguém.'
    ],
    karmaBom: [
      'Cliente amou tanto que exigiu reembolso "porque devia ser de graça de tão bom". Dono cedeu pra não virar meme.',
      'Postou nas redes chamando de "o melhor da cidade" — agora tem fila todo dia e o dono não aguenta o ritmo.',
      'Recomendou pra um crítico gastronômico disfarçado, que aprovou tudo, menos o preço (agora todo mundo reclama do preço).',
      'Fã fez uma "resenha" tão detalhada que revelou a receita secreta do molho.',
      'Trouxe 15 amigos numa "visita surpresa" — dono ficou sem ingrediente no meio do rush.'
    ]
  },
  {
    id: 'foodtruck', nome: 'Food truck', categoria: 'Alimentação', emoji: '🚚', tier: 'Barato', custo: 1200,
    taxas: [
      'Furou a fila toda achando que "conhecia o dono". Pague a taxa de prioridade.',
      'Pediu pra sentar na cadeira de praia do próprio food truck. Taxa de conforto extra.',
      'Perguntou o Wi-Fi de um food truck. Recebeu a conta com "taxa de ingenuidade".',
      'Pediu desconto "porque é fiel". Taxa de lealdade cobrada em dobro por audácia.',
      'Tirou 10 fotos do prato antes de comer, deixando esfriar. Taxa de "conteúdo pra rede social".'
    ],
    karmaRuim: [
      'O caminhão quebrou no meio do atendimento. Esperou 40 minutos no sol só pra comer batata fria.',
      'Derramou o suco em cima do celular tentando segurar o prato em pé.',
      'Achou uma cadeira, sentou, e era a cadeira reservada do dono. Constrangimento total.',
      'Pediu o prato "mais picante do menu" só pra parecer durão na frente do crush.',
      'Ficou tanto tempo na fila que perdeu o horário de outro compromisso.'
    ],
    karmaBom: [
      'Fila enorme se formou depois do elogio — prefeitura multou por "obstrução de via pública".',
      'Vídeo viral trouxe gente demais e o dono ficou sem gás no meio do dia.',
      'Cliente satisfeito fotografou a placa e virou ponto de referência no mapa (sem autorização de uso de imagem).',
      'Elogiou tanto que um food truck concorrente "coincidentemente" abriu do lado.',
      'Espalhou que era "o point secreto da cidade" — segredo durou 1 dia.'
    ]
  },
  {
    id: 'padaria', nome: 'Padaria', categoria: 'Alimentação', emoji: '🥐', tier: 'Barato', custo: 1000,
    taxas: [
      'Comprou pão quentinho e testou 4 tipos de recheio "só pra ver".',
      'Pediu o café da manhã completo e ainda quis embalar "pro resto da semana".',
      'Ficou degustando salgados de amostra grátis por 20 minutos sem comprar nada — até decidir comprar tudo.',
      'Pediu pra fatiar o pão numa máquina que "quebrou ontem". Taxa de fatiamento manual.',
      'Trouxe a própria caneca "pra ser sustentável" e pediu desconto que não existe.'
    ],
    karmaRuim: [
      'O pão francês estava duro como pedra. Quase quebrou um dente.',
      'Comprou o último salgado disponível bem na frente de quem estava esperando há mais tempo — clima pesado.',
      'Escorregou na farinha que caiu no chão. Caiu literalmente.',
      'Pediu "sem açúcar" e comeram o bolo errado, o mais doce do cardápio.',
      'Ficou com cheiro de pão o dia inteiro e ninguém avisou.'
    ],
    karmaBom: [
      'Elogiou tanto o atendimento que virou "cliente vitalício com desconto permanente". Dono se ferrou financeiramente.',
      'Postou receita "inspirada" no pão de lá e agora tem concorrência direta.',
      'Trouxe a família toda numa visita surpresa no domingo, dia de folga do padeiro.',
      'Fez tanta fama que a padaria virou "point de influencer" e perdeu clientes de bairro de tanta fila.',
      'Reclamou "com carinho" sobre o preço, e o dono baixou pra sempre por vergonha.'
    ]
  },
  {
    id: 'sorveteria', nome: 'Sorveteria', categoria: 'Alimentação', emoji: '🍦', tier: 'Médio', custo: 2000,
    taxas: [
      'Pediu o sorvete gigante de 5 bolas "só pra experimentar sabores".',
      'Trocou de sabor 3 vezes depois de já ter provado tudo de graça.',
      'Ficou sentado usando o ar-condicionado da loja por uma hora "só de boa".',
      'Pediu cobertura tripla e reclamou que "não tinha mais espaço" no copo.',
      'Levou os filhos e eles "só quiseram provar" cada pote da vitrine.'
    ],
    karmaRuim: [
      'O sorvete derreteu todo na mão antes de conseguir comer. Ficou grudento e revoltado.',
      'Mordeu o sorvete com dente sensível. Gritou na frente de todo mundo.',
      'Escolheu o sabor mais exótico por status e odiou o gosto.',
      'Sentou no banco recém-pintado da sorveteria sem perceber.',
      'Comprou pra impressionar alguém que "só queria água".'
    ],
    karmaBom: [
      'Postou vídeo elogiando e virou "point turístico" — vizinhos processaram por perturbação do sossego.',
      'Fila dobrou depois do post e o sorvete acabou no meio do dia, cliente revoltado.',
      'Comentário "1 real o sorvete lá é um crime de tão bom" viralizou — literalmente acharam que era o preço real.',
      'Indicou pra um evento beneficente e o dono teve que doar sorvete de graça pro mês inteiro.',
      'Disse que era "o point secreto" e agora tem fila até de manhã cedo.'
    ]
  },
  // 💅 Beleza & Estética
  {
    id: 'salao', nome: 'Salão de beleza', categoria: 'Beleza & Estética', emoji: '💇', tier: 'Médio', custo: 2200,
    taxas: [
      'Pediu escova, hidratação e "só uma retocadinha" que virou corte completo.',
      'Trouxe foto de referência impossível de replicar e exigiu o "mesmo resultado".',
      'Ficou 3 horas decidindo a cor da tinta. Taxa de indecisão.',
      'Pediu pra usar o Wi-Fi do salão pra "trabalhar" enquanto esperava.',
      'Trouxe a própria tinta comprada na internet e pediu desconto pela "economia de material".'
    ],
    karmaRuim: [
      'Pediu luzes e saiu parecendo um guaxinim. Chorou no espelho.',
      'O corte ficou torto e só percebeu em casa, no espelho grande.',
      'Alisou o cabelo antes de um dia de chuva torrencial.',
      'Cor escolhida "porque tava na moda" não combinou nadinha com o tom de pele.',
      'Ficou tão satisfeito que tirou foto, postou, e a internet discordou educadamente.'
    ],
    karmaBom: [
      'Cliente amou o corte e indicou pra 10 amigas — que exigiram o mesmo preço promocional "de primeira vez".',
      'Fez propaganda tão boa que virou "point de famosinha" — agora tem paparazzi na porta.',
      'Elogiou tanto que a cabeleireira favorita virou concorrente e abriu salão próprio do lado.',
      'Postou "melhor salão da cidade" e agora recebe reclamação de todo mundo que não teve o mesmo resultado.',
      'Reclamação "gentil" sobre o preço fez o salão baixar os valores pra sempre.'
    ]
  },
  {
    id: 'barbearia', nome: 'Barbearia', categoria: 'Beleza & Estética', emoji: '💈', tier: 'Barato', custo: 1100,
    taxas: [
      'Pediu corte, barba, sobrancelha e "aquele cafezinho" que "sempre tem".',
      'Ficou fazendo call de trabalho na cadeira, atrasando todo mundo. Taxa de tempo extra.',
      'Trouxe referência de corte de um jogador famoso "só que mais estiloso".',
      'Pediu desconto "porque é cliente antigo" (foi lá uma vez há 2 anos).',
      'Usou o espelho pra selfie por 10 minutos antes de sair.'
    ],
    karmaRuim: [
      'Pediu "só uma aparadinha" e saiu careca sem querer.',
      'A barba ficou torta e só percebeu na saída, na luz do sol.',
      'Corte novo coincidiu com o pior dia possível pra tirar foto de perfil.',
      'Ficou de bigode torto por escolher o modelo "moderno" errado.',
      'Dormiu na cadeira e babou na toalha na frente de todos.'
    ],
    karmaBom: [
      'Cliente satisfeito indicou pra galera toda do trabalho — agora tem fila que não acaba mais.',
      'Fez tanta fama que virou "point de influencer de barba" e perdeu o público antigo.',
      'Elogiou tanto que o barbeiro favorito foi convidado pra outra barbearia (e aceitou).',
      'Postou "melhor corte da vida" e agora todo cliente exige o barbeiro específico, sobrecarregando ele.',
      'Reclamou "com jeitinho" do preço e ganhou desconto vitalício sem querer.'
    ]
  },
  {
    id: 'estetica', nome: 'Clínica de estética', categoria: 'Beleza & Estética', emoji: '✨', tier: 'Caro', custo: 5000,
    taxas: [
      'Pediu o pacote completo de tratamento "porque tá com tudo pago mesmo".',
      'Marcou 3 horários e cancelou 2 em cima da hora. Taxa de cancelamento.',
      'Pediu procedimento "igual ao da influenciadora" sem considerar o próprio rosto.',
      'Trouxe print de resultado de outra clínica e exigiu comparação.',
      'Ficou dando notas pro atendimento em voz alta durante o procedimento.'
    ],
    karmaRuim: [
      'O procedimento inchou mais do que o esperado e teve que usar boné por 1 semana.',
      'Escolheu o preenchimento "mais natural" e saiu parecendo outra pessoa.',
      'Fez tratamento antes de um evento importante e ficou vermelho igual pimentão.',
      'Comparou o resultado com o de uma celebridade e ficou puto com a diferença.',
      'Contou pra todo mundo que fez procedimento "discretamente".'
    ],
    karmaBom: [
      'Resultado ficou tão bom que virou "propaganda ambulante" — agora todo mundo quer o mesmo desconto que ela "conseguiu".',
      'Indicou a clínica pra uma celebridade que exigiu sigilo total e horário exclusivo.',
      'Elogio nas redes trouxe fiscalização "de surpresa" da vigilância sanitária.',
      'Fez tanta fama que profissional principal foi "roubado" por clínica concorrente.',
      'Postou antes/depois tão impressionante que virou meta impossível de replicar em outros clientes.'
    ]
  },
  {
    id: 'academia', nome: 'Academia', categoria: 'Beleza & Estética', emoji: '🏋️', tier: 'Médio', custo: 3000,
    taxas: [
      'Matriculou-se, foi 1 vez, e quer cancelar "por motivos de saúde" (preguiça).',
      'Ocupou o aparelho por 40 minutos "descansando entre séries".',
      'Trouxe personal trainer particular pra usar o espaço de graça.',
      'Pediu avaliação física "só pra saber", sem intenção de treinar de verdade.',
      'Usou o vestiário como spa particular por 1 hora.'
    ],
    karmaRuim: [
      'Tentou o agachamento pesado sem aquecer e sentiu a dor no dia seguinte (e no seguinte, e no seguinte).',
      'Postou foto "before" pra motivação e ninguém comentou.',
      'Prometeu ir todo dia e foi visto 1 vez em 3 meses — a academia mandou notificação de "sentimos sua falta".',
      'Errou o peso do aparelho e ficou preso embaixo dele, na frente de todo mundo.',
      'Roupa de treino rasgou no meio do exercício mais concorrido da sala.'
    ],
    karmaBom: [
      'Aluno se machucou fazendo exercício errado por conta própria e ameaçou processar.',
      'Resultado impressionante virou propaganda — agora fila de espera pra matrícula.',
      'Indicou pra galera toda do trabalho, lotando os horários de pico.',
      'Postou "melhor academia da cidade" e agora recebe reclamação de superlotação.',
      'Personal trainer favorito virou "celebridade local" e pediu aumento (ou saiu).'
    ]
  },
  {
    id: 'spa', nome: 'Spa', categoria: 'Beleza & Estética', emoji: '🧖', tier: 'Caro', custo: 4500,
    taxas: [
      'Marcou o "dia inteiro de spa" e usou até a sala que não estava inclusa no pacote.',
      'Pediu massagem, sauna e ainda quis "só mais um probleminha resolvido de graça".',
      'Ficou 2 horas na sala de relaxamento "só descansando" depois do horário marcado.',
      'Trouxe amigo "só pra acompanhar" e ele acabou usando tudo também.',
      'Reclamou do silêncio pedindo música, e depois reclamou do barulho.'
    ],
    karmaRuim: [
      'Dormiu tão profundamente na massagem que roncou na frente de outros clientes.',
      'Escorregou saindo da sauna e caiu de bunda no chão molhado.',
      'Óleo de massagem manchou a roupa cara que estava usando.',
      'Ficou tão relaxado que esqueceu um compromisso importante depois.',
      'Achou que era "spa completo" mas esqueceu de levar dinheiro pro extra.'
    ],
    karmaBom: [
      'Elogiou tanto que virou "point de luxo" — agora tem lista de espera de 3 meses.',
      'Indicou pra uma celebridade que exigiu privacidade total, fechando o local pro público comum.',
      'Postou "melhor spa da vida" e a concorrência copiou o serviço exato no mês seguinte.',
      'Resultado tão bom que o massagista favorito abriu spa próprio e levou a clientela.',
      'Reclamação "gentil" sobre preço fez o spa criar promoção que quebrou a margem de lucro.'
    ]
  },
  // 💻 Tecnologia
  {
    id: 'eletronicos', nome: 'Loja de eletrônicos', categoria: 'Tecnologia', emoji: '📱', tier: 'Médio', custo: 3500,
    taxas: [
      'Testou todos os produtos da loja "só pra comparar" antes de comprar o mais barato.',
      'Pediu desconto citando um "concorrente" que nem existe.',
      'Levou o produto pra "mostrar em casa" e devolveu 2 semanas depois "arrependido".',
      'Pediu ajuda técnica gratuita pra um produto comprado em outro lugar.',
      'Reclamou da garantia sem ter guardado a nota fiscal.'
    ],
    karmaRuim: [
      'Comprou o modelo mais caro achando que era o mais novo — era o antigo com preço inflado.',
      'Produto quebrou no dia seguinte por mau uso (culpa 100% dele).',
      'Discutiu preço na frente de todo mundo e perdeu a discussão feio.',
      'Esqueceu a senha do próprio celular novo na frente do vendedor.',
      'Comprou o carregador errado e só percebeu em casa.'
    ],
    karmaBom: [
      'Elogiou tanto o atendimento que virou "referência" — agora todo cliente exige o mesmo vendedor específico.',
      'Indicou a loja num grupo de WhatsApp que "vazou" e virou grupo de 500 pessoas.',
      'Postou review 5 estrelas mencionando um desconto "único" que agora todo mundo cobra.',
      'Fez tanta fama que a loja ficou sem estoque do produto mais vendido.',
      'Reclamou (educadamente) e ganhou upgrade de graça — precedente perigoso pro caixa da loja.'
    ]
  },
  {
    id: 'startup', nome: 'Startup de app', categoria: 'Tecnologia', emoji: '🚀', tier: 'Caro', custo: 6500,
    taxas: [
      'Testou a versão premium de graça por "período de avaliação estendido".',
      'Achou um bug e exigiu compensação em créditos vitalícios.',
      'Pediu pra ser "beta tester oficial" e reclamou de tudo que via.',
      'Cancelou assinatura e reativou 3 vezes pra pegar promoção de "volta".',
      'Marcou reunião com o fundador "só pra dar feedback" e tomou 1 hora do dia dele.'
    ],
    karmaRuim: [
      'App travou bem na hora que precisava mais e perdeu um compromisso importante.',
      'Investiu na "pré-venda" de uma feature que nunca saiu do papel.',
      'Compartilhou a senha com um amigo e a conta foi banida por violação de termos.',
      'Reclamou publicamente do app e foi voz ativa contra ele mesmo sendo usuário fiel.',
      'Ficou viciado no app e perdeu produtividade no trabalho (e quase o emprego).'
    ],
    karmaBom: [
      'Deu feedback tão bom que virou "consultor não remunerado" oficial da empresa.',
      'Fez tanta propaganda que o servidor caiu de tanto acesso repentino.',
      'Investidor visto usando o app decidiu "conversar" com o fundador sobre equity.',
      'Elogio viral atraiu atenção de um concorrente gigante, que copiou a ideia em 1 mês.',
      'Sugestão de feature virou pauta obrigatória, atrasando o roadmap real da empresa.'
    ]
  },
  {
    id: 'lanhouse', nome: 'Lan house', categoria: 'Tecnologia', emoji: '🖥️', tier: 'Barato', custo: 1000,
    taxas: [
      'Jogou 1 hora e pediu "só mais uns minutinhos de cortesia" 5 vezes.',
      'Trouxe o próprio fone "pra economizar" mas usou o computador da loja mesmo assim.',
      'Fez download de arquivo gigante "sem querer" e travou a internet de todo mundo.',
      'Pediu pra usar impressora pra imprimir "uma coisinha rápida" (30 páginas).',
      'Marcou torneio "amistoso" que na prática exigiu reserva da sala toda.'
    ],
    karmaRuim: [
      'Perdeu a partida decisiva do campeonato local na frente de todo mundo.',
      'PC travou no meio do jogo mais importante do dia.',
      'Esqueceu o boné e a franja suada apareceu bem na hora da webcam ligar.',
      'Foi expulso da sala de jogo por "rage quit" escandaloso.',
      'Gastou tudo que tinha em créditos de jogo e ficou sem dinheiro pro busão de volta.'
    ],
    karmaBom: [
      'Fez tanta fama que virou "point competitivo" — agora tem fila pra usar os PCs bons.',
      'Ganhou torneio local e a lan house virou "oficial" de campeonato regional (sem infraestrutura pra isso).',
      'Postou setup "insano" e agora todo cliente exige o mesmo PC top.',
      'Indicou pra galera do streaming, lotando o local todo fim de semana.',
      'Reclamou (com razão) da internet lenta e o dono teve que investir tudo num upgrade caro.'
    ]
  },
  {
    id: 'assistencia', nome: 'Assistência técnica', categoria: 'Tecnologia', emoji: '🔧', tier: 'Barato', custo: 1300,
    taxas: [
      'Levou o celular quebrado "por acidente" (deixou cair na piscina de propósito quase).',
      'Pediu orçamento em 5 lugares diferentes e voltou pro primeiro "porque era mais barato mesmo".',
      'Reclamou do prazo sem considerar que a peça vem de fora.',
      'Pediu pra "só dar uma olhadinha rápida" que virou troca de tela completa.',
      'Esqueceu a senha do celular e fez o técnico "adivinhar" por 20 minutos.'
    ],
    karmaRuim: [
      'Tela nova quebrou de novo no dia seguinte (queda própria, claro).',
      'Perdeu todas as fotos porque "esqueceu" de fazer backup antes do conserto.',
      'Descobriu que o "conserto rápido" ia demorar 1 semana pela falta da peça.',
      'Ficou sem celular no dia mais importante (entrevista de emprego, encontro, etc.).',
      'Pagou caro achando que era conserto simples e era a placa-mãe inteira.'
    ],
    karmaBom: [
      'Conserto tão bom e rápido que virou "point de emergência" — fila lotada todo dia.',
      'Elogiou tanto que a assistência virou "referência" e a concorrência começou a copiar os preços pra baixo.',
      'Indicou pro chefe, que agora exige atendimento VIP "porque o funcionário disse que era bom".',
      'Fez propaganda tão boa que peça ficou em falta por excesso de demanda.',
      'Reclamação "gentil" sobre o preço da peça fez o técnico trabalhar quase de graça.'
    ]
  },
  {
    id: 'ecommerce', nome: 'Loja virtual', categoria: 'Tecnologia', emoji: '🛒', tier: 'Médio', custo: 2800,
    taxas: [
      'Comprou, se arrependeu, e devolveu 3 vezes o mesmo produto em cores diferentes.',
      'Pediu frete grátis "porque é cliente fiel" (primeira compra).',
      'Reclamou do prazo de entrega no dia seguinte ao pedido (frete padrão de 10 dias).',
      'Usou cupom de desconto vencido e insistiu que "devia funcionar".',
      'Deixou review de 1 estrela por causa do frete, não do produto.'
    ],
    karmaRuim: [
      'Produto veio com defeito bem na hora que precisava mais dele.',
      'Comprou tamanho errado por não ler a tabela de medidas.',
      'Pacote chegou violado e faltando peça.',
      'Comprou por impulso numa promoção e se arrependeu no dia seguinte.',
      'Errou o endereço de entrega e o produto foi parar na casa do vizinho.'
    ],
    karmaBom: [
      'Review 5 estrelas trouxe pico de vendas que a loja não tinha estoque pra atender.',
      'Elogio viral fez o produto "sold out" em 1 hora, gerando fila de reclamação de quem não conseguiu comprar.',
      'Indicou num grupo grande e o site caiu de tanto acesso simultâneo.',
      'Fez tanta propaganda que a loja virou alvo de falsificadores vendendo cópia mais barata.',
      'Reclamação (educada) sobre atraso gerou política de reembolso automático que quebrou o caixa do mês.'
    ]
  },
  // 🎭 Entretenimento
  {
    id: 'cinema', nome: 'Cinema', categoria: 'Entretenimento', emoji: '🎬', tier: 'Médio', custo: 3200,
    taxas: [
      'Pediu combo gigante de pipoca e refri "pra dividir" (e comeu tudo sozinho).',
      'Trocou de assento 3 vezes durante o filme "procurando o melhor ângulo".',
      'Chegou atrasado e pediu pra "passar o resumo" do que perdeu.',
      'Levou comida de fora escondida e foi pego pelo cheiro.',
      'Ficou no celular com a tela no brilho máximo durante o filme todo.'
    ],
    karmaRuim: [
      'Sentou do lado de alguém que comentava o filme inteiro, e era ele mesmo.',
      'Filme era em outro idioma e ele não sabia ler legenda rápido o suficiente.',
      'Derramou pipoca inteira no colo bem na cena de suspense.',
      'Dormiu no cinema e roncou tão alto que interrompeu a plateia.',
      'Escolheu o filme errado achando que era outra continuação.'
    ],
    karmaBom: [
      'Elogiou tanto a experiência que virou "point de cinéfilo" — agora fila enorme toda sexta.',
      'Indicou pra um crítico famoso que detonou a qualidade do som numa review pública.',
      'Postou sobre o combo barato e agora todo mundo pede o mesmo preço promocional.',
      'Fez tanta fama que sessão lotou e teve que remarcar clientes que já tinham ingresso.',
      'Reclamou (com razão) do ar-condicionado e o cinema gastou uma fortuna pra trocar o sistema.'
    ]
  },
  {
    id: 'boate', nome: 'Boate', categoria: 'Entretenimento', emoji: '🪩', tier: 'Caro', custo: 5500,
    taxas: [
      'Entrou na lista VIP "conhecendo alguém" que nem trabalha mais lá.',
      'Pediu open bar achando que a entrada já incluía.',
      'Ficou na pista a noite toda sem consumir nada além da água grátis.',
      'Trouxe "mais 5 amigos" que "combinaram de vir" sem avisar antes.',
      'Pediu desconto na saída "porque a noite não estava tão boa assim".'
    ],
    karmaRuim: [
      'Dançou demais e torceu o tornozelo bem no momento da música preferida.',
      'Perdeu o celular na pista de dança lotada.',
      'Gastou tudo no guarda-volumes e ainda perdeu o tíquete.',
      'Discutiu com o segurança por causa da lista e foi barrado feio na frente de todos.',
      'Bebeu além da conta e virou o "vexame" registrado em vídeo por estranhos.'
    ],
    karmaBom: [
      'Fez tanta propaganda que a boate lotou além da capacidade e teve multa por superlotação.',
      'Elogio viral trouxe fiscalização de surpresa da prefeitura.',
      'Indicou pra uma celebridade que exigiu área exclusiva, irritando clientes antigos.',
      'Postou "melhor noite da vida" e agora todo mundo espera o mesmo nível de festa toda semana.',
      'Fez tanta fama que DJ favorito recebeu proposta melhor e saiu no meio da temporada.'
    ]
  },
  {
    id: 'parque', nome: 'Parque de diversões', categoria: 'Entretenimento', emoji: '🎡', tier: 'Caro', custo: 7000,
    taxas: [
      'Furou fila achando que o passaporte "premium" dava prioridade em tudo.',
      'Comeu antes de ir no brinquedo mais radical (e sabia o que ia acontecer).',
      'Pediu foto profissional grátis "porque já pagou o ingresso caro".',
      'Trouxe criança pequena demais pra um brinquedo e discutiu com o operador.',
      'Perdeu o brinde do combo família e exigiu reposição imediata.'
    ],
    karmaRuim: [
      'Passou mal na montanha-russa bem na frente de todo mundo da fila.',
      'Perdeu os pertences no brinquedo de água (celular incluso).',
      'Ficou preso no topo da roda-gigante por manutenção "rapidinha".',
      'Discutiu sobre a fila e acabou sendo o último a entrar de qualquer jeito.',
      'Comprou pipoca cara demais e ficou sem dinheiro pro resto do dia.'
    ],
    karmaBom: [
      'Elogiou tanto que virou point de aniversário — agenda lotada de festas o ano inteiro.',
      'Vídeo viral do brinquedo trouxe fila gigante e reclamação de tempo de espera.',
      'Indicou pra influencer que exigiu acesso vip gratuito pra "divulgar".',
      'Fez tanta fama que teve que contratar segurança extra pro fim de semana.',
      'Reclamação sobre preço do ingresso "gentil" derrubou o valor pro ano todo.'
    ]
  },
  {
    id: 'teatro', nome: 'Casa de shows', categoria: 'Entretenimento', emoji: '🎤', tier: 'Médio', custo: 3000,
    taxas: [
      'Pediu assento de "melhor vista" achando que o ingresso comum já dava direito a isso.',
      'Chegou atrasado e insistiu em entrar no meio do ato.',
      'Filmou o show inteiro pro Instagram, atrapalhando quem estava atrás.',
      'Cantou junto (mal) achando que estava "ajudando" o artista.',
      'Pediu autógrafo depois do show e ficou 20 minutos "só mais uma foto".'
    ],
    karmaRuim: [
      'Celular tocou alto no momento mais silencioso e emocionante da peça.',
      'Assento rangeu o show inteiro, todo mundo olhando feio.',
      'Chorou tanto na cena triste que ficou com maquiagem borrada pra selfie de saída.',
      'Aplaudiu no momento errado e ficou sozinho batendo palma.',
      'Perdeu o intervalo conversando e voltou pro ato final sem entender nada.'
    ],
    karmaBom: [
      'Elogio viral esgotou os ingressos em minutos, deixando fãs de longa data sem lugar.',
      'Indicou pro crítico mais rígido da cidade, que adorou (mas exigiu tratamento especial pra sempre).',
      'Fez tanta fama que artista principal pediu cachê maior pra próxima temporada.',
      'Postou clipe do show sem permissão, e virou problema de direitos autorais pro teatro.',
      'Fila de autógrafo tão grande que atrasou a saída de todo o elenco.'
    ]
  },
  {
    id: 'fliperama', nome: 'Fliperama', categoria: 'Entretenimento', emoji: '🕹️', tier: 'Barato', custo: 1500,
    taxas: [
      'Trocou ficha por prêmio, se arrependeu, e quis trocar de volta.',
      'Ficou numa máquina só "pra bater o recorde" travando a fila.',
      'Pediu fichas "emprestadas" pro amigo e nunca devolveu.',
      'Reclamou que a máquina de garra "é roubada" (é, mas não é culpa do dono).',
      'Trouxe criança pequena demais pra um jogo violento e discutiu quando foi impedido.'
    ],
    karmaRuim: [
      'Perdeu a partida decisiva bem na frente do crush.',
      'Gastou toda a ficha tentando pegar um prêmio bobo na máquina de garra.',
      'Foi zoado pelo placar baixo no jogo de dança.',
      'Ficou puto e chutou a máquina — e ela quebrou (e ele que pagou o conserto).',
      'Perdeu a aposta amistosa e teve que pagar o lanche de todo mundo.'
    ],
    karmaBom: [
      'Bateu recorde histórico e virou "lenda local" — agora tem fila só pra tentar quebrar o recorde dele.',
      'Fez tanta fama que virou point de campeonato regional sem estrutura pra isso.',
      'Elogiou tanto que a casa de jogos virou point de aniversário infantil todo fim de semana.',
      'Indicou pra galera do streaming e lotou o local de gente querendo aparecer no vídeo.',
      'Reclamação "gentil" sobre preço da ficha derrubou o valor e apertou a margem do dono.'
    ]
  },
  // 🏥 Saúde
  {
    id: 'veterinaria', nome: 'Clínica veterinária', categoria: 'Saúde', emoji: '🐾', tier: 'Médio', custo: 2600,
    taxas: [
      'Levou o pet pra "só uma consulta rápida" que virou exame completo.',
      'Pediu desconto porque "tem 3 pets" (trouxe só 1 pra consulta).',
      'Discutiu o diagnóstico achando que sabia mais que o veterinário (pesquisou no Google).',
      'Marcou horário e chegou 1 hora atrasado "porque o pet não queria sair de casa".',
      'Pediu remédio "genérico mais barato" sem considerar a indicação do profissional.'
    ],
    karmaRuim: [
      'O pet mordeu ele mesmo durante o exame, na frente de todo mundo.',
      'Esqueceu de levar a carteirinha de vacinação e teve que refazer tudo.',
      'O pet fez xixi na sala de espera na frente de outros donos.',
      'Discordou do diagnóstico, foi pesquisar "por conta própria" e piorou o quadro.',
      'Chorou mais que o próprio pet durante o procedimento simples.'
    ],
    karmaBom: [
      'Elogiou tanto que virou "point de pet lover" — agenda lotada pros próximos 2 meses.',
      'Indicou pra influencer pet, que exigiu atendimento vip gratuito "pra divulgar".',
      'Fez tanta propaganda que a clínica ficou sem vaga de emergência pros casos urgentes.',
      'Postou "melhor veterinário da cidade" e agora ele é o único que os clientes aceitam.',
      'Reclamação sobre preço "com carinho" derrubou o valor da consulta pra sempre.'
    ]
  },
  {
    id: 'farmacia', nome: 'Farmácia', categoria: 'Saúde', emoji: '💊', tier: 'Médio', custo: 2400,
    taxas: [
      'Pediu desconto no remédio "porque tá caro" (não tem desconto em remédio controlado).',
      'Perguntou o preço de tudo, comparou, e comprou só o mais barato mesmo assim.',
      'Trocou o remédio genérico pelo de marca "só pra garantir" e reclamou do preço depois.',
      'Pediu pra "só aferir a pressão" e ficou meia hora conversando sobre sintomas.',
      'Levou receita vencida e insistiu que "ainda valia".'
    ],
    karmaRuim: [
      'Comprou remédio errado por pressa e teve que voltar na fila de novo.',
      'Esqueceu a receita em casa depois de 40 minutos de fila.',
      'Confundiu os horários dos remédios e sentiu o efeito colateral errado.',
      'Discutiu o preço na fila e todo mundo atrás começou a reclamar também.',
      'Recebeu troco errado e só percebeu depois de sair.'
    ],
    karmaBom: [
      'Elogiou tanto o atendimento que virou "point de bairro" — fila que não acaba nunca.',
      'Indicou pro grupo de WhatsApp da igreja/condomínio e lotou o balcão.',
      'Fez tanta fama que farmacêutico favorito virou "consultor não remunerado" de todo mundo.',
      'Postou sobre o preço bom e agora todo cliente exige o mesmo desconto "de sempre".',
      'Reclamação "gentil" sobre demora fez a farmácia contratar mais funcionário, apertando o caixa.'
    ]
  },
  {
    id: 'dentista', nome: 'Consultório odontológico', categoria: 'Saúde', emoji: '🦷', tier: 'Médio', custo: 3400,
    taxas: [
      'Cancelou 2 consultas em cima da hora e remarcou "de última hora" mesmo assim.',
      'Pediu clareamento "rapidinho" que virou tratamento de várias sessões.',
      'Discutiu o orçamento comparando com "um primo que faz mais barato".',
      'Chegou atrasado reclamando que "o trânsito não colabora" (mora a 5 min dali).',
      'Pediu anestesia extra "só por garantia" sem necessidade médica.'
    ],
    karmaRuim: [
      'Ficou de bochecha inchada bem no dia de um evento importante.',
      'Sentiu o gosto de anestesia o dia inteiro e não conseguiu comer direito.',
      'Descobriu que precisava de canal na consulta que era "só pra limpeza".',
      'Ficou com medo de dentista, cancelou tudo, e a dor de dente voltou pior.',
      'Comeu algo duro logo depois do procedimento e teve que voltar correndo.'
    ],
    karmaBom: [
      'Sorriso novo virou propaganda ambulante — agora todo mundo quer o "mesmo dentista", agenda lotada até ano que vem.',
      'Elogiou tanto que virou referência de indicação em grupo de bairro, sobrecarregando a agenda.',
      'Postou antes/depois impressionante e virou meta impossível pra outros pacientes.',
      'Indicou pra um crítico de saúde nas redes, que fez auditoria pública dos preços.',
      'Reclamação (educada) sobre valor do tratamento derrubou o preço pra sempre.'
    ]
  },
  {
    id: 'clinica', nome: 'Clínica médica', categoria: 'Saúde', emoji: '🩺', tier: 'Caro', custo: 5000,
    taxas: [
      'Pediu procedimento "igual ao da celebridade" ignorando as diferenças óbvias.',
      'Cancelou em cima da hora achando que não teria taxa (tinha).',
      'Trouxe print de resultado de outra clínica pra "comparar em tempo real".',
      'Discutiu o preço citando "influenciadora que fez de graça" (parceria paga, não gratuita).',
      'Pediu desconto por "trazer amigo" que nem marcou consulta.'
    ],
    karmaRuim: [
      'Procedimento inchou mais do que o esperado, ficou de máscara por 1 semana.',
      'Escolheu opção "mais natural" e saiu parecendo outra pessoa completamente.',
      'Fez o procedimento antes de um evento importante e não teve tempo de recuperação.',
      'Comparou o próprio resultado com o de uma celebridade e ficou revoltado com a diferença.',
      'Contou "discretamente" pra todo mundo que fez o procedimento.'
    ],
    karmaBom: [
      'Resultado tão bom que virou propaganda involuntária — agenda lotada, preço nunca mais sobe.',
      'Indicou pra uma celebridade que exigiu sigilo e horário exclusivo, irritando outros pacientes.',
      'Elogio nas redes trouxe fiscalização "de surpresa".',
      'Profissional principal foi "roubado" pela clínica concorrente depois da fama.',
      'Antes/depois postado virou padrão impossível de repetir em todo mundo.'
    ]
  },
  {
    id: 'otica', nome: 'Ótica', categoria: 'Saúde', emoji: '👓', tier: 'Barato', custo: 1400,
    taxas: [
      'Testou 15 armações "só pra ver como fica" e comprou a mais barata.',
      'Pediu ajuste de graça achando que era vitalício sem limite de vezes.',
      'Trocou de lente 2 vezes "porque não gostou da cor".',
      'Reclamou do prazo do exame de vista "porque em outro lugar é mais rápido".',
      'Pediu desconto citando "óculos que viu na internet mais barato".'
    ],
    karmaRuim: [
      'Escolheu a armação "da moda" e não combinou nadinha com o rosto.',
      'Sentou em cima dos próprios óculos na frente de todo mundo.',
      'Confundiu o grau e saiu enxergando pior do que antes.',
      'Perdeu os óculos novos no primeiro dia de uso.',
      'Descobriu no espelho de casa que a armação ficou torta.'
    ],
    karmaBom: [
      'Elogiou tanto o atendimento que virou "point de indicação" — fila de exame de vista lotada.',
      'Postou o antes/depois da armação nova e virou modelo padrão que todo mundo pede.',
      'Indicou pro grupo da família toda, e a ótica teve que remarcar todo mundo pra semana seguinte.',
      'Fez tanta fama que a armação "queridinha" saiu de linha por excesso de demanda.',
      'Reclamação "gentil" sobre o preço do exame derrubou o valor pra sempre.'
    ]
  },
  // 🚗 Transporte
  {
    id: 'locadora', nome: 'Locadora de carros', categoria: 'Transporte', emoji: '🚗', tier: 'Médio', custo: 3300,
    taxas: [
      'Devolveu o carro sem gasolina "porque esqueceu de abastecer".',
      'Pediu upgrade de categoria "de cortesia" achando que era automático.',
      'Bateu de leve e "nem percebeu", mas a vistoria percebeu.',
      'Estendeu a locação sem avisar e devolveu 2 dias depois.',
      'Reclamou do carro "cheirando novo demais" (sim, isso foi reclamação real).'
    ],
    karmaRuim: [
      'Carro alugado quebrou no meio de uma viagem importante.',
      'Multou por excesso de velocidade tentando "testar o carro novo".',
      'Ficou preso no trânsito com o tanque quase vazio, sem posto por perto.',
      'Confundiu o carro alugado com outro no estacionamento e discutiu com um estranho.',
      'Esqueceu pertences pessoais no carro e teve que voltar correndo pra locadora.'
    ],
    karmaBom: [
      'Elogiou tanto que virou "cliente preferencial" — sempre pede o mesmo carro específico, sem disponibilidade.',
      'Indicou pra empresa inteira, e a locadora ficou sem carro disponível no mês seguinte.',
      'Postou sobre o preço bom e agora todo cliente exige o mesmo valor promocional.',
      'Fez tanta fama que carro "queridinho" ficou reservado meses à frente.',
      'Reclamação "gentil" sobre taxa extra derrubou a política de cobrança pra sempre.'
    ]
  },
  {
    id: 'oficina', nome: 'Oficina mecânica', categoria: 'Transporte', emoji: '🛠️', tier: 'Barato', custo: 1200,
    taxas: [
      'Levou o carro "fazendo um barulhinho estranho" que virou reforma completa do motor.',
      'Pediu orçamento em 5 lugares e voltou pro primeiro "porque confia mais".',
      'Discutiu o diagnóstico achando que sabia mais que o mecânico (viu um vídeo no YouTube).',
      'Pediu pra "só dar uma olhadinha" que virou troca de peça cara.',
      'Reclamou do prazo sem considerar que a peça vem de fora.'
    ],
    karmaRuim: [
      'Carro quebrou de novo 1 semana depois do conserto (por mau uso, claro).',
      'Descobriu que o problema era "besteira" e pagou caro mesmo assim.',
      'Ficou sem carro no dia mais importante por causa do conserto atrasado.',
      'Discutiu o preço da peça sem saber que ela vinha importada.',
      'Emprestou o carro pro amigo, que devolveu com o problema de volta.'
    ],
    karmaBom: [
      'Conserto tão bom que virou "point de confiança" — fila de carros esperando vaga na oficina.',
      'Indicou pra empresa de frota inteira, sobrecarregando a agenda por meses.',
      'Elogiou tanto que o mecânico principal foi "roubado" por oficina concorrente.',
      'Fez propaganda tão boa que peça específica ficou em falta na região inteira.',
      'Reclamação "gentil" sobre valor do serviço fez a oficina trabalhar quase de graça.'
    ]
  },
  {
    id: 'apptransporte', nome: 'App de transporte', categoria: 'Transporte', emoji: '📲', tier: 'Caro', custo: 6000,
    taxas: [
      'Cancelou a corrida em cima da hora "porque achou mais barato outro app".',
      'Pediu pra "só dar uma passadinha" fora da rota combinada.',
      'Deu nota baixa pro motorista por trânsito (culpa da cidade, não dele).',
      'Levou 3 pessoas a mais que o combinado "porque cabia".',
      'Comeu no carro sem avisar e deixou cheiro/sujeira.'
    ],
    karmaRuim: [
      'Motorista cancelou em cima da hora e ele perdeu um compromisso importante.',
      'Pegou trânsito enorme bem na corrida mais cara do mês.',
      'Esqueceu pertence pessoal no carro e não conseguiu contato com o motorista depois.',
      'Discutiu o preço da corrida na tarifa dinâmica sem entender o motivo.',
      'Passou mal no banco de trás e teve que pagar taxa de limpeza.'
    ],
    karmaBom: [
      'Elogiou tanto o motorista que virou "o queridinho" — agora todo mundo só quer corrida com ele, fila de espera enorme.',
      'Indicou pro grupo de trabalho todo, lotando os horários de pico da região.',
      'Deu nota máxima e comentário público, e agora o motorista vive comparado a esse "padrão perfeito".',
      'Fez tanta fama que motorista favorito virou "influencer local" e reduziu a disponibilidade pra gravar conteúdo.',
      'Reclamação "gentil" sobre tarifa fez o app rever preços pra baixo na região.'
    ]
  },
  {
    id: 'posto', nome: 'Posto de gasolina', categoria: 'Transporte', emoji: '⛽', tier: 'Barato', custo: 1500,
    taxas: [
      'Pediu pra calibrar os pneus "de graça" achando que era serviço padrão sempre.',
      'Usou o banheiro sem consumir nada, várias vezes na mesma semana.',
      'Discutiu o preço do combustível "porque no posto ao lado é mais barato" (era gasolina adulterada).',
      'Pediu desconto no lava-rápido "porque é cliente fiel do combustível".',
      'Encheu o tanque e descobriu que esqueceu a carteira no carro (foi buscar e voltou).'
    ],
    karmaRuim: [
      'Encheu o tanque errado e teve que rebocar o carro na sequência.',
      'Discutiu o troco e descobriu que estava certo (o erro era dele).',
      'Ficou na fila do caixa atrás de alguém "só pagando trocado, moeda por moeda".',
      'Esqueceu a tampa do tanque no posto e só percebeu na estrada.',
      'Comprou salgadinho vencido no mini mercado do posto.'
    ],
    karmaBom: [
      'Elogiou tanto o atendimento que virou "point de parada obrigatória" — fila na bomba toda hora do rush.',
      'Indicou pro grupo de motoristas de aplicativo, e o posto não aguentou o volume extra.',
      'Postou sobre o preço bom, e concorrente do lado baixou ainda mais só pra fazer feio.',
      'Fez tanta fama que o mini mercado do posto ficou sem estoque no fim de semana.',
      'Reclamação "gentil" sobre preço derrubou o valor do litro na região toda.'
    ]
  },
  {
    id: 'mudancas', nome: 'Empresa de mudanças', categoria: 'Transporte', emoji: '📦', tier: 'Médio', custo: 2000,
    taxas: [
      'Subestimou a quantidade de coisas "é pouca coisa" e virou mudança de caminhão inteiro.',
      'Pediu pra "só levar mais uma caixinha" repetidas vezes durante o serviço.',
      'Reclamou do horário combinado achando que "de manhã" significava 6h.',
      'Pediu desconto por "ser vizinho do dono" (nunca se conheceram antes).',
      'Discutiu o preço do frete de um piano que "esqueceu de mencionar antes".'
    ],
    karmaRuim: [
      'Um móvel quebrou na mudança por ter sido "embalado por conta própria" mal feito.',
      'Esqueceu itens importantes na casa antiga e teve que voltar buscar.',
      'Chegou na casa nova e faltava chave, ficou esperando no meio da mudança.',
      'Discutiu o preço final sem ter combinado direito o valor antes.',
      'Perdeu um item de valor sentimental no meio das caixas confusas.'
    ],
    karmaBom: [
      'Elogiou tanto o serviço que virou "point de indicação" — agenda lotada até o próximo trimestre.',
      'Indicou pra prédio inteiro que estava mudando de síndico, lotando a empresa num mês só.',
      'Postou sobre o preço justo e agora todo cliente exige orçamento igual, mesmo mudanças maiores.',
      'Fez tanta fama que a equipe mais experiente ficou sobrecarregada de trabalho.',
      'Reclamação "gentil" sobre atraso fez a empresa contratar mais gente às pressas, apertando o caixa.'
    ]
  },
  // 👗 Moda & Varejo
  {
    id: 'roupas', nome: 'Loja de roupas', categoria: 'Moda & Varejo', emoji: '👗', tier: 'Médio', custo: 2300,
    taxas: [
      'Provou 15 peças e comprou só uma, deixando o provador uma bagunça.',
      'Pediu desconto "porque é a segunda vez que vem na semana" (não é fidelidade, é indecisão).',
      'Trocou a peça 3 vezes por tamanho errado (mesmo depois de provar).',
      'Pediu pra reservar a peça "só até amanhã" e voltou 1 semana depois.',
      'Reclamou do preço comparando com uma peça "parecida" de qualidade bem inferior.'
    ],
    karmaRuim: [
      'Comprou uma peça pelo hype e nunca mais usou.',
      'A roupa nova desbotou na primeira lavada por não seguir a etiqueta.',
      'Comprou tamanho errado por vergonha de pedir ajuda no provador.',
      'Usou a roupa nova num dia de chuva e estragou tudo.',
      'Pagou caro numa peça "exclusiva" que viu igual em outra loja mais barata depois.'
    ],
    karmaBom: [
      'Elogiou tanto o look que virou "modelo padrão" — todo cliente quer a peça exata, que saiu de linha.',
      'Indicou pro grupo de amigas todo, esvaziando o estoque da coleção nova em 1 dia.',
      'Postou o look nas redes e virou tendência — agora não dá conta da demanda.',
      'Fez tanta fama que a vendedora favorita foi "roubada" por loja concorrente.',
      'Reclamação "gentil" sobre preço derrubou o valor da coleção inteira.'
    ]
  },
  {
    id: 'calcados', nome: 'Loja de calçados', categoria: 'Moda & Varejo', emoji: '👟', tier: 'Barato', custo: 1300,
    taxas: [
      'Provou 10 pares "só pra comparar conforto" e comprou o mais barato.',
      'Pediu desconto porque "combina com uma roupa que já tem" (lógica questionável).',
      'Trocou o par 2 vezes por tamanho, mesmo tendo provado antes.',
      'Reclamou do preço do calçado "de marca" citando o genérico similar.',
      'Pediu pra usar o calçado novo "só pra testar na rua" e devolveu sujo.'
    ],
    karmaRuim: [
      'Sapato novo apertou e formou bolha bem no dia de caminhar muito.',
      'Escorregou na rua com o solado novo ainda "escorregadio de fábrica".',
      'Comprou por status e o modelo saiu de moda em 1 mês.',
      'Combinou errado com a roupa e só percebeu nas fotos do evento.',
      'Perdeu um dos pares em uma balada (literalmente, sumiu um só).'
    ],
    karmaBom: [
      'Elogiou tanto o modelo que ele saiu de linha por excesso de demanda repentina.',
      'Indicou pro time de corrida inteiro, e a loja ficou sem numeração no estoque.',
      'Postou o "achadinho" nas redes e o preço promocional virou expectativa permanente dos clientes.',
      'Fez tanta fama que teve fila de espera pra reposição do modelo específico.',
      'Reclamação "gentil" sobre durabilidade fez a loja trocar de fornecedor às pressas.'
    ]
  },
  {
    id: 'joalheria', nome: 'Joalheria', categoria: 'Moda & Varejo', emoji: '💍', tier: 'Caro', custo: 7000,
    taxas: [
      'Pediu pra "só experimentar" as peças mais caras da vitrine, sem intenção de comprar.',
      'Trocou a joia de presente 2 vezes porque "não caiu bem no clima da relação".',
      'Pediu desconto "porque é uma data especial" (nenhuma data especial de verdade).',
      'Reclamou do valor do certificado de autenticidade, achando desnecessário.',
      'Pediu pra gravar uma frase na peça e mudou de ideia 3 vezes.'
    ],
    karmaRuim: [
      'Foi assaltado saindo da loja com a joia recém-comprada. Perdeu tudo.',
      'A joia caiu no ralo durante a lavagem das mãos no banheiro da loja.',
      'Descobriu, depois de comprar, que era réplica vendida por golpista (não da loja, mas ficou com trauma de joalheria).',
      'Perdeu a aliança recém-comprada no dia do próprio noivado.',
      'Pagou caro numa peça "única" e viu réplica idêntica em outra loja no dia seguinte.'
    ],
    karmaBom: [
      'Peça tão elogiada que virou "modelo icônico" da loja — agora todo cliente exige o mesmo desconto exclusivo.',
      'Indicou pra uma celebridade, que exigiu segurança extra e sigilo total nas próximas compras.',
      'Postou a joia nas redes e virou alvo de comentário sobre "preço abusivo", prejudicando a reputação da loja.',
      'Elogio trouxe atenção indesejada — a loja precisou reforçar segurança por causa do burburinho.',
      'Fez tanta fama que o modelo mais vendido ficou com fila de espera de meses.'
    ]
  },
  {
    id: 'brinquedos', nome: 'Loja de brinquedos', categoria: 'Moda & Varejo', emoji: '🧸', tier: 'Barato', custo: 1100,
    taxas: [
      'Deixou a criança abrir e testar o brinquedo antes de decidir comprar.',
      'Pediu desconto "porque é aniversário da criança" (não era).',
      'Trocou o brinquedo 2 vezes porque a criança "mudou de ideia" na saída da loja.',
      'Reclamou do preço do brinquedo "de marca" comparando com genérico de qualidade inferior.',
      'Pediu pra embrulhar de presente de graça mesmo sem comprar o suficiente pra isso.'
    ],
    karmaRuim: [
      'Brinquedo quebrou no mesmo dia por "uso extremamente entusiasmado" da criança.',
      'Comprou o brinquedo da moda e ele saiu de moda em 2 semanas.',
      'Esqueceu de comprar pilhas e a criança chorou o dia inteiro sem poder usar.',
      'Brinquedo tinha peça pequena e sumiu debaixo do sofá no primeiro dia.',
      'Discussão feia com outro pai/mãe pelo último brinquedo em promoção.'
    ],
    karmaBom: [
      'Elogiou tanto o brinquedo que ele esgotou em todas as lojas da rede em 1 semana.',
      'Indicou pra escola toda da criança, e a loja não deu conta da demanda de fim de ano.',
      'Postou o "presente perfeito" nas redes e virou item obrigatório de toda lista de Natal.',
      'Fez tanta fama que fornecedor aumentou o preço pro lojista por causa da demanda repentina.',
      'Reclamação "gentil" sobre preço derrubou o valor do brinquedo mais vendido da loja.'
    ]
  },
  {
    id: 'livraria', nome: 'Livraria', categoria: 'Moda & Varejo', emoji: '📚', tier: 'Barato', custo: 1000,
    taxas: [
      'Ficou 2 horas lendo de graça no café da livraria sem comprar nada — até comprar um marcador de página.',
      'Pediu desconto "porque comprou 2 livros" (a promoção era pra 3).',
      'Reservou um livro e não foi buscar por 1 mês.',
      'Pediu pra embrulhar de presente de graça um livro comprado com cupom.',
      'Reclamou do preço do livro comparando com "sebo", ignorando que era lançamento.'
    ],
    karmaRuim: [
      'Comprou um livro pela capa bonita e odiou a história.',
      'Derramou café em cima do livro recém-comprado, ainda dentro da livraria.',
      'Ficou tão absorto lendo que perdeu a hora de um compromisso.',
      'Comprou o livro errado da saga (fora de ordem) e só percebeu na metade.',
      'Emprestou o livro novo pro amigo, que devolveu todo desgastado.'
    ],
    karmaBom: [
      'Elogiou tanto o livro que ele esgotou em todas as filiais e a editora não deu conta da reimpressão.',
      'Indicou pro clube do livro inteiro, lotando a livraria pro evento do mês.',
      'Postou resenha tão boa que virou "leitura obrigatória" — fila de espera pra reserva.',
      'Fez tanta fama que autor local pediu pra fazer sessão de autógrafos, lotando o espaço pequeno da loja.',
      'Reclamação "gentil" sobre preço derrubou o valor do lançamento mais aguardado do ano.'
    ]
  },
];

/* PLACEHOLDER — fallback, só usado se algum negócio futuro não tiver textos próprios. */
window.CAOS_DATA.textosPadrao = {
  taxas: [
    'Você deu uma passadinha na {nome} e a conta chegou antes do cardápio.',
    'Visita "rápida" na {nome}. Saiu com a carteira mais leve.',
    'A {nome} cobrou taxa de convivência. Ninguém sabe o que é isso.',
  ],
  karmaBom: [
    '[placeholder] Karma bom na {nome}: o visitante sai bem, o dono se ferra.',
    '[placeholder] Algo deu muito certo pra você na {nome} — e muito errado pro dono.',
  ],
  karmaRuim: [
    '[placeholder] Karma ruim na {nome}: a coisa desandou pro seu lado.',
    '[placeholder] A {nome} te deu azar em dose dupla.',
  ],
};
