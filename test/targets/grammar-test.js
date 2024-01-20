import { RiScript, RiGrammar } from '../../dist/riscript.js';

console.log('RiScript v' + RiScript.VERSION + '\n\n');

let rg = new RiGrammar();
rg.addTransform('rhyme', () => "log");

rg.setRules({
  start: 'dog rhymes with [dog].rhyme()'
});
  //, { rhyme }
console.log(rg.expand());
