import { expect } from "chai";
import { RiScript } from "./index.js";
const version = RiScript.VERSION;
const title = `RiScript.v3 ${isNum(version) ? `v${version}` : "[DEV]"}`;
describe(title, function() {
  const TRACE = { trace: 1 };
  const LTR = 0;
  const T = TRACE;
  const PL = { preserveLookups: 1 };
  const TRX = { trace: 1, traceTx: 1 };
  const TRL = { trace: 1, traceLex: 1 };
  const TPL = { preserveLookups: 1, trace: 1 };
  let riscript, IfRiTa, RiScriptVisitor, Util;
  before(function() {
    riscript = new RiScript();
    Util = RiScript.Util;
    RiScriptVisitor = RiScript.Visitor;
    IfRiTa = typeof riscript.RiTa.VERSION === "string";
    RiScript.RiTaWarnings.silent = !IfRiTa;
  });
  LTR && describe("OneOff", function() {
    it("Be a single problematic test", function() {
    });
  });
  LTR && describe("LexOnly", function() {
    it("Handles lexing", function() {
      let opts;
      riscript.lex(opts = { input: "$a()", traceLex: 1 });
      opts.tokens.forEach((t) => console.log(t.tokenType.name + ': "' + t.image + '"'));
      expect(opts.tokens).eq("");
    });
  });
  describe("Markdown", function() {
    it("Handles basic markdown", function() {
      let test = "Some *italic* and **bold** and _other_ markdown";
      expect(riscript.evaluate(test)).eq(test);
      let test2 = "1. list 1\n2. list 2\n3. list 3";
      expect(riscript.evaluate(test2)).eq(test2);
    });
    it("Handles markdown headers", function() {
      const res = riscript.evaluate("### Header");
      expect(res).eq("### Header");
    });
    it("Handles markdown links", function() {
      let res;
      res = riscript.evaluate("Some [RiTa](https://rednoise.org/rita) code");
      expect(res).eq("Some [RiTa](https://rednoise.org/rita) code");
      res = riscript.evaluate("Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code");
      expect(res).eq("Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code");
      res = riscript.evaluate("Some [RiScript](/@dhowe/riscript) code");
      expect(res).eq("Some [RiScript](/@dhowe/riscript) code");
      res = riscript.evaluate("Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code with [RiScript](/@dhowe/riscript) links");
      expect(res).eq("Some [RiTa+](https://rednoise.org/rita?a=b&c=k) code with [RiScript](/@dhowe/riscript) links");
    });
    it("Handles formatted markdown", function() {
      let input = `### A Title 
      Some RiScript code
        that we can [format|format|format]
           with *[inline | inline]* Markdown
             and rerun [once per | once per] second
               [using|using|using] the **[pulse].qq** function below`;
      let expected = "### A Title \n      Some RiScript code\n        that we can format\n           with *inline* Markdown\n             and rerun once per second\n               using the **\u201Cpulse\u201D** function below";
      const res = riscript.evaluate(input);
      expect(res).eq(expected);
    });
  });
  describe("Sequences", function() {
    it("Supports norepeat choice transforms", function() {
      const count = 5;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate("$names=[a|b]\n$names $names.norepeat()");
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(" ");
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });
    it("Supports single norepeat choices ", function() {
      let res;
      for (let i = 0; i < 10; i++) {
        res = riscript.evaluate("$b=a[b|c|d]e\n$b $b.nr");
        expect(/a[bdc]e a[bdc]e/.test(res)).true;
        const parts = res.split(" ");
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });
    it("Supports single norepeat choices in context", function() {
      let res;
      for (let i = 0; i < 5; i++) {
        res = riscript.evaluate("$b=[a[b | c | d]e]\n$b $b.nr");
        expect(/a[bcd]e a[bcd]e/.test(res)).true;
        const parts = res.split(" ");
        expect(parts.length).eq(2);
        expect(parts[0], parts[1]).not.eq;
      }
    });
    it("Supports norepeat symbol transforms", function() {
      let fail = false;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const res = riscript.evaluate("$rule=[a|b|c|d|e]\n$rule.nr $rule.nr");
        expect(/^[a-e] [a-e]$/.test(res)).true;
        const parts = res.split(" ");
        expect(parts.length).eq(2);
        if (parts[0] === parts[1]) {
          fail = true;
          break;
        }
      }
      expect(fail).false;
    });
    it("Throws on norepeat statics", function() {
      expect(() => riscript.evaluate("#a=[a|b]\n$a $a.nr", 0)).to.throw();
      expect(() => riscript.evaluate("#a=[a|b]\n#a #a.nr", 0)).to.throw();
    });
    it("Throws on dynamics called as statics", function() {
      expect(() => riscript.evaluate("{$foo=bar}#foo", 0)).to.throw();
    });
    it("Throws on norepeats in context", function() {
      expect(() => riscript.evaluate("$foo $foo.nr", { foo: "[a|b]" })).to.throw();
    });
  });
  describe("Gates", function() {
    it("Throws on bad gates", function() {
      expect(() => riscript.evaluate("$a=ok\n[ @{$a: ok} hello]", 0)).to.throw();
      expect(() => riscript.evaluate("[@{} [a|a] || [b|b] ]")).to.throw();
    });
    it("Handles transforms in gate operands", function() {
      let ctx, res;
      ctx = { getHours: () => (/* @__PURE__ */ new Date()).getHours() };
      res = riscript.evaluate("[ @{ $getHours(): { @lt: 12 } } morning || evening]", ctx);
      expect(res).eq((/* @__PURE__ */ new Date()).getHours() < 12 ? "morning" : "evening");
    });
    it("Handles time-based gates", function() {
      let ctx = { getHours: () => (/* @__PURE__ */ new Date()).getHours() };
      let res = riscript.evaluate("$hours=$getHours()\n[ @{ $hours: {@lt: 12} } morning || evening]", ctx);
      expect(res).eq((/* @__PURE__ */ new Date()).getHours() < 12 ? "morning" : "evening");
    });
    it("Handles new-style gates", function() {
      expect(riscript.evaluate(`[ @{ $a: { @exists: true }} hello]`, { b: 2 })).eq("");
      expect(riscript.evaluate(`[ @{ $a: { @exists: true }} hello]`, { a: 2 })).eq("hello");
    });
    it("Handles exists gates", function() {
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} hello][ @{ $a: { @exists: true }} hello]")).eq("");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} user]", { a: "apogee" })).eq("user");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} user]", { b: "apogee" })).eq("");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} user]", { a: "apogreed" })).eq("user");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} &lt;]", { a: "apogee" })).eq("<");
      expect(riscript.evaluate("$a=apogee\n[ @{ $a: { @exists: true }} dynamic]", 0)).eq("dynamic");
      expect(riscript.evaluate("$b=apogee\n[ @{ $a: { @exists: true }} dynamic]")).eq("");
      expect(riscript.evaluate("{$b=apogee}[ @{ $a: { @exists: true }} dynamic]")).eq("");
      expect(riscript.evaluate("[$b=apogee][ @{ $a: { @exists: true }} dynamic]")).eq("apogee");
      expect(riscript.evaluate("[$a=apogee] [ @{ $a: { @exists: true }} dynamic]")).eq("apogee dynamic");
      expect(riscript.evaluate("[$a=apogee]\n[ @{ $a: { @exists: true }} dynamic]")).eq("apogee\ndynamic");
      expect(riscript.evaluate("#a=apogee\n[ @{ $a: { @exists: true }} static]")).eq("static");
      expect(riscript.evaluate("#b=apogee\n[ @{ $a: { @exists: true }} static]")).eq("");
      expect(riscript.evaluate("{#b=apogee}[ @{ $a: { @exists: true }} static]")).eq("");
      expect(riscript.evaluate("[#b=apogee][ @{ $a: { @exists: true }} static]")).eq("apogee");
      expect(riscript.evaluate("[#a=apogee] [ @{ $a: { @exists: true }} static]")).eq("apogee static");
      expect(riscript.evaluate("[#a=apogee]\n[ @{ $a: { @exists: true }} static]")).eq("apogee\nstatic");
    });
    it("Handles matching gates", function() {
      expect(riscript.evaluate("[ @{ $a: /^p/ } hello]", { a: "apogee" })).eq("");
      expect(riscript.evaluate("[ @{ $a: /^p/ } hello]", { a: "puffer" })).eq("hello");
      expect(riscript.evaluate("[ @{ $a: /^p/ } $a]", { a: "pogue" })).eq("pogue");
      expect(riscript.evaluate("[ @{ $a: /^p/g } hello]", { a: "apogee" })).eq("");
      expect(riscript.evaluate("[ @{ $a: /^p/g } hello]", { a: "puffer" })).eq("hello");
      expect(riscript.evaluate("[ @{ $a: /^p/g } $a]", { a: "pogue" })).eq("pogue");
    });
    it("Handles nested gates", function() {
      let res;
      res = riscript.evaluate("$x=2\n$y=3\n[ @{$x:1} [a] || [@{$y:3} b ]]", 0);
      expect(res).eq("b");
      res = riscript.evaluate("$x=2\n$y=4\n[ @{$x:1} [a] || [@{$y:3} b || c ]]", 0);
      expect(res).eq("c");
    });
    it("Handles else gates", function() {
      let res;
      res = riscript.evaluate("$x=2\n[@{$x:2} [a] || [b]]", 0);
      expect(res).eq("a");
      res = riscript.evaluate("$x=2\n[@{$x:2} [a|a] || [b|b]]", 0);
      expect(res).eq("a");
      res = riscript.evaluate("$x=1\n[@{$x:2} [a|a] || [b|b]]", 0);
      expect(res).eq("b");
      res = riscript.evaluate("$x=1\n[@{$x:1}a||b]", 0);
      expect(res).eq("a");
      res = riscript.evaluate("$x=2\n[@{$x:1}a||b]", 0);
      expect(res).eq("b");
      res = riscript.evaluate("[@{$x:3}a||b]", { x: 3 });
      expect(res).eq("a");
      res = riscript.evaluate("[@{$x:4}a||b]", { x: 3 });
      expect(res).eq("b");
      res = riscript.evaluate("[@{$x:4} a | a || b ]", { x: 3 });
      expect(res).eq("b");
      res = riscript.evaluate("[@{$x:4} a | a || [b | b(5)] ]", { x: 3 });
      expect(res).eq("b");
      res = riscript.evaluate("[a||b]", 0);
      expect(res).eq("a");
    });
    it("Handles deferred else gates", function() {
      let res;
      res = riscript.evaluate("[@{$a:1}a||b]\n$a=1", 0);
      expect(res).eq("a");
      res = riscript.evaluate("[@{$a:2}a||b]\n$a=1", 0);
      expect(res).eq("b");
      res = riscript.evaluate("[@{$a:2}[a]||[b]]\n$a=1", 0);
      expect(res).eq("b");
      res = riscript.evaluate("[@{$a:2}[a|a|a]||[b]]\n$a=2", 0);
      expect(res).eq("a");
      res = riscript.evaluate("[ @{$a:2} [accept|accept] || [reject|reject] ]\n$a=1", 0);
      expect(res).eq("reject");
      res = riscript.evaluate("[@{$x:4} a | a || b | b ]", { x: 3 });
      expect(res).eq("b");
      res = riscript.evaluate("[@{$a:2}a||b]", 0);
      expect(res).eq("b");
    });
    it("Handles equality gates", function() {
      expect(riscript.evaluate('$a=3\n[ @{$a: "3"} hello]', 0)).eq("hello");
      expect(riscript.evaluate("$a=3\n[ @{$a: '3'} hello]", 0)).eq("hello");
      expect(riscript.evaluate("$a=2\n[ @{$a: 3} hello]", 0)).eq("");
      expect(riscript.evaluate("$a=3\n[ @{$a: 3} hello]", 0)).eq("hello");
      expect(riscript.evaluate("$a=3\n[ @{$a: 4} hello]", 0)).eq("");
      expect(riscript.evaluate('$a=ok\n[ @{$a: "ok"} hello]', 0)).eq("hello");
      expect(riscript.evaluate('$a=notok\n[ @{$a: "ok"} hello]', 0)).eq("");
      expect(riscript.evaluate("$a=ok\n[ @{$a: 'ok'} hello]", 0)).eq("hello");
      expect(riscript.evaluate("$a=notok\n[ @{$a: 'ok'} hello]", 0)).eq("");
    });
    it("Handles deferred equality gates", function() {
      expect(riscript.evaluate("[ @{$a: 3} hello]", { a: 2 })).eq("");
      expect(riscript.evaluate("[ @{$a: 3} hello]", { a: 3 })).eq("hello");
      expect(riscript.evaluate("[ @{$a: 4} hello]", { a: 3 })).eq("");
      expect(riscript.evaluate('[ @{$a: "ok"} hello]', { a: "ok" })).eq("hello");
      expect(riscript.evaluate('[ @{$a: "ok"} hello]', { a: "fail" })).eq("");
    });
    it("Handles casting for arithmetic gates", function() {
      expect(riscript.evaluate("$a=4\n[ @{$a: {@gt: 3}} hello]", 0)).eq("hello");
      expect(riscript.evaluate("$a=3\n[ @{$a: {@gt: 3}} hello]", 0)).eq("");
      expect(riscript.evaluate("$a=3.1\n[ @{$a: {@gt: 3}} hello]", 0)).eq("hello");
      expect(riscript.evaluate("$a=3.0\n[ @{$a: {@gt: 3}} hello]", 0)).eq("");
    });
    it("Handles boolean gate logic", function() {
      expect(riscript.evaluate("$a=2\n[ @{$a: {}} hello]")).eq("");
      expect(riscript.evaluate("$a=2\n[ @{$a: {@gt: 3}} hello]")).eq("");
      expect(riscript.evaluate("$a=4\n[ @{$a: {@gt: 3}} hello]")).eq("hello");
      expect(riscript.evaluate("$a=4\n[ @{$a: {@gt:25, @lt:32}} hello]")).eq("");
      expect(riscript.evaluate("$a=27\n[ @{$a: {@gt:25, @lt:32}} hello]")).eq("hello");
      expect(riscript.evaluate("$a=27\n[ @{ @or: [ {$a: {@gt: 30}}, {$a: {@lt: 20}} ] } hello]")).eq("");
      expect(riscript.evaluate("$a=35\n[ @{ @or: [ {$a: {@gt: 30}}, {$a: {@lt: 20}} ] } hello]")).eq("hello");
      expect(riscript.evaluate("$a=27\n[ @{ @and: [ {$a: {@gt: 20}}, {$a: {@lt: 25}} ] } hello]")).eq("");
      expect(riscript.evaluate("$a=23\n[ @{ @and: [ {$a: {@gt: 20}}, {$a: {@lt: 25}} ] } hello]")).eq("hello");
      expect(riscript.evaluate("$a=23\n[ @{ @and: [ {$a: {@gt: 20}}, {$b: {@lt: 25}} ] } hello]")).eq("");
    });
    it("Handles deferred dynamics", function() {
      expect(riscript.evaluate("[ @{$a: {}} hello]\n$a=2")).eq("");
      expect(riscript.evaluate('[ @{$a: "ok"} hello]\n$a=ok', 0)).eq("hello");
    });
    it("Handles deferred booleans", function() {
      expect(riscript.evaluate("[ @{$a: {}} hello]", { a: 2 })).eq("");
      expect(riscript.evaluate("[ @{$a: {}} hello]\n$a=2", 0)).eq("");
      expect(riscript.evaluate("[ @{$a: {@gt: 3}} hello]", { a: 2 })).eq("");
      expect(riscript.evaluate("[ @{$a: {@gt: 3}} hello]", { a: 4 })).eq("hello");
      expect(riscript.evaluate("[ @{$a: {@gt:25, @lt:32}} hello]", { a: 4 })).eq("");
      expect(riscript.evaluate("[ @{$a: {@gt:25, @lt:32}} hello]", { a: 27 })).eq("hello");
      expect(riscript.evaluate("[ @{ @or: [ {$a: {@gt: 30}}, {$a: {@lt: 20}} ] } hello]", { a: 27 })).eq("");
      expect(riscript.evaluate("[ @{ @or: [ {$a: {@gt: 30}}, {$a: {@lt: 20}} ] } hello]", { a: 35 })).eq("hello");
      expect(riscript.evaluate("[ @{ @and: [ {$a: {@gt: 20}}, {$a: {@lt: 25}} ] } hello]", { a: 27 })).eq("");
      expect(riscript.evaluate("[ @{ @and: [ {$a: {@gt: 20}}, {$a: {@lt: 25}} ] } hello]", { a: 23 })).eq("hello");
      expect(riscript.evaluate("[ @{ @and: [ {$a: {@gt: 20}}, {$b: {@lt: 25}} ] } hello]", { a: 23 })).eq("");
    });
    it("Extract operands from gate with object operands", function() {
      const obj = { $a: 3, "@or": [{ $b: { "@lt": 30 } }, { $c: /^p*/ }] };
      const query = new RiScript.Query(riscript, obj);
      const operands = query.operands(riscript, obj);
      expect(operands).eql(["a", "c", "b"]);
    });
    it("Extract operands from JSON-string gate", function() {
      const json = "{ $a: 3, '@or': [{ $b: { '@lt': 30 } }, { $c: /^p*/ }] }";
      const query = new RiScript.Query(riscript, json);
      const operands = query.operands(riscript, json);
      expect(operands).eql(["a", "c", "b"]);
    });
    it("Calls test on RiQuery", function() {
      const obj = { $a: 3, "@or": [{ $b: { "@lt": 30 } }, { $c: /^p*/ }] };
      const query = new RiScript.Query(riscript, obj);
      const res = query.test({ a: 3, b: 10 });
      expect(res).true;
    });
    it("Handles complex boolean gate logic", function() {
      let queryAsVar = "{ $a: 3, @or: [ { $b: { @lt: 30 } }, { $c: /^p*/ } ] }";
      let ctxAsVar = "$a=27\n$b=10\n$c=pants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`, 0)).eq("");
      ctxAsVar = "$a=3\n$b=10\n$c=ants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("hello");
      ctxAsVar = "$a=3\n$b=5\n$c=pants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("hello");
      queryAsVar = '{ $a: 3, @or: [ { $b: { @lt: 30 } }, { $c: "pants" } ] }';
      ctxAsVar = "$a=27\n$b=30\n$c=pants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("");
      ctxAsVar = "$a=3\n$b=30\n$c=pants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("hello");
      ctxAsVar = "$a=3\n$b=10\n$c=ants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("hello");
      ctxAsVar = "$a=3\n$b=30\n$c=ants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("");
      ctxAsVar = "$a=3\n$b=5\n$c=pants\n";
      expect(riscript.evaluate(`${ctxAsVar}[ @${queryAsVar} hello]`)).eq("hello");
    });
    it("Handles deferred complex boolean gate logic", function() {
      let queryAsVar = "{ $a: 3, @or: [ { $b: { @lt: 30 } }, { $c: /^p*/ } ] }";
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 27,
        b: 10,
        c: "pants"
      })).eq("");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 10,
        c: "ants"
      })).eq("hello");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 5,
        c: "pants"
      })).eq("hello");
      queryAsVar = '{ $a: 3, @or: [ { $b: { @lt: 30 } }, { $c: "pants" } ] }';
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 27,
        b: 30,
        c: "pants"
      })).eq("");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 30,
        c: "pants"
      })).eq("hello");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 10,
        c: "ants"
      })).eq("hello");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 30,
        c: "ants"
      })).eq("");
      expect(riscript.evaluate(`[ @${queryAsVar} hello]`, {
        a: 3,
        b: 5,
        c: "pants"
      })).eq("hello");
    });
    it("Handles deferred gates", function() {
      expect(riscript.evaluate('$a=$b\n[ @{ $a: "cat" } hello]\n$b=[cat|cat]', 0)).eq("hello");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} dynamic]\n$a=apogee")).eq("dynamic");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} dynamic]\n{$a=apogee}")).eq("dynamic");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} dynamic]\n[$a=apogee]")).eq("dynamic\napogee");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} dynamic]\n$b=apogee")).eq("");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} static]\n#a=apogee")).eq("static");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} static]\n#b=apogee")).eq("");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} static]\n{#a=apogee}")).eq("static");
      expect(riscript.evaluate("[ @{ $a: { @exists: true }} static]\n[#a=apogee]")).eq("static\napogee");
    });
    it("Handles gates with strings characters", function() {
      expect(riscript.evaluate("$a=bc\n[@{$a: 'bc'} $a]")).eq("bc");
      expect(riscript.evaluate("$a=bc\n[@{$a: 'cd'} $a]")).eq("");
      expect(riscript.evaluate("$a=bc\n[@{$a: 'bc'} $a]")).eq("bc");
      expect(riscript.evaluate('$a=bc\n[@{$a: "cd"} $a]')).eq("");
      expect(riscript.evaluate('$a=bc\n[@{$a: "bc"} $a]')).eq("bc");
      expect(riscript.evaluate('$a=bc\n[@{$a: "cd"} $a]')).eq("");
      expect(riscript.evaluate('$a=bc\n[@{$a: "bc"} $a]')).eq("bc");
    });
    it("Handles gates with Chinese characters", function() {
      expect(riscript.evaluate('$a=ab\n[@{$a: "ab"} $a]')).eq("ab");
      expect(riscript.evaluate('$a=\u7E41\u9AD4\n[@{$a: "\u7E41\u9AD4"} $a]')).eq("\u7E41\u9AD4");
      expect(riscript.evaluate('$a=\u7E41\u9AD4\n[@{$a: "\u4E2D\u6587"} $a]')).eq("");
      expect(riscript.evaluate('$a=\u7E41\u9AD4\n[@{$a: {@ne: "\u7E41\u9AD4"}} $a]')).eq("");
      expect(riscript.evaluate('$a=\u7E41\u9AD4\n[@{$a: {@ne: "\u4E2D\u6587"}} $a]')).eq("\u7E41\u9AD4");
    });
  });
  describe("Choice", function() {
    it("Throws on bad choices", function() {
      expect(() => riscript.evaluate("|")).to.throw();
      expect(() => riscript.evaluate("a |")).to.throw();
      expect(() => riscript.evaluate("a | b")).to.throw();
      expect(() => riscript.evaluate("a | b | c")).to.throw();
      expect(() => riscript.evaluate("[a | b] | c")).to.throw();
      expect(() => riscript.evaluate("[a | b].nr()")).to.throw();
      expect(() => riscript.evaluate("[$names=[a|b|c|d|e]].nr()")).to.throw();
    });
    it("Resolves choices in context", function() {
      const res = riscript.evaluate("$bar:$bar", { bar: "[man | boy]" });
      expect(/(man|boy):(man|boy)/.test(res)).true;
    });
    it("Repeat choices with randomSeed", function() {
      if (!("randomSeed" in riscript.RiTa))
        return;
      const seed = Math.random() * Number.MAX_SAFE_INTEGER;
      const script = "$a=[1|2|3|4|5|6]\n$a";
      riscript.RiTa.randomSeed(seed);
      let b;
      const a = riscript.evaluate(script);
      for (let i = 0; i < 5; i++) {
        riscript.RiTa.randomSeed(seed);
        b = riscript.evaluate(script);
        expect(a).eq(b);
      }
    });
    it("Selects non-weighted choices evenly", function() {
      const map = {};
      for (let i = 0; i < 1e3; i++) {
        const res = riscript.evaluate("[quite|]");
        if (!(res in map))
          map[res] = 0;
        map[res]++;
      }
      expect(map.quite).greaterThan(400);
      expect(map[""]).greaterThan(400);
    });
    it("Resolves choices", function() {
      expect(riscript.evaluate("[|]")).eq("");
      expect(riscript.evaluate("[a]")).eq("a");
      expect(riscript.evaluate("[a | a]", 0)).eq("a");
      expect(riscript.evaluate("[a | ]")).to.be.oneOf(["a", ""]);
      expect(riscript.evaluate("[a | b]")).to.be.oneOf(["a", "b"]);
      expect(riscript.evaluate("[a | b | c]"), {}).to.be.oneOf(["a", "b", "c"]);
      expect(riscript.evaluate("[a | [b | c] | d]")).to.be.oneOf([
        "a",
        "b",
        "c",
        "d"
      ]);
      expect(riscript.evaluate("$names=[a|b|c|d|e]\n$names $names", 0)).match(/[abcde] [abcde]/);
      expect(riscript.evaluate("not [quite|] far enough")).to.be.oneOf([
        "not far enough",
        "not quite far enough"
      ]);
    });
    it("Resolves multiword choices", function() {
      const silent = riscript.RiTa.SILENCE_LTS;
      riscript.RiTa.SILENCE_LTS = true;
      expect(riscript.evaluate("[A B | A B]")).eq("A B");
      expect(riscript.evaluate("[A B].toLowerCase()")).eq("a b");
      expect(riscript.evaluate("[A B | A B].toLowerCase()", 0)).eq("a b");
      expect(riscript.evaluate("[A B | A B].articlize()", 0)).eq("an A B");
      riscript.RiTa.SILENCE_LTS = silent;
    });
    it("Resolves choices in expressions", function() {
      expect(riscript.evaluate("x [a | a | a] x")).eq("x a x");
      expect(riscript.evaluate("x [a | a | a]")).eq("x a");
      expect(riscript.evaluate("x [a | a | a]x")).eq("x ax");
      expect(riscript.evaluate("x[a | a | a] x")).eq("xa x");
      expect(riscript.evaluate("x[a | a | a]x")).eq("xax");
      expect(riscript.evaluate("x [a | a | a] [b | b | b] x")).eq("x a b x");
      expect(riscript.evaluate("x [a | a | a][b | b | b] x")).eq("x ab x");
      expect(riscript.evaluate("x [a | a] [b | b] x")).eq("x a b x");
      expect(riscript.evaluate("[a|b]")).matches(/a|b/);
      expect(riscript.evaluate("[a|]")).matches(/a?/);
      expect(riscript.evaluate("[a|a]")).eq("a");
      expect(riscript.evaluate("[|a|]")).to.be.oneOf(["a", ""]);
      expect(riscript.evaluate("This is &lpar;a parenthesed&rpar; expression")).eq("This is (a parenthesed) expression");
      expect(riscript.evaluate("This is \\(a parenthesed\\) expression")).eq("This is (a parenthesed) expression");
      expect(riscript.evaluate(
        "[[mountain | mountain] village | [evening | evening] sunlight | [winter | winter] flower | [star | star]light above]"
      )).to.be.oneOf([
        "mountain village",
        "evening sunlight",
        "winter flower",
        "starlight above"
      ]);
    });
    it("Resolves weighted choices", function() {
      expect(riscript.evaluate("[ a (2) ]", {})).eq("a");
      LTR && expect(riscript.evaluate("[(2) |(3)]", {})).eq("");
      expect(riscript.evaluate("[a | b (2) |(3)]", {})).to.be.oneOf([
        "a",
        "b",
        ""
      ]);
      expect(riscript.evaluate("[a | b(2) |(3)]", {})).to.be.oneOf([
        "a",
        "b",
        ""
      ]);
      expect(riscript.evaluate("[ a (2) | a (3) ]", {})).eq("a");
      expect(riscript.evaluate("[ a ( 2) | a (3 ) ]", {})).eq("a");
      let result = { b: 0, a: 0 };
      for (let i = 0; i < 100; i++) {
        const ans = riscript.evaluate("[a(1) | b (3)]");
        if (!/^[ab]$/.test(ans))
          throw Error("invalid: " + ans);
        result[ans]++;
      }
      expect(result.a).gt(0);
      expect(result.b).gt(result.a);
      result = { b: 0, a: 0 };
      for (let i = 0; i < 100; i++) {
        const ans = riscript.evaluate("[a | b (3)]");
        if (!/^[ab]$/.test(ans))
          throw Error("invalid: " + ans);
        result[ans]++;
      }
      expect(result.a).gt(0);
      expect(result.b).gt(result.a);
    });
  });
  describe("Assignment", function() {
    it("Ends single assignments on line break", function() {
      let res;
      expect(res = riscript.evaluate("hello\n$foo=a", 0, PL)).eq("hello");
      expect(riscript.visitor.dynamics.foo).to.be.a("function");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.evaluate("$foo=a\n", 0, PL)).eq("\n");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.evaluate("$foo=a\nb", 0, PL)).eq("b");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.evaluate("$foo=a\n$bar=$foo", 0, PL)).eq("");
      expect(riscript.visitor.dynamics.bar).to.be.a("function");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.visitor.dynamics.bar()).eq("a");
      expect(riscript.evaluate("$foo=a\n$bar=$foo.", 0, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.visitor.dynamics.bar()).eq("a.");
      expect(riscript.evaluate("$foo=[a | a]\n$foo", 0, PL)).eq("a");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.evaluate("$foo=[hi | hi]\n$foo there", 0, PL)).eq("hi there");
      expect(riscript.visitor.dynamics.foo()).eq("hi");
    });
    it("Parses silent assignments", function() {
      let ctx = {};
      expect(riscript.evaluate("{$foo=a}b", ctx, PL)).eq("b");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      ctx = {};
      expect(riscript.evaluate("{$foo=[a] b}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a b");
      ctx = {};
      expect(riscript.evaluate("{$foo=[a | a]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      ctx = {};
      expect(riscript.evaluate("{$foo=ab}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("ab");
      ctx = {};
      expect(riscript.evaluate("{$foo=ab bc}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("ab bc");
      ctx = {};
      expect(riscript.evaluate("{$foo=(ab) (bc)}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("(ab) (bc)");
      expect(riscript.evaluate("{$foo=[ab] [bc]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("ab bc");
      ctx = {};
      expect(riscript.evaluate("{$foo=[ab bc]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("ab bc");
      ctx = {};
      expect(riscript.evaluate("{$foo=[a | a] [b | b]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a b");
      ctx = {};
      expect(riscript.evaluate("{$foo=[[a | a] | [a | a]]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      ctx = {};
      expect(riscript.evaluate("{$foo=[]}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("");
      ctx = {};
      expect(riscript.evaluate("{$foo=()}", ctx, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("()");
      expect(riscript.evaluate("{$foo=[a | a]}", ctx = {}, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("a");
      expect(riscript.evaluate("{$foo=The boy walked his dog}", ctx = {}, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("The boy walked his dog");
    });
    it("Resolves prior assignments", function() {
      expect(riscript.evaluate("$foo=dog\n$bar=$foo\n$baz=$foo\n$baz", 0)).eq("dog");
      expect(riscript.evaluate("$foo=hi\n$foo there")).eq("hi there");
      expect(riscript.evaluate("$foo=a\n$foo")).eq("a");
    });
  });
  describe("Evaluation", function() {
    it("Resolves static objects from context", function() {
      expect(riscript.evaluate(
        "Meet [$person].name",
        { person: { name: "Lucy" } }
      )).eq("Meet Lucy");
      expect(riscript.evaluate("Meet [$lucy].name. [$lucy].pronoun().cap drives a [$lucy].car().", {
        lucy: {
          name: "Lucy",
          pronoun: "she",
          car: "Lexus"
        }
      })).eq("Meet Lucy. She drives a Lexus.");
      expect(riscript.evaluate(
        "Meet [$person=$lucy].name",
        { lucy: { name: "Lucy" } }
      )).eq("Meet Lucy");
      expect(riscript.evaluate(
        "Meet [#person=$lucy].name",
        { lucy: { name: "Lucy" } }
      )).eq("Meet Lucy");
      expect(riscript.evaluate("Meet [#person=$lucy].name. [#person=$lucy].pronoun().cap drives a [#person=$lucy].car().", {
        lucy: {
          name: "Lucy",
          pronoun: "she",
          car: "Lexus"
        }
      })).eq("Meet Lucy. She drives a Lexus.");
    });
    it("Resolves simple expressions", function() {
      expect(riscript.evaluate("hello", 0)).eq("hello");
      expect(riscript.evaluate("[a|b]", 0)).is.oneOf(["a", "b"]);
      expect(riscript.evaluate("[a|b (4)|c]", 0)).is.oneOf(["a", "b", "c"]);
      expect(riscript.evaluate("[hello (2)]", 0)).eq("hello");
      expect(riscript.evaluate("[hello]", 0)).eq("hello");
      expect(riscript.evaluate("[@{$a:2} hello]", 0)).eq("");
      expect(riscript.evaluate("$a=2\n$a", 0)).eq("2");
      expect(riscript.evaluate("[$a=2]", 0)).eq("2");
      expect(riscript.evaluate("[#a=2]", 0)).eq("2");
      expect(riscript.evaluate("#a=2", 0)).eq("");
      expect(riscript.evaluate("#a=2\n$a", 0)).eq("2");
      expect(riscript.evaluate("$a=2\n[@{$a:2} hello]", 0)).eq("hello");
      expect(riscript.evaluate("[@{$a:2} hello (2)]", 0)).eq("");
      expect(riscript.evaluate("[@{$a:2} hello (2)]", 0)).eq("");
    });
    it("Handles static evaluate", function() {
      expect(RiScript.evaluate("(foo)", {})).eq("(foo)");
      expect(RiScript.evaluate("foo!", {})).eq("foo!");
      expect(RiScript.evaluate("!foo", {})).eq("!foo");
      expect(RiScript.evaluate("foo.", {})).eq("foo.");
      expect(RiScript.evaluate('"foo"', {})).eq('"foo"');
      expect(RiScript.evaluate("'foo'", {})).eq("'foo'");
      expect(RiScript.evaluate("$a=hello\n", 0)).eq("\n");
      expect(RiScript.evaluate("hello\n", 0)).eq("hello\n");
      expect(RiScript.evaluate("*%\xA9\n", 0)).eq("*%\xA9\n");
    });
    it("Handles abbreviations", function() {
      expect(riscript.evaluate("The C.D failed", {})).eq("The C.D failed");
      expect(riscript.evaluate("The $C.D failed", { C: "C", D: (s) => s.toLowerCase() })).eq("The c failed");
    });
    it("Resolves expressions", function() {
      expect(riscript.evaluate("foo")).eq("foo");
      expect(riscript.evaluate("(foo)", {})).eq("(foo)");
      expect(riscript.evaluate("foo!", {})).eq("foo!");
      expect(riscript.evaluate("!foo", {})).eq("!foo");
      expect(riscript.evaluate("foo.", {})).eq("foo.");
      expect(riscript.evaluate('"foo"', {})).eq('"foo"');
      expect(riscript.evaluate("'foo'", {})).eq("'foo'");
      expect(riscript.evaluate("$a=hello\n", 0)).eq("\n");
      expect(riscript.evaluate("hello\n", 0)).eq("hello\n");
      expect(riscript.evaluate("*%\xA9\n", 0)).eq("*%\xA9\n");
    });
    it("Resolves choices", function() {
      expect(riscript.evaluate("[a]")).eq("a");
      expect(riscript.evaluate("[a | a]")).eq("a");
      expect(riscript.evaluate("[a | ]")).to.be.oneOf(["a", ""]);
      expect(riscript.evaluate("[a | b]")).to.be.oneOf(["a", "b"]);
      expect(riscript.evaluate("[a | b | c]"), {}).to.be.oneOf(["a", "b", "c"]);
      expect(riscript.evaluate("[a | [b | c] | d]")).to.be.oneOf([
        "a",
        "b",
        "c",
        "d"
      ]);
      expect(riscript.evaluate("{$names=[a|b|c|d|e]}$names $names", {})).to.match(/[abcde] [abcde]/);
    });
    it("Resolves multiword choices", function() {
      expect(riscript.evaluate("[A B | A B]")).eq("A B");
    });
    it("Resolves transformed choices", function() {
      expect(riscript.evaluate("[A B].toLowerCase()")).eq("a b");
      expect(riscript.evaluate("[A B | A B].toLowerCase()")).eq("a b");
      expect(riscript.evaluate("[A B | A B].articlize()")).eq("an A B");
      expect(riscript.evaluate("$mammal=[dog | dog]\n$mammal.pluralize.ucf are unruly, but my $mammal is the best.")).eq("Dogs are unruly, but my dog is the best.");
    });
    it("Resolves simple statics", function() {
      expect(riscript.evaluate("{#foo=bar}baz", {})).eq("baz");
      expect(riscript.evaluate("{#foo=bar}$foo", {})).eq("bar");
      expect(riscript.evaluate("[#foo=bar]\nbaz", {})).eq("bar\nbaz");
      expect(riscript.evaluate("{#foo=bar}baz$foo", {})).eq("bazbar");
      expect(riscript.evaluate("{#foo=bar}[$foo]baz", {})).eq("barbaz");
      expect(riscript.evaluate("{#foo=bar}$foo baz $foo", {})).eq("bar baz bar");
      expect(riscript.evaluate("{#foo=bar}baz\n$foo $foo", {})).eq("baz\nbar bar");
      let failed = false;
      for (let i = 0; i < 5; i++) {
        const res = riscript.evaluate("{#foo=[a|b|c|d]}$foo $foo $foo", {});
        const pts = res.split(" ");
        expect(pts.length).eq(3);
        if (pts[0] != pts[1] || pts[1] != pts[2] || pts[2] != pts[0]) {
          failed = true;
          break;
        }
      }
      expect(failed).eq(false);
    });
    it("Resolves statics", function() {
      let res = riscript.evaluate("{#bar=[man | boy]}$bar");
      expect(res === "man" || res === "boy").true;
      res = riscript.evaluate("#bar=[man | boy]\n$foo=$bar:$bar\n$foo", {});
      expect(res === "man:man" || res === "boy:boy").true;
    });
    it("Resolves statics from context", function() {
      let res;
      res = riscript.evaluate("#bar=$man\n$bar:$bar", { man: "[BOY|boy]" });
      expect(res).to.be.oneOf(["BOY:BOY", "boy:boy"]);
      res = riscript.evaluate(
        "#bar=[$man | $boy]\n$bar:$bar",
        { man: "[BOY|boy]", boy: "[BOY|boy]" },
        { trace: 0 }
      );
      expect(res).to.be.oneOf(["BOY:BOY", "boy:boy"]);
      res = riscript.evaluate("[#bar=[man | boy]]:$bar");
      expect(res).to.be.oneOf(["man:man", "boy:boy"]);
      res = riscript.evaluate("[#bar=[$man | $boy]]:$bar", { man: "[MAN|man]", boy: "[BOY|boy]" });
      expect(res).to.be.oneOf(["BOY:BOY", "boy:boy", "MAN:MAN", "man:man"]);
    });
    it("Resolves predefined statics", function() {
      let res, visitor;
      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { b: "a [b | c | d] e" };
      res = riscript._evaluate({ input: "$b", visitor });
      expect(/a [bdc] e/.test(res)).true;
      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: "[man | boy]" };
      res = riscript._evaluate({ input: "$bar:$bar", visitor, trace: 0 });
      expect(res === "man:man" || res === "boy:boy").true;
      visitor = new RiScriptVisitor(riscript);
      visitor.statics = { bar: "[$man | $boy]" };
      visitor.context = { man: "[MAN|man]", boy: "[BOY|boy]" };
      res = riscript._evaluate({ input: "$bar:$bar", visitor, trace: 0 });
      expect(res).to.be.oneOf(["BOY:BOY", "boy:boy", "MAN:MAN", "man:man"]);
    });
    it("Resolves expressions with line-breaks ", function() {
      expect(riscript.evaluate("$foo=bar\nbaz", {})).eq("baz");
      expect(riscript.evaluate("foo\nbar", {})).eq("foo\nbar");
      expect(riscript.evaluate("$foo=bar\nbaz\n$foo", {})).eq("baz\nbar");
      expect(riscript.evaluate("#foo=[a|b|c]\n$foo is $foo")).to.be.oneOf([
        "a is a",
        "b is b",
        "c is c"
      ]);
      expect(riscript.evaluate("<em>foo</em>", {})).eq("<em>foo</em>");
      expect(riscript.evaluate("[a|a]", { a: "a", b: "b" })).eq("a");
      const str = "Now in one year\n     A book published\n          And plumbing \u2014";
      expect(riscript.evaluate(str)).eq(str);
      expect(riscript.evaluate("a   b", 0)).eq("a   b");
      expect(riscript.evaluate("a	b", 0)).eq("a	b");
      expect(
        /[abcde] [abcde]/.test(
          riscript.evaluate("$names=[a|b|c|d|e]\n$names $names")
        )
      ).true;
      expect(riscript.evaluate("foo.bar", {}, { silent: 1 })).eq("foo.bar");
    });
    it("Resolves recursive expressions", function() {
      let ctx, expr;
      ctx = { a: "a" };
      expr = "[a|$a]";
      expect(riscript.evaluate(expr, ctx)).eq("a");
      ctx = { a: "$b", b: "[c | c]" };
      expr = "$a";
      expect(riscript.evaluate(expr, ctx)).eq("c");
      ctx = { a: "$b", b: "[c | c]" };
      expr = "$k = $a\n$k";
      expect(riscript.evaluate(expr, ctx)).eq("c");
      ctx = { a: "$b", b: "[c | c]" };
      expr = "$s = $a\n$a = $b\n$c = $d\n$d = c\n$s";
      expect(riscript.evaluate(expr, ctx)).eq("c");
      ctx = { s: "$a", a: "$b", b: "$c", c: "$d", d: "c" };
      expect(riscript.evaluate("$s", ctx)).eq("c");
    });
    it("Resolves recursive dynamics", function() {
      let ctx, expr;
      ctx = { a: "$b", b: "[c | c]" };
      expr = "#k=$a\n$k";
      expect(riscript.evaluate(expr, ctx)).eq("c");
      ctx = { a: "$b", b: "[c | c]" };
      expr = "#s = $a\n#a = $b\n#c = $d\n#d = c\n$s";
      expect(riscript.evaluate(expr, ctx)).eq("c");
    });
  });
  describe("Symbols", function() {
    it("Handles generated symbols", function() {
      let sc = "$a=antelope\n$b=otter\n$an() $[a|b]";
      const res = riscript.evaluate(sc, { an: () => "An" });
      expect(res).to.be.oneOf([
        "An antelope",
        "An otter"
      ]);
    });
    it("Handles generated transforms", function() {
      let sc = "$an() $[a|b]";
      const res = riscript.evaluate(sc, {
        an: () => "An",
        a: () => "Ant",
        b: () => "Elk"
      });
      expect(res).to.be.oneOf([
        "An Ant",
        "An Elk"
      ]);
    });
    it("Handles simple object in context", function() {
      let context, res;
      context = { a: { name: "Lucy" } };
      res = riscript.evaluate("$a.name", context, 0);
      expect(res).to.be.oneOf(["Lucy"]);
      context = { a: { name: "Lucy" }, b: { name: "Sam" } };
      res = riscript.evaluate("$[a | b].name", context);
      expect(res).to.be.oneOf(["Lucy", "Sam"]);
    });
    it("Passes context as this", function() {
      let checkThis = function(word) {
        expect(this).eq(riscript.visitor.context);
        return word + (this === riscript.visitor.context ? " success" : " failure");
      };
      let res = riscript.evaluate("[hello].checkThis", { checkThis });
      expect(res).eq("hello success");
    });
    it("Handles simple generated symbol in context", function() {
      let ctx, res;
      ctx = { a: { name: "Lucy" } };
      res = riscript.evaluate("#person=$a\n$person.name $person.name", ctx);
      expect(res).eq("Lucy Lucy");
    });
    it("Handles generated symbol in context", function() {
      let context, res;
      context = { a: "Lucy", b: "Sam" };
      res = riscript.evaluate("$[a|b]", context);
      expect(res).to.be.oneOf(["Lucy", "Sam"]);
      context = { a: "Lucy", b: "Sam" };
      res = riscript.evaluate("$person=$[a|b]\n$person", context);
      expect(res).to.be.oneOf(["Lucy", "Sam"]);
      context = { a: { name: "Lucy" }, b: { name: "Sam" } };
      res = riscript.evaluate("$[a|b].name", context);
      expect(res).to.be.oneOf(["Lucy", "Sam"]);
      context = { a: { name: "Lucy" }, b: { name: "Sam" } };
      res = riscript.evaluate("$person=$[a|b]\n$person.name", context);
      expect(res).to.be.oneOf(["Lucy", "Sam"]);
    });
    it("Handles deferred", function() {
      expect(riscript.evaluate("$foo\n$foo=cat", 0)).eq("cat");
    });
    it("Handles statics", function() {
      let res;
      res = riscript.evaluate("[#bar=[boy]]:$bar");
      expect(res === "boy:boy").true;
      res = riscript.evaluate("[#bar=[$boy]]:$bar\n$boy=boy");
      expect(res === "boy:boy").true;
      res = riscript.evaluate("#foo=[cat | dog]\n$foo $foo");
      expect(res === "cat cat" || res === "dog dog").true;
      res = riscript.evaluate("#foo=[cat | dog]\n$foo $foo");
      expect(res === "cat cat" || res === "dog dog").true;
      res = riscript.evaluate("#bar=[$man | $boy]\n$man=[MAN|man]\n$boy=[BOY|boy]\n#bar:#bar");
      expect(
        res === "MAN:MAN" || res === "BOY:BOY" || res === "man:man" || res === "boy:boy"
      ).true;
      res = riscript.evaluate("#bar=[$man | $boy]\n$man=[MAN|man]\n$boy=[BOY|boy]\n$bar:$bar");
      expect(
        res === "MAN:MAN" || res === "BOY:BOY" || res === "man:man" || res === "boy:boy"
      ).true;
    });
    it("Handles norepeats", function() {
      let res;
      for (let i = 0; i < 5; i++) {
        res = riscript.evaluate("$foo=[cat|dog]\n$foo $foo.nr");
        expect(res === "cat dog" || res === "dog cat").true;
      }
    });
    it("Handles internal line breaks", function() {
      expect(riscript.evaluate("$foo=[cat\ndog]\n$foo")).eq("cat\ndog");
      expect(riscript.evaluate("\u524D\u534A\u6BB5\u53E5\u5B50\n\u5F8C\u534A\u6BB5\u53E5\u5B50")).eq("\u524D\u534A\u6BB5\u53E5\u5B50\n\u5F8C\u534A\u6BB5\u53E5\u5B50");
      expect(riscript.evaluate("$foo=\u524D\u534A\u6BB5\n$foo\u53E5\u5B50   \n\u5F8C\u534A\u6BB5\u53E5\u5B50")).eq("\u524D\u534A\u6BB5\u53E5\u5B50   \n\u5F8C\u534A\u6BB5\u53E5\u5B50");
      expect(riscript.evaluate("$foo=\u524D\u534A\u6BB5\n$foo\u53E5\u5B50\n   \u5F8C\u534A\u6BB5\u53E5\u5B50")).eq("\u524D\u534A\u6BB5\u53E5\u5B50\n   \u5F8C\u534A\u6BB5\u53E5\u5B50");
      expect(riscript.evaluate("$foo=[\u524D\u534A\u6BB5\u53E5\u5B50\n\u5F8C\u534A\u6BB5\u53E5\u5B50]\n$foo")).eq("\u524D\u534A\u6BB5\u53E5\u5B50\n\u5F8C\u534A\u6BB5\u53E5\u5B50");
    });
    it("Handles silents", function() {
      expect(riscript.evaluate("{$a=b}", 0)).eq("");
      expect(riscript.evaluate("$a=b", 0)).eq("");
      expect(riscript.evaluate("$a=b\n$a", 0)).eq("b");
    });
    it("Resolves transforms", function() {
      let ctx, rs;
      expect(riscript.evaluate("$foo=$bar.toUpperCase()\n$bar=baz\n$foo", 0)).eq("BAZ");
      expect(riscript.evaluate("$foo.capitalize()\n$foo=[a|a]")).eq("A");
      expect(riscript.evaluate("$start=$r.capitalize()\n$r=[a|a]\n$start")).eq("A");
      expect(riscript.evaluate("$names=a\n$names.uc()", 0)).eq("A");
      expect(riscript.evaluate("$foo=[bar].ucf\n$foo")).eq("Bar");
      ctx = { bar: () => "result" };
      rs = riscript.evaluate("[].bar", ctx);
      expect(rs).eq("result");
      ctx = { mammal: "[ox | ox]" };
      rs = riscript.evaluate(
        "The big $mammal ate all the smaller $mammal.s.",
        ctx
      );
      IfRiTa && expect(rs).eq("The big ox ate all the smaller oxen.");
    });
  });
  describe("Transforms", function() {
    it("Adds/removes custom transforms", function() {
      let addRhyme = function(word) {
        return word + " rhymes with bog";
      };
      expect(riscript.transforms.rhymes).is.undefined;
      riscript.addTransform("rhymes", addRhyme);
      expect(riscript.transforms.rhymes).is.not.undefined;
      let res = riscript.evaluate("The [dog | dog | dog].rhymes");
      expect(res).eq("The dog rhymes with bog");
      riscript.removeTransform("rhymes");
      expect(riscript.transforms.rhymes).is.undefined;
      res = riscript.evaluate("The [dog | dog | dog].rhymes", 0, { silent: true });
      expect(res).eq("The dog.rhymes");
      let addRhyme2 = function(word) {
        return word + " rhymes with bog" + riscript.RiTa.randi(1);
      };
      expect(riscript.transforms.rhymes2).is.undefined;
      riscript.addTransform("rhymes2", addRhyme2);
      expect(riscript.transforms.rhymes2).is.not.undefined;
      res = riscript.evaluate("The [dog | dog | dog].rhymes2");
      expect(res).eq("The dog rhymes with bog0");
      riscript.removeTransform("rhymes2");
      expect(riscript.transforms.rhymes2).is.undefined;
      res = riscript.evaluate("The [dog | dog | dog].rhymes2", 0, { silent: true });
      expect(res).eq("The dog.rhymes2");
    });
    it("Handles anonymous transforms", function() {
      const ctx = { capB: (s) => "B" };
      expect(riscript.evaluate("$uppercase()")).eq("");
      expect(riscript.evaluate("$capB()", ctx)).eq("B");
      expect(riscript.evaluate("$uppercase", 0)).eq("");
      expect(riscript.evaluate("$capB", ctx)).eq("B");
      expect(riscript.evaluate("[].capB", ctx)).eq("B");
    });
    it("Handles old-style anonymous transforms", function() {
      const ctx = { capB: (s) => "B" };
      expect(riscript.evaluate("$.uppercase()")).eq("");
      expect(riscript.evaluate("$.capB()", ctx)).eq("B");
      expect(riscript.evaluate("$.uppercase", 0)).eq("");
      expect(riscript.evaluate("[].capB", ctx)).eq("B");
    });
    it("Resolves transforms containing riscript", function() {
      let ctx;
      ctx = { tx: () => "[a | a]" };
      expect(riscript.evaluate("[c].tx()", ctx)).eq("a");
      ctx = { tx: (s) => s + "$sym" };
      expect(riscript.evaluate("$sym=at\n[c].tx()", ctx)).eq("cat");
      ctx = { sym: "at", tx: (s) => s + "$sym" };
      expect(riscript.evaluate("[c].tx()", ctx)).eq("cat");
      ctx = { c: "foo", tx: (s) => `$${s}` };
      expect(riscript.evaluate("[c].tx()", ctx)).eq("foo");
      ctx = { tx: (s) => `[${s}]` };
      expect(riscript.evaluate("[c].tx()", ctx)).eq("c");
      ctx = { tx: (s) => `[${s}].uc()` };
      expect(riscript.evaluate("[c].tx()", ctx)).eq("C");
      ctx = { s: "c", tx: (s) => '[@{ $s: "c"} FOO]' };
      expect(riscript.evaluate("[d].tx()", ctx)).eq("FOO");
    });
    it("Resolves transforms in context", function() {
      const ctx = { capB: (s) => s || "B" };
      expect(riscript.evaluate("[c].capB()", ctx)).eq("c");
    });
    it("Resolves transforms", function() {
      let ctx = {};
      expect(riscript.evaluate("[This].uc() is an acronym.", ctx)).eq("THIS is an acronym.");
      expect(riscript.evaluate("[BAZ].toLowerCase().ucf()", ctx)).eq("Baz");
      expect(riscript.evaluate("[c].toUpperCase()", ctx)).eq("C");
      expect(riscript.evaluate("[c].toUpperCase", ctx)).eq("C");
      expect(riscript.evaluate("$a=b\n$a.toUpperCase()", ctx)).eq("B");
      expect(riscript.evaluate("$a.toUpperCase()\n$a=b", ctx)).eq("B");
      expect(riscript.evaluate("[$b=[[a | a]|a]].toUpperCase() dog.", ctx)).eq("A dog.");
      expect(riscript.evaluate("[[a]].toUpperCase()", ctx)).eq("A");
      expect(riscript.evaluate("$a.toUpperCase()\n[$a=b]", ctx)).eq("B\nb");
      ctx = { dog: "terrier" };
      expect(riscript.evaluate("$dog.ucf()", ctx)).eq("Terrier");
    });
    it("Resolves custom transforms", function() {
      const Blah = () => "Blah";
      expect(riscript.evaluate("That is [ant].Blah().", { Blah })).eq("That is Blah.");
      const ctx = { Blah2: () => "Blah2" };
      expect(riscript.evaluate("That is [ant].Blah2().", ctx)).eq("That is Blah2.");
      const Blah3 = () => "Blah3";
      riscript.transforms.Blah3 = Blah3;
      expect(riscript.evaluate("That is [ant].Blah3().")).eq("That is Blah3.");
      expect(riscript.evaluate("That is [ant].Blah3.")).eq("That is Blah3.");
    });
    it("Resolves transforms on literals", function() {
      expect(riscript.evaluate("How many [teeth].quotify() do you have?")).eq("How many \u201Cteeth\u201D do you have?");
      expect(riscript.evaluate("How many [].quotify() do you have?")).eq("How many \u201C\u201D do you have?");
      expect(riscript.evaluate("How many [teeth].toUpperCase() do you have?", 0)).eq("How many TEETH do you have?");
      expect(riscript.evaluate("That is [].articlize().", 0)).eq("That is .");
      expect(riscript.evaluate("That is $articlize().", 0)).eq("That is .");
      expect(riscript.evaluate("That is an [ant].capitalize().")).eq("That is an Ant.");
      expect(riscript.evaluate("[ant].articlize().capitalize()", 0)).eq("An ant");
      expect(riscript.evaluate("[ant].capitalize().articlize()", 0)).eq("an Ant");
      expect(riscript.evaluate("[deeply-nested expression].art()")).eq("a deeply-nested expression");
      expect(riscript.evaluate("[deeply-nested $art].art()", { art: "emotion" })).eq("a deeply-nested emotion");
      expect(riscript.evaluate("That is [ant].articlize().")).eq("That is an ant.");
      expect(riscript.evaluate("That is [ant].articlize.")).eq("That is an ant.");
    });
    it("Resolves transforms on bare symbols", function() {
      expect(riscript.evaluate("How many $quotify() quotes do you have?")).eq("How many \u201C\u201D quotes do you have?");
      expect(riscript.evaluate("That is $articlize().", 0)).eq("That is .");
      expect(riscript.evaluate("That is $incontext().", { incontext: "in context" })).eq("That is in context.");
      expect(riscript.evaluate("How many $quotify quotes do you have?")).eq("How many \u201C\u201D quotes do you have?");
      expect(riscript.evaluate("That is $articlize.", 0)).eq("That is .");
      expect(riscript.evaluate("That is $incontext.", { incontext: "in context" })).eq("That is in context.");
    });
    it("Resolves transforms on old-style bare symbols", function() {
      expect(riscript.evaluate("How many $.quotify() quotes do you have?")).eq("How many \u201C\u201D quotes do you have?");
      expect(riscript.evaluate("That is $.articlize().", 0)).eq("That is .");
      expect(riscript.evaluate("That is $.incontext().", { incontext: () => "in context" })).eq("That is in context.");
      expect(riscript.evaluate("How many $.quotify quotes do you have?")).eq("How many \u201C\u201D quotes do you have?");
      expect(riscript.evaluate("That is $.articlize.", 0)).eq("That is .");
      expect(riscript.evaluate("That is $.incontext.", { incontext: () => "in context" })).eq("That is in context.");
    });
    it("Pluralize phrases", function() {
      expect(riscript.evaluate("These [$state feeling].pluralize().", { state: "[bad | bad]" })).eq("These bad feelings.");
      expect(riscript.evaluate("These [bad feeling].pluralize().")).eq("These bad feelings.");
      expect(riscript.evaluate("She [pluralize].pluralize().")).eq("She pluralizes.");
      expect(riscript.evaluate("These [$state feeling].pluralize().", { state: "bad" })).eq("These bad feelings.");
      expect(riscript.evaluate("{$state=[bad | bad]}These [$state feeling].pluralize().", {})).eq("These bad feelings.");
      expect(riscript.evaluate("{#state=[bad | bad]}These [$state feeling].pluralize().", {})).eq("These bad feelings.");
      expect(riscript.evaluate("These [off-site].pluralize().", { state: "[bad | bad]" })).eq("These off-sites.");
      expect(riscript.evaluate("$state=[bad | bad]\nThese [$state feeling].pluralize().", {})).eq("These bad feelings.");
      expect(riscript.evaluate("#state=[bad | bad]\nThese [$state feeling].pluralize().", {})).eq("These bad feelings.");
    });
    it("Resolves across assignment types", function() {
      let ctx;
      expect(riscript.evaluate("The [$foo=blue] [dog | dog]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.dynamics.foo()).eq("blue");
      expect(riscript.evaluate("The [$foo=blue [dog | dog]]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.dynamics.foo()).eq("blue dog");
      expect(riscript.evaluate("{$foo=blue [dog | dog]}", ctx = {}, PL)).eq("");
      expect(riscript.visitor.dynamics.foo()).eq("blue dog");
      expect(riscript.evaluate("The{$foo=blue [dog | dog]}", ctx = {}, PL)).eq("The");
      expect(riscript.visitor.dynamics.foo()).eq("blue dog");
      expect(riscript.evaluate("The $foo=blue [dog | dog]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.dynamics.foo()).eq("blue dog");
    });
    it("Resolves statics across assignment types", function() {
      let ctx;
      expect(riscript.evaluate("The [#foo=blue] [dog | dog]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.statics.foo).eq("blue");
      expect(riscript.evaluate("The [#foo=blue [dog | dog]]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.statics.foo).eq("blue dog");
      expect(riscript.evaluate("{#foo=blue [dog | dog]}", ctx = {}, PL)).eq("");
      expect(riscript.visitor.statics.foo).eq("blue dog");
      expect(riscript.evaluate("The{#foo=blue [dog | dog]}", ctx = {}, PL)).eq("The");
      expect(riscript.visitor.statics.foo).eq("blue dog");
      expect(riscript.evaluate("The #foo=blue [dog | dog]", ctx = {}, PL)).eq("The blue dog");
      expect(riscript.visitor.statics.foo).eq("blue dog");
    });
    it("Resolves choice transforms", function() {
      expect(riscript.evaluate("[a | a].toUpperCase()", {})).eq("A");
      expect(riscript.evaluate("[a | a].up()", { up: (x) => x.toUpperCase() })).eq("A");
      expect(riscript.evaluate("[a | a].up", { up: (x) => x.toUpperCase() })).eq("A");
      expect(riscript.evaluate("[a].toUpperCase()")).eq("A");
      expect(riscript.evaluate("[[a]].toUpperCase()")).eq("A");
      expect(riscript.evaluate("[a | b].toUpperCase()")).to.be.oneOf([
        "A",
        "B"
      ]);
      expect(riscript.evaluate("[a | a].capitalize()")).eq("A");
      expect(riscript.evaluate("The [boy | boy].toUpperCase() ate.")).eq("The BOY ate.");
      IfRiTa && expect(riscript.evaluate("How many [tooth | tooth].pluralize() do you have?")).eq("How many teeth do you have?");
    });
    it("Preserve non-existent transforms", function() {
      expect(riscript.evaluate("[a | a].up()", 0, { silent: true })).eq("a.up()");
      expect(riscript.evaluate("$dog.toUpperCase()", 0, { silent: true })).eq("$dog.toUpperCase()");
      expect(riscript.evaluate("The $C.D failed", 0, { silent: true })).eq("The $C.D failed");
    });
    it("Resolves symbol transforms", function() {
      expect(riscript.evaluate("$dog.toUpperCase()", { dog: "spot" })).eq("SPOT");
      expect(riscript.evaluate("$dog.capitalize()", { dog: "spot" })).eq("Spot");
      expect(riscript.evaluate("$1dog.capitalize()", { "1dog": "spot" })).eq("Spot");
      expect(riscript.evaluate("[$dog].capitalize()", { dog: "spot" })).eq("Spot");
      expect(riscript.evaluate("The $dog.toUpperCase()", { dog: "spot" })).eq("The SPOT");
      expect(riscript.evaluate("The [boy | boy].toUpperCase() ate.")).eq("The BOY ate.");
      expect(riscript.evaluate("The [girl].toUpperCase() ate.")).eq("The GIRL ate.");
      expect(riscript.evaluate("$dog.articlize().capitalize()", { dog: "spot" })).eq("A spot");
    });
    it("Resolves symbol multi-transforms", function() {
      expect(riscript.evaluate("[$pet | $animal].articlize().cap()", { pet: "ant", animal: "ant" })).eq("An ant");
      expect(riscript.evaluate("[$a=$dog] $a.articlize().capitalize()", { dog: "spot" })).eq("spot A spot");
      expect(riscript.evaluate("[$a=$dog] $a.articlize().capitalize()", { dog: "abe" })).eq("abe An abe");
      expect(riscript.evaluate("[abe | abe].articlize().capitalize()", { dog: "abe" })).eq("An abe");
      expect(riscript.evaluate("[abe | abe].capitalize().articlize()", { dog: "abe" })).eq("an Abe");
      expect(riscript.evaluate("[abe | abe].capitalize.articlize", { dog: "abe" })).eq("an Abe");
      expect(riscript.evaluate("[Abe Lincoln].articlize().capitalize()", { dog: "abe" })).eq("An Abe Lincoln");
      expect(riscript.evaluate("<li>$start</li>\n$start=[$jrSr].capitalize()\n$jrSr=[junior|junior]")).eq("<li>Junior</li>");
    });
    it("Resolves functions on context props with transforms", function() {
      const s = "$player.name.toUpperCase().toLowerCase()";
      const gameState = { player: { name: "Wing" } };
      const res = riscript.evaluate(s, gameState);
      expect(res).eq("wing");
      const ctx = { bar: { baz: "result" } };
      const rs = riscript.evaluate("$foo=$bar.baz\n$foo", ctx);
      expect(rs).eq("result");
    });
    it("Resolves properties of context symbols", function() {
      let s = "$player.name";
      let gameState = { player: { name: "Wing" } };
      let res = riscript.evaluate(s, gameState);
      expect(res).eq("Wing");
      s = "$player.name has $time.secs() secs left.";
      gameState = {
        player: {
          name: "Wing",
          color: "blue",
          traits: []
        },
        time: {
          secs: () => (/* @__PURE__ */ new Date()).getSeconds()
        }
      };
      res = riscript.evaluate(s, gameState);
      expect(/Wing has [0-9]{1,2} secs left\./.test(res)).true;
    });
    it("Resolves object properties", function() {
      const dog = { name: "spot", color: "white", hair: { color: "white" } };
      expect(riscript.evaluate("It was a $dog.hair.color dog.", { dog })).eq("It was a white dog.");
      expect(riscript.evaluate("It was a $dog.color.toUpperCase() dog.", { dog })).eq("It was a WHITE dog.");
      expect(riscript.evaluate("It was a $dog.color.toUpperCase dog.", { dog })).eq("It was a WHITE dog.");
    });
    it("Resolves member functions", function() {
      const dog = { name: "Spot", getColor: () => "red" };
      expect(riscript.evaluate("$dog.name was a $dog.getColor() dog.", { dog })).eq("Spot was a red dog.");
      expect(riscript.evaluate("$dog.name was a $dog.getColor dog.", { dog })).eq("Spot was a red dog.");
    });
    it("Resolves transforms ending with punc", function() {
      expect(riscript.evaluate("[a | b].toUpperCase().")).to.be.oneOf([
        "A.",
        "B."
      ]);
      expect(riscript.evaluate("The [boy | boy].toUpperCase()!")).eq("The BOY!");
      expect(riscript.evaluate("The $dog.toUpperCase()?", { dog: "spot" })).eq("The SPOT?");
      expect(riscript.evaluate("The [boy | boy].toUpperCase().")).eq("The BOY.");
      const dog = { name: "spot", color: "white", hair: { color: "white" } };
      expect(riscript.evaluate("It was $dog.hair.color.", { dog })).eq("It was white.");
      expect(riscript.evaluate("It was $dog.color.toUpperCase()!", { dog })).eq("It was WHITE!");
      const col = { getColor: () => "red" };
      expect(riscript.evaluate("It was $dog.getColor()?", { dog: col })).eq("It was red?");
      expect(riscript.evaluate("It was $dog.getColor?", { dog: col })).eq("It was red?");
      expect(riscript.evaluate("It was $dog.getColor.", { dog: col })).eq("It was red.");
      const ctx = { user: { name: "jen" } };
      expect(riscript.evaluate("That was $user.name!", ctx)).eq("That was jen!");
      expect(riscript.evaluate("That was $user.name.", ctx)).eq("That was jen.");
    });
    it("Resolves property transforms in context", function() {
      const ctx = { bar: { result: "result" } };
      const rs = riscript.evaluate("$foo=$bar.result\n$foo", ctx);
      expect(rs).eq("result");
    });
    it("Resolves transform props and method", function() {
      class TestClass {
        constructor() {
          this.prop = "result";
        }
        getProp() {
          return this.prop;
        }
      }
      const ctx = { bar: new TestClass() };
      let res = riscript.evaluate("$foo=$bar.prop\n$foo", ctx);
      expect(res).eq("result");
      res = riscript.evaluate("$foo=$bar.getProp()\n$foo", ctx);
      expect(res).eq("result");
      res = riscript.evaluate("$foo=$bar.getProp\n$foo", ctx);
      expect(res).eq("result");
    });
    it("Handles nested context", function() {
      const ctx = { bar: { color: "blue" } };
      const res = riscript.evaluate("#foo=$bar.color\n$foo", ctx);
      expect(res).eq("blue");
    });
  });
  describe("Entities", function() {
    it("Decodes escaped characters", function() {
      expect(riscript.evaluate("The (word) has parens")).eq("The (word) has parens");
      expect(riscript.evaluate("The [word] has parens")).eq("The word has parens");
      expect(riscript.evaluate("The reference\\(1\\) has parens")).eq("The reference(1) has parens");
      expect(riscript.evaluate("The reference&lpar;1&rpar; has parens")).eq("The reference(1) has parens");
      expect(riscript.evaluate("The \\[word\\] has brackets", 0)).eq("The [word] has brackets");
      expect(riscript.evaluate("The &lsqb;word&rsqb; has brackets", 0)).eq("The [word] has brackets");
      expect(riscript.evaluate("The & is an ampersand")).eq("The & is an ampersand");
      expect(riscript.evaluate("The # is a hash")).eq("The # is a hash");
    });
    it("Decodes escaped characters in choices", function() {
      expect(riscript.evaluate("The [\\(word\\) | \\(word\\)] has parens")).eq("The (word) has parens");
      expect(riscript.evaluate("The [\\[word\\] | \\[word\\]] has brackets")).eq("The [word] has brackets");
    });
    it("Decodes emojis", function() {
      expect(riscript.evaluate("The \u{1F44D} is thumbs up")).eq("The \u{1F44D} is thumbs up");
    });
    it("Decodes HTML entities", function() {
      expect(riscript.evaluate("The &#010; line break entity")).eq("The \n line break entity");
      expect(riscript.evaluate("The &num; symbol")).eq("The # symbol");
      expect(riscript.evaluate("The &#x00023; symbol")).eq("The # symbol");
      expect(riscript.evaluate("The &#35; symbol")).eq("The # symbol");
      expect(riscript.evaluate("The&num;symbol")).eq("The#symbol");
      ["&lsqb;", "&lbrack;", "&#x0005B;", "&#91;"].forEach((e) => expect(riscript.evaluate("The " + e + " symbol")).eq("The [ symbol"));
      ["&rsqb;", "&rbrack;", "&#x0005D;", "&#93;"].forEach((e) => expect(riscript.evaluate("The " + e + " symbol")).eq("The ] symbol"));
      ["&lpar;", "&#x28;", "&#x00028;", "&#40;"].forEach((e) => expect(riscript.evaluate("The " + e + " symbol")).eq("The ( symbol"));
      ["&rpar;", "&#x29;", "&#x00029;", "&#41;"].forEach((e) => expect(riscript.evaluate("The " + e + " symbol")).eq("The ) symbol"));
    });
    it("Allows basic punctuation", function() {
      expect(riscript.evaluate("The -;:.!?'`", {})).eq("The -;:.!?'`");
      expect(riscript.evaluate('The -;:.!?"`', {})).eq('The -;:.!?"`');
      expect(riscript.evaluate(",.;:'?!-_`\u201C\u201D\u2019\u2018\u2026\u2010\u2013\u2014\u2015<>", {})).eq(",.;:'?!-_`\u201C\u201D\u2019\u2018\u2026\u2010\u2013\u2014\u2015<>");
      expect(riscript.evaluate(',.;:"?!-_`\u201C\u201D\u2019\u2018\u2026\u2010\u2013\u2014\u2015<>', {})).eq(',.;:"?!-_`\u201C\u201D\u2019\u2018\u2026\u2010\u2013\u2014\u2015<>');
      expect(riscript.evaluate("*%\xA9", 0)).eq("*%\xA9");
    });
    it("Allows spaces for formatting", function() {
      expect(riscript.evaluate("&nbsp;The dog&nbsp;", {})).eq(" The dog ");
      expect(riscript.evaluate("&nbsp; The dog&nbsp;", {})).eq("  The dog ");
      expect(riscript.evaluate("The &nbsp;dog", {})).eq("The  dog");
      expect(riscript.evaluate("The&nbsp; dog", {})).eq("The  dog");
      expect(riscript.evaluate("The &nbsp; dog", {})).eq("The   dog");
    });
    it("Shows literal dollar signs", function() {
      let res;
      expect(res = riscript.evaluate("This is &#x00024;", {})).eq("This is $");
      expect(res = riscript.evaluate("This is &#36;", {})).eq("This is $");
    });
    it("Allows HTML entities in context", function() {
      expect(riscript.evaluate("This is $dollar.", { dollar: "&#36;" })).eq("This is $.");
      expect(riscript.evaluate("This is a $diamond.", { diamond: "&lt;&gt;" })).eq("This is a <>.");
    });
    it("Recognizes continuations", function() {
      expect(riscript.evaluate("~\n", {})).eq("");
      expect(riscript.evaluate("aa~\nbb", {})).eq("aabb");
      expect(riscript.evaluate("aa~\n~\n[bb].uc", {})).eq("aaBB");
      expect(riscript.evaluate("aa~\n bb", {})).eq("aa bb");
      expect(riscript.evaluate("aa ~\nbb", {})).eq("aa bb");
      expect(riscript.evaluate("aa ~\n bb", {})).eq("aa  bb");
    });
    it("Recognizes continuations orig", function() {
      expect(riscript.evaluate("aabb", {})).eq("aabb");
      expect(riscript.evaluate("aa[bb].uc", {})).eq("aaBB");
      expect(riscript.evaluate("aa bb", {})).eq("aa bb");
      expect(riscript.evaluate("aa bb", {})).eq("aa bb");
      expect(riscript.evaluate("aa  bb", {})).eq("aa  bb");
    });
    it("Ignores line comments ", function() {
      expect(riscript.evaluate("// $foo=a")).eq("");
      expect(riscript.evaluate("// hello")).eq("");
      expect(riscript.evaluate("//hello")).eq("");
      expect(riscript.evaluate("//()")).eq("");
      expect(riscript.evaluate("//{}")).eq("");
      expect(riscript.evaluate("//$")).eq("");
      expect(riscript.evaluate("hello\n//hello", 0)).eq("hello");
      expect(riscript.evaluate("//hello\nhello", 0)).eq("hello");
      expect(riscript.evaluate("//hello\r\nhello", 0)).eq("hello");
      expect(riscript.evaluate("//hello\nhello\n//hello", 0)).eq("hello");
      expect(riscript.evaluate("//hello\r\nhello\r\n//hello", 0)).eq("hello");
    });
    it("Ignores block comments ", function() {
      expect(riscript.evaluate("/* hello */")).eq("");
      expect(riscript.evaluate("/* $foo=a */")).eq("");
      expect(riscript.evaluate("a /* $foo=a */b", 0)).eq("a b");
      expect(riscript.evaluate("a/* $foo=a */ b")).eq("a b");
      expect(riscript.evaluate("a/* $foo=a */b")).eq("ab");
      expect(riscript.evaluate("a/* $foo=a */b/* $foo=a */c")).eq("abc");
    });
  });
  describe("Helpers", function() {
    it("#stringHash", function() {
      expect(Util.stringHash("revenue")).eq("1099842588");
    });
    it("#preParseLines", function() {
      expect(riscript._preParse("a (1) ")).eq("a ^1^ ");
      expect(riscript._preParse("a (foo) ")).eq("a (foo) ");
      expect(riscript._preParse("foo=a")).eq("foo=a");
      expect(riscript._preParse("$foo=a")).eq("{$foo=a}");
      expect(riscript._preParse("$foo=a\nb")).eq("{$foo=a}b");
      expect(riscript._preParse("hello\n$foo=a")).eq("hello\n{$foo=a}");
      expect(riscript._preParse("$foo=a[b\nc]d\ne")).eq("{$foo=a[b\nc]d}e");
      expect(riscript._preParse("$foo=[cat\ndog]\n$foo")).eq("{$foo=[cat\ndog]}$foo");
      expect(riscript._preParse("$foo=a\nb\n$foo")).eq("{$foo=a}b\n$foo");
      expect(riscript._preParse("$foo=[\n]\n$foo")).eq("{$foo=[\n]}$foo");
      expect(riscript._preParse("$foo=a[\n]b\n$foo")).eq("{$foo=a[\n]b}$foo");
      expect(riscript._preParse("$foo=[cat\ndog].uc()\n$foo")).eq("{$foo=[cat\ndog].uc()}$foo");
      expect(riscript._preParse("[ @{$a: {}} hello]\n$a=2")).eq("[ @{$a: {}} hello]\n{$a=2}");
      expect(riscript._preParse("[ @{$a: {}} hello]\n$a=2")).eq("[ @{$a: {}} hello]\n{$a=2}");
      let res = riscript._preParse("Some [RiTa](https://rednoise.org/rita?a=b&c=k) code");
      let expected = "Some &lsqb;RiTa&rsqb;&lpar;https:&sol;&sol;rednoise.org&sol;rita?a=b&c=k&rpar; code";
      expect(res).eq(expected);
    });
    it("#parseJSOLregex", function() {
      let res = riscript.parseJSOL("{a: /^p/}");
      expect(Object.keys(res)[0]).eq("a");
      expect(regexEquals(Object.values(res)[0], /^p/));
      res = riscript.parseJSOL("{a: /^p/g}");
      expect(Object.keys(res)[0]).eq("a");
      expect(regexEquals(Object.values(res)[0], /^p/g));
    });
    it("#parseJSOLstrings", function() {
      expect(JSON.stringify(riscript.parseJSOL("{a: 'hello'}"))).eq(JSON.stringify({ a: "hello" }));
      expect(JSON.stringify(riscript.parseJSOL('{a: "hello"}'))).eq(JSON.stringify({ a: "hello" }));
    });
    it("#parseJSOL", function() {
      expect(JSON.stringify(riscript.parseJSOL("{a: 3}"))).eq(JSON.stringify({ a: 3 }));
      expect(JSON.stringify(riscript.parseJSOL("{$a: 3}"))).eq(JSON.stringify({ $a: 3 }));
      expect(JSON.stringify(riscript.parseJSOL('{a: "3"}'))).eq(JSON.stringify({ a: "3" }));
      expect(JSON.stringify(riscript.parseJSOL('{$a: "3"}'))).eq(JSON.stringify({ $a: "3" }));
      expect(JSON.stringify(riscript.parseJSOL("{a: '3'}"))).eq(JSON.stringify({ a: "3" }));
      expect(JSON.stringify(riscript.parseJSOL("{$a: '3'}"))).eq(JSON.stringify({ $a: "3" }));
      expect(JSON.stringify(riscript.parseJSOL('{$a: {"@gt": 3}}'))).eq(JSON.stringify({ $a: { "@gt": 3 } }));
      expect(JSON.stringify(riscript.parseJSOL('{$a: {"@gt":25, "@lt":32}}'))).eq(JSON.stringify({ $a: { "@gt": 25, "@lt": 32 } }));
      expect(JSON.stringify(riscript.parseJSOL('{"@or": [ {a: {"@gt": 30}}, {a: {"@lt": 20}}]}'))).eq(JSON.stringify({ "@or": [{ a: { "@gt": 30 } }, { a: { "@lt": 20 } }] }));
    });
    it("#isParseable", function() {
      expect(riscript.isParseable("(")).eq(false);
      expect(riscript.isParseable("[")).eq(true);
      expect(riscript.isParseable("{")).eq(true);
      expect(riscript.isParseable("[A | B]")).eq(true);
      expect(riscript.isParseable("{A | B}")).eq(true);
      expect(riscript.isParseable("$hello")).eq(true);
      expect(riscript.isParseable("$b")).eq(true);
      expect(riscript.isParseable("#b")).eq(true);
      expect(riscript.isParseable("[$b]")).eq(true);
      expect(riscript.isParseable("[&nbsp;]")).eq(true);
      expect(riscript.isParseable("Hello")).eq(false);
      expect(riscript.isParseable("&181;")).eq(false);
      expect(riscript.isParseable("&b")).eq(false);
      expect(riscript.isParseable("&&b")).eq(false);
      expect(riscript.isParseable("&nbsp;")).eq(false);
      expect(riscript.isParseable("@{")).eq(true);
      expect(riscript.isParseable("@ {")).eq(true);
      expect(riscript.isParseable("@  {")).eq(true);
      expect(riscript.isParseable("@")).eq(false);
      expect(riscript.isParseable("@name")).eq(false);
    });
  });
  function regexEquals(x, y) {
    return x instanceof RegExp && y instanceof RegExp && x.source === y.source && x.global === y.global && x.ignoreCase === y.ignoreCase && x.multiline === y.multiline;
  }
});
function isNum(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
