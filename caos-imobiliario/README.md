# Caos Imobiliário (protótipo jogável)

## 🆕 Mudanças de regras (v5 — feitas pelo Claude direto no código, todas testadas)
- **Início:** 1 negócio por jogador (antes 2-3) + R$ 30.000 de reputação inicial (antes R$ 20.000).
- **Karma redesenhado:** agora só **35% de chance** de acontecer algo além da taxa normal (antes era sempre). Quando acontece: **karma bom** = o visitante rouba de volta exatamente o valor da taxa do dono; **karma ruim** = o dono rouba o dobro do visitante (ele paga a taxa + o mesmo valor de novo). Testado estatisticamente: ~34% de disparo, ~50/50 entre bom e ruim.
- **Última Cartada escalonada:** 1ª quebra = 40% de chance de voltar, 2ª = 30%, 3ª = 15%. Da 4ª em diante, sem chance nenhuma — eliminação direta.
- **Multa por recusar prenda/efeito** (local e online): escalona 300 → 1.300 → 2.300 → 3.000 (trava no último valor a partir da 4ª recusa).
- **Regra do 6 no dado:** tirou 6, joga de novo (encadeia se tirar 6 de novo).
- **Virada de Sorte:** agora ganha 1 "tiro" a cada **2 taxas pagas** como visitante (não mais por karma ruim), sem limite de acúmulo — mas só pode **usar 1 por turno**. Também ganhou 20 efeitos diferentes (sorteados), no lugar dos 4 antigos.
- **Karma Online:** no modo online não existe mais prenda física — em vez disso, sorteia 1 de 20 efeitos leves/médios/pesados no jogo (ex: andar menos casas, ficar sem comprar, perder negócio, etc.), com o mesmo sistema de reroll (2 por partida) e multa de recusa escalonada.
- **Melhorar negócio:** ao cair no seu próprio negócio, pode pagar o custo de novo pra **dobrar a taxa** cobrada dos visitantes (nível sobe a cada melhoria).

Jogo de tabuleiro digital, pass-and-play, 2–12 jogadores (pessoas e/ou bots). Roda 100% no navegador, sem servidor.

## Como rodar
**Mesmo aparelho (pass-and-play):** abra `index.html` no navegador (funciona direto de `file://`). Em celular, sirva a pasta com qualquer servidor estático (ex.: `npx serve .`) e abra o endereço no aparelho. Não precisa de servidor nenhum.

**Online (cada um no seu aparelho):** precisa do servidor Node da pasta `server/` — veja "Multiplayer online" abaixo.

## Multiplayer online (v4)

### Como funciona
A engine nunca mexeu no navegador: ela só chama `io.ask(pending)` (pede uma decisão) e `io.animate(evento)` (avisa que algo aconteceu). No modo online a **engine roda no servidor** (`server/server.js`, uma instância por sala) com um `io` de rede:
- `ask` → mensagem só para o jogador da vez (`pending.playerId`); o servidor espera a resposta chegar pela rede. Bots são decididos no próprio servidor (`js/bots.js`), sem depender de cliente.
- `animate` → broadcast para a sala junto com um snapshot do estado; o servidor espera o `ack` dos jogadores humanos conectados (com timeout) para todo mundo seguir junto.
No navegador, `js/online.js` entrega o que chega pela rede às **mesmas** funções da UI (`UI.io().ask` / `UI.io().animate`) e devolve `answer`/`ack`. `UI.startOnline` mantém um espelho do estado (`UI.applyState`) para que HUD, balões, tabuleiro e peões funcionem sem mudança. Cada um só decide na própria vez; nas outras, assiste. Balões da *sua* jogada esperam seu toque; os dos outros avançam sozinhos (`UI.isMe`).
- Salas: código de 5 caracteres (ex. `CX7Q2`), anfitrião escolhe modo, adiciona/remove bots e começa; depois de iniciada ninguém mais entra.
- Reconexão: código + token ficam no navegador por 12 min; ao reabrir a página o cliente volta para a sala e recebe o estado atual e a pergunta pendente, se houver. O servidor guarda salas sem ninguém por `ROOM_TTL_MIN` (padrão 10 min).
- O modo "Mesmo aparelho" continua 100% local, sem servidor.

