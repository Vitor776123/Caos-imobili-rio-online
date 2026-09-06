// Extrai a lista dos 12 personagens de js/characters.js (que precisa de Three.js) para um JSON usado pelo servidor.
global.window = globalThis; globalThis.THREE = {}; // stub: só queremos CaosChars.LIST
require('../js/characters.js');
require('fs').writeFileSync(__dirname + '/personagens.json', JSON.stringify(globalThis.CaosChars.LIST, null, 2));
console.log('personagens.json gerado com', globalThis.CaosChars.LIST.length, 'personagens');
