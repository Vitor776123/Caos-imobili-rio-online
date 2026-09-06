# Servidor multiplayer — Caos Imobiliário

Roda a mesma `GameEngine` do jogo (`../js/engine.js`, sem alterações) no Node.js, uma por sala, e conversa com os navegadores por WebSocket. Também serve os arquivos do jogo, então **um único serviço basta**.

## Rodar no seu computador
```bash
cd server
npm install
npm start          # abre em http://localhost:8080
```
Abra `http://localhost:8080` em duas abas (ou no celular na mesma rede Wi-Fi usando o IP do computador, ex. `http://192.168.0.10:8080`), vá na aba **Online**, crie a sala numa aba e entre com o código na outra.

## Variáveis de ambiente
| variável | padrão | para quê |
|---|---|---|
| `PORT` | 8080 | porta HTTP/WebSocket (os serviços de hospedagem definem sozinhos) |
| `ROOM_TTL_MIN` | 10 | minutos que uma sala fica guardada sem ninguém conectado (reconexão) |
| `ACK_TIMEOUT_MS` | 45000 | tempo máximo esperando um jogador "ler" um evento antes de seguir |
| `SERVE_STATIC` | 1 | `0` para não servir os arquivos do jogo (se o front estiver em outro host) |

## Testes
```bash
node test-3clientes.js     # 3 clientes falsos + 1 bot, partida completa, checa entrega de ask/evt e reconexão
```
Se mudar os personagens em `js/characters.js`, rode `npm run personagens` para atualizar `personagens.json`.