### Arquivos novos
```
server/server.js         servidor Node (http estático + WebSocket + salas + io de rede)
server/package.json      npm install / npm start
server/personagens.json  lista dos 12 personagens (gerada de js/characters.js)
server/test-3clientes.js teste de integração com 3 clientes falsos
js/config.js             endereço do servidor (configurável)
js/net.js                transporte WebSocket com reconexão
js/online.js             aba Online, salas, lobby e ponte para a UI
```

### Colocar o servidor no ar (passo a passo, sem programar)
Vercel/Netlify **não servem**: eles só hospedam arquivos estáticos e o servidor precisa ficar ligado o tempo todo com WebSocket. Use **Render** (tem plano gratuito), Railway ou Fly.io. Passos no Render:

1. Crie uma conta em https://render.com e conecte seu GitHub. Suba a pasta do jogo inteira num repositório (com a pasta `server/` dentro).
2. No Render: **New → Web Service** → escolha o repositório.
3. Preencha:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance type**: Free (serve para começar; a primeira conexão do dia pode demorar ~30 s para "acordar")
4. Em *Environment* não precisa criar nada: o Render define `PORT` sozinho. Se quiser, adicione `ROOM_TTL_MIN=15`.
5. Clique em **Create Web Service** e espere aparecer "Live". A URL será algo como `https://caos-imobiliario.onrender.com`.
6. **Pronto para jogar**: mande essa URL para as pessoas. Ela já abre o jogo (o servidor serve os arquivos), e a aba Online se conecta automaticamente ao próprio endereço.

Se você preferir manter o jogo no Netlify e só o servidor no Render, abra `js/config.js` e coloque o endereço do servidor com `wss://` (ex.: `serverUrl: 'wss://caos-imobiliario.onrender.com'`), depois publique de novo o Netlify. Sem isso, o jogador pode digitar o endereço manualmente em "Servidor" na aba Online (fica salvo no aparelho).

Para testar antes de publicar: `cd server && npm install && npm start`, abra `http://localhost:8080` em duas abas.

### Sair da partida (online)
O ✕ do HUD, no modo online, abre a confirmação "Tem certeza? Um bot assume o seu lugar…". Ao confirmar: o cliente manda `leave`, fecha o WebSocket, apaga a sessão salva (`caos_online_session`) e volta à tela inicial — ao reabrir o jogo **não** há reconexão. No servidor, `Room.abandonar()` marca o jogador como saído, transforma o jogador dele em bot (só o campo `tipo` muda; a engine segue intacta), responde na hora qualquer pergunta pendente dele, avisa a sala (`saiu` → toast e histórico) e recusa reconexão com aquele token. Se não sobrar nenhuma pessoa, a sala é encerrada. Quedas acidentais (sem clicar em sair) continuam com reconexão automática. Teste: `node server/test-sair.js`.

### Validação feita
- `server/test-sair.js`: Bruno sai de propósito aos 3 s, Carla cai e reconecta aos 5 s — partida chega ao fim sem Bruno, os outros recebem o aviso, Bruno não recebe mais nada e sua reconexão é recusada ("Você saiu dessa partida."), Carla reconecta.
- `server/test-3clientes.js`: partida completa (modo Rápido) com 3 clientes + 1 bot — 632 eventos vistos pelos 3 com estado idêntico, 0 `ask` entregue ao jogador errado, reconexão de um cliente no meio da partida, fim de jogo alcançado em 27 s.
- 3 navegadores reais (Playwright) + 1 bot no servidor local: 140/140 amostras com posições e reputações idênticas nas 3 telas; balão "sua vez" apareceu apenas na tela do dono do turno (30/30).
- Modo local (mesmo aparelho) sem regressão.

