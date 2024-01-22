import { expect } from 'chai';

import { RiScript, RiGrammar } from './index.js';

const version = RiScript.VERSION;
const title = `RiGrammar.v3`;

describe(title, function () {
  /* eslint-disable no-unused-expressions, no-unused-vars, no-multi-str */
  const TRACE = { trace: 1 };
  const LTR = 0;
  const T = TRACE;

  let riscript, IfRiTa;

  before(function () {
    riscript = new RiScript();
    RiScript.RiTaWarnings.silent = !IfRiTa;
  });

  describe('Grammars', function () {
    const rules = {
      start: '$kaminoku <br> $shimonoku',

      kaminoku: '$five <br> $sevenFive[. | ...(3)]',
      shimonoku: '[[$sevenB1 <br> $sevenC] | [$doubleA | $doubleB]].cap.',

      four: 'look for water | look to the $n | pray for quiet',
      five: '[[the $nnnn | $nnnnn | $vp4 now] | [last | red] \
[mountain|wilting] flower].cap',
      sevenFive: 'I [rise | wake] and $four <br> $vp5 | $twelve $tree',
      sevenB1: '[no one [need | can] understand] \
| [no one can forget | everyone forgets | no one misunderstands].cap',
      sevenC: 'the [vastness|stillness] of this [garden | universe | morning]',
      twelve: '[[[beetle|termite] eats | ant burrows].art [silently | placidly] \
<br> into the] | [[spider | inchworm].art dangles <br> from the]',

      n: 'clouds | trees | leaves',
      nn: 'the [stars | moon | sun | sky]',
      nnn: 'a black rose | white daisies | sakura | rosemary \
| cool moonlight | dark forest | tall mountain',
      nnnn: '[mountain | silent] village | [evening | morning] sunlight \
| [winter | summer] flower | [star | moon]light above',
      nnnnn: 'the [autumn | summer | winter] moonlight',

      tree: '[chestnut | cedar | old [gum | tea]] tree',
      vp4: 'drifting like [snow|clouds] | falling like [rain | leaves] ',
      vp5: 'crying like a child | singing like a bird | drifting like the snow \
| falling like [the rain | a leaf]',

      doubleA: 'not [quite|] far enough away <br> but closer than $nn',
      doubleB: 'close enough to touch <br> but farther even than $nn',

      a: 'sad | tall | hot | plain | grey',
      v: 'sing | cry | rise | bloom | dance | fall'
    };

    it('Handle simple grammars', function () {
      const script = {
        noun: '[ox | oxen]',
        start: '$noun.art()'
      };
      const res = RiGrammar.expand(script);
      expect(res).matches(/an ox(en)?/);
    });

    it('Handle simple character choice in context', function () {
      let context, script, res;

      // simple case
      context = { a: { name: 'Lucy' }, b: { name: 'Sam' } };
      script = {
        start: "$person.name",
        "person": "$[a | b]"
      };
      res = RiGrammar.expand(script, context);
      expect(res).to.be.oneOf(['Lucy', 'Sam']);
    });

    it('Handle time-based gated example', function () {
      let context = { hours: new Date().getHours() };
      let grammar = {
        start: '$greeting, he said.',
        greeting: '[ @{ hours: {$lt: 12}} $morning || $evening]',
        morning: 'Good morning',
        evening: 'Good evening'
      };
      let res = RiGrammar.expand(grammar, context);
      expect(res).to.be.oneOf(['Good morning, he said.', 'Good evening, he said.']);
    });

    it('Handle time-based transform example', function () {
      let context = { getGreeting: () => new Date().getHours() < 12 ? '$morning' : '$evening' };
      let grammar = {
        start: '$greeting, he said.',
        greeting: '$.getGreeting()',
        morning: 'Good morning',
        evening: 'Good evening'
      };
      let res = RiGrammar.expand(grammar, context);
      expect(res).to.be.oneOf(['Good morning, he said.', 'Good evening, he said.']);
    });

    LTR && it('Handle generated symbols1', function () { // WORKING HERE  ON branch=lastgood
      let ctx, res;
      ctx = { a: { name: 'Lucy' } };
      res = riscript.evaluate('#person=$a\n$person.name $person.name', ctx, T);
      expect(res).eq('Lucy Lucy');
    });

    LTR && it('Handle complex character choice in context', function () { // WORKING HERE ON branch=lastgood
      let context, script, res;

      // simple case
      context = { a: { name: 'Lucy' }, b: { name: 'Sam' } };
      script = {
        start: "$person.name",
        "person": "$[a | b]"
      };
      res = RiGrammar.expand(script, context);
      expect(res).to.be.oneOf(['Lucy', 'Sam']);

      // more complex
      context = {
        lucy: {
          name: 'Lucy',
          pronoun: 'she',
          car: 'Lexus'
        },
        sam: {
          name: 'Sam',
          pronoun: 'he',
          car: 'Subaru'
        },
        //getChar: (name) => characters.filter(c => c.name === name)
      };
      script = {
        start: "Meet $person.name. $person.pronoun().cap drives a $person.car().",
        "#person": "$[sam | lucy]"
      };
      res = RiGrammar.expand(script, context, T);
      expect(res).to.be.oneOf([
        'Meet Lucy. She drives a Subaru.',
        'Meet Sam. He drives a Lexus.',
      ]);
    });

    it('Handle character choice in grammar', function () {
      let script = {
        "#person": "Sam {$pronoun=He}{$car=Lexus} | Lucy {$pronoun=She}{$car=Subaru}",
        start: "Meet $person. $pronoun drives a $car.",
      };
      let res = RiGrammar.expand(script);
      expect(res).to.be.oneOf([
        'Meet Lucy. She drives a Subaru.',
        'Meet Sam. He drives a Lexus.',
      ]);

      script = {
        "#person": "$sam | $lucy",
        sam: "Sam {$pronoun=He}{$car=Lexus}",
        lucy: "Lucy {$pronoun=She}{$car=Subaru}",
        start: "Meet $person. $pronoun drives a $car.",
      };
      res = RiGrammar.expand(script);
      expect(res).to.be.oneOf([
        'Meet Lucy. She drives a Subaru.',
        'Meet Sam. He drives a Lexus.',
      ]);
    });

    LTR && it('Handle character choice in grammarXXX', function () {
      let script, res;
      script = {
        "#person": "$sam | $lucy",
        sam: "{$name=Sam}{$pronoun=He}{$car=Lexus}",
        lucy: "{$name=Lucy}{$pronoun=She}{$car=Subaru}",
        start: "Meet $name. $pronoun drives a $car.",
      };
      res = RiGrammar.expand(script, 0, T);
      console.log(res);
      expect(res).to.be.oneOf([
        'Meet Lucy. She drives a Subaru.',
        'Meet Sam. He drives a Lexus.',
      ]);
    });


    it('Handle simple statics', function () {
      const script = {
        '#noun': '[a | b]',
        start: '$noun\n$noun'
      };
      const res = RiGrammar.expand(script);
      // console.log(res);
      expect(res).matches(/(a\na)|(b\nb)/);
    });

    it('Handle simple wrapped statics ', function () {
      const script = {
        '#noun': '[a | b]',
        start: '$noun $noun'
      };
      const res = RiGrammar.expand(script);
      expect(res).matches(/(a a)|(b b)/);
    });

    it('Handle longer grammars', function () {
      const res = RiGrammar.expand(rules);
      const lines = res.split(/\s*<br>\s*/g);
      // console.log(lines);
      expect(lines.length).eq(5);
      return;

      // TODO: syllables not correct here (not riscript issue)
      const syls = lines.map((l, i) => {
        const words = riscript.RiTa.syllables(l).split(' ');
        return words
          .map((w) => w.split('/'))
          .filter((w) => /\w/.test(w))
          .flat();
      });
      // console.log(syls);
      [5, 7, 5, 7, 7].forEach((cnt, i) =>
        expect(syls[i].length).eq(cnt,
          '\n\n' + lines.join('\n') + `\n\nindex#${i}=[${syls[i]}]\n\n`
        ));
    });

    it('Handle gates in grammars', function () {
      const script = {
        '#noun': '[man | woman]',
        start: '#noun[@{noun: "man"} :boy]'
      };
      const res = RiGrammar.expand(script);
      // console.log(res);
      expect(res === 'man:boy' || res === 'woman').eq(true);
    });

    it('Resolve inline grammars', function () {
      const script = [
        '$start = $nounp $verbp.',
        '$nounp = $determiner $noun',
        '$determiner = [the | the]',
        '$verbp = $verb $nounp',
        '$noun = [woman | woman]',
        '$verb = shoots',
        '$start'
      ].join('\n');
      const rs = riscript.evaluate(script);
      expect(rs).eq('the woman shoots the woman.');
    });

    it('Reevaluate dynamics', function () {
      const script = {
        noun: '[man | woman]',
        start: '$noun:$noun'
      };

      let ok = false;
      for (let i = 0; i < 20; i++) {
        const res = RiGrammar.expand(script);
        // console.log(i, 'res=' + res);
        const parts = res.split(':');
        expect(parts.length, 'FAIL: parts=' + parts).eq(2);
        if (parts[0] !== parts[1]) {
          ok = true;
          break;
        }
      }
      expect(ok).true;
    });

    it('Reuse statics', function () {
      const script = {
        '#noun': '[man | woman]',
        start: '#noun:#noun'
      };

      for (let i = 0; i < 5; i++) {
        const res = RiGrammar.expand(script); //, TRACE);
        // console.log(i, 'res=' + res, ctx);
        expect(res === 'man:man' || res === 'woman:woman').true;
      }
    });

    it('Handle norepeat in grammars', function () {
      let res;
      const script = {
        noun: '[man | woman]',
        start: '$noun:$noun.nr'
      };
      for (let i = 0; i < 5; i++) {
        res = RiGrammar.expand(script);
        // console.log(i, 'res=' + res);
        expect(res === 'man:woman' || res === 'woman:man').true;
      }
    });

    const SEQ_COUNT = 5;

    const sentences1 = {
      start: '$noun_phrase $verb_phrase.',
      noun_phrase: '$determiner $noun',
      verb_phrase: '($verb | $verb $noun_phrase)',
      determiner: '(a | the)',
      noun: '(woman | man)',
      verb: 'shoots'
    };

    const sentences2 = {
      start: '$noun_phrase $verb_phrase.',
      noun_phrase: '$determiner $noun',
      determiner: ['a', 'the'],
      verb_phrase: ['$verb $noun_phrase', '$verb'],
      noun: ['woman', 'man'],
      verb: 'shoots'
    };

    const sentences3 = {
      start: '$noun_phrase $verb_phrase.',
      noun_phrase: '$determiner $noun',
      verb_phrase: '$verb | $verb $noun_phrase',
      determiner: 'a | the',
      noun: 'woman | man',
      verb: 'shoots'
    };

    const grammars = [sentences1, sentences2, sentences3];

    it('Call constructor', function () {
      expect(typeof new RiGrammar() !== 'undefined');
    });

    it('Support norepeat rules', function () {
      let fail = false;
      const names = 'a|b|c|d|e';
      const g = { start: '$names $names.norepeat()', names };
      // console.log(g);
      for (let i = 0; i < SEQ_COUNT; i++) {
        const res = RiGrammar.expand(g);
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        // console.log(i + ") " + parts[0] + " :: " + parts[1]);
        if (parts[0] === parts[1]) {
          fail = true;
          break;
        }
      }
      expect(fail).false;
    });

    // QUESTION: can no-repeats be used directly on choice?
    if (LTR) it('Support norepeat symbol rules', function () {
      let fail = false;
      const names = '[a|b|c|d|e].nr()';
      const g = { start: '$names $names', names };
      for (let i = 0; i < SEQ_COUNT; i++) {
        const res = RiGrammar.expand(g)(T);
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        console.log(i + ') ' + parts[0] + ' ' + parts[1]);
        if (parts[0] === parts[1]) {
          fail = true;
          break;
        }
      }
      expect(fail).false;
    });

    // QUESTION: can no-repeats be used inline? No, because they must be assigned to the variable?
    if (LTR)
      it('Support norepeat inline rules', function () {
        // TODO: Prob support this
        let fail = false;
        const g = { start: '[$names=[a|b|c|d|e]].nr() $names' };
        for (let i = 0; i < SEQ_COUNT; i++) {
          const res = RiGrammar.expand(g)(T);
          expect(/^[a-e] [a-e]$/.test(res)).true;
          const parts = res.split(' ');
          expect(parts.length).eq(2);
          console.log(i + ') ' + parts[0] + ' ' + parts[1]);
          if (parts[0] === parts[1]) {
            fail = true;
            break;
          }
        }
        expect(fail).false;
      });

    it('Call constructorJSON', function () {
      const json = JSON.stringify(sentences1);

      const gr1 = new RiGrammar(JSON.parse(json));
      expect(gr1 instanceof RiGrammar).true;

      const gr2 = RiGrammar.fromJSON(json);
      expect(gr2 instanceof RiGrammar).true;
      expect(gr1.toString()).eq(gr2.toString(),
        'FAIL\n' + gr1 + '\n' + gr2 + '\n');

      expect(() => new RiGrammar("notjson")).to.throw();
    });

    it('Call static expandFrom', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', '[$bird | $mammal]');
      rg.addRule('bird', '[hawk | crow]');
      rg.addRule('mammal', 'dog');
      expect(rg.expand({ start: 'mammal' }), 'dog');
      for (let i = 0; i < 5; i++) {
        const res = rg.expand({ start: 'bird' });
        expect(res === 'hawk' || res === 'crow');
      }
    });

    it('Handle phrase transforms', function () {
      const g = {
        start: '[$x=$y b].ucf()',
        y: '[a | a]'
      };
      expect(RiGrammar.expand(g)).eq('A b');

      const h = {
        start: '[$x=$y c].ucf()',
        y: '[a | b]'
      };
      const rg = new RiGrammar(h);
      for (let i = 0; i < 5; i++) {
        const res = rg.expand();
        expect(res).matches(/[AB] c/);
      }
    });

    it('Allow rules starting with numbers', function () {
      let rg, rs;

      rg = new RiGrammar({
        start: '$1line talks too much.',
        '1line': 'Dave | Jill | Pete'
      });
      rs = rg.expand({ trace: 0 });
      expect(rs).to.be.oneOf([
        'Dave talks too much.',
        'Jill talks too much.',
        'Pete talks too much.'
      ]);

      rg = new RiGrammar({
        '1line': 'Dave | Jill | Pete'
      });
      rs = rg.expand({ start: '1line' }, { trace: 0 });
      expect(rs).to.be.oneOf(['Dave', 'Jill', 'Pete']);
    });

    it('Allow static rules starting with numbers', function () {
      let rg, rs;

      rg = new RiGrammar({
        start: '$1line talks too much.',
        '#1line': 'Dave | Jill | Pete'
      });
      rs = rg.expand({ trace: 0 });
      expect(rs).to.be.oneOf([
        'Dave talks too much.',
        'Jill talks too much.',
        'Pete talks too much.'
      ]);

      rg = new RiGrammar({ '#1line': 'Dave | Jill | Pete' });
      rs = rg.expand({ start: '1line' }, { trace: 0 });
      expect(rs).to.be.oneOf(['Dave', 'Jill', 'Pete']);
    });

    it('Call setRules', function () {
      let rg = new RiGrammar();
      expect(typeof rg.rules !== 'undefined');
      expect(typeof rg.rules.start === 'undefined');
      expect(typeof rg.rules.noun_phrase === 'undefined');

      grammars.forEach((g) => {
        // as JS objects
        rg.setRules(g);
        expect(typeof rg.rules !== 'undefined');
        expect(typeof rg.rules.start !== 'undefined');
        expect(typeof rg.rules.noun_phrase !== 'undefined');
        expect(rg.expand().length > 0);
      });

      rg = new RiGrammar();
      rg.setRules('{"start":"a"}'); // as JSON string
      expect(rg.expand().length > 0);
    });

    it('Call fromJSON with string', function () {
      grammars.forEach((g) => {
        // as JSON strings
        const rg = RiGrammar.fromJSON(JSON.stringify(g));
        expect(typeof rg.rules !== 'undefined');
        expect(typeof rg.rules.start !== 'undefined');
        expect(typeof rg.rules.noun_phrase !== 'undefined');
        expect(rg.expand().length > 0);
      });
    });

    it('Call removeRule', function () {
      grammars.forEach((g) => {
        const rg1 = new RiGrammar(g);
        expect(rg1.rules.start).not.undefined;
        expect(rg1.rules.noun_phrase).not.undefined;

        rg1.removeRule('noun_phrase');
        expect(!rg1.rules.noun_phrase).not.undefined;
        expect(!rg1.rules.noun_phrase).not.undefined;

        rg1.removeRule('start');
        expect(!rg1.rules.start).not.undefined;

        rg1.removeRule('');
        rg1.removeRule('bad-name');
        rg1.removeRule(null);
        rg1.removeRule(undefined);
      });
    });

    it('Call static removeRule', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', '[$bird | $mammal]');
      rg.addRule('bird', '[hawk | crow]');
      rg.addRule('mammal', 'dog');

      expect(rg.rules.start).not.undefined;
      expect(rg.rules.pet).not.undefined;
      expect(rg.rules.bird).not.undefined;

      rg.removeRule('$pet'); // TODO: handle? does nothing
      expect(rg.rules.pet).not.undefined;

      rg.removeRule('pet');
      expect(!rg.rules.pet).not.undefined;

      rg.removeRule('bird');
      expect(!rg.rules.bird).not.undefined;

      rg.removeRule('start');
      expect(!rg.rules.start).not.undefined;

      expect(rg.rules.mammal).not.undefined;
    });

    it('Throw on missing rules', function () {
      let rg = new RiGrammar();
      expect(() => rg.expand()).to.throw();

      rg = new RiGrammar({ start: 'My rule' });
      expect(() => rg.expand('bad')).to.throw();

      rg = new RiGrammar({ '1line': 'Dave | Jill | Pete' });
      expect(() => rg.expand()).to.throw(); // no start rule
    });

    it('Call expandFrom', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', '[$bird | $mammal]');
      rg.addRule('bird', '[hawk | crow]');
      rg.addRule('mammal', 'dog');
      expect(rg.expand({ start: 'mammal' }), 'dog');
      for (let i = 0; i < 5; i++) {
        const res = rg.expand({ start: 'bird' });
        expect(res === 'hawk' || res === 'crow');
      }
    });

    it('Throw on bad grammars', function () {
      expect(() => new RiGrammar({ '': 'pet' })).to.throw();
      expect(() => new RiGrammar({ $start: 'pet' })).to.throw();
      expect(() => new RiGrammar('"{start": "pet" }')).to.throw();
      expect(() => new RiGrammar().addRule('$$rule', 'pet')).to.throw();
      expect(() => new RiGrammar('pet')).to.throw();

      expect(() => new RiGrammar({ a: 'pet' })).not.to.throw();
      expect(() => new RiGrammar('{ "a": "pet" }')).not.to.throw();
      expect(() => new RiGrammar({ start: 'pet' })).not.to.throw();
      expect(() => new RiGrammar().addRule('rule', 'pet')).not.to.throw();
      expect(() => new RiGrammar().removeRule('rule')).not.to.throw();
      expect(() => new RiGrammar().removeRule('nonexistent')).not.to.throw();
    });

    it('Call toString', function () {
      let rg = new RiGrammar({ start: 'pet' });
      expect(rg.toString()).eq('{\n  "start": "pet"\n}');
      rg = new RiGrammar({ start: '$pet', pet: 'dog' });
      expect(rg.toString()).eq('{\n  "start": "$pet",\n  "pet": "dog"\n}');
      rg = new RiGrammar({
        start: '$pet | $iphone',
        pet: 'dog | cat',
        iphone: 'iphoneSE | iphone12'
      });
      expect(rg.toString()).eq('{\n  "start": "$pet | $iphone",\n  "pet": "dog | cat",\n  "iphone": "iphoneSE | iphone12"\n}');
      rg = new RiGrammar({ start: '$pet.articlize()', pet: 'dog | cat' });
      expect(rg.toString()).eq('{\n  "start": "$pet.articlize()",\n  "pet": "dog | cat"\n}');

      rg = new RiGrammar({ start: '$pet.articlize()', pet: '[dog | cat]' });
      expect(rg.toString()).eq('{\n  "start": "$pet.articlize()",\n  "pet": "[dog | cat]"\n}');

      rg = new RiGrammar({ start: '$pet.articlize()', pet: 'dog | cat' }); // static var
      expect(rg.toString()).eq('{\n  "start": "$pet.articlize()",\n  "pet": "dog | cat"\n}');

      // static
      rg = new RiGrammar({ start: '#pet.articlize()', '#pet': '[dog | cat]' });
      expect(rg.toString()).eq('{\n  "start": "#pet.articlize()",\n  "#pet": "[dog | cat]"\n}');

      // static, called as $
      rg = new RiGrammar({ start: '$pet.articlize()', '#pet': '[dog | cat]' });
      expect(rg.toString()).eq('{\n  "start": "$pet.articlize()",\n  "#pet": "[dog | cat]"\n}');
    });

    it('Call toString with arg', function () {
      const lb = { linebreak: '<br/>' };

      let rg = new RiGrammar({ start: 'pet' });
      expect(rg.toString(lb), '{<br/>  "start": "pet"<br/>}');

      rg = new RiGrammar({ start: '$pet', pet: 'dog' });
      expect(rg.toString(lb),
        '{<br/>  "start": "$pet",<br/>  "pet": "dog"<br/>}');

      rg = new RiGrammar({
        start: '$pet | $iphone',
        pet: 'dog | cat',
        iphone: 'iphoneSE | iphone12'
      });
      expect(rg.toString(lb),
        '{<br/>  "start": "$pet | $iphone",<br/>  "pet": "dog | cat",<br/>  "iphone": "iphoneSE | iphone12"<br/>}');

      rg = new RiGrammar({ start: '$pet.articlize()', pet: 'dog | cat' });
      expect(rg.toString(lb),
        '{<br/>  "start": "$pet.articlize()",<br/>  "pet": "dog | cat"<br/>}');

      rg = new RiGrammar({ start: '$pet.articlize()', '#pet': 'dog | cat' }); // static var
      expect(rg.toString(lb),
        '{<br/>  "start": "$pet.articlize()",<br/>  "#pet": "dog | cat"<br/>}');
    });

    it('Call expand', function () {
      let rg = new RiGrammar();
      rg.addRule('start', 'pet');
      expect(rg.expand(), 'pet');

      rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', 'dog');
      expect(rg.expand(), 'dog');

      rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', 'dog');
      expect(rg.expand(), 'dog');

      rg = new RiGrammar();
      rg.addRule('start', 'dog');
      rg.addRule('pet', 'cat');
      expect(rg.expand({ start: 'pet' }), 'cat');

      // throw on bad rules
      expect(() => rg.expand({ start: 'dog' })).to.throw();
      expect(() => rg.expand({ start: 'pets' })).to.throw();
      expect(() => rg.expand({ start: 'a$pet' })).to.throw();

      expect(() => new RiGrammar().addRule('pet', 'dog').expand()).to.throw(); // no start ule
    });

    it('Override dynamic default', function () {

      // here is the normal (dynamic) behavior
      let rg = new RiGrammar();
      rg.addRule('start', '$rule $rule');
      rg.addRule('rule', '[a|b|c|d|e]');
      let ok = false;
      for (let i = 0; i < 5; i++) {
        const parts = rg.expand().split(' ');
        expect(parts.length, 2);
        // console.log(i + ") " + parts[0] + " " + parts[1]);
        if (parts[0] !== parts[1]) {
          ok = true;
          break;
        }
      }
      expect(ok, true);

      // here we OVERRIDE the normal (dynamic) behavior
      rg = new RiGrammar();
      rg.addRule('start', '$rule $rule');
      rg.addRule('#rule', '[a|b|c|d|e]');
      ok = false;
      for (let i = 0; i < 5; i++) {
        const parts = rg.expand().split(' ');
        expect(parts.length, 2);
        // console.log(i + ") " + parts[0] + " " + parts[1]);
        expect(parts[0]).eq(parts[1]);
      }
    });

    it('Call expand.weights', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$rule1');
      rg.addRule('rule1', 'cat | dog | boy');
      let found1 = false;
      let found2 = false;
      let found3 = false;
      for (let i = 0; i < 5; i++) {
        const res = rg.expand();
        expect(res === 'cat' || res === 'dog' || res === 'boy');
        if (res === 'cat') found1 = true;
        else if (res === 'dog') found2 = true;
        else if (res === 'boy') found3 = true;
      }
      expect(found1 && found2 && found3); // found all
    });

    it('Call expandFrom.weights', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet');
      rg.addRule('pet', '$bird (9) | $mammal');
      rg.addRule('bird', 'hawk');
      rg.addRule('mammal', 'dog');

      expect(rg.expand({ start: 'mammal' }), 'dog');

      let hawks = 0;
      let dogs = 0;
      for (let i = 0; i < 5; i++) {
        // could fail
        const res = rg.expand({ start: 'pet' });
        expect(res === 'hawk' || res === 'dog', 'got ' + res);
        if (res === 'dog') dogs++;
        if (res === 'hawk') hawks++;
      }
      expect(hawks > dogs * 2, 'got h=' + hawks + ', ' + dogs);
    });

    it('Call addRule', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet'); // default
      expect(typeof rg.rules.start).not.undefined;
      rg.addRule('start', '$dog', 0.3); // default
      expect(typeof rg.rules.start).not.undefined;
      rg.addRule('start', '$dog', 0.3); // static
      expect(typeof rg.rules.start).not.undefined;
      rg.addRule('start', 'a|b'); // auto wrap
      expect(typeof rg.rules.start).not.undefined;
      expect(() => rg.addRule('start')).to.throw();
    });

    it('Call expandFrom.weights.static', function () {
      const rg = new RiGrammar();
      rg.addRule('start', '$pet $pet');
      rg.addRule('#pet', '$bird (9) | $mammal');
      rg.addRule('bird', 'hawk');
      rg.addRule('mammal', 'dog');
      const res = rg.expand({ start: 'mammal', trace: 0 });

      expect(res).eq('dog');

      let hawks = 0;
      let dogs = 0;
      for (let i = 0; i < 5; i++) {
        const res = rg.expand({ start: 'start' });
        expect(res === 'hawk hawk' || res === 'dog dog', 'got ' + res);

        if (res === 'dog dog') dogs++;
        if (res === 'hawk hawk') hawks++;
      }
      // console.log(hawks, dogs);
      expect(hawks > dogs), 'got h=' + hawks + ', d=' + dogs;
    });

    it('Handle transforms', function () {
      let rg = new RiGrammar();

      rg.addRule('start', '$pet.toUpperCase()');
      rg.addRule('pet', 'dog');
      expect(rg.expand(), 'DOG');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('pet', '[dog].toUpperCase()');
      expect(rg.expand(), 'DOG');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('pet', '[dog].uc'); // no parens
      expect(rg.expand(), 'DOG');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('pet', '[ant].articlize()');
      expect(rg.expand(), 'an ant');

      rg = new RiGrammar();
      rg.addRule('start', '[a | a].uc()');
      expect(rg.expand(), 'A');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal].articlize().ucf()');
      rg.addRule('animal', '$pet');
      rg.addRule('pet', 'ant');
      expect(rg.expand(), 'An ant');
    });

    it('Handle transforms on statics', function () {
      let rg = new RiGrammar();
      rg.addRule('start', '$pet.toUpperCase()');
      rg.addRule('#pet', 'dog');
      expect(rg.expand(), 'DOG');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('#pet', '[dog].toUpperCase()');
      expect(rg.expand(), 'DOG');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('#pet', '[ant].articlize()');
      expect(rg.expand(), 'an ant');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal]');
      rg.addRule('animal', '$pet');
      rg.addRule('#pet', '[ant].art'); // no parens
      expect(rg.expand(), 'an ant');

      rg = new RiGrammar();
      rg.addRule('start', '[a | a].uc()');
      expect(rg.expand(), 'A');

      rg = new RiGrammar();
      rg.addRule('start', '[$pet | $animal].articlize().ucf()');
      rg.addRule('animal', '$pet');
      rg.addRule('#pet', 'ant');
      expect(rg.expand(), 'An ant');

      rg = new RiGrammar();
      rg.addRule('start', '[$animal $animal].ucf()');
      rg.addRule('#animal', 'ant | eater');
      rg.addRule('#pet', 'ant');
      for (let i = 0; i < 10; i++) {
        expect(rg.expand()).to.be.oneOf(['Ant ant', 'Eater eater']);
      }
    });

    it('Allow context in expand', function () {
      let ctx, rg;
      ctx = { randomPosition: () => 'job type' };

      rg = new RiGrammar({ start: 'My $.randomPosition().' }, ctx);
      expect(rg.expand()).eq('My job type.');

      rg = new RiGrammar({ start: 'My $.randomPosition.' }, ctx);
      expect(rg.expand(ctx)).eq('My job type.'); // no parens

      rg = new RiGrammar({ rule: 'My $.randomPosition().' }, ctx);
      expect(rg.expand({ start: 'rule' })).eq('My job type.');

      rg = new RiGrammar({ '#rule': 'My $.randomPosition().' }, ctx); // static
      expect(rg.expand({ start: '#rule' })).eq('My job type.');
      expect(rg.expand({ start: '$rule' })).eq('My job type.');

      rg = new RiGrammar({ start: 'My [].randomPosition().' }, ctx);
      expect(rg.expand()).eq('My job type.');

      rg = new RiGrammar({ start: 'My [].randomPosition.' }, ctx);
      expect(rg.expand(ctx)).eq('My job type.'); // no parens

      rg = new RiGrammar({ rule: 'My [].randomPosition().' }, ctx);
      expect(rg.expand({ start: 'rule' })).eq('My job type.');

      rg = new RiGrammar({ '#rule': 'My [].randomPosition().' }, ctx); // static
      expect(rg.expand({ start: '#rule' })).eq('My job type.');
      expect(rg.expand({ start: '$rule' })).eq('My job type.');
    });

    it('Resolve rules in context', function () {
      let ctx, rg, res;

      ctx = { rule: '[job | mob]' }; // dynamic var in context
      rg = new RiGrammar({ start: '$rule $rule' }, ctx);
      res = rg.expand();
      expect(/^[jm]ob [jm]ob$/.test(res)).eq(true);

      if (LTR) {
        ctx = { '#rule': '[job | mob]' }; // TODO: statics in grammar context
        rg = new RiGrammar({ start: '$rule $rule' }, ctx);
        expect(rg.expand(T)).to.be.oneOf(['job job', 'mob mob']);
      }
    });

    if (LTR)
      it('Handle custom transforms on statics', function () {
        // TODO: statics in grammar context
        const context = { '#randomPosition': () => 'job type' };
        const rg = new RiGrammar({ start: 'My $.randomPosition().' });
        expect(rg.expand(context)).eq('My job type.');
      });

    it('Handle custom transforms', function () {
      const context = { randomPosition: () => 'job type' };
      const rg = new RiGrammar({ start: 'My $.randomPosition().' }, context);
      expect(rg.expand()).eq('My job type.');
    });

    it('Handle phrases starting with custom transforms', function () {
      const context = { randomPosition: () => 'job type' };
      const rg = new RiGrammar({ start: '$.randomPosition().' }, context);
      expect(rg.expand()).eq('job type.');
    });

    it('Handle custom transforms with target', function () {
      const context = { randomPosition: (z) => z + ' job type' };
      let rg = new RiGrammar({ start: 'My [new].randomPosition().' }, context);
      expect(rg.expand()).eq('My new job type.');

      context.new = 'new';
      rg = new RiGrammar({ start: 'My $new.randomPosition.' }, context);
      expect(rg.expand()).eq('My new job type.');
    });

    it('Handle paired assignments via transforms', function () {
      let rules = {
        start: '$name was our hero and $pronoun was fantastic.',
        name: '$boys {$pronoun=he} | $girls {$pronoun=she}',
        boys: 'Jack | Jack',
        girls: 'Jill | Jill'
      };
      let result = RiGrammar.expand(rules);
      // console.log(result);
      expect(result).to.be.oneOf([
        'Jill was our hero and she was fantastic.',
        'Jack was our hero and he was fantastic.'
      ]);

      rules = {
        start: '$name was our hero and $pronoun was very $adj.',
        name: '$boys {$pronoun=he} {$adj=manly} | $girls {$pronoun=she} {$adj=womanly}',
        boys: 'Jack | Jack',
        girls: 'Jill | Jill'
      };
      result = RiGrammar.expand(rules, context);
      // console.log(result);
      expect(result).to.be.oneOf([
        'Jill was our hero and she was very womanly.',
        'Jack was our hero and he was very manly.'
      ]);

      // and with static names
      rules = {
        start: '$name was our hero and $name was fantastic.',
        '#name': '$boys | $girls',
        boys: 'Jack | Jake',
        girls: 'Joan | Jane'
      };
      result = RiGrammar.expand(rules);
      // console.log(result);
      expect(result).to.be.oneOf([
        'Joan was our hero and Joan was fantastic.',
        'Jane was our hero and Jane was fantastic.',
        'Jack was our hero and Jack was fantastic.',
        'Jake was our hero and Jake was fantastic.'
      ]);
    });

    it('Handle symbol transforms', function () {
      let rg;

      rg = new RiGrammar({
        start: '$tmpl',
        tmpl: '$jrSr.capitalize()',
        jrSr: '[junior|junior]'
      });
      expect(rg.expand({ trace: 0 })).eq('Junior');

      rg = new RiGrammar({
        start: '$r.capitalize()',
        r: '[a|a]'
      });
      expect(rg.expand({ trace: 0 }), 'A');

      rg = new RiGrammar({
        start: '$r.pluralize()',
        r: '[ mouse | mouse ]'
      });
      expect(rg.expand({ trace: 0 }), 'mice');
    });

    it('Handle symbol transforms on statics', function () {
      let rg;
      rg = new RiGrammar({
        start: '$tmpl',
        '#tmpl': '$jrSr.capitalize()',
        '#jrSr': '[junior|junior]'
      });
      expect(rg.expand()).eq('Junior');

      rg = new RiGrammar({
        start: '$r.capitalize()',
        '#r': '[a|a]'
      });
      expect(rg.expand()).eq('A');

      rg = new RiGrammar({
        start: '$r.pluralize() $r',
        '#r': '[ mouse | ant ]'
      });
      if (IfRiTa) {
        expect(rg.expand()).to.be.oneOf(['mice mouse', 'ants ant']);
      } else {
        expect(rg.expand()).to.be.oneOf(['mouses mouse', 'ants ant']);
      }
    });

    it('Handle special characters', function () {
      let rg, res, s;

      s = '{ "start": "hello &#124; name" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === 'hello | name');

      s = '{ "start": "hello: name" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      expect(res === 'hello: name');

      s = '{ "start": "&#8220;hello!&#8221;" }';
      rg = RiGrammar.fromJSON(s);

      s = '{ "start": "&lt;start&gt;" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === '<start>');

      s = '{ "start": "I don&#96;t want it." }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === 'I don`t want it.');

      s = '{ "start": "&#39;I really don&#39;t&#39;" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      expect(res === "'I really don't'");

      s = '{ "start": "hello | name" }';
      rg = RiGrammar.fromJSON(s);
      for (let i = 0; i < 5; i++) {
        res = rg.expand();
        expect(res === 'hello' || res === 'name');
      }
    });

    it('Handle special characters with statics', function () {
      let rg, res, s;

      s = '{ "start": "hello &#124; name" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === 'hello | name');

      s = '{ "start": "hello: name" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      expect(res === 'hello: name');

      s = '{ "start": "&#8220;hello!&#8221;" }';
      rg = RiGrammar.fromJSON(s);

      s = '{ "start": "&lt;start&gt;" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === '<start>');

      s = '{ "start": "I don&#96;t want it." }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      // console.log(res);
      expect(res === 'I don`t want it.');

      s = '{ "start": "&#39;I really don&#39;t&#39;" }';
      rg = RiGrammar.fromJSON(s);
      res = rg.expand();
      expect(res === "'I really don't'");

      s = '{ "start": "hello | name" }';
      rg = RiGrammar.fromJSON(s);
      for (let i = 0; i < 5; i++) {
        res = rg.expand();
        expect(res === 'hello' || res === 'name');
      }
    });

    it('Call to/from JSON', function () {
      let json, rg, rg2, generatedJSON;

      // fromJSON Throw on non-json-string
      expect(function () {
        const gra = RiGrammar.fromJSON({ a: 'b' });
      }).to.throw();

      expect(function () {
        const gra = RiGrammar.fromJSON('non-JSON string');
      }).to.throw();

      json = '{ "start": "$pet $iphone", "pet": "[dog | cat]", "iphone": "[iphoneSE | iphone12]" }';
      rg = new RiGrammar(JSON.parse(json));
      generatedJSON = rg.toJSON();
      // console.log("\n" + generatedJSON);
      JSON.parse(generatedJSON);
      rg2 = RiGrammar.fromJSON(generatedJSON);

      expect(rg.toString()).eq(rg2.toString());
      expect(rg.equals(rg2));
      expect(rg2.equals(rg));

      json = '{ "start": "$pet $iphone", "pet": "[dog | cat]", "iphone": "[iphoneSE | iphone12]" }';
      rg = new RiGrammar(JSON.parse(json));
      generatedJSON = rg.toJSON();

      rg2 = RiGrammar.fromJSON(generatedJSON);
      expect(rg.toString()).eq(rg2.toString());
      expect(rg.equals(rg2));
      expect(rg2.equals(rg));
    });

    it('Correctly pluralize phrases', function () {
      const json = {
        start: '[$state feeling].pluralize()',
        state: '[bad | bad]'
      };
      const rg = new RiGrammar(json);
      const res = rg.expand();
      expect(res, 'bad feelings');
    });

    it('Correctly pluralize static phrases', function () {
      const json = {
        start: '[$state feeling].pluralize()',
        '#state': '[bad | bad]'
      };
      const rg = new RiGrammar(json);
      const res = rg.expand();
      expect(res, 'bad feelings');
    });
  });

});