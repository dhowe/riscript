import he from 'he';
import { Query } from 'mingo';
import { Lexer } from 'chevrotain';

import { getTokens } from './tokens.js';
import { RiScriptParser } from './parser.js';
import { RiScriptVisitor } from './visitor.js';

/*
  Specification:
    script: expr+
    expr: (atom)+
    wexpr: (atom)+ weight
    symbol: SYM transform*
    assign: SYM EQ expr transform*
    gate: @mingo@
    silent: { gate? expr }
    atom: (choice | symbol | text | silent) weight?
    choice: [ gate? ( expr | wexpr ) (OR  (expr | wexpr ) )* else? ] transform*
    else: ELSE expr
    raw: Raw
*/

const { decode } = he;
const VowelRE = /[aeiou]/;
const RegexEscape = '_RE_';
const HtmlEntities = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi;

class RiQuery extends Query {
  constructor(scripting, condition, options) {
    if (typeof condition === 'string') {
      let raw = condition; // eslint-disable-line
      condition = scripting.parseJSOL(condition);
      // console.log('RAW: ', raw, 'parsed', condition);
    }
    super(condition, options);
  }

  test(obj) {
    for (let i = 0, len = this.compiled.length; i < len; i++) {
      if (!this.compiled[i](obj)) return false;
    }
    return true;
  }

  operands() {
    const stack = [this.condition];
    const keys = new Set();
    while (stack?.length > 0) {
      const currentObj = stack.pop();
      Object.keys(currentObj).forEach((key) => {
        const value = currentObj[key];
        // console.log(`key: ${ key }, value: ${ value } `);
        if (!key.startsWith('$')) keys.add(key);
        if (typeof value === 'object' && value !== null) {
          const eles = Array.isArray(value) ? value : [value];
          eles.forEach((ele) => stack.push(ele));
        }
      });
    }
    return Array.from(keys);
  }
}

class RiScript {
  static Query = RiQuery;

  static VERSION = '[VI]{{inject}}[/VI]';
  static RiTaWarnings = { plurals: false, phones: false };

  static evaluate(script, context, opts = {}) {
    return new RiScript().evaluate(script, context, opts);
  }

  constructor(opts = {}) { // private ?
    this.visitor = 0; // created in evaluate() or passed in here
    this.v2Compatible = opts.compatibility === 2;
    const { Constants, tokens } = getTokens(this.v2Compatible);
    this.Escaped = Constants.Escaped;
    this.Symbols = Constants.Symbols;

    const anysym = Constants.Escaped.STATIC + Constants.Escaped.DYNAMIC;
    const open = Constants.Escaped.OPEN_CHOICE;
    const close = Constants.Escaped.CLOSE_CHOICE;

    this.JSOLIdentRE = new RegExp(`([${anysym}]?[A-Za-z_0-9][A-Za-z_0-9]*)\\s*:`, 'g');
    this.RawAssignRE = new RegExp(`^[${anysym}][A-Za-z_0-9][A-Za-z_0-9]*\\s*=`);
    this.ChoiceWrapRE = new RegExp('^' + open + '[^' + open + close + ']*' + close + '$');

    this.SpecialRE = new RegExp(`[${this.Escaped.SPECIAL.replace('&', '')}]`);
    this.ContinueRE = new RegExp(this.Escaped.CONTINUATION + '\\r?\\n', 'g');
    this.WhitespaceRE = /[\u00a0\u2000-\u200b\u2028-\u2029\u3000]+/g;
    this.AnySymbolRE = new RegExp(`[${anysym}]`); // added

    this.silent = false;
    this.lexer = new Lexer(tokens);
    this.parser = new RiScriptParser(tokens);
    this.RiTa = opts.RiTa || {
      VERSION: 0,
      randi: (k) => Math.floor(Math.random() * k),
    }
  }

  lex(opts) {
    if (!opts.input) throw Error('no input');
    const lexResult = this.lexer.tokenize(opts.input);
    if (lexResult.errors.length) {
      console.error('Input: ' + opts.input + '\n', lexResult.errors[0].message);
      throw Error('[LEXING] ' + lexResult.errors[0].message);
    }
    if (opts.trace) this.printTokens(lexResult.tokens);
    opts.tokens = lexResult.tokens;
    // return lexResult;
  }

  parse(opts) {
    opts.cst = this.parser.parse(opts);
  }

  visit(opts) {
    return this.visitor.start(opts);
  }

  lexParseVisit(opts = {}) {
    this.lex(opts);
    this.parse(opts);
    return this.visit(opts);
  }

  evaluate(script, context, opts = {}) {
    if (typeof script !== 'string') {
      throw Error('RiScript.evaluate() expects a string, got ' + typeof script);
    }
    opts.input = script;
    opts.visitor = new RiScriptVisitor(this, context);
    return this._evaluate(opts);
  }

