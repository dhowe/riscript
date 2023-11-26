import he from 'he';
import { Query } from 'mingo';
import { Lexer } from 'chevrotain';

import { RiScriptParser } from './parser.js';
import { RiScriptVisitor } from './visitor.js';
import { getTokens, TextTypes } from './tokens.js';

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
const Vowels = /[aeiou]/;
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

  static VERSION = '[VI]{{inject}}[/VI]';

  static Query = RiQuery;
  static RiTaWarnings = { plurals: false, phones: false, silent: false };

  static evaluate(script, context, opts = {}) {
    return new RiScript(opts).evaluate(script, context, opts);
  }

  constructor(opts = { /*RiTa:0, compatibility: 2*/ }) {
    this.visitor = 0; // created in evaluate() or passed in here
    this.v2Compatible = opts.compatibility === 2;
    const { Constants, tokens } = getTokens(this.v2Compatible);
    const { Escaped, Symbols } = Constants;

    this.Escaped = Escaped;
    this.Symbols = Symbols;

    const open = Escaped.OPEN_CHOICE;
    const close = Escaped.CLOSE_CHOICE;
    const anysym = Escaped.STATIC + Escaped.DYNAMIC;

    this.regex = {
      LineBreaks: /\r?\n/,
      EndingBreak: /\r?\n$/,
      NonGateAtSigns: /([^}])@(?!{)/,
      AnySymbol: new RegExp(`[${anysym}]`),
      ParenthesizedWeights: /\((\s*\d+\s*)\)/g,
      MultiLineComments: /\/\*[^]*?(\r?\n)?\//g,
      SingleLineComments: /\/\/[^\n]+(\r?\n|$)/g,
      MarkdownLinks: /\[([^\]]+)\]\(([^)"]+)(?: \"([^\"]+)\")?\)/g,
      RawAssign: new RegExp(`^[${anysym}][A-Za-z_0-9][A-Za-z_0-9]*\\s*=`),
      JSOLIdent: new RegExp(`([${anysym}]?[A-Za-z_0-9][A-Za-z_0-9]*)\\s*:`, 'g'),
      ChoiceWrap: new RegExp('^' + open + '[^' + open + close + ']*' + close + '$'),
      ValidSymbol: new RegExp('(' + Escaped.DYNAMIC + '|' + Escaped.STATIC + '[A-Za-z_0-9])[A-Za-z_0-9]*'),
      Entity: tokens./*modes.normal.*/filter(t => t.name === 'Entity')[0].PATTERN,
      StaticSymbol: new RegExp(Escaped.STATIC + '[A-Za-z_0-9][A-Za-z_0-9]*'),
      Special: new RegExp(`[${Escaped.SPECIAL.replace('&', '')}]`),
      Continue: new RegExp(Escaped.CONTINUATION + '\\r?\\n', 'g'),
      Whitespace: /[\u00a0\u2000-\u200b\u2028-\u2029\u3000]+/g,
    }

    this.textTypes = TextTypes;
    this.lexer = new Lexer(tokens);
    this.parser = new RiScriptParser(tokens, this.textTypes);
    this.RiTa = (opts.RiTa && opts.RiTa.VERSION) ? opts.RiTa : {
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

    let last, endingBreak = this.regex.EndingBreak.test(input); // keep

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

      if (opts.trace) console.log('-'.repeat(20)
        + ' Pass#' + i + ' ' + '-'.repeat(20));

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
    if (!opts.silent && !this.RiTa.SILENT) {
      if (this.regex.ValidSymbol.test(expr.replace(HtmlEntities, ''))) {
        console.warn('[WARN] Unresolved symbol(s) in "'
          + expr.replace(/\n/g, '\\n') + '" ');
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

  preParse(script, opts) {
    if (typeof script !== 'string') return '';

    const $ = this.Symbols;

    let input = script;
    if (!this.v2Compatible) { // handle parenthesized weights
      input = input.replace(this.regex.ParenthesizedWeights, '^$1^');
    }

    let replaced = input.replace(this.regex.NonGateAtSigns, '$1&#64;'); // non-gate @-signs
    if (replaced !== input) {
      // console.log('Removed non-gate @-sign: ','\n', input,'\n', replaced);
      input = replaced;
    }

    let matches = input.match(this.regex.MarkdownLinks, ''); // md-links
    matches && matches.forEach(m => input = input.replace(m, escapeMarkdownLink(m)));
    input = input.replace(this.regex.MultiLineComments, ''); // multi-line comments
    input = input.replace(this.regex.SingleLineComments, ''); // single-line comments
    input = input.replace(this.regex.Continue, ''); // line continuations
    input = slashEscapesToEntities(input); // double-backslashed escapes

    let result = '';
    let lines = input.split(this.regex.LineBreaks);
    for (let i = 0; i < lines.length; i++) {
      // special-case: handle assignments alone on a line
      if (this.regex.RawAssign.test(lines[i])) {
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

  postParse(input, opts) {
    if (typeof input !== 'string') return '';

    // replace html entities
    let decoded = decode(input);

    // clean up whitespace, linebreaks
    let result = decoded.replace(this.regex.Whitespace, ' ').replace(this.regex.EndingBreak, '');

    // handle unresolved gates
    let gates = [...result.matchAll(this.Symbols.PENDING_GATE_RE)];
    gates.forEach((g) => {
      if (!g || !g[0] || !g[1]) throw Error('bad gate: ' + g);
      let deferredGate = this.visitor.pendingGates[g[1]];
      let { deferredContext, operands, gateText } = deferredGate;
      if (!operands.length) throw Error('no operands');
      let reject = this.visitor.choice(deferredContext, { forceReject: true });

      result = result.replace(g[0], reject);
      if (opts.trace) console.log('Unresolved gate: \'' + gateText + '\' {reject}');
    });

    if (opts.trace) console.log(`\nFinal: '${result}'`);

    if (!opts.preserveLookups) {
      // reset lookups unless preserveLookups=true (for testing only)
      this.visitor.statics = undefined;
      this.visitor.dynamics = undefined;
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
    let escaped = escapeJSONRegex(text)
      .replace(this.regex.JSOLIdent, '"$1":')
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
    if (isStrOrNum) result = this.regex.Special.test(s.toString());
    return result;
  }

  // ========================= statics ===============================
  static addTransform(name, def) {
    return RiScript.transforms[name] = def;
  }

  static getTransforms() {
    return Object.keys(RiScript.transforms);
  }

  static removeTransform(name) {
    delete RiScript.transforms[name];
  }

  // Default transform that adds an article
  static articlize(s) {
    if (!s || !s.length) return '';

    let first = s.split(/\s+/)[0];

    if (!this.RiTa?.phones) {
      if (!RiScript.RiTaWarnings.phones && !RiScript.RiTaWarnings.silent) {
        console.warn('[WARN] Install RiTa for proper phonemes');
        RiScript.RiTaWarnings.phones = true;
      }
      // first.startsWith('a') ? 'an ' : 'a ') + s;
      return (/^[aeiou].*/i.test(first) ? 'an ' : 'a ') + s;
    }

    let phones = this.RiTa.phones(first, { silent: true });

    // could still be original word if no phones found
    return (
      (phones && phones.length && Vowels.test(phones[0]) ? 'an ' : 'a ') + s
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
    if (!this.RiTa?.pluralize) {
      if (!RiScript.RiTaWarnings.plurals && !RiScript.RiTaWarnings.silent) {
        RiScript.RiTaWarnings.plurals = true;
        console.warn('[WARN] Install RiTa for proper pluralization');
      }
      return s.endsWith('s') ? s : s + 's';
    }
    return this.RiTa.pluralize(s);
  }

  // Default no-op transform
  static identity(s) {
    return s;
  }

  // static helpers

  static _escapeText(s, quotify) {
    if (typeof s !== 'string') return s;
    let t = s.replace(/\r?\n/g, '\\n');
    return quotify || !t.length ? "'" + t + "'" : t;
  }

  static _stringHash(s) { // for testing
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

function escapeMarkdownLink(txt) {
  let result = txt;
  let lookups = { '[': '&lsqb;', ']': '&rsqb;', '(': '&lpar;', ')': '&rpar;', '/': '&sol;' };
  Object.entries(lookups).forEach(([k, v]) => result = result.replace(new RegExp(`\\${k}`, 'g'), v));
  return result;
}

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

function escapeJSONRegex(text) {
  return text.replace(
    /\/([^/]+?)\/([igmsuy]*)/g,
    `"${RegexEscape}$1${RegexEscape}$2${RegexEscape}"`
  );
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