## Visual v5.2 — composição Monopoly Plus
- **Texto das casas (billboard)**: o nome e o preço de cada casa são um `THREE.Sprite` (`labelTex`) — encara a câmera automaticamente, em qualquer ponto do loop e ângulo, sem nenhum cálculo de rotação por casa. Fica na borda externa da casa como uma placa; a da casa do peão ativo sobe acima dele; as distantes desvanecem para não poluir. No topo da casa fica só a faixa colorida do distrito e o ícone. Validado em 12 posições do loop (`validacao-1`).
- **Miolo (composição fixa)**: grama de base; ruas em cruz asfaltadas com calçadas claras e faixa tracejada; praça circular de pedra com meio-fio ao redor da fonte (anéis concêntricos + ondulações animadas na água) e um monumento (pedestal + estátua cinza do "magnata" de cartola e bengala); quarteirões em grade nos 4 cantos com a paleta do distrito mais próximo; árvores e postes alternados ao longo das calçadas e ao redor da praça; carros circulando nas ruas (desviam da praça). No declínio: água escurece e para de ondular, grama amarela, carros param, postes tremem (`validacao-3`, dia e noite).
- **Cache**: os scripts e o CSS no `index.html` levam `?v=5.2` — ao publicar uma versão nova, mude esse número para o navegador dos jogadores não usar arquivos antigos (foi o que fez a captura do bug mostrar o tabuleiro anterior).
- **Câmera baixa**: por dentro do loop, ~130 unidades de altura, atrás e ao lado do peão, olhando ao longo do trajeto e um pouco para cima — peão em primeiro plano, casa em jogo à frente, prédios se erguendo ao fundo (`focusPlayer`). Vista geral (🗺️) e suavização mantidas.
- **Peão ativo maior**: escala 54 (era 34) com o LOD alto; os demais 34. Balões ancoram acima da cabeça nova.
- **Prédios**: 5 estilos (`box`, `roof` telhado 4 águas + chaminé, `tower` com recuo e antena piscante, `L`, `awning` toldos e varandas), 3 fileiras por distrito (a 3ª sem janelas: LOD), herói 35% maior e um **prédio-marco** (torre de 230–300) por distrito.
- **Miolo**: praça com fonte de anéis concêntricos (mostarda/coral/teal), duas ruas cruzando até os 4 lados com faixas, 5 carros em vaivém com velocidades diferentes, 14 postes piscando fora de fase (no estágio 3 tremem), quarteirões de 6 prédios em cada canto com a paleta do distrito mais próximo, 4 parques de árvores com banco, roda-gigante do lado de Entretenimento. No declínio: carros desaceleram até parar, roda para, tudo dessatura e inclina, janelas acendem.
- **Performance**: toda geometria estática opaca (blocos, telhados, árvores, faixas, aros das casas, props do miolo) vai para `InstancedMesh` com cor por instância, recalculado só nas trocas de estágio (`SI`). Na câmera de jogo: 60–190 draw calls e 20–34k triângulos; na vista geral: ~740 / 48k (momentânea). Tabuleiros Rápido/Médio usam menos props e sem janelas no miolo.

## Áudio (v4.1) — 100% sintetizado
`js/audio.js` gera tudo com Web Audio API (osciladores quadrado/triângulo/serra, ruído filtrado, envelopes), estilo chiptune. Nenhum arquivo de áudio.
- **Autoplay**: o `AudioContext` só é criado/retomado no primeiro toque/clique em qualquer lugar; chamadas antes disso são ignoradas em silêncio (sem erro no console).
- **Controles**: no HUD, 🎵 (música) e 🔊 (efeitos), independentes; a preferência fica em `localStorage` (`caos_audio_pref`) e vale entre partidas.
- **Música**: sequenciador em loop (baixo, melodia, bumbo, chimbal), volume baixo, só durante a partida. Acompanha os 4 estágios de declínio do tabuleiro: maior/alegre a 112 BPM → tons menores, timbre de serra e 130 BPM no estágio 3.

| efeito | quando toca |
|---|---|
| `click` | qualquer botão da interface (delegado) |
| `dice` | evento `dado` (rolagem) |
| `step` / `land` | cada casa andada / pouso na casa final |
| `chaching` | `compra` de negócio |
| `pay` | `taxa` (pagamento de visita) |
| `karmaBom` / `karmaRuim` | evento `karma` |
| `evento` / `eventoForte` | evento leve / forte |
| `powerup` | `token_ganho` (Virada de Sorte) |
| `whoosh` | `virada` (uso do token) |
| `suspense` → `fanfare` / `gameover` | Última Cartada: carta girando → sucesso / falha |
| `dundundun` | `heranca_falencia` (Falência Definitiva) |
| `coins` | `passou_topo` (Início / dividendos) |
| `finale` | fim de jogo (tela de ranking) |

