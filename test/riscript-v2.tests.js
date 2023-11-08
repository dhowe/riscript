import { expect } from 'chai';

import RiScript from './index.js';

describe('RiScript.v2', function () {
  /* eslint-disable no-unused-vars */
  const TRACE = { trace: 1 };
  const LTR = 0;
  const T = TRACE;
  const PL = { preserveLookups: 1 };
  const TRX = { trace: 1, traceTx: 1 };
  const TPL = { preserveLookups: 1, trace: 1 };
  /* eslint-enable no-unused-vars */

  let riscript, RiScriptVisitor, IfRiTa;

  before(function () {
    riscript = new RiScript({ compatibility: 2 });
    RiScriptVisitor = RiScript.Visitor;
    IfRiTa = typeof riscript.RiTa.VERSION === 'string';
  });

  describe('Assignment.v2', function () {
    it('Should end single assignments on line break', function () {
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

      expect(riscript.evaluate('$foo=(a | a)\n$foo', 0, PL)).eq('a');
      // console.log(riscript.visitor.dynamics);
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(riscript.evaluate('$foo=(hi | hi)\n$foo there', 0, PL)).eq(
        'hi there'
      );
      expect(riscript.visitor.dynamics.foo()).eq('hi');
    });

    it('Should parse silent assignments', function () {
      let ctx = {};
      expect(riscript.evaluate('{$foo=a}b', ctx, PL)).eq('b');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=(a) b}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a b');

      ctx = {};
      expect(riscript.evaluate('{$foo=(a | a)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=ab}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab');

      ctx = {};
      expect(riscript.evaluate('{$foo=ab bc}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=(ab) (bc)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      expect(riscript.evaluate('{$foo=(ab) (bc)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=(ab bc)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('ab bc');

      ctx = {};
      expect(riscript.evaluate('{$foo=(a | a) (b | b)}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a b');

      ctx = {};
      expect(riscript.evaluate('{$foo=((a | a) | (a | a))}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      ctx = {};
      expect(riscript.evaluate('{$foo=()}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('');

      ctx = {};
      expect(riscript.evaluate('{$foo=()}', ctx, PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('');

      expect(riscript.evaluate('{$foo=(a | a)}', (ctx = {}), PL)).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('a');

      expect(
        riscript.evaluate('{$foo=The boy walked his dog}', (ctx = {}), PL)
      ).eq('');
      expect(riscript.visitor.dynamics.foo()).eq('The boy walked his dog');
    });

    it('Should resolve prior assignments', function () {
      expect(riscript.evaluate('$foo=dog\n$bar=$foo\n$baz=$foo\n$baz', 0)).eq(
        'dog'
      );
      expect(riscript.evaluate('$foo=hi\n$foo there')).eq('hi there');
      expect(riscript.evaluate('$foo=a\n$foo')).eq('a');
    });
  });

  describe('Evaluation.v2', function () {
    it('Should handle abbreviations.v2', function () {
      expect(riscript.evaluate('The C.D failed', {})).eq('The C.D failed');
      expect(
        riscript.evaluate('The $C.D failed', {
          C: 'C',
          D: (s) => s.toLowerCase()
        })
      ).eq('The c failed');
    });

    it('Should resolve expressions.v2', function () {
      expect(riscript.evaluate('foo')).eq('foo');
      expect(riscript.evaluate('(foo)', {})).eq('foo');
      expect(riscript.evaluate('foo!', {})).eq('foo!');
      expect(riscript.evaluate('!foo', {})).eq('!foo');
      expect(riscript.evaluate('foo.', {})).eq('foo.');
      expect(riscript.evaluate('"foo"', {})).eq('"foo"');
      expect(riscript.evaluate("'foo'", {})).eq("'foo'");
      expect(riscript.evaluate('$a=hello\n', 0)).eq('\n');
      expect(riscript.evaluate('hello\n', 0)).eq('hello\n');
      expect(riscript.evaluate('*%©\n', 0)).eq('*%©\n');
    });

    it('Should resolve choices', function () {
      expect(riscript.evaluate('(a)')).eq('a');
      expect(riscript.evaluate('(a | a)')).eq('a');
      expect(riscript.evaluate('(a | )')).to.be.oneOf(['a', '']);
      expect(riscript.evaluate('(a | b)')).to.be.oneOf(['a', 'b']);
      expect(riscript.evaluate('(a | b | c)'), {}).to.be.oneOf(['a', 'b', 'c']);
      expect(riscript.evaluate('(a | (b | c) | d)')).to.be.oneOf([
        'a',
        'b',
        'c',
        'd'
      ]);
      expect(
        riscript.evaluate('{$names=(a|b|c|d|e)}$names $names', {})
      ).to.match(/[abcde] [abcde]/);
    });

    it('Should resolve multiword choices', function () {
      expect(riscript.evaluate('(A B | A B)')).eq('A B');
    });

    it('Should resolve transformed choices', function () {
      expect(riscript.evaluate('(A B).toLowerCase()')).eq('a b');
      expect(riscript.evaluate('(A B | A B).toLowerCase()')).eq('a b');
      IfRiTa &&
        expect(riscript.evaluate('(A B | A B).articlize()')).eq('an A B');
    });

    it('Should resolve simple statics', function () {
      expect(riscript.evaluate('{#foo=bar}baz', {})).eq('baz');
      expect(riscript.evaluate('{#foo=bar}$foo', {})).eq('bar');
      expect(riscript.evaluate('(#foo=bar)\nbaz', {})).eq('bar\nbaz');
      expect(riscript.evaluate('{#foo=bar}baz$foo', {})).eq('bazbar');
      expect(riscript.evaluate('{#foo=bar}($foo)baz', {})).eq('barbaz');
      expect(riscript.evaluate('{#foo=bar}$foo baz $foo', {})).eq(
        'bar baz bar'
      );
      expect(riscript.evaluate('{#foo=bar}baz\n$foo $foo', {})).eq(
        'baz\nbar bar'
      );

      let failed = false;
      for (let i = 0; i < 10; i++) {
        // #: should always match (static)
        const res = riscript.evaluate('{#foo=(a|b|c|d)}$foo $foo $foo', {});
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

    it('Should resolve statics', function () {
      let res = riscript.evaluate('{#bar=(man | boy)}$bar'); // silent
      expect(res === 'man' || res === 'boy').true;

      res = riscript.evaluate('#bar=(man | boy)\n$foo=$bar:$bar\n$foo', {});
      expect(res === 'man:man' || res === 'boy:boy').true;
    });

    it('Should resolve predefined statics', function () {
      let res, visitor;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { b: 'a (b | c | d) e' };
      res = riscript._evaluate({ input: '#b', visitor });
      expect(/a [bdc] e/.test(res)).true;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: '(man | boy)' };
      res = riscript._evaluate({ input: '#bar:#bar', visitor, trace: 0 });
      expect(res === 'man:man' || res === 'boy:boy').true;

      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: '($man | $boy)' };
      visitor.context = { man: '(MAN|man)', boy: '(BOY|boy)' };
      res = riscript._evaluate({ input: '#bar:#bar', visitor, trace: 0 });
      expect(
        res === 'MAN:MAN' ||
        res === 'BOY:BOY' ||
        res === 'man:man' ||
        res === 'boy:boy'
      ).true;
    });

    it('Should resolve expressions with line-breaks ', function () {
      expect(riscript.evaluate('$foo=bar\nbaz', {})).eq('baz');

      expect(riscript.evaluate('foo\nbar', {})).eq('foo\nbar');
      expect(riscript.evaluate('$foo=bar\nbaz\n$foo', {})).eq('baz\nbar');
      expect(riscript.evaluate('#foo=(a|b|c)\n$foo is $foo')).to.be.oneOf([
        'a is a',
        'b is b',
        'c is c'
      ]);
      expect(riscript.evaluate('<em>foo</em>', {})).eq('<em>foo</em>');
      expect(riscript.evaluate('(a|a)', { a: 'a', b: 'b' })).eq('a');

      const str =
        'Now in one year\n     A book published\n          And plumbing —';
      expect(riscript.evaluate(str)).eq(str);

      expect(riscript.evaluate('a   b', 0)).eq('a   b');
      expect(riscript.evaluate('a\tb', 0)).eq('a\tb');

      expect(
        /[abcde] [abcde]/.test(
          riscript.evaluate('$names=(a|b|c|d|e)\n$names $names')
        )
      ).true;

      expect(riscript.evaluate('foo.bar', {}, { silent: 1 })).eq('foo.bar'); // KNOWN ISSUE
    });

    it('Should resolve recursive expressions', function () {
      let ctx, expr;
      ctx = { a: 'a' };
      expr = '(a|$a)';
      expect(riscript.evaluate(expr, ctx)).eq('a');
      ctx = { a: '$b', b: '(c | c)' };
      expr = '$a';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '(c | c)' };
      expr = '$k = $a\n$k';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '(c | c)' };
      expr = '$s = $a\n$a = $b\n$c = $d\n$d = c\n$s';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { s: '$a', a: '$b', b: '$c', c: '$d', d: 'c' };
      expect(riscript.evaluate('$s', ctx)).eq('c');
    });

    it('Should resolve recursive dynamics', function () {
      let ctx, expr;

      ctx = { a: '$b', b: '(c | c)' };
      expr = '#k=$a\n$k';
      expect(riscript.evaluate(expr, ctx)).eq('c');

      ctx = { a: '$b', b: '(c | c)' };
      expr = '#s = $a\n#a = $b\n#c = $d\n#d = c\n$s';
      expect(riscript.evaluate(expr, ctx)).eq('c');
    });
  });

  describe('Sequences.v2', function () {
    it('Should support norepeat choice transforms', function () {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate('$names=(a|b)\n$names $names.norepeat()');
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        // console.log(i + ") " + parts[0] + " :: " + parts[1]);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Should support single norepeat choices ', function () {
      // FIX FOR rita#157
      let res;
      for (let i = 0; i < 10; i++) {
        res = riscript.evaluate('$b=a(b|c|d)e\n$b $b.nr');
        // console.log(i,res);
        expect(/a[bdc]e a[bdc]e/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Should support single norepeat choices in context', function () {
      let res;

      for (let i = 0; i < 10; i++) {
        res = riscript.evaluate('$b $b.nr', { $b: '(a(b | c | d)e)' });
        // console.log(i, res);
        expect(/a[bcd]e a[bcd]e/.test(res)).true;
        const parts = res.split(' ');
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });

    it('Should support norepeat symbol transforms', function () {
      let fail = false;
      const count = 10;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate('$rule=(a|b|c|d|e)\n$rule.nr $rule.nr');
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

    it('Should throw on norepeat statics', function () {
      // TODO: (problematic)
      expect(() => riscript.evaluate('#a=(a|b)\n#a #a.nr', 0)).to.throw();
    });

    it('Should throw on dynamics called as statics', function () {
      // TODO: (problematic)
      expect(() => riscript.evaluate('{$foo=bar}#foo', 0)).to.throw();
    });
  });

  describe('Choice.v2', function () {
    it('Should throw on bad choices', function () {
      expect(() => riscript.evaluate('|')).to.throw();
      expect(() => riscript.evaluate('a |')).to.throw();
      expect(() => riscript.evaluate('a | b')).to.throw();
      expect(() => riscript.evaluate('a | b | c')).to.throw();
      expect(() => riscript.evaluate('(a | b) | c')).to.throw();
    });

    it('Should resolve choices in context', function () {
      const res = riscript.evaluate('$bar:$bar', { bar: '(man | boy)' });
      // console.log(res);
      expect(/(man|boy):(man|boy)/.test(res)).true;
    });

    IfRiTa && it('Should repeat choices with randomSeed', function () {
      const seed = Math.random() * Number.MAX_SAFE_INTEGER;
      const script = '$a=(1|2|3|4|5|6)\n$a';
      RiScript.RiTa.randomSeed(seed);
      let b;
      const a = riscript.evaluate(script);
      for (let i = 0; i < 5; i++) {
        RiScript.RiTa.randomSeed(seed);
        b = riscript.evaluate(script);
        // console.log(i + ') ', a, b);
        expect(a).eq(b);
      }
    });

    it('Should select non-weighted choices evenly', function () {
      const map = {};
      for (let i = 0; i < 1000; i++) {
        const res = riscript.evaluate('(quite|)');
        if (!(res in map)) map[res] = 0;
        map[res]++;
      }
      expect(map.quite).greaterThan(400);
      expect(map['']).greaterThan(400);
    });

    it('Should resolve choices', function () {
      expect(riscript.evaluate('(|)')).eq('');
      expect(riscript.evaluate('(a)')).eq('a');
      expect(riscript.evaluate('(a | a)', 0)).eq('a');

      expect(riscript.evaluate('(a | )')).to.be.oneOf(['a', '']);

      expect(riscript.evaluate('(a | b)')).to.be.oneOf(['a', 'b']);

      expect(riscript.evaluate('(a | b | c)'), {}).to.be.oneOf(['a', 'b', 'c']);
      expect(riscript.evaluate('(a | (b | c) | d)')).to.be.oneOf([
        'a',
        'b',
        'c',
        'd'
      ]);

      expect(riscript.evaluate('$names=(a|b|c|d|e)\n$names $names', 0)).match(
        /[abcde] [abcde]/
      );

      expect(riscript.evaluate('not (quite|) far enough')).to.be.oneOf([
        'not far enough',
        'not quite far enough'
      ]);
    });

    it('Should resolve multiword choices', function () {
      const silent = riscript.RiTa.SILENCE_LTS;
      riscript.RiTa.SILENCE_LTS = true;
      expect(riscript.evaluate('(A B | A B)')).eq('A B');
      expect(riscript.evaluate('(A B).toLowerCase()')).eq('a b');
      expect(riscript.evaluate('(A B | A B).toLowerCase()', 0)).eq('a b');
      IfRiTa && expect(riscript.evaluate('(A B | A B).articlize()', 0)).eq('an A B');
      riscript.RiTa.SILENCE_LTS = silent;
    });

    it('Should resolve choices in expressions', function () {
      expect(riscript.evaluate('x (a | a | a) x')).eq('x a x');
      expect(riscript.evaluate('x (a | a | a)')).eq('x a');
      expect(riscript.evaluate('x (a | a | a)x')).eq('x ax');
      expect(riscript.evaluate('x(a | a | a) x')).eq('xa x');
      expect(riscript.evaluate('x(a | a | a)x')).eq('xax');
      expect(riscript.evaluate('x (a | a | a) (b | b | b) x')).eq('x a b x');
      expect(riscript.evaluate('x (a | a | a)(b | b | b) x')).eq('x ab x');
      expect(riscript.evaluate('x (a | a) (b | b) x')).eq('x a b x');
      expect(riscript.evaluate('(a|b)')).matches(/a|b/);
      expect(riscript.evaluate('(a|)')).matches(/a?/);
      expect(riscript.evaluate('(a|a)')).eq('a');
      expect(riscript.evaluate('(|a|)')).to.be.oneOf(['a', '']);
      expect(
        riscript.evaluate('This is &lpar;a parenthesed&rpar; expression')
      ).eq('This is (a parenthesed) expression');

      expect(riscript.evaluate('This is \\(a parenthesed\\) expression')).eq(
        'This is (a parenthesed) expression'
      );
      expect(
        riscript.evaluate(
          '((mountain | mountain) village | (evening | evening) sunlight | (winter | winter) flower | (star | star)light above)'
        )
      ).to.be.oneOf([
        'mountain village',
        'evening sunlight',
        'winter flower',
        'starlight above'
      ]);
    });

    it('Should resolve weighted choices', function () {
      expect(riscript.evaluate('( a [2] )', {})).eq('a');
      expect(riscript.evaluate('([2] |[3])', {})).eq('');
      expect(riscript.evaluate('(a | b [2] |[3])', {})).to.be.oneOf([
        'a',
        'b',
        ''
      ]);
      expect(riscript.evaluate('(a | b[2] |[3])', {})).to.be.oneOf([
        'a',
        'b',
        ''
      ]);
      expect(riscript.evaluate('( a [2] | a [3] )', {})).eq('a');
      expect(riscript.evaluate('( a [2] | a [3 ] )', {})).eq('a');

      const result = { b: 0, a: 0 };
      for (let i = 0; i < 20; i++) {
        const ans = riscript.evaluate('(a | b [3])');
        // console.log(i, ans);
        if (!/^[ab]$/.test(ans)) throw Error('invalid: ' + ans);
        result[ans]++;
      }
      expect(result.b).gt(result.a);
    });
  });

  describe('Entities.v2', function () {
    it('Should decode escaped characters.v2', function () {
      // TODO: intermittent errors ???

      expect(riscript.evaluate('The (word) has parens')).eq(
        'The word has parens'
      );

      expect(riscript.evaluate('The reference\\[1\\] has parens')).eq(
        'The reference[1] has parens'
      );

      expect(riscript.evaluate('The \\[word\\] has brackets', 0)).eq(
        'The [word] has brackets'
      );

      expect(riscript.evaluate('The \\(word\\) has brackets', 0)).eq(
        'The (word) has brackets'
      );
    });

    it('Should decode escaped characters in choices.v2', function () {
      expect(riscript.evaluate('The (\\(word\\) | \\(word\\)) has parens')).eq(
        'The (word) has parens'
      );

      expect(
        riscript.evaluate('The (\\[word\\] | \\[word\\]) has brackets')
      ).eq('The [word] has brackets');
    });
  });
});
