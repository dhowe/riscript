let RiScript = require('../../dist/riscript.cjs');
console.log(Object.getOwnPropertyNames(RiScript));
let str = '\nRiScript v' + RiScript.VERSION + '\n\n';
Object.getOwnPropertyNames(RiScript)
  .filter(p => !p.startsWith('_') && typeof RiScript[p] === "function" )
  .forEach(p => str += `RiScript.${p}`+(/^class/.test(RiScript[p]+"")? '\n' : '()\n'));
console.log(str);