## Estrutura
```
index.html          telas (início, jogo, fim)
css/style.css       visual "massinha", animações, responsivo
js/engine.js        REGRAS — sem DOM. Estado serializável, loop de turnos, karma, prendas, Virada de Sorte, Última Cartada, fim de jogo
js/bots.js          5 personalidades e suas decisões
js/characters.js    12 personagens 3D (Three.js, só primitivas), visualizador, thumbnails e camada de peões
js/vendor/three.min.js  Three.js r152 (vendorizado: funciona offline e em file://)
js/board3d.js       tabuleiro 3D em loop (Three.js): casas, 7 distritos com cenário low-poly, câmera que segue o peão, dado 3D, declínio progressivo
js/ui.js            balões/botões ancorados (projeção 3D → pixels), HUD, números flutuantes; implementa io.ask / io.animate
js/main.js          tela de configuração e ciclo de partidas
data/negocios.js    35 negócios (tier, custo) + textos PLACEHOLDER
data/prendas.js     50 prendas
data/eventos.js     cartas de evento forte/leve PLACEHOLDER
```

### Por que `.js` e não `.json`?
Navegadores bloqueiam `fetch` de JSON em `file://`. Cada arquivo de dados só faz `window.CAOS_DATA.xxx = [...]`. Para migrar para JSON basta trocar as tags `<script src="data/...">` por um `fetch` e atribuir ao mesmo objeto.

## Trocando o conteúdo (sem tocar na lógica)
Em `data/negocios.js`, adicione a cada negócio:
```js
{ id:'pizzaria', nome:'Pizzaria', ..., 
  taxas:     ['texto 1', 'texto 2', 'texto 3', 'texto 4', 'texto 5'],
  karmaBom:  ['...x5'],
  karmaRuim: ['...x5'] }
```
O jogo sorteia entre as variações. Negócios sem esses campos usam `textosPadrao` (aceita `{nome}`).
Eventos: veja os tipos de efeito suportados no cabeçalho de `data/eventos.js`.

## Tabuleiro v3 — loop fixo em 3D (estilo Monopoly Plus)
**Mudança de mecânica (documentada):** a pirâmide com bifurcações foi removida. Não existe mais escolha de caminho arriscado/neutro/seguro — o jogador rola o dado e anda X casas num **loop único de 62 casas**: 1 Início (+R$ 500 ao passar, `CONFIG.rendaVoltaTopo`) + 35 negócios + 8 Eventos Fortes + 18 Eventos Leves. Os tiers de custo (barato/médio/caro) continuam valendo, só não estão mais amarrados a uma rota. O código de bifurcação na engine ficou inerte (nenhuma casa desse tipo existe) e os bots simplesmente não são mais perguntados sobre caminho.

- **7 distritos** em sequência no loop, um por categoria: Alimentação (food truck com sorvete gigante), Beleza (batom e espelho), Tecnologia (torre neon), Entretenimento (roda-gigante girando), Saúde (hospital com cruz), Transporte (posto com carro passando), Moda (loja com manequim). Cada um tem paleta, alturas de prédio e placa próprias. Eventos fortes/leves são intercalados entre os negócios de cada distrito (`FORTES_POR_DISTRITO` / `LEVES_POR_DISTRITO` em `engine.js`).
- **Câmera**: perspectiva baixa, por dentro do loop, um pouco atrás do peão ativo e olhando ao longo do trajeto; segue com suavização. Botão 🎯/🗺️ alterna para a vista geral.
- **Peões**: os 12 personagens 3D andam casa por casa com pulo e squash-and-stretch; o ativo tem anel dourado e alta definição; eliminado fica translúcido e caído.
- **Dado 3D** rola ao lado do peão. Balões, botões de decisão e números flutuantes são projetados da posição 3D para a tela — o tabuleiro nunca é coberto por modal em turno normal (só Última Cartada, decisão do grupo e sair).
- Toque numa casa mostra o balão de informações do negócio.

### Declínio visual progressivo (substitui a pirâmide desabando)
Quatro estágios, trocados quando a partida cruza 25%, 50% e 75% das rodadas (`updateRound` → `board.setStage`):
- **0 (início)**: céu azul, chão verde, cores vivas, roda-gigante girando.
- **1 (25%)**: céu acinzentado, névoa mais próxima, primeiras rachaduras no chão, árvores e placas começam a inclinar.
- **2 (50%)**: céu roxo-escuro, luz mais fria e fraca, prédios dessaturando, lixo nas calçadas, placas de FALÊNCIA em fachadas, fumaça saindo de prédios, roda-gigante desacelera.
- **3 (75%)**: noite de tempestade, cores lavadas, todas as rachaduras/lixo/placas visíveis, inclinações máximas, roda-gigante parada.
Tudo isso é só cenário — nenhum valor ou regra muda.