  _evaluate(opts) {
    const { input } = opts;

    // opts.onepass = true; // TMP

    let last, endingBreak = /\r?\n$/.test(input); // keep

    let expr = this.preParse(input, opts);
    if (!expr) return '';

    if (opts.trace) console.log(`\nInput:  '${RiScript._escapeText(input)}'`);
    if (opts.trace && input !== expr) {
      console.log(`Parsed: '${RiScript._escapeText(expr)}'`);
    }

    if (!opts.visitor) throw Error('no visitor');
    this.visitor = opts.visitor;
    delete opts.visitor; // remind me why

    for (let i = 1; expr !== last && i <= 10; i++) {
      last = expr;

      if (opts.trace) console.log('-'.repeat(20) + ' Pass#' + i + ' ' + '-'.repeat(20));

      opts.input = expr;
      expr = this.lexParseVisit(opts); // do it

      if (opts.trace) {
        console.log(`Result(${i}) -> "` + `${RiScript._escapeText(expr)}"`
          + ` ctx=${this.visitor.lookupsToString()}`);
      }

      // end if no more riscript
      if (opts.onepass || !this.isParseable(expr)) break;
    }

    // check for unresolved symbols ([$#]) after removing HTML entities
    if (!this.silent && !this.RiTa.SILENT) {
      if (this.AnySymbolRE.test(expr.replace(HtmlEntities, ''))) {
        console.warn('[WARN] Unresolved symbol(s) in "' + expr.replace(/\n/g, '\\n') + '" ');
      }
    }

    return this.postParse(expr, opts) + (endingBreak ? '\n' : '');
  }

  _query(rawQuery, opts) {
    return new RiQuery(this, rawQuery, opts);
  }

  printTokens(tokens) {
    let s = tokens.reduce((str, t) => {
      let { name } = t.tokenType;
      let tag = name;
      if (tag === 'TEXT') tag = RiScript._escapeText(t.image, 1);
      if (tag === 'SYM') tag = 'sym(' + t.image + ')';
      if (tag === 'TX') tag = 'tx(' + t.image + ')';
      return str + tag + ', ';
    }, '')
      .slice(0, -2);
    console.log('\nTokens: [ ' + s + ' ]  Context:',
      this.visitor.lookupsToString());
  }

  postParse(input, opts) {
    if (typeof input !== 'string') return '';

    // replace html entities
    let decoded = decode(input);

    // clean up whitespace, linebreaks
    let result = decoded.replace(this.WhitespaceRE, ' ').replace(/\r?\n$/, '');

    // handle unresolved gates
    let gates = [...result.matchAll(this.Symbols.PENDING_GATE_RE)];
    gates.forEach((g) => {
      if (!g || !g[0] || !g[1]) throw Error('bad gate: ' + g);
      let deferredGate = this.visitor.pendingGates[g[1]];
      let { deferredContext, operands } = deferredGate;
      if (!operands.length) throw Error('no operands');
      let reject = this.visitor.choice(deferredContext, { forceReject: true });

      result = result.replace(g[0], reject);
      if (opts.trace) console.log('  ' + g[0] + '-> ' + reject);
    });

    if (opts.trace) console.log(`\nFinal: '${result}'`);

    if (!opts.preserveLookups) {
      // reset lookups unless preserveLookups=true (for testing only)
      this.visitor.statics = undefined;
      this.visitor.dynamics = undefined;
    }

    return result;
  }

  preParse(script, opts) {
    if (typeof script !== 'string') return '';

    const $ = this.Symbols;

    let input = script;
    if (!this.v2Compatible) {
      // handle parenthesized weights ??
      input = input.replace(/\((\s*\d+\s*)\)/g, '^$1^');
    }

    input = input.replace(/\/\*[^]*?(\r?\n)?\//g, ''); // multi-line comments
    input = input.replace(/\/\/[^\n]+(\r?\n|$)/g, ''); // single-line comments
    input = input.replace(this.ContinueRE, ''); // line continuations
    input = slashEscapesToEntities(input); // double-backslashed escapes

    let result = '';
    let lines = input.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      // special-case: handle assignments alone on a line
      if (/*!opts.noAddedSilence && */ this.RawAssignRE.test(lines[i])) {
        // a very convoluted way of preserving line-breaks inside groups
        let eqIdx = lines[i].indexOf('=');
        if (eqIdx < 0) throw Error('invalid state: no assigment: ' + lines[i]);
        let lhs = lines[i].substring(0, eqIdx),
          rhs = lines[i].substring(eqIdx + 1);
        let opens = charCount(rhs, $.OPEN_CHOICE);
        let closes = charCount(rhs, $.CLOSE_CHOICE);
        while (opens > closes) {
          let line = lines[++i];
          rhs += '\n' + line;
          opens += charCount(line, $.OPEN_CHOICE);
          closes += charCount(line, $.CLOSE_CHOICE);
        }
        result += $.OPEN_SILENT + (lhs + '=' + rhs) + $.CLOSE_SILENT;
      } else {
        result += lines[i];
        if (i < lines.length - 1) result += '\n';
      }
    }

    return result;
  }

