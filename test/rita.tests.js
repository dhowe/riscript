import { expect } from 'chai';

import { RiScript } from './index.js';
import { RiTa } from 'rita';

/*
  Integration coverage for optional `rita` peer dependency.
  
  Tests below run only when `rita` is installed
  
  RiScript has a fallback for `pluralize`/`articlize` when RiTa is not available.
  When a RiTa object is supplied via `options.RiTa`, both transforms delegate to RiTa 
  phonemes, and `RiTa.randi` replaces Math.random for seeded runs.
*/

const hasRita = (() => {
  try {
    return typeof RiTa?.pluralize === 'function';
  } catch {
    return false;
  }
})();

const title = `RiScript.rita ${RiTa.VERSION ? `v${RiTa.VERSION}` : '[DEV]'}`;

describe(title, function () {
  if (!hasRita) {
    this.skip();
    return;
  }

  let riscript;

  before(function () {
    riscript = new RiScript({ RiTa });
    RiScript.RiTaWarnings.silent = true;
  });

  describe('Detection', function () {
    it('Uses the injected RiTa object', function () {
      expect(typeof riscript.RiTa.VERSION).eq('string');
    });

    it('Falls back to a stub when RiTa is not supplied', function () {
      const plain = new RiScript();
      expect(plain.RiTa.VERSION).eq(0);
      expect(plain.RiTa.randi(1)).eq(0);
    });
  });

  describe('Pluralization', function () {
    it('Handles irregular plurals', function () {
      expect(riscript.evaluate('[tooth].pluralize()')).eq('teeth');
      expect(riscript.evaluate('[child].pluralize()')).eq('children');
      expect(riscript.evaluate('[person].pluralize()')).eq('people');
    });

    it('Leaves uncountable nouns alone', function () {
      expect(riscript.evaluate('[sheep].pluralize()')).eq('sheep');
    });

    it('Adds -es after sibilants', function () {
      expect(riscript.evaluate('[box].pluralize()')).eq('boxes');
    });

    it('Does not double-pluralize regulars', function () {
      expect(riscript.evaluate('[cats].pluralize()')).eq('cats');
    });
  });

  describe('Articlization', function () {
    it('Uses phonemes, not spelling', function () {
      // Silent-h: "honest" starts with a vowel sound.
      expect(riscript.evaluate('[honest].articlize()')).eq('an honest');
      // "European" starts with a /j/ glide despite the vowel letter.
      expect(riscript.evaluate('[European].articlize()')).eq('a European');
    });

    it('Handles plain vowels and consonants', function () {
      expect(riscript.evaluate('[ant].articlize()')).eq('an ant');
      expect(riscript.evaluate('[dog].articlize()')).eq('a dog');
    });

    it('Returns empty for empty input', function () {
      expect(riscript.evaluate('That is [].articlize().', 0)).eq('That is .');
    });
  });

  describe('Randomization', function () {
    it('Honours a random seed', function () {
      RiTa.randomSeed(1234);
      const first = riscript.evaluate('[a|b|c|d|e|f|g|h]');
      RiTa.randomSeed(1234);
      const second = riscript.evaluate('[a|b|c|d|e|f|g|h]');
      expect(second).eq(first);
    });
  });

  describe('Warnings', function () {
    it('Does not warn when RiTa is present', function () {
      const warnings = [];
      const warn = console.warn;
      console.warn = (msg) => warnings.push(msg);
      try {
        const script = new RiScript({ RiTa });
        script.evaluate('[tooth].pluralize() [ant].articlize()');
      } finally {
        console.warn = warn;
      }
      expect(warnings.join(' ')).not.to.match(/Install RiTa/);
    });
  });
});