### Observação de balanceamento
Com o loop único (62 casas) o jogador passa pelo Início menos vezes que na pirâmide e não existe mais rota "segura"; nas simulações a média de eliminações por partida subiu de ~1,4 para ~2,2. Se quiser suavizar, o botão mais simples é `CONFIG.rendaVoltaTopo`.

## Apresentação (v2)
- O tabuleiro ocupa a tela inteira; HUD é uma barra fina no topo (rodada/modo) e uma faixa de fichas embaixo.
- Nada de modal durante o turno: taxas, karmas, eventos e prendas aparecem como **balões ancorados** ao peão/casa (fecham sozinhos ou com toque); decisões (comprar, caminho, prenda, Virada) são **botões pequenos dentro do balão**.
- Valores sobem/descem como **números flutuantes** sobre o peão.
- O peão **pula casa por casa** (animação em JS, `hopTo`), e a câmera acompanha com zoom suave (botão 🎯/🗺️ alterna para ver tudo).
- Modal só em exceções: Última Cartada, decisão do grupo após eliminação e confirmação de saída.

## Personagens 3D
- `CaosChars.LIST` tem os 12 (id, nome, emoji, cor, descrição). Cada um é montado em `BUILDERS[id]` só com esferas, cápsulas, cones, cilindros, toros e caixas arredondadas; material toon de 3 tons.
- Dois níveis de detalhe: `high` (5–12k triângulos, com todos os acessórios) na seleção e no peão ativo; `low` (1.4–2.5k) nos demais peões.
- Tela de seleção: canvas com rotação por arrasto (`Viewer`), setas e grade dos 12; personagens já escolhidos ficam bloqueados.
- No tabuleiro os peões são desenhados numa camada WebGL transparente (`PawnLayer`) por cima do SVG, seguindo as mesmas posições/câmera; idle "respirando", pulo com squash-and-stretch ao andar, peão eliminado cai deitado. Se não houver WebGL, volta aos peões 2D.
- Thumbnails do HUD, balões e ranking são renders 2D dos mesmos modelos (um renderer offscreen compartilhado, cache em memória).

## Ajustes de jogabilidade (v3.1)
- **Leitura dos balões**: jogador humano → o balão fica até tocar em qualquer lugar da tela (`TIMING.humanoMaxAuto = 0`); bot → avança sozinho após 4,5 s (`TIMING.botLeitura`), falas curtas 2,2 s (`TIMING.botFala`). Tudo em `js/ui.js`.
- **Voltas por jogador**: cada jogador tem `voltas`, incrementada quando *ele* passa pelo Início. O jogo termina quando todos os não eliminados completarem as voltas do modo (`CONFIG.modos.*.rodadas`, agora lido como voltas) ou quando sobrar 1. Quem conclui deixa de jogar e assiste (card "🏁 concluiu"). O indicador do topo mostra a volta do jogador da vez; cada card mostra "🔁 Volta X/N". O declínio do cenário acompanha o jogador mais adiantado.
- **Reputação inicial**: R$ 20.000.
- **"Esqueceu a Senha do Banco"**: efeito `perde_fixo_bloqueio { valor: 150, turnos: 2 }` — perde o valor e fica sem comprar negócios nas próximas 2 jogadas dele (taxas e eventos seguem normais). Card mostra "🔒 Conta bloqueada (n)".
- **Linguagem**: "fodido/fodida" removido do projeto inteiro (tagline e títulos do ranking → "lascado(a)"); dados verificados, sem ocorrências.
- **Nomes**: campo por pessoa na tela inicial (até 14 caracteres); vazio → "Jogador N". Bots têm nome fixo.