  /*
   * Parses a mingo query into JSON format
   */
  parseJSOL(text) {
    const unescapeRegexProperty = (text) => {
      // TODO: why do we need this?
      let res = text;
      if (
        typeof text === 'string' &&
        text.startsWith(RegexEscape) &&
        text.endsWith(RegexEscape)
      ) {
        let parts = text.split(RegexEscape);
        if (parts.length !== 4) throw Error('invalid regex in unescape');
        res = new RegExp(parts[1], parts[2]);
      }
      return res;
    };
    let escaped = RiScript._escapeJSONRegex(text)
      .replace(this.JSOLIdentRE, '"$1":')
      .replace(/'/g, '"');

    // console.log("escaped: '"+escaped+"'");

    let result = JSON.parse(escaped),
      urp = unescapeRegexProperty;
    Object.keys(result).forEach((k) => (result[k] = urp(result[k])));
    return result;
  }

  isParseable(s) {
    // conservatively assume non-string/numbers are always parseable
    let result = true;
    let isStrOrNum = /(string|number)/.test(typeof s);
    // if a string or num, test for special chars
    if (isStrOrNum) result = this.SpecialRE.test(s.toString());
    return result;
  }

  // ========================= statics ===============================


  // Default transform that adds an article
  static articlize(s) {
    if (!s || !s.length) return '';

    let first = s.split(/\s+/)[0];

    if (!RiScript.RiTa?.phones) {
      if (!RiScript.RiTaWarnings.phones) {
        console.warn('[WARN] Install RiTa for proper phonemes');
        RiScript.RiTaWarnings.phones = true;
      }
      // first.startsWith('a') ? 'an ' : 'a ') + s;
      return (/^[aeiou].*/i.test(first) ? 'an ' : 'a ') + s;
    }

    let phones = RiScript.RiTa.phones(first, { silent: true });

    // could still be original word if no phones found
    return (
      (phones && phones.length && VowelRE.test(phones[0]) ? 'an ' : 'a ') + s
    );
  }

  // Default transform that capitalizes the first character
  static capitalize(s) {
    return s ? s[0].toUpperCase() + s.substring(1) : '';
  }

  // Default transform that capitalizes the string
  static uppercase(s) {
    return s ? s.toUpperCase() : '';
  }

  // Default transform that wraps the string in (smart) quotes.
  static quotify(s) {
    return '&#8220;' + (s || '') + '&#8221;';
  }

  // Default transform that pluralizes a string (requires RiTa)
  static pluralize(s) {
    if (!RiScript.RiTa?.pluralize) {
      if (!RiScript.RiTaWarnings.plurals) {
        RiScript.RiTaWarnings.plurals = true;
        console.warn('[WARN] Install RiTa for proper pluralization');
      }
      return s.endsWith('s') ? s : s + 's';
    }
    return RiScript.RiTa.pluralize(s);
  }

  // Default no-op transform
  static identity(s) {
    return s;
  }

  // static helpers

  static _transformNames(txs) {
    return txs && txs.length
      ? txs.map((tx) => tx.image.replace(/(^\.|\(\)$)/g, ''), [])
      : [];
  }

  static _escapeText(s, quotify) {
    if (typeof s !== 'string') return s;
    let t = s.replace(/\r?\n/g, '\\n');
    return quotify || !t.length ? "'" + t + "'" : t;
  }

  static _escapeJSONRegex(text) {
    return text.replace(
      /\/([^/]+?)\/([igmsuy]*)/g,
      `"${RegexEscape}$1${RegexEscape}$2${RegexEscape}"`
    );
  }

  static _stringHash(s) {
    let chr,
      hash = 0;
    for (let i = 0; i < s.length; i++) {
      chr = s.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    let strHash = hash.toString();
    return hash < 0 ? strHash.replace('-', '0') : strHash;
  }
}

////////////////////// STATIC PROPS ///////////////////////

RiScript.transforms = {
  quotify: RiScript.quotify,
  pluralize: RiScript.pluralize,
  capitalize: RiScript.capitalize,
  articlize: RiScript.articlize,
  uppercase: RiScript.uppercase,

  // sequences
  norepeat: RiScript.identity,

  // aliases
  art: RiScript.articlize,
  nr: RiScript.identity,
  cap: RiScript.capitalize,
  ucf: RiScript.capitalize, // deprecated?
  uc: RiScript.uppercase,
  qq: RiScript.quotify,
  s: RiScript.pluralize,
};

///////////////////////// FUNCTIONS /////////////////////////

function slashEscapesToEntities(s) {
  s = replaceAll(s, '\\(', '&lpar;');
  s = replaceAll(s, '\\)', '&rpar;');
  s = replaceAll(s, '\\[', '&lsqb;');
  s = replaceAll(s, '\\]', '&rsqb;');
  s = replaceAll(s, '\\{', '&lcqb;');
  s = replaceAll(s, '\\}', '&rcqb;');
  s = replaceAll(s, '\\@', '&commat;');
  s = replaceAll(s, '\\#', '&num;');
  s = replaceAll(s, '\\|', ' &vert');
  s = replaceAll(s, '\\=', ' &equals');
  return s;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function replaceAll(str, match, replacement) {
  return str.replace(new RegExp(escapeRegExp(match), 'g'), () => replacement);
}
function charCount(str, c) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === c) count++;
  }
  return count;
}

export { RiScript };