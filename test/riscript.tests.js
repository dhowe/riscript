import { expect } from 'chai';

import { RiScript, RiGrammar } from './index.js';

/*
  TODO:  - line-breaks in choices
    - #postconditions# (post/effect/changes) => silent
    - better syntax for gates? remove @s?
    - RiScript cheatsheet
    - test collision in pendingSymbols between static/dynamic/user vars
    - find / load ?
*/
const version = RiScript.VERSION;
const title = `RiScript.v3 ${isNum(version) ? `v${version}` : '[DEV]'}`;

describe(title, function () {
  /* eslint-disable no-unused-expressions, no-unused-vars, no-multi-str */
  const TRACE = { trace: 1 };
  const LTR = 0;
  const T = TRACE;
  const PL = { preserveLookups: 1 };
  const TRX = { trace: 1, traceTx: 1 };
  const TPL = { preserveLookups: 1, trace: 1 };

  let riscript, IfRiTa, RiScriptVisitor, Util;

  before(function () {
    riscript = new RiScript();
    // RiGrammar = RiScript.Grammar;
    Util = RiScript.Util;
    RiScriptVisitor = RiScript.Visitor;
    IfRiTa = typeof riscript.RiTa.VERSION === 'string';
    RiScript.RiTaWarnings.silent = !IfRiTa;
  });

  LTR && describe('OneOff', function () {
    it('Be a single problematic test', function () { });
  });
  
  describe('Markdown', function () {
    it('Handle basic markdown', function () {
      let test = 'Some *italic* and **bold** and _other_ markdown';
      expect(riscript.evaluate(test)).eq(test)
      let test2 = '1. list 1\n2. list 2\n3. list 3';
      expect(riscript.evaluate(test2)).eq(test2)
    });

    it('Handle markdown headers', function () {
      const res = riscript.evaluate('### Header');
      expect(res).eq('### Header');
    });

    it('Handle markdown links', function () {
      let res;

      res = riscript.evaluate('Some [RiTa](https://rednoise.org/rita) code');
      expect(res).eq('Some [RiTa](https://rednoise.org/rita) code');

      res = riscript.evaluate('Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code');
      expect(res).eq('Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code');

      res = riscript.evaluate('Some [RiScript](/@dhowe/riscript) code');
      expect(res).eq('Some [RiScript](/@dhowe/riscript) code');

      res = riscript.evaluate('Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code' +
        ' with [RiScript](/@dhowe/riscript) links');
      expect(res).eq('Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code' +
        ' with [RiScript](/@dhowe/riscript) links');
    });

    it('Handle formatted markdown', function () {
      let input = `### A Title 
      Some RiScript code
        that we can [format|format|format]
           with *[inline | inline]* Markdown
             and rerun [once per | once per] second
               [using|using|using] the **[pulse].qq** function below`;
      let expected = '### A Title \n      Some RiScript code\n        that we can format\n           with *inline* Markdown\n             and rerun once per second\n               using the **“pulse”** function below';
      const res = riscript.evaluate(input);
      expect(res).eq(expected);
    });
  });


  describe('Sequences', function () {
    it('Support norepeat choice transforms', function () {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate('$names=[a|b]\n$names $names.norepeat()');
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        // console.log(i + ") " + parts[0] + " :: " + parts[1]);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Support single norepeat choices ', function () {
      // FIX FOR rita#157
      let res;
      for (let i = 0; i < 10; i++) {
        res = riscript.evaluate('$b=a[b|c|d]e\n$b $b.nr');
        // console.log(i,res);
        expect(/a[bdc]e a[bdc]e/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Support single norepeat choices in context', function () {
      let res;

      for (let i = 0; i < 5; i++) {
        res = riscript.evaluate('$b $b.nr', { $b: '[a[b | c | d]e]' });
        // console.log(i, res);
        expect(/a[bcd]e a[bcd]e/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Support norepeat symbol transforms', function () {
      let fail = false;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate('$rule=[a|b|c|d|e]\n$rule.nr $rule.nr');
        // console.log(i,res);
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        // console.log(i + ") " + parts[0] + " " + parts[1]);
        if (parts[0] === parts[1]) {
          fail = true;
          break;
        }
      }
      expect(fail).false;
    });

    it('Throw on norepeat statics', function () {
      expect(() => riscript.evaluate('#a=[a|b]\n$a $a.nr', 0)).to.throw();
      expect(() => riscript.evaluate('#a=[a|b]\n#a #a.nr', 0)).to.throw();
    });

    it('Throw on dynamics called as statics', function () {
      expect(() => riscript.evaluate('{$foo=bar}#foo', 0)).to.throw();
    });
  });

  describe('Gates', function () {
    // it('Lex simplest gate', function () {
    //   expect(riscript.lex({input:'[ @{ a: { $exists: true }} hello]'},0,T)).eq('');
    // });

    /*it('Handle simplest gate', function () {
      expect(riscript.evaluate('[ @{ a: { $exists: true }} hello]',0)).eq('');
      expect(riscript.evaluate('$a=1\n[ @{ a: { $exists: true }} hello]')).eq('hello');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} hello]\n$a=1', 0, T)).eq('hello');
    });*/

    it('Throw on bad gates', function () {
      expect(() => riscript.evaluate('$a=ok\n[ @{a: ok} hello]', 0)).to.throw();
    });

    it('Handle exists gates', function () {
      expect(riscript.evaluate('[ @{ a: { $exists: true }} hello]')).eq('');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} hello][ @{ a: { $exists: true }} hello]')).eq('');

      expect(riscript.evaluate('[ @{ a: { $exists: true }} user]', { a: 'apogee' })).eq('user');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} user]', { b: 'apogee' })).eq('');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} user]', { a: 'apogreed'})).eq('user');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} &lt;]', { a: 'apogee' })).eq('<');

      expect(riscript.evaluate('$a=apogee\n[ @{ a: { $exists: true }} dynamic]', 0)).eq('dynamic');
      expect(riscript.evaluate('$b=apogee\n[ @{ a: { $exists: true }} dynamic]')).eq('');
      expect(riscript.evaluate('{$b=apogee}[ @{ a: { $exists: true }} dynamic]')).eq('');
      expect(riscript.evaluate('[$b=apogee][ @{ a: { $exists: true }} dynamic]')).eq('apogee');
      expect(riscript.evaluate('[$a=apogee] [ @{ a: { $exists: true }} dynamic]')).eq('apogee dynamic');
      expect(riscript.evaluate('[$a=apogee]\n[ @{ a: { $exists: true }} dynamic]')).eq('apogee\ndynamic');

      expect(riscript.evaluate('#a=apogee\n[ @{ a: { $exists: true }} static]')).eq('static');
      expect(riscript.evaluate('#b=apogee\n[ @{ a: { $exists: true }} static]')).eq('');
      expect(riscript.evaluate('{#b=apogee}[ @{ a: { $exists: true }} static]')).eq('');
      expect(riscript.evaluate('[#b=apogee][ @{ a: { $exists: true }} static]')).eq('apogee');
      expect(riscript.evaluate('[#a=apogee] [ @{ a: { $exists: true }} static]')).eq('apogee static');
      expect(riscript.evaluate('[#a=apogee]\n[ @{ a: { $exists: true }} static]')).eq('apogee\nstatic');
    });

    it('Handle matching gates', function () {
      expect(riscript.evaluate('[ @{ a: /^p/ } hello]', { a: 'apogee' })).eq('');
      expect(riscript.evaluate('[ @{ a: /^p/ } hello]', { a: 'puffer' })).eq('hello');
      expect(riscript.evaluate('[ @{ a: /^p/ } $a]', { a: 'pogue' })).eq('pogue');

      expect(riscript.evaluate('[ @{ a: /^p/g } hello]', { a: 'apogee' })).eq('');
      expect(riscript.evaluate('[ @{ a: /^p/g } hello]', { a: 'puffer' })).eq('hello');
      expect(riscript.evaluate('[ @{ a: /^p/g } $a]', { a: 'pogue' })).eq('pogue');
    });


    it('Handle nested gates', function () {
      let res;

      res = riscript.evaluate('$x=2\n$y=3\n[ @{x:1} [a] || [@{y:3} b ]]', 0);
      expect(res).eq('b');

      res = riscript.evaluate('$x=2\n$y=4\n[ @{x:1} [a] || [@{y:3} b || c ]]', 0);
      expect(res).eq('c');
    });

    it('Handle else gates', function () {
      let res;

      res = riscript.evaluate('$x=2\n[@{x:2} [a] || [b]]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('$x=2\n[@{x:2} [a|a] || [b|b]]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('$x=1\n[@{x:2} [a|a] || [b|b]]', 0);
      expect(res).eq('b');

      res = riscript.evaluate('[@{} [a|a] || [b|b] ]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('$x=1\n[@{x:1}a||b]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('$x=2\n[@{x:1}a||b]', 0);
      expect(res).eq('b');

      res = riscript.evaluate('[@{x:3}a||b]', { x: 3 });
      expect(res).eq('a');

      res = riscript.evaluate('[@{x:4}a||b]', { x: 3 });
      expect(res).eq('b');

      res = riscript.evaluate('[@{x:4} a | a || b ]', { x: 3 });
      expect(res).eq('b');

      res = riscript.evaluate('[@{x:4} a | a || [b | b(5)] ]', { x: 3 });
      expect(res).eq('b');

      res = riscript.evaluate('[@{}a||b]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('[@{}a|a||b]', 0);
      expect(res).eq('a');

      res = riscript.evaluate('[a||b]', 0); // or error?
      expect(res).eq('a');
    });

    it('Handle deferred else gates', function () {
      let res;

      res = riscript.evaluate('[@{a:1}a||b]\n$a=1', 0);
      expect(res).eq('a');

      res = riscript.evaluate('[@{a:2}a||b]\n$a=1', 0);
      expect(res).eq('b');

      res = riscript.evaluate('[@{a:2}[a]||[b]]\n$a=1', 0);
      expect(res).eq('b');

      res = riscript.evaluate('[@{a:2}[a|a|a]||[b]]\n$a=2', 0);
      expect(res).eq('a');

      res = riscript.evaluate('[ @{a:2} [accept|accept] || [reject|reject] ]\n$a=1', 0);
      expect(res).eq('reject');

      res = riscript.evaluate('[@{x:4} a | a || b | b ]', { x: 3 });
      expect(res).eq('b');

      res = riscript.evaluate('[@{a:2}a||b]', 0);
      expect(res).eq('b');
    });

    it('Handle equality gates', function () {
      expect(riscript.evaluate('$a=3\n[ @{a: "3"} hello]', 0)).eq('hello');
      expect(riscript.evaluate('$a=2\n[ @{a: 3} hello]', 0)).eq('');
      expect(riscript.evaluate('$a=3\n[ @{a: 3} hello]', 0)).eq('hello');
      expect(riscript.evaluate('$a=3\n[ @{a: 4} hello]', 0)).eq('');
      expect(riscript.evaluate('$a=ok\n[ @{a: "ok"} hello]', 0)).eq('hello');
      expect(riscript.evaluate('$a=notok\n[ @{a: "ok"} hello]', 0)).eq('');
    });

    it('Handle deferred equality gates', function () {
      expect(riscript.evaluate('[ @{a: 3} hello]', { a: 2 })).eq('');
      expect(riscript.evaluate('[ @{a: 3} hello]', { a: 3 })).eq('hello');
      expect(riscript.evaluate('[ @{a: 4} hello]', { a: 3 })).eq('');
      expect(riscript.evaluate('[ @{a: "ok"} hello]', { a: 'ok' })).eq('hello');
      expect(riscript.evaluate('[ @{a: "ok"} hello]', { a: 'fail' })).eq('');
    });

    it('Handle casting for arithmetic gates', function () {
      expect(riscript.evaluate('$a=4\n[ @{a: {$gt: 3}} hello]', 0)).eq('hello');
      expect(riscript.evaluate('$a=3\n[ @{a: {$gt: 3}} hello]', 0)).eq('');
      expect(riscript.evaluate('$a=3.1\n[ @{a: {$gt: 3}} hello]', 0)).eq('hello');
      expect(riscript.evaluate('$a=3.0\n[ @{a: {$gt: 3}} hello]', 0)).eq('');
    });

    it('Handle boolean gate logic', function () {
      // reject if no valid conditions
      expect(riscript.evaluate('$a=2\n[ @{a: {}} hello]')).eq('');

      // reject if no passing condition in $or
      expect(riscript.evaluate('$a=27\n[ @{ $or: [] } hello]')).eq('');

      // accept if no failing condition in $and
      expect(riscript.evaluate('$a=27\n[ @{ $and: [] } hello]')).eq('hello');

      // simple AND
      expect(riscript.evaluate('$a=2\n[ @{a: {$gt: 3}} hello]')).eq('');
      expect(riscript.evaluate('$a=4\n[ @{a: {$gt: 3}} hello]')).eq('hello');
      expect(riscript.evaluate('$a=4\n[ @{a: {$gt:25, $lt:32}} hello]')).eq('');
      expect(riscript.evaluate('$a=27\n[ @{a: {$gt:25, $lt:32}} hello]')).eq('hello');

      // composite OR
      expect(riscript.evaluate('$a=27\n[ @{ $or: [ {a: {$gt: 30}}, {a: {$lt: 20}} ] } hello]')).eq('');
      expect(riscript.evaluate('$a=35\n[ @{ $or: [ {a: {$gt: 30}}, {a: {$lt: 20}} ] } hello]')).eq('hello');

      // composite AND
      expect(riscript.evaluate('$a=27\n[ @{ $and: [ {a: {$gt: 20}}, {a: {$lt: 25}} ] } hello]')).eq('');
      expect(riscript.evaluate('$a=23\n[ @{ $and: [ {a: {$gt: 20}}, {a: {$lt: 25}} ] } hello]')).eq('hello');

      expect(riscript.evaluate('$a=23\n[ @{ $and: [ {a: {$gt: 20}}, {b: {$lt: 25}} ] } hello]')).eq('');
    });

    it('Handle deferred dynamics', function () {
      // deferred dynamics
      expect(riscript.evaluate('[ @{a: {}} hello]\n$a=2')).eq('');
      expect(riscript.evaluate('[ @{a: "ok"} hello]\n$a=ok', 0)).eq('hello');
    });

    it('Handle deferred booleans', function () {
      // reject if no valid conditions
      expect(riscript.evaluate('[ @{a: {}} hello]', { a: 2 })).eq('');
      expect(riscript.evaluate('[ @{a: {}} hello]\n$a=2', 0)).eq('');

      // reject if no passing condition in $or
      expect(riscript.evaluate('[ @{ $or: [] } hello]', { a: 27 })).eq('');

      // accept if no failing condition in $and
      expect(riscript.evaluate('[ @{ $and: [] } hello]', { a: 27 })).eq('hello');

      // simple AND
      expect(riscript.evaluate('[ @{a: {$gt: 3}} hello]', { a: 2 })).eq('');
      expect(riscript.evaluate('[ @{a: {$gt: 3}} hello]', { a: 4 })).eq('hello');
      expect(riscript.evaluate('[ @{a: {$gt:25, $lt:32}} hello]', { a: 4 })).eq('');
      expect(riscript.evaluate('[ @{a: {$gt:25, $lt:32}} hello]', { a: 27 })).eq('hello');

      // composite OR
      expect(riscript.evaluate('[ @{ $or: [ {a: {$gt: 30}}, {a: {$lt: 20}} ] } hello]', { a: 27 })).eq('');
      expect(riscript.evaluate('[ @{ $or: [ {a: {$gt: 30}}, {a: {$lt: 20}} ] } hello]', { a: 35 })).eq('hello');

      // composite AND
      expect(riscript.evaluate('[ @{ $and: [ {a: {$gt: 20}}, {a: {$lt: 25}} ] } hello]', { a: 27 })).eq('');
      expect(riscript.evaluate('[ @{ $and: [ {a: {$gt: 20}}, {a: {$lt: 25}} ] } hello]', { a: 23 })).eq('hello');

      expect(riscript.evaluate('[ @{ $and: [ {a: {$gt: 20}}, {b: {$lt: 25}} ] } hello]', { a: 23 })).eq('');
    });

    it('Extract operands from gate', function () {
      const json = { a: 3, $or: [{ b: { $lt: 30 } }, { c: /^p*/ }] };
      const query = new RiScript.Query(riscript, json);
      const operands = query.operands(riscript, json);
      expect(operands).eql(['a', 'c', 'b']);
    });

    it('Call test on RiQuery', function () {
      const json = { a: 3, $or: [{ b: { $lt: 30 } }, { c: /^p*/ }] };
      const query = new RiScript.Query(riscript, json);
      const res = query.test({ a: 3, b: 10 });
      expect(res).true;
    });

    it('Handle complex boolean gate logic', function () {
      //  AND plus OR
      let queryAsVar = '{ a: 3, $or: [ { b: { $lt: 30 } }, { c: /^p*/ } ] }';
      let ctxAsVar = '$a=27\n$b=10\n$c=pants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`, 0)).eq('');
      ctxAsVar = '$a=3\n$b=10\n$c=ants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('hello');
      ctxAsVar = '$a=3\n$b=5\n$c=pants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('hello');

      //  AND plus OR
      queryAsVar = '{ a: 3, $or: [ { b: { $lt: 30 } }, { c: "pants" } ] }';
      ctxAsVar = '$a=27\n$b=30\n$c=pants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('');
      ctxAsVar = '$a=3\n$b=30\n$c=pants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('hello');
      ctxAsVar = '$a=3\n$b=10\n$c=ants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('hello');
      ctxAsVar = '$a=3\n$b=30\n$c=ants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('');
      ctxAsVar = '$a=3\n$b=5\n$c=pants\n';
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq('hello');
    });

    it('Handle deferred complex boolean gate logic', function () {
      //  AND plus OR
      let queryAsVar = '{ a: 3, $or: [ { b: { $lt: 30 } }, { c: /^p*/ } ] }';
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 27,
        b: 10,
        c: 'pants'
      })).eq('');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 10,
        c: 'ants'
      })).eq('hello');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 5,
        c: 'pants'
      })).eq('hello');

      //  AND plus OR
      queryAsVar = '{ a: 3, $or: [ { b: { $lt: 30 } }, { c: "pants" } ] }';
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 27,
        b: 30,
        c: 'pants'
      })).eq('');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 30,
        c: 'pants'
      })).eq('hello');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 10,
        c: 'ants'
      })).eq('hello');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 30,
        c: 'ants'
      })).eq('');
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 5,
        c: 'pants'
      })).eq('hello');
    });

    it('Handle deferred gates', function () {
      expect(riscript.evaluate('$a=$b\n[ @{ a: "dog" } hello]\n$b=[cat|cat]')).eq('');
      expect(riscript.evaluate('$a=$b\n[ @{ a: "cat" } hello]\n$b=[cat|cat]')).eq('hello');

      expect(riscript.evaluate('[ @{ a: { $exists: true }} dynamic]\n$a=apogee')).eq('dynamic');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} dynamic]\n{$a=apogee}')).eq('dynamic');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} dynamic]\n[$a=apogee]')).eq('dynamic\napogee');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} dynamic]\n$b=apogee')).eq('');

      expect(riscript.evaluate('[ @{ a: { $exists: true }} static]\n#a=apogee')).eq('static');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} static]\n#b=apogee')).eq('');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} static]\n{#a=apogee}')).eq('static');
      expect(riscript.evaluate('[ @{ a: { $exists: true }} static]\n[#a=apogee]')).eq('static\napogee');
    });

    it('Handle gates with strings characters', function () {
      expect(riscript.evaluate("$a=bc\n[@{a: 'bc'} $a]")).eq('bc');
      expect(riscript.evaluate("$a=bc\n[@{a: 'cd'} $a]")).eq('');
      expect(riscript.evaluate("$a=bc\n[@{a: 'bc'} $a]")).eq('bc');
      expect(riscript.evaluate('$a=bc\n[@{a: "cd"} $a]')).eq('');
      expect(riscript.evaluate('$a=bc\n[@{a: "bc"} $a]')).eq('bc');
      expect(riscript.evaluate('$a=bc\n[@{a: "cd"} $a]')).eq('');
      expect(riscript.evaluate('$a=bc\n[@{a: "bc"} $a]')).eq('bc');
    });

    it('Handle gates with Chinese characters', function () {
      expect(riscript.evaluate('$a=ab\n[@{a: "ab"} $a]')).eq('ab');
      expect(riscript.evaluate('$a=繁體\n[@{a: "繁體"} $a]')).eq('繁體');
      expect(riscript.evaluate('$a=繁體\n[@{a: "中文"} $a]')).eq('');
      expect(riscript.evaluate('$a=繁體\n[@{a: {$ne: "繁體"}} $a]')).eq('');
      expect(riscript.evaluate('$a=繁體\n[@{a: {$ne: "中文"}} $a]')).eq('繁體');
    });
  });

  describe('Choice', function () {
    it('Throw on bad choices', function () {
      expect(() => riscript.evaluate('|')).to.throw();
      expect(() => riscript.evaluate('a |')).to.throw();
      expect(() => riscript.evaluate('a | b')).to.throw();
      expect(() => riscript.evaluate('a | b | c')).to.throw();
      expect(() => riscript.evaluate('[a | b] | c')).to.throw();
      expect(() => riscript.evaluate('[a | b].nr()')).to.throw(); // nr() only on variables
      expect(() => riscript.evaluate('[$names=[a|b|c|d|e]].nr()')).to.throw(); // TODO: support this
    });

    it('Resolve choices in context', function () {
      const res = riscript.evaluate('$bar:$bar', { bar: '[man | boy]' });
      // console.log(res);
      expect(/(man|boy):(man|boy)/.test(res)).true;
    });

    it('Repeat choices with randomSeed', function () {
      if (!('randomSeed' in riscript.RiTa)) return;
      const seed = Math.random() * Number.MAX_SAFE_INTEGER;
      const script = '$a=[1|2|3|4|5|6]\n$a';
      riscript.RiTa.randomSeed(seed); // TODO: How to handle with no RiTa ?
      let b;
      const a = riscript.evaluate(script);
      for (let i = 0; i < 5; i++) {
        riscript.RiTa.randomSeed(seed); // TODO: How to handle with no RiTa ?
        b = riscript.evaluate(script);
        // console.log(i + ') ', a, b);
        expect(a).eq(b);
      }
    });

    it('Select non-weighted choices evenly', function () {
      const map = {};
      for (let i = 0; i < 1000; i++) {
        const res = riscript.evaluate('[quite|]');
        if (!(res in map)) map[res] = 0;
        map[res]++;
      }
      expect(map.quite).greaterThan(400);
      expect(map['']).greaterThan(400);
    });

    it('Resolve choices', function () {
      expect(riscript.evaluate('[|]')).eq('');
      expect(riscript.evaluate('[a]')).eq('a');
      expect(riscript.evaluate('[a | a]', 0)).eq('a');

      expect(riscript.evaluate('[a | ]')).to.be.oneOf(['a', '']);

      expect(riscript.evaluate('[a | b]')).to.be.oneOf(['a', 'b']);

      expect(riscript.evaluate('[a | b | c]'), {}).to.be.oneOf(['a', 'b', 'c']);
      expect(riscript.evaluate('[a | [b | c] | d]')).to.be.oneOf([
        'a',
        'b',
        'c',
        'd'
      ]);
      expect(riscript.evaluate('$names=[a|b|c|d|e]\n$names $names', 0)).match(/[abcde] [abcde]/);

      expect(riscript.evaluate('not [quite|] far enough')).to.be.oneOf([
        'not far enough',
        'not quite far enough'
      ]);
    });

    it('Resolve multiword choices', function () {
      const silent = riscript.RiTa.SILENCE_LTS;
      riscript.RiTa.SILENCE_LTS = true;
      expect(riscript.evaluate('[A B | A B]')).eq('A B');
      expect(riscript.evaluate('[A B].toLowerCase()')).eq('a b');
      expect(riscript.evaluate('[A B | A B].toLowerCase()', 0)).eq('a b');
      expect(riscript.evaluate('[A B | A B].articlize()', 0)).eq('an A B');
      riscript.RiTa.SILENCE_LTS = silent;
    });

    it('Resolve choices in expressions', function () {
      expect(riscript.evaluate('x [a | a | a] x')).eq('x a x');
      expect(riscript.evaluate('x [a | a | a]')).eq('x a');
      expect(riscript.evaluate('x [a | a | a]x')).eq('x ax');
      expect(riscript.evaluate('x[a | a | a] x')).eq('xa x');
      expect(riscript.evaluate('x[a | a | a]x')).eq('xax');
      expect(riscript.evaluate('x [a | a | a] [b | b | b] x')).eq('x a b x');
      expect(riscript.evaluate('x [a | a | a][b | b | b] x')).eq('x ab x');
      expect(riscript.evaluate('x [a | a] [b | b] x')).eq('x a b x');
      expect(riscript.evaluate('[a|b]')).matches(/a|b/);
      expect(riscript.evaluate('[a|]')).matches(/a?/);
      expect(riscript.evaluate('[a|a]')).eq('a');
      expect(riscript.evaluate('[|a|]')).to.be.oneOf(['a', '']);
      expect(riscript.evaluate('This is &lpar;a parenthesed&rpar; expression')).eq('This is (a parenthesed) expression');

      expect(riscript.evaluate('This is \\(a parenthesed\\) expression')).eq('This is (a parenthesed) expression');
      expect(riscript.evaluate('[[mountain | mountain] village | [evening | evening] sunlight | [winter | winter] flower | [star | star]light above]'
      )).to.be.oneOf([
        'mountain village',
        'evening sunlight',
        'winter flower',
        'starlight above'
      ]);
    });

    it('Resolve weighted choices', function () {
      expect(riscript.evaluate('[ a (2) ]', {})).eq('a');
      expect(riscript.evaluate('[(2) |(3)]', {})).eq('');
      expect(riscript.evaluate('[a | b (2) |(3)]', {})).to.be.oneOf([
        'a',
        'b',
        ''
      ]);
      expect(riscript.evaluate('[a | b(2) |(3)]', {})).to.be.oneOf([
        'a',
        'b',
        ''
      ]);
      expect(riscript.evaluate('[ a (2) | a (3) ]', {})).eq('a');
      expect(riscript.evaluate('[ a ( 2) | a (3 ) ]', {})).eq('a');

      const result = { b: 0, a: 0 };
      for (let i = 0; i < 100; i++) {
        const ans = riscript.evaluate('[a | b (3)]');
        // console.log(i, ans);
        if (!/^[ab]$/.test(ans)) throw Error('invalid: ' + ans);
        result[ans]++;
      }
      expect(result.b).gt(result.a);
    });
  });

  describe('Assignment', function () {
    it('End single assignments on line break', function () {
      let res;
      expect((res = riscript.evaluate('hello\n$foo=a', 0, PL))).eq('hello'); // eslint-disable-line
      // console.log('\nResult="' + res + '"', riscript.visitor.dynamics.foo);

      expect(riscript.visitor.dynamics.foo).to.be.a('function');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('$foo=a\n', 0, PL)).eq('\n');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('$foo=a\nb', 0, PL)).eq('b');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('$foo=a\n$bar=$foo', 0, PL)).eq(''); // empty string

      expect(riscript.visitor.dynamics.bar).to.be.a('function');
      expect(riscript.visitor.dynamics.foo()).eq('a');
      expect(riscript.visitor.dynamics.bar()).eq('a');

      expect(riscript.evaluate('$foo=a\n$bar=$foo.', 0, PL)).eq(''); // empty string

      // console.log('riscript.visitor.dynamics:', riscript.visitor.dynamics);
      expect(riscript.visitor.dynamics.foo()).eq('a');
      expect(riscript.visitor.dynamics.bar()).eq('a.');

      expect(riscript.evaluate('$foo=[a | a]\n$foo', 0, PL)).eq('a');
      // console.log(riscript.visitor.dynamics);
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('$foo=[hi | hi]\n$foo there', 0, PL)).eq('hi there');
      expect(riscript.visitor.dynamics.foo()).eq('hi');
    });

    it('Parse silent assignments', function () {
      let ctx = {};
      expect(riscript.evaluate('{$foo=a}b', ctx, PL)).eq('b');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=[a] b}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a b');

      ctx = {};
      expect(riscript.evaluate('{$foo=[a | a]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=ab}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab');

      ctx = {};
      expect(riscript.evaluate('{$foo=ab bc}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=(ab) (bc)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('(ab) (bc)');

      expect(riscript.evaluate('{$foo=[ab] [bc]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=[ab bc]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=[a | a] [b | b]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a b');

      ctx = {};
      expect(riscript.evaluate('{$foo=[[a | a] | [a | a]]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=[]}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('');

      ctx = {};
      expect(riscript.evaluate('{$foo=()}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('()');

      expect(riscript.evaluate('{$foo=[a | a]}', (ctx = {}), PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('{$foo=The boy walked his dog}', (ctx = {}), PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('The boy walked his dog');
    });

    it('Resolve prior assignments', function () {
      expect(riscript.evaluate('$foo=dog\n$bar=$foo\n$baz=$foo\n$baz', 0)).eq('dog');
      expect(riscript.evaluate('$foo=hi\n$foo there')).eq('hi there');
      expect(riscript.evaluate('$foo=a\n$foo')).eq('a');
    });
  });

  describe('Evaluation', function () {

    it('Resolve simple expressions', function () {
      expect(riscript.evaluate('hello', 0)).eq('hello');
      expect(riscript.evaluate('[a|b]', 0)).is.oneOf(['a', 'b']);
      expect(riscript.evaluate('[a|b (4)|c]', 0)).is.oneOf(['a', 'b', 'c']);
      expect(riscript.evaluate('[hello (2)]', 0)).eq('hello');
      expect(riscript.evaluate('[hello]', 0)).eq('hello');
      expect(riscript.evaluate('[@{a:2} hello]', 0)).eq('');
      expect(riscript.evaluate('$a=2\n$a', 0)).eq('2');
      expect(riscript.evaluate('[$a=2]', 0)).eq('2');
      expect(riscript.evaluate('[#a=2]', 0)).eq('2');
      expect(riscript.evaluate('#a=2', 0)).eq('');
      expect(riscript.evaluate('#a=2\n$a', 0)).eq('2');
      expect(riscript.evaluate('$a=2\n[@{a:2} hello]', 0)).eq('hello');
      expect(riscript.evaluate('[@{a:2} hello (2)]', 0)).eq('');
      expect(riscript.evaluate('[@{a:2} hello (2)]', 0)).eq('');
    });

    it('Have static evaluate', function () {
      expect(RiScript.evaluate('(foo)', {})).eq('(foo)');
      expect(RiScript.evaluate('foo!', {})).eq('foo!');
      expect(RiScript.evaluate('!foo', {})).eq('!foo');
      expect(RiScript.evaluate('foo.', {})).eq('foo.');
      expect(RiScript.evaluate('"foo"', {})).eq('"foo"');
      expect(RiScript.evaluate("'foo'", {})).eq("'foo'");
      expect(RiScript.evaluate('$a=hello\n', 0)).eq('\n');
      expect(RiScript.evaluate('hello\n', 0)).eq('hello\n');
      expect(RiScript.evaluate('*%©\n', 0)).eq('*%©\n');
    });

    it('Handle abbreviations', function () {
      expect(riscript.evaluate('The C.D failed', {})).eq('The C.D failed');
      expect(riscript.evaluate('The $C.D failed', { C: 'C', D: (s) => s.toLowerCase() })).eq('The c failed');
    });

    it('Resolve expressions', function () {
      expect(riscript.evaluate('foo')).eq('foo');
      expect(riscript.evaluate('(foo)', {})).eq('(foo)');
      expect(riscript.evaluate('foo!', {})).eq('foo!');
      expect(riscript.evaluate('!foo', {})).eq('!foo');
      expect(riscript.evaluate('foo.', {})).eq('foo.');
      expect(riscript.evaluate('"foo"', {})).eq('"foo"');
      expect(riscript.evaluate("'foo'", {})).eq("'foo'");
      expect(riscript.evaluate('$a=hello\n', 0)).eq('\n');
      expect(riscript.evaluate('hello\n', 0)).eq('hello\n');
      expect(riscript.evaluate('*%©\n', 0)).eq('*%©\n');
    });

    it('Resolve choices', function () {
      expect(riscript.evaluate('[a]')).eq('a');
      expect(riscript.evaluate('[a | a]')).eq('a');
      expect(riscript.evaluate('[a | ]')).to.be.oneOf(['a', '']);
      expect(riscript.evaluate('[a | b]')).to.be.oneOf(['a', 'b']);
      expect(riscript.evaluate('[a | b | c]'), {}).to.be.oneOf(['a', 'b', 'c']);
      expect(riscript.evaluate('[a | [b | c] | d]')).to.be.oneOf([
        'a',
        'b',
        'c',
        'd'
      ]);
      expect(riscript.evaluate('{$names=[a|b|c|d|e]}$names $names', {})).to.match(/[abcde] [abcde]/);
    });

    it('Resolve multiword choices', function () {
      expect(riscript.evaluate('[A B | A B]')).eq('A B');
    });

    it('Resolve transformed choices', function () {
      expect(riscript.evaluate('[A B].toLowerCase()')).eq('a b');
      expect(riscript.evaluate('[A B | A B].toLowerCase()')).eq('a b');
      expect(riscript.evaluate('[A B | A B].articlize()')).eq('an A B');
      expect(riscript.evaluate('$mammal=[dog | dog]\n$mammal.pluralize.ucf are unruly, but my $mammal is the best.'))
        .eq('Dogs are unruly, but my dog is the best.');
    });

    it('Resolve simple statics', function () {
      expect(riscript.evaluate('{#foo=bar}baz', {})).eq('baz');
      expect(riscript.evaluate('{#foo=bar}$foo', {})).eq('bar');
      expect(riscript.evaluate('[#foo=bar]\nbaz', {})).eq('bar\nbaz');
      expect(riscript.evaluate('{#foo=bar}baz$foo', {})).eq('bazbar');
      expect(riscript.evaluate('{#foo=bar}[$foo]baz', {})).eq('barbaz');
      expect(riscript.evaluate('{#foo=bar}$foo baz $foo', {})).eq('bar baz bar');
      expect(riscript.evaluate('{#foo=bar}baz\n$foo $foo', {})).eq('baz\nbar bar');

      let failed = false;
      for (let i = 0; i < 5; i++) {
        // #: Always match (static)
        const res = riscript.evaluate('{#foo=[a|b|c|d]}$foo $foo $foo', {});
        // console.log(i + ") " + res);
        const pts = res.split(' ');
        expect(pts.length).eq(3);
        if (pts[0] != pts[1] || pts[1] != pts[2] || pts[2] != pts[0]) {
          failed = true;
          break;
        }
      }
      expect(failed).eq(false);
    });

    it('Resolve statics', function () {
      let res = riscript.evaluate('{#bar=[man | boy]}$bar'); // silent
      expect(res === 'man' || res === 'boy').true;

      res = riscript.evaluate('#bar=[man | boy]\n$foo=$bar:$bar\n$foo', {});
      expect(res === 'man:man' || res === 'boy:boy').true;
    });

    it('Resolve predefined statics', function () {
      let res, visitor;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { b: 'a [b | c | d] e' };
      res = riscript._evaluate({ input: '#b', visitor });
      expect(/a [bdc] e/.test(res)).true;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: '[man | boy]' };
      res = riscript._evaluate({ input: '#bar:#bar', visitor, trace: 0 });
      expect(res === 'man:man' || res === 'boy:boy').true;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: '[$man | $boy]' };
      visitor.context = { man: '[MAN|man]', boy: '[BOY|boy]' };
      res = riscript._evaluate({ input: '#bar:#bar', visitor, trace: 0 });
      expect(res === 'MAN:MAN' ||
        res === 'BOY:BOY' ||
        res === 'man:man' ||
        res === 'boy:boy'
      ).true;
    });

    it('Resolve expressions with line-breaks ', function () {
      expect(riscript.evaluate('$foo=bar\nbaz', {})).eq('baz');

      expect(riscript.evaluate('foo\nbar', {})).eq('foo\nbar');
      expect(riscript.evaluate('$foo=bar\nbaz\n$foo', {})).eq('baz\nbar');
      expect(riscript.evaluate('#foo=[a|b|c]\n$foo is $foo')).to.be.oneOf([
        'a is a',
        'b is b',
        'c is c'
      ]);
      expect(riscript.evaluate('<em>foo</em>', {})).eq('<em>foo</em>');
      expect(riscript.evaluate('[a|a]', { a: 'a', b: 'b' })).eq('a');

      const str = 'Now in one year\n     A book published\n          And plumbing —';
      expect(riscript.evaluate(str)).eq(str);

      expect(riscript.evaluate('a   b', 0)).eq('a   b');
      expect(riscript.evaluate('a\tb', 0)).eq('a\tb');

      expect(/[abcde] [abcde]/.test(
        riscript.evaluate('$names=[a|b|c|d|e]\n$names $names'))
      ).true;

      expect(riscript.evaluate('foo.bar', {}, { silent: 1 })).eq('foo.bar'); // KNOWN ISSUE
    });

    it('Resolve recursive expressions', function () {
      let ctx, expr;
      ctx = { a: 'a' };
      expr = '[a|$a]';
      expect(riscript.evaluate(expr, ctx)).eq('a');
      ctx = { a: '$b', b: '[c | c]' };
      expr = '$a';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '[c | c]' };
      expr = '$k = $a\n$k';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '[c | c]' };
      expr = '$s = $a\n$a = $b\n$c = $d\n$d = c\n$s';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { s: '$a', a: '$b', b: '$c', c: '$d', d: 'c' };
      expect(riscript.evaluate('$s', ctx)).eq('c');
    });

    it('Resolve recursive dynamics', function () {
      let ctx, expr;

      ctx = { a: '$b', b: '[c | c]' };
      expr = '#k=$a\n$k';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '[c | c]' };
      expr = '#s = $a\n#a = $b\n#c = $d\n#d = c\n$s';
      expect(riscript.evaluate(expr, ctx)).eq('c');
    });
  });

  describe('Symbols', function () {
    it('Handle deferred', function () {
      expect(riscript.evaluate('$foo\n$foo=cat', 0)).eq('cat');
    });

    it('Handle statics', function () {
      let res;

      res = riscript.evaluate('[#bar=[boy]]:$bar');
      expect(res === 'boy:boy').true;

      res = riscript.evaluate('[#bar=[$boy]]:$bar\n$boy=boy');
      expect(res === 'boy:boy').true;

      res = riscript.evaluate('#foo=[cat | dog]\n$foo $foo');
      expect(res === 'cat cat' || res === 'dog dog').true;

      res = riscript.evaluate('#foo=[cat | dog]\n$foo $foo');
      expect(res === 'cat cat' || res === 'dog dog').true;

      res = riscript.evaluate('#bar=[$man | $boy]\n$man=[MAN|man]\n$boy=[BOY|boy]\n#bar:#bar');
      expect(
        res === 'MAN:MAN' ||
        res === 'BOY:BOY' ||
        res === 'man:man' ||
        res === 'boy:boy'
      ).true;

      res = riscript.evaluate('#bar=[$man | $boy]\n$man=[MAN|man]\n$boy=[BOY|boy]\n$bar:$bar');
      expect(
        res === 'MAN:MAN' ||
        res === 'BOY:BOY' ||
        res === 'man:man' ||
        res === 'boy:boy'
      ).true;
    });

    it('Handle norepeats', function () {
      let res;
      for (let i = 0; i < 5; i++) {
        res = riscript.evaluate('$foo=[cat|dog]\n$foo $foo.nr');
        expect(res === 'cat dog' || res === 'dog cat').true;
      }
    });

    it('Handle internal line breaks', function () {
      expect(riscript.evaluate('$foo=[cat\ndog]\n$foo')).eq('cat\ndog');
      expect(riscript.evaluate('前半段句子\n後半段句子')).eq('前半段句子\n後半段句子');
      expect(riscript.evaluate('$foo=前半段\n$foo句子   \n後半段句子')).eq('前半段句子   \n後半段句子');
      expect(riscript.evaluate('$foo=前半段\n$foo句子\n   後半段句子')).eq('前半段句子\n   後半段句子');
      expect(riscript.evaluate('$foo=[前半段句子\n後半段句子]\n$foo')).eq('前半段句子\n後半段句子');
    });

    it('Handle silents', function () {
      expect(riscript.evaluate('{$a=b}', 0)).eq('');
      expect(riscript.evaluate('$a=b', 0)).eq('');
      expect(riscript.evaluate('$a=b\n$a', 0)).eq('b'); // not silent
    });

    it('Resolve transforms', function () {
      let ctx, rs;

      expect(riscript.evaluate('$foo=$bar.toUpperCase()\n$bar=baz\n$foo', 0)).eq('BAZ');
      expect(riscript.evaluate('$foo.capitalize()\n$foo=[a|a]')).eq('A');
      expect(riscript.evaluate('$start=$r.capitalize()\n$r=[a|a]\n$start')).eq('A');

      expect(riscript.evaluate('$names=a\n$names.uc()', 0)).eq('A');

      expect(riscript.evaluate('$foo=[bar].ucf\n$foo')).eq('Bar');

      ctx = { bar: () => 'result' }; // func transform
      rs = riscript.evaluate('[].bar', ctx);
      expect(rs).eq('result');

      ctx = { mammal: '[ox | ox]' };
      rs = riscript.evaluate('The big $mammal ate all the smaller $mammal.s.',
        ctx);
      IfRiTa && expect(rs).eq('The big ox ate all the smaller oxen.');
    });
  });

  describe('Transforms', function () {

    it('Add/remove custom transforms', function () {
      let addRhyme = function (word) {
        return word + ' rhymes with bog';
      }
      expect(riscript.transforms.rhymes).is.undefined;
      riscript.addTransform('rhymes', addRhyme);
      expect(riscript.transforms.rhymes).is.not.undefined;
      let res = riscript.evaluate('The [dog | dog | dog].rhymes');
      expect(res).eq('The dog rhymes with bog');
      riscript.removeTransform('rhymes');
      expect(riscript.transforms.rhymes).is.undefined;
      res = riscript.evaluate('The [dog | dog | dog].rhymes', 0, { silent: true });
      expect(res).eq('The dog.rhymes');

      let addRhyme2 = function (word, parent) {
        return word + ' rhymes with bog'+parent.randi(1);
      }
      expect(riscript.transforms.rhymes2).is.undefined;
      riscript.addTransform('rhymes2', addRhyme2);
      expect(riscript.transforms.rhymes2).is.not.undefined;
      res = riscript.evaluate('The [dog | dog | dog].rhymes2');
      expect(res).eq('The dog rhymes with bog0');
      riscript.removeTransform('rhymes2');
      expect(riscript.transforms.rhymes2).is.undefined;
      res = riscript.evaluate('The [dog | dog | dog].rhymes2', 0, { silent: true });
      expect(res).eq('The dog.rhymes2');
    });

    it('Handle anonymous transforms', function () {
      // ensure $.tf() === ''.tf() === [].tf()
      const ctx = { capB: (s) => 'B' };
      expect(riscript.evaluate('$.toUpperCase()')).eq('');
      expect(riscript.evaluate('$.capB()', ctx)).eq('B');
      expect(riscript.evaluate('$.toUpperCase', 0)).eq('');
      expect(riscript.evaluate('$.capB', ctx)).eq('B');
    });

    it('Resolve transforms containing riscript', function () {
      let ctx;
      ctx = { tx: () => '[a | a]' };
      expect(riscript.evaluate('[c].tx()', ctx)).eq('a');

      ctx = { tx: (s) => s + '$sym' };
      expect(riscript.evaluate('$sym=at\n[c].tx()', ctx)).eq('cat');

      ctx = { sym: 'at', tx: (s) => s + '$sym' };
      expect(riscript.evaluate('[c].tx()', ctx)).eq('cat');

      ctx = { c: 'foo', tx: (s) => `$${s}` };
      expect(riscript.evaluate('[c].tx()', ctx)).eq('foo');

      ctx = { tx: (s) => `[${s}]` };
      expect(riscript.evaluate('[c].tx()', ctx)).eq('c');

      ctx = { tx: (s) => `[${s}].uc()` };
      expect(riscript.evaluate('[c].tx()', ctx)).eq('C');

      ctx = { s: 'c', tx: (s) => '[@{ s: "c"} FOO]' };
      expect(riscript.evaluate('[d].tx()', ctx)).eq('FOO');
    });

    it('Resolve transforms in context', function () {
      const ctx = { capB: (s) => s || 'B' };
      expect(riscript.evaluate('[c].capB()', ctx)).eq('c');
    });

    it('Resolve transforms', function () {
      let ctx = {};

      expect(riscript.evaluate('[This].uc() is an acronym.', ctx)).eq('THIS is an acronym.');

      expect(riscript.evaluate('[BAZ].toLowerCase().ucf()', ctx)).eq('Baz');
      expect(riscript.evaluate('[c].toUpperCase()', ctx)).eq('C'); // on str
      expect(riscript.evaluate('[c].toUpperCase', ctx)).eq('C'); // no parens
      expect(riscript.evaluate('$a=b\n$a.toUpperCase()', ctx)).eq('B');
      expect(riscript.evaluate('$a.toUpperCase()\n$a=b', ctx)).eq('B');
      expect(riscript.evaluate('[$b=[[a | a]|a]].toUpperCase() dog.', ctx)).eq('A dog.');
      expect(riscript.evaluate('[[a]].toUpperCase()', ctx)).eq('A');
      expect(riscript.evaluate('$a.toUpperCase()\n[$a=b]', ctx)).eq('B\nb');

      ctx = { dog: 'terrier' };
      expect(riscript.evaluate('$dog.ucf()', ctx)).eq('Terrier');
    });

    it('Resolve custom transforms', function () {
      const Blah = () => 'Blah';
      expect(riscript.evaluate('That is [ant].Blah().', { Blah })).eq('That is Blah.');
      const ctx = { Blah2: () => 'Blah2' };
      expect(riscript.evaluate('That is [ant].Blah2().', ctx)).eq('That is Blah2.');
      const Blah3 = () => 'Blah3';
      riscript.transforms.Blah3 = Blah3;
      expect(riscript.evaluate('That is [ant].Blah3().')).eq('That is Blah3.');
      expect(riscript.evaluate('That is [ant].Blah3.')).eq('That is Blah3.'); // no parens
    });

    it('Resolve transforms on literals', function () {
      expect(riscript.evaluate('How many [teeth].quotify() do you have?')).eq('How many “teeth” do you have?');
      expect(riscript.evaluate('How many [].quotify() do you have?')).eq('How many “” do you have?');
      expect(riscript.evaluate('How many [teeth].toUpperCase() do you have?', 0)).eq('How many TEETH do you have?');

      expect(riscript.evaluate('That is [].articlize().', 0)).eq('That is .');

      expect(riscript.evaluate('That is $.articlize().', 0)).eq('That is .');
      expect(riscript.evaluate('That is an [ant].capitalize().')).eq('That is an Ant.');

      expect(riscript.evaluate('[ant].articlize().capitalize()', 0)).eq('An ant');

      expect(riscript.evaluate('[ant].capitalize().articlize()', 0)).eq('an Ant');
      expect(riscript.evaluate('[deeply-nested expression].art()')).eq('a deeply-nested expression');

      expect(riscript.evaluate('[deeply-nested $art].art()', { art: 'emotion' })).eq('a deeply-nested emotion');


      expect(riscript.evaluate('That is [ant].articlize().')).eq('That is an ant.');
      expect(riscript.evaluate('That is [ant].articlize.')).eq('That is an ant.');
    });

    it('Pluralize phrases', function () {
      expect(riscript.evaluate('These [$state feeling].pluralize().', { state: '[bad | bad]' })).eq('These bad feelings.');
      expect(riscript.evaluate('These [bad feeling].pluralize().')).eq('These bad feelings.');
      expect(riscript.evaluate('She [pluralize].pluralize().')).eq('She pluralizes.');
      expect(riscript.evaluate('These [$state feeling].pluralize().', { state: 'bad' })).eq('These bad feelings.');
      expect(riscript.evaluate('{$state=[bad | bad]}These [$state feeling].pluralize().', {})).eq('These bad feelings.');
      expect(riscript.evaluate('{#state=[bad | bad]}These [$state feeling].pluralize().', {})).eq('These bad feelings.');
      expect(riscript.evaluate('These [off-site].pluralize().', { state: '[bad | bad]' })).eq('These off-sites.');
      expect(riscript.evaluate('$state=[bad | bad]\nThese [$state feeling].pluralize().', {})).eq('These bad feelings.');
      expect(riscript.evaluate('#state=[bad | bad]\nThese [$state feeling].pluralize().', {})).eq('These bad feelings.');
    });

    it('Resolve across assignment types', function () {
      let ctx;

      expect(riscript.evaluate('The [$foo=blue] [dog | dog]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.dynamics.foo()).eq('blue');

      expect(riscript.evaluate('The [$foo=blue [dog | dog]]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.dynamics.foo()).eq('blue dog');

      expect(riscript.evaluate('{$foo=blue [dog | dog]}', (ctx = {}), PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('blue dog');

      expect(riscript.evaluate('The{$foo=blue [dog | dog]}', (ctx = {}), PL)).eq('The');
      expect(riscript.visitor.dynamics.foo()).eq('blue dog');

      expect(riscript.evaluate('The $foo=blue [dog | dog]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.dynamics.foo()).eq('blue dog');
    });

    it('Resolve statics across assignment types', function () {
      let ctx;

      expect(riscript.evaluate('The [#foo=blue] [dog | dog]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.statics.foo).eq('blue');

      expect(riscript.evaluate('The [#foo=blue [dog | dog]]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.statics.foo).eq('blue dog');

      expect(riscript.evaluate('{#foo=blue [dog | dog]}', (ctx = {}), PL)).eq('');
      expect(riscript.visitor.statics.foo).eq('blue dog');

      expect(riscript.evaluate('The{#foo=blue [dog | dog]}', (ctx = {}), PL)).eq('The');
      expect(riscript.visitor.statics.foo).eq('blue dog');

      expect(riscript.evaluate('The #foo=blue [dog | dog]', (ctx = {}), PL)).eq('The blue dog');
      expect(riscript.visitor.statics.foo).eq('blue dog');
    });

    it('Resolve choice transforms', function () {
      expect(riscript.evaluate('[a | a].toUpperCase()', {})).eq('A');
      expect(riscript.evaluate('[a | a].up()', { up: (x) => x.toUpperCase() })).eq('A');
      expect(riscript.evaluate('[a | a].up', { up: (x) => x.toUpperCase() })).eq('A'); // no parens

      expect(riscript.evaluate('[a].toUpperCase()')).eq('A');
      expect(riscript.evaluate('[[a]].toUpperCase()')).eq('A');
      expect(riscript.evaluate('[a | b].toUpperCase()')).to.be.oneOf([
        'A',
        'B'
      ]);
      expect(riscript.evaluate('[a | a].capitalize()')).eq('A');
      expect(riscript.evaluate('The [boy | boy].toUpperCase() ate.')).eq('The BOY ate.');
      IfRiTa && expect(riscript.evaluate('How many [tooth | tooth].pluralize() do you have?')).eq('How many teeth do you have?');
    });

    it('Preserve non-existent transforms', function () {
      expect(riscript.evaluate('[a | a].up()', 0, { silent: true })).eq('a.up()'); // note: no transform .up
      expect(riscript.evaluate('$dog.toUpperCase()', 0, { silent: true })).eq('$dog.toUpperCase()'); // note: no symbol $dog
      expect(riscript.evaluate('The $C.D failed', 0, { silent: true })).eq('The $C.D failed'); // note: no transform .D
    });

    it('Resolve symbol transforms', function () {
      expect(riscript.evaluate('$dog.toUpperCase()', { dog: 'spot' })).eq('SPOT');
      expect(riscript.evaluate('$dog.capitalize()', { dog: 'spot' })).eq('Spot');
      expect(riscript.evaluate('$1dog.capitalize()', { '1dog': 'spot' })).eq('Spot');
      expect(riscript.evaluate('[$dog].capitalize()', { dog: 'spot' })).eq('Spot');

      expect(riscript.evaluate('The $dog.toUpperCase()', { dog: 'spot' })).eq('The SPOT');
      expect(riscript.evaluate('The [boy | boy].toUpperCase() ate.')).eq('The BOY ate.');
      expect(riscript.evaluate('The [girl].toUpperCase() ate.')).eq('The GIRL ate.');
      expect(riscript.evaluate('$dog.articlize().capitalize()', { dog: 'spot' })).eq('A spot');
    });

    it('Resolve symbol multi-transforms', function () {
      expect(riscript.evaluate('[$pet | $animal].articlize().cap()', { pet: 'ant', animal: 'ant' })).eq('An ant');
      expect(riscript.evaluate('[$a=$dog] $a.articlize().capitalize()', { dog: 'spot' })).eq('spot A spot');
      expect(riscript.evaluate('[$a=$dog] $a.articlize().capitalize()', { dog: 'abe' })).eq('abe An abe');
      expect(riscript.evaluate('[abe | abe].articlize().capitalize()', { dog: 'abe' })).eq('An abe');
      expect(riscript.evaluate('[abe | abe].capitalize().articlize()', { dog: 'abe' })).eq('an Abe');
      expect(riscript.evaluate('[abe | abe].capitalize.articlize', { dog: 'abe' })).eq('an Abe');
      expect(riscript.evaluate('[Abe Lincoln].articlize().capitalize()', { dog: 'abe' })).eq('An Abe Lincoln');
      expect(riscript.evaluate('<li>$start</li>\n$start=[$jrSr].capitalize()\n$jrSr=[junior|junior]')).eq('<li>Junior</li>');
    });

    it('Resolve functions on context props with transforms', function () {
      const s = '$player.name.toUpperCase().toLowerCase()';
      const gameState = { player: { name: 'Wing' } };
      const res = riscript.evaluate(s, gameState);
      expect(res).eq('wing');

      const ctx = { bar: { baz: 'result' } }; // property transform
      const rs = riscript.evaluate('$foo=$bar.baz\n$foo', ctx); // no parens
      expect(rs).eq('result');
    });

    it('Resolve properties of context symbols', function () {
      let s = '$player.name';
      let gameState = { player: { name: 'Wing' } };
      let res = riscript.evaluate(s, gameState);
      expect(res).eq('Wing');

      s = '$player.name has $time.secs() secs left.';
      gameState = {
        player: {
          name: 'Wing',
          color: 'blue',
          traits: []
        },
        time: {
          secs: () => new Date().getSeconds()
        }
      };
      res = riscript.evaluate(s, gameState);
      expect(/Wing has [0-9]{1,2} secs left\./.test(res)).true;
    });

    it('Resolve object properties', function () {
      const dog = { name: 'spot', color: 'white', hair: { color: 'white' } };
      expect(riscript.evaluate('It was a $dog.hair.color dog.', { dog })).eq('It was a white dog.');
      expect(riscript.evaluate('It was a $dog.color.toUpperCase() dog.', { dog })).eq('It was a WHITE dog.');
      expect(riscript.evaluate('It was a $dog.color.toUpperCase dog.', { dog })).eq('It was a WHITE dog.'); // no parens
    });

    it('Resolve member functions', function () {
      const dog = { name: 'Spot', getColor: () => 'red' };
      expect(riscript.evaluate('$dog.name was a $dog.getColor() dog.', { dog })).eq('Spot was a red dog.');
      expect(riscript.evaluate('$dog.name was a $dog.getColor dog.', { dog })).eq('Spot was a red dog.'); // no parens
    });

    it('Resolve transforms ending with punc', function () {
      expect(riscript.evaluate('[a | b].toUpperCase().')).to.be.oneOf([
        'A.',
        'B.'
      ]);
      expect(riscript.evaluate('The [boy | boy].toUpperCase()!')).eq('The BOY!');
      expect(riscript.evaluate('The $dog.toUpperCase()?', { dog: 'spot' })).eq('The SPOT?');
      expect(riscript.evaluate('The [boy | boy].toUpperCase().')).eq('The BOY.');

      const dog = { name: 'spot', color: 'white', hair: { color: 'white' } };
      expect(riscript.evaluate('It was $dog.hair.color.', { dog })).eq('It was white.');
      expect(riscript.evaluate('It was $dog.color.toUpperCase()!', { dog })).eq('It was WHITE!');

      const col = { getColor: () => 'red' };
      expect(riscript.evaluate('It was $dog.getColor()?', { dog: col })).eq('It was red?');
      expect(riscript.evaluate('It was $dog.getColor?', { dog: col })).eq('It was red?'); // no parens
      expect(riscript.evaluate('It was $dog.getColor.', { dog: col })).eq('It was red.'); // no parens

      const ctx = { user: { name: 'jen' } };
      expect(riscript.evaluate('That was $user.name!', ctx)).eq('That was jen!');
      expect(riscript.evaluate('That was $user.name.', ctx)).eq('That was jen.');
    });

    it('Resolve property transforms in context', function () {
      const ctx = { bar: { result: 'result' } }; // property transform
      const rs = riscript.evaluate('$foo=$bar.result\n$foo', ctx); // no parens
      expect(rs).eq('result');
    });

    it('Resolve transform props and method', function () {
      class TestClass {
        constructor() {
          this.prop = 'result';
        }
        getProp() {
          return this.prop;
        }
      }
      const ctx = { bar: new TestClass() };
      let res = riscript.evaluate('$foo=$bar.prop\n$foo', ctx);
      expect(res).eq('result');
      res = riscript.evaluate('$foo=$bar.getProp()\n$foo', ctx);
      expect(res).eq('result');
      res = riscript.evaluate('$foo=$bar.getProp\n$foo', ctx);
      expect(res).eq('result'); // no parens
    });

    it('Handle nested context', function () {
      const ctx = { bar: { color: 'blue' } };
      const res = riscript.evaluate('#foo=$bar.color\n$foo', ctx);
      expect(res).eq('blue');
    });
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

  describe('Entities', function () {
    it('Decode escaped characters', function () {

      expect(riscript.evaluate('The (word) has parens')).eq('The (word) has parens');
      expect(riscript.evaluate('The [word] has parens')).eq('The word has parens');
      expect(riscript.evaluate('The reference\\(1\\) has parens')).eq('The reference(1) has parens');
      expect(riscript.evaluate('The reference&lpar;1&rpar; has parens')).eq('The reference(1) has parens');
      expect(riscript.evaluate('The \\[word\\] has brackets', 0)).eq('The [word] has brackets');
      expect(riscript.evaluate('The &lsqb;word&rsqb; has brackets', 0)).eq('The [word] has brackets');
      expect(riscript.evaluate('The & is an ampersand')).eq('The & is an ampersand');
      expect(riscript.evaluate('The # is a hash')).eq('The # is a hash');
    });

    it('Decode escaped characters in choices', function () {
      expect(riscript.evaluate('The [\\(word\\) | \\(word\\)] has parens')).eq('The (word) has parens');

      expect(riscript.evaluate('The [\\[word\\] | \\[word\\]] has brackets')).eq('The [word] has brackets');
    });

    it('Decode emojis', function () {
      expect(riscript.evaluate('The 👍 is thumbs up')).eq('The 👍 is thumbs up');
    });

    it('Decode HTML entities', function () {
      // TODO: bad 'unresolved symbol' warnings
      expect(riscript.evaluate('The &#010; line break entity')).eq('The \n line break entity');
      expect(riscript.evaluate('The &num; symbol')).eq('The # symbol');
      expect(riscript.evaluate('The &#x00023; symbol')).eq('The # symbol');
      expect(riscript.evaluate('The &#35; symbol')).eq('The # symbol');
      expect(riscript.evaluate('The&num;symbol')).eq('The#symbol');

      ['&lsqb;', '&lbrack;', '&#x0005B;', '&#91;'].forEach((e) =>
        expect(riscript.evaluate('The ' + e + ' symbol')).eq('The [ symbol'));
      ['&rsqb;', '&rbrack;', '&#x0005D;', '&#93;'].forEach((e) =>
        expect(riscript.evaluate('The ' + e + ' symbol')).eq('The ] symbol'));

      ['&lpar;', '&#x28;', '&#x00028;', '&#40;'].forEach((e) =>
        expect(riscript.evaluate('The ' + e + ' symbol')).eq('The ( symbol'));
      ['&rpar;', '&#x29;', '&#x00029;', '&#41;'].forEach((e) =>
        expect(riscript.evaluate('The ' + e + ' symbol')).eq('The ) symbol'));
    });

    it('Allow basic punctuation', function () {
      // removed * while being used for weight, replace it if/as
      expect(riscript.evaluate("The -;:.!?'`", {})).eq("The -;:.!?'`");
      expect(riscript.evaluate('The -;:.!?"`', {})).eq('The -;:.!?"`');
      expect(riscript.evaluate(",.;:'?!-_`“”’‘…‐–—―<>", {})).eq(",.;:'?!-_`“”’‘…‐–—―<>");
      expect(riscript.evaluate(',.;:"?!-_`“”’‘…‐–—―<>', {})).eq(',.;:"?!-_`“”’‘…‐–—―<>');
      expect(riscript.evaluate('*%©', 0)).eq('*%©');
    });

    it('Allow spaces for formatting', function () {
      expect(riscript.evaluate('&nbsp;The dog&nbsp;', {})).eq(' The dog ');
      expect(riscript.evaluate('&nbsp; The dog&nbsp;', {})).eq('  The dog ');
      expect(riscript.evaluate('The &nbsp;dog', {})).eq('The  dog');
      expect(riscript.evaluate('The&nbsp; dog', {})).eq('The  dog');
      expect(riscript.evaluate('The &nbsp; dog', {})).eq('The   dog');
    });

    it('Show literal dollar signs', function () {
      let res;
      expect((res = riscript.evaluate('This is &#x00024;', {}))).eq('This is $');
      expect((res = riscript.evaluate('This is &#36;', {}))).eq('This is $');
    });

    it('Allow HTML entities in context', function () { // not sure about this
      let res;
      expect((res = riscript.evaluate('This is $dollar.', { dollar: '&#36;' }))).eq('This is $.');
    });

    it('Recognize continuations', function () {
      expect(riscript.evaluate('~\n', {})).eq('');
      expect(riscript.evaluate('aa~\nbb', {})).eq('aabb');
      expect(riscript.evaluate('aa~\n~\n[bb].uc', {})).eq('aaBB');
      expect(riscript.evaluate('aa~\n bb', {})).eq('aa bb');
      expect(riscript.evaluate('aa ~\nbb', {})).eq('aa bb');
      expect(riscript.evaluate('aa ~\n bb', {})).eq('aa  bb');
    });

    it('Recognize continuations orig', function () {
      expect(riscript.evaluate('aa\
bb', {})).eq('aabb');
      expect(riscript.evaluate('aa\
[bb].uc', {})).eq('aaBB');
      expect(riscript.evaluate('aa\
 bb', {})).eq('aa bb');
      expect(riscript.evaluate('aa \
bb', {})).eq('aa bb');
      expect(riscript.evaluate('aa \
 bb', {})).eq('aa  bb');
    });

    it('Ignore line comments ', function () {
      expect(riscript.evaluate('// $foo=a')).eq('');
      expect(riscript.evaluate('// hello')).eq('');
      expect(riscript.evaluate('//hello')).eq('');
      expect(riscript.evaluate('//()')).eq('');
      expect(riscript.evaluate('//{}')).eq('');
      expect(riscript.evaluate('//$')).eq('');
      expect(riscript.evaluate('hello\n//hello', 0)).eq('hello');
      expect(riscript.evaluate('//hello\nhello', 0)).eq('hello');
      expect(riscript.evaluate('//hello\r\nhello', 0)).eq('hello');
      expect(riscript.evaluate('//hello\nhello\n//hello', 0)).eq('hello');
      expect(riscript.evaluate('//hello\r\nhello\r\n//hello', 0)).eq('hello');
    });

    it('Ignore block comments ', function () {
      expect(riscript.evaluate('/* hello */')).eq('');
      expect(riscript.evaluate('/* $foo=a */')).eq('');
      expect(riscript.evaluate('a /* $foo=a */b', 0)).eq('a b');
      expect(riscript.evaluate('a/* $foo=a */ b')).eq('a b');
      expect(riscript.evaluate('a/* $foo=a */b')).eq('ab');
      expect(riscript.evaluate('a/* $foo=a */b/* $foo=a */c')).eq('abc');
    });
  });

  describe('Helpers', function () {
    it('#stringHash', function () {
      expect(Util.stringHash('revenue')).eq('1099842588');
    });

    it('#preParseLines', function () {
      // handle new weights
      expect(riscript._preParse('a (1) ')).eq('a ^1^ ');
      expect(riscript._preParse('a (foo) ')).eq('a (foo) ');

      expect(riscript._preParse('foo=a')).eq('foo=a');
      expect(riscript._preParse('$foo=a')).eq('{$foo=a}');
      expect(riscript._preParse('$foo=a\nb')).eq('{$foo=a}b');
      expect(riscript._preParse('hello\n$foo=a')).eq('hello\n{$foo=a}');

      expect(riscript._preParse('$foo=a[b\nc]d\ne')).eq('{$foo=a[b\nc]d}e');
      expect(riscript._preParse('$foo=[cat\ndog]\n$foo')).eq('{$foo=[cat\ndog]}$foo');
      expect(riscript._preParse('$foo=a\nb\n$foo')).eq('{$foo=a}b\n$foo');
      expect(riscript._preParse('$foo=[\n]\n$foo')).eq('{$foo=[\n]}$foo');
      expect(riscript._preParse('$foo=a[\n]b\n$foo')).eq('{$foo=a[\n]b}$foo');
      expect(riscript._preParse('$foo=[cat\ndog].uc()\n$foo')).eq('{$foo=[cat\ndog].uc()}$foo');

      expect(riscript._preParse('[ @{a: {}} hello]\n$a=2')).eq('[ @{a: {}} hello]\n{$a=2}');

      expect(riscript._preParse('[ @{a: {}} hello]\n$a=2')).eq('[ @{a: {}} hello]\n{$a=2}');

      let res = riscript._preParse('Some [RiTa](https://rednoise.org/rita?a=b&c=k) code');
      let expected = 'Some &lsqb;RiTa&rsqb;&lpar;https:&sol;&sol;rednoise.org&sol;rita?a=b&c=k&rpar; code';
      expect(res).eq(expected);
    });


    it('#parseJSOLregex', function () {
      // SIMPLE REGEX
      let res = riscript.parseJSOL('{a: /^p/}');
      expect(Object.keys(res)[0]).eq('a');
      expect(regexEquals(Object.values(res)[0], /^p/));

      // REGEX with flags
      res = riscript.parseJSOL('{a: /^p/g}');
      expect(Object.keys(res)[0]).eq('a');
      expect(regexEquals(Object.values(res)[0], /^p/g));
    });

    it('#parseJSOLstrings', function () {
      // SIMPLE STRING
      expect(JSON.stringify(riscript.parseJSOL("{a: 'hello'}"))).eq(JSON.stringify({ a: 'hello' }));
      expect(JSON.stringify(riscript.parseJSOL('{a: "hello"}'))).eq(JSON.stringify({ a: 'hello' }));
    });

    it('#parseJSOL', function () {
      // SIMPLE EQ
      expect(JSON.stringify(riscript.parseJSOL('{a: 3}'))).eq(JSON.stringify({ a: 3 }));
      expect(JSON.stringify(riscript.parseJSOL('{$a: 3}'))).eq(JSON.stringify({ $a: 3 }));
      expect(JSON.stringify(riscript.parseJSOL('{a: "3"}'))).eq(JSON.stringify({ a: '3' }));
      expect(JSON.stringify(riscript.parseJSOL('{$a: "3"}'))).eq(JSON.stringify({ $a: '3' }));
      expect(JSON.stringify(riscript.parseJSOL("{a: '3'}"))).eq(JSON.stringify({ a: '3' }));
      expect(JSON.stringify(riscript.parseJSOL("{$a: '3'}"))).eq(JSON.stringify({ $a: '3' }));

      // SIMPLE COMP
      expect(JSON.stringify(riscript.parseJSOL('{$a: {$gt: 3}}'))).eq(JSON.stringify({ $a: { $gt: 3 } }));

      // AND QUERY
      expect(JSON.stringify(riscript.parseJSOL('{a: {$gt:25, $lt:32}}'))).eq(JSON.stringify({ a: { $gt: 25, $lt: 32 } }));

      // OR QUERY
      expect(JSON.stringify(riscript.parseJSOL('{$or: [ {a: {$gt: 30}}, {a: {$lt: 20}}]}')))
        .eq(JSON.stringify({ $or: [{ a: { $gt: 30 } }, { a: { $lt: 20 } }] }));
    });

    it('#isParseable', function () {
      expect(riscript.isParseable('(')).eq(false);
      expect(riscript.isParseable('[')).eq(true);
      expect(riscript.isParseable('[A | B]')).eq(true);
      expect(riscript.isParseable('$hello')).eq(true);
      expect(riscript.isParseable('$b')).eq(true);
      expect(riscript.isParseable('#b')).eq(true);
      expect(riscript.isParseable('[$b]')).eq(true);
      expect(riscript.isParseable('[&nbsp;]')).eq(true);

      expect(riscript.isParseable('Hello')).eq(false);
      expect(riscript.isParseable('&181;')).eq(false);
      expect(riscript.isParseable('&b')).eq(false);
      expect(riscript.isParseable('&&b')).eq(false);
      expect(riscript.isParseable('&nbsp;')).eq(false);

      // expect(riscript.isParseable("a.b")).eq(true);
      // expect(riscript.isParseable("a.transform()")).eq(true);
    });
  });

  function regexEquals(x, y) {
    return (
      x instanceof RegExp &&
      y instanceof RegExp &&
      x.source === y.source &&
      x.global === y.global &&
      x.ignoreCase === y.ignoreCase &&
      x.multiline === y.multiline
    );
  }
});

function isNum(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