## Correções v3.3 (feitas pelo Claude direto no código)
- **🐛 Bug crítico corrigido**: no evento `heranca_falencia` (Falência Definitiva), `js/ui.js` usava `this.engine` dentro de um método de objeto literal onde `this` não apontava para o controlador de UI (o padrão correto usado no resto do arquivo é `ui.engine`, via `const ui = this` capturado no escopo externo de `io()`). Isso lançava uma exceção não tratada bem no momento da herança, travando a `Promise` do `animate()` e, por consequência, o loop de turnos inteiro — o próximo jogador nunca era chamado para jogar. Corrigido trocando `this.engine` por `ui.engine` na linha do `heranca_falencia`.
- **💰 Cap no karma bom**: o dono de um negócio não pode mais perder, num único evento de "karma bom" (que prejudica o dono), mais do que ele acabou de ganhar com a taxa daquela mesma visita. Antes, a perda era sempre 2×–4× a taxa (sempre maior que o ganho), tornando ser dono um prejuízo garantido em ~50% das visitas. Agora `valor = Math.min(valor, n.taxa)` quando `bom === true` — o pior cenário pra quem possui negócio é ficar no zero a zero naquela visita, nunca no negativo. O karma ruim (que afeta o visitante) não foi alterado — continua podendo ser 2×–4× a taxa, mantendo o risco de visitar negócios dos outros.
- **🔁 Voltas ajustadas**: Rápido 1 → **2** voltas, Médio 2 → **3** voltas. Longo mantido em 3 voltas (não foi pedido ajuste).

## Correções v3.2 (feitas pelo Claude direto no código)
- **Renda ao passar no Início**: R$ 500 → **R$ 1.000** (`CONFIG.rendaVoltaTopo`).
- **Dividendo de Portfólio (Plano A)**: além do valor fixo acima, o jogador agora recebe um bônus por cada negócio que possui, toda vez que passa pelo Início: **+R$ 200 (Barato) / +R$ 400 (Médio) / +R$ 600 (Caro)** por negócio (`CONFIG.dividendoPorTier`). Isso garante retorno sobre investimento mesmo em partidas com poucas visitas de outros jogadores. Ambos os valores aparecem separados no log e somados no evento `passou_topo`.
- **Última Cartada**: valor de retorno ao quebrar passa de R$ 1.000 → **R$ 2.500** (`CONFIG.reputacaoRetorno`).
- **Falência Definitiva (5ª carta / regra nova)**: quando um jogador falha na Última Cartada e o grupo escolhe **continuar** a partida (e não é o caso de só sobrar 1 jogador), os negócios dele não voltam mais pro mercado — eles são **transferidos inteiros para o jogador com a pior reputação entre os ativos** ("o mais lascado da mesa"). Se o jogo terminar ali (só resta 1, ou o grupo escolhe encerrar), o comportamento antigo se mantém (negócios voltam ao mercado, já que a partida está acabando de qualquer forma). Novo evento de animação: `heranca_falencia` (com toast dedicado em `ui.js`).

### ⚠️ Pendente — só o Fable deve mexer (envolve o cenário 3D)
Ainda falta implementar a **redução de casas do tabuleiro para os modos Rápido e Médio** (o Longo mantém as 62 casas atuais, já que comporta mais jogadores). Isso não foi feito aqui porque mexe direto em `board3d.js` (geração de cenário, distritos, câmera) — ver prompt específico enviado para o Fable resolver essa parte, já considerando os ajustes de economia acima (que devem aliviar bastante a eliminação em massa relatada abaixo).

### Tamanho do tabuleiro por modo (v3.3)
`CONFIG.modos.*.tabuleiro` define quantos negócios por distrito entram no loop (sorteados por partida, com seed) e quantos eventos por distrito. O passo entre casas é constante — o loop encolhe proporcionalmente. Negócios iniciais são distribuídos só entre os que estão no tabuleiro.

Simulação com a economia v3.2 (renda R$ 1.000 + dividendo de portfólio + Última Cartada R$ 2.500 + Falência Definitiva), bots, 150 partidas por linha, 3–8 jogadores:

| modo | casas | negócios | voltas | turnos por jogador | jogadores eliminados | como termina |
|---|---|---|---|---|---|---|
| Rápido | **36** | 21 | 1 | ~11 | 0% | 100% por voltas |
| Médio | **48** | 28 | 2 | ~27 | 20% | 98% por voltas |
| Longo | **62** | 35 | 3 | ~40 | 66% | 53% voltas / 47% sobra 1 |

Referência (62 casas, economia nova): 2 voltas → 37% eliminados; 5 voltas → 76%; 10 voltas → 79% (100% das partidas acabam por sobrar 1). Por isso as voltas por modo passaram a 1/2/3: os turnos por jogador ficam próximos da intenção original (10/18/30) e o tempo de partida cabe nas faixas 15–25 / 30–45 / 60–90 min. Rápido é um sprint sem eliminação; Longo é a partida de sobrevivência, com mais espaço e mais negócios para mesas grandes.

### Cenário v3.3
- **Janelas**: cada prédio (frente e fundo) tem uma grade de janelas; todas as ~1.800 janelas ficam em um único `InstancedMesh` (1 draw call). Cor por instância muda com o estágio: dia = vidro azulado; 25% = 12% acesas; 50% = metade acesa (amarelo/creme), resto escuro; 75% = 75% acesas.
- **Miolo**: cidade em miniatura dentro do loop, com 2–4 props por distrito (proporcional ao tamanho do tabuleiro), de frente para o trajeto: mesinhas com guarda-sol e carrinho de cachorro-quente (Alimentação); batom gigante, espelho e secador (Beleza); antena com luz piscando, racks de servidor e painel neon (Tecnologia); marquise de lâmpadas, carrossel girando e pipoqueira (Entretenimento); cruz de farmácia acesa, bancos-pílula e ambulância (Saúde); semáforos ciclando, placas e carros estacionados (Transporte); manequins e cabides gigantes (Moda). Praça central com chafariz animado, bancos e árvores; a logo ficou menor, ao sul da praça.
- Props do miolo entram no declínio (dessaturação, inclinação, carrossel e luzes param).
- Custo: cena inteira ≈ 340 draw calls / 22k triângulos, ~2 ms por quadro mesmo em rasterizador de CPU.

### ⚠️ Balanceamento das voltas (histórico)
Com o loop de 62 casas, uma volta leva ~18 turnos do jogador. Simulação (bots, modo Médio):

| voltas | turnos por jogador | jogadores eliminados | como termina |
|---|---|---|---|
| 1 | ~18 | 5% | todos completam |
| 2 | ~31 | 50% | 80% por voltas, 20% por eliminação |
| 3 | ~35 | 74% | 73% por sobrar 1 |
| ≥4 (inclui 10/18/30 atuais) | ~36 | 80% | 100% por sobrar 1 — ninguém completa |

Os valores 10/18/30 foram mantidos como pedido, mas na prática toda partida termina por eliminação em massa antes de qualquer volta ser concluída. Sugestão para revisar: Rápido 1, Médio 2, Longo 3 voltas (ou subir `rendaVoltaTopo`).

### Correção v3.3.1 — "Histórico abre sozinho pela metade"
Não era o painel abrindo: era a tela inteira rolando. O drawer fechado (`translateX(105%)`) estende a área rolável de `#screen-game`, e `chip.scrollIntoView()` (usado para centralizar o card do jogador da vez) rola todos os ancestrais roláveis — `overflow: hidden` só bloqueia rolagem do usuário, não a programática. A tela deslocava ~380 px e o drawer "aparecia" sem a classe `open` (os botões do topo direito ficavam longe da borda — sintoma visível na captura do bug). Correção: (1) a faixa de cards rola com `strip.scrollTo` em vez de `scrollIntoView`; (2) `#screen-game { overflow: clip }`, que impede também rolagem programática; (3) drawer fechado com `visibility: hidden` (não ocupa área rolável). O listener de "toque em qualquer lugar" foi verificado e não vaza para o botão 📜 (`.hud-top` está excluído e o hit-area coincide com o elemento).

## Parâmetros de balanceamento
Todos em `CONFIG` no topo de `js/engine.js` (reputação inicial, % da taxa, faixa de karma, rerolls, penalidade, tokens, chance da Última Cartada, rodadas por modo, renda ao passar pelo Topo etc.).

## Arquitetura pensada para multiplayer futuro
A engine só conversa com o mundo por `io.ask(pending)` e `io.animate(evento)`. Numa versão online, o servidor roda a engine, envia `pending` para o cliente da vez e `eventos` para todos — a UI atual já consome exatamente esse contrato. O RNG é seedável (`new GameEngine(io, data, { seed })`) para reproduzir partidas.

## Roadmap sugerido
1. Substituir placeholders (negócios e eventos) pelos textos finais
2. Som e feedback tátil (vibração no celular)
3. Tabuleiro em camadas 3D reais (CSS 3D ou Three.js) reaproveitando as coordenadas do grafo
4. Salas online via WebSockets
