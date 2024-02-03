/** @module riscript */

import he from 'he';
import { Query } from 'mingo';
import { Lexer } from 'chevrotain';

import { RiScriptParser } from './parser.js';
import { RiScriptVisitor } from './visitor.js';
import { getTokens, TextTypes } from './tokens.js';
import { RiGrammar } from './grammar.js';
import { Util } from './util.js';

const { decode } = he;
const Vowels = /[aeiou]/;
const HtmlEntities = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi;
const { escapeText, slashEscToEntities, escapeMarkdownLink, escapeJSONRegex } = Util;

/** @private */
class RiQuery extends Query {

  constructor(scripting, condition, options) {

    if (typeof condition !== 'string') {
      try {
        condition = JSON.stringify(condition);
      }
      catch (e) {
        throw Error(condition.toString().includes('@') ?
          'Replace @ with $ when passing an object to RiQuery\nRoot: ' + e : e);
      }
    }

    if (!condition.includes('$')) throw Error('Invalid Gate: \''
      + condition + "' -> operand must include $symbol or $function()");

    condition = condition.replace(/(\$|\(\))/g, '').replace(/@/g, '$');
    condition = scripting.parseJSOL(condition);
    
    super(condition, options);
  }

  test(obj) {
    // @ts-ignore
    let compiled = this.compiled;
    for (let i = 0, len = compiled.length; i < len; i++) {
      if (!compiled[i](obj)) return false;
    }
    return true;
  }

  operands() {
    // @ts-ignore
    const stack = [this.condition];
    const keys = new Set();
    while (stack?.length > 0) {
      const currentObj = stack.pop();
      Object.keys(currentObj).forEach((key) => {
        const value = currentObj[key];
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

/**
 * The RiScript interpreter, responsible for lexing, parsing and evaluating 
 * RiScript and RiGrammar expressions
 */
class RiScript {

  /** @type {string} */
  static VERSION = '[VI]{{inject}}[/VI]';

  /** @type {typeof RiQuery} */
  static Query = RiQuery;

  /** @type {Object.<string, boolean>} */
  static RiTaWarnings = { plurals: false, phones: false, silent: false };

  /**
   * Create a RiTa grammar instance
   * @param {object} [rules] - the rules of the grammar
   * @param {object} [context] - the context of the grammar
   * @param {object} [options] - options for the evaluation
   * @returns {RiGrammar} - a new RiGrammar instance
   */
  static grammar(rules, context, options) {
    return new RiGrammar(rules, context, options);
  }

  /**
   * Evaluates the input script via the RiScript parser
   * @param {string} script - the script to evaluate
   * @param {object} [context] - the context (or world-state) to evaluate in
   * @param {object} [options] - options for the evaluation
   * @param {object} [options.RiTa] - optionals RiTa object to use in transforms
   * @param {number} [options.compatibility] - the RiTa compatibility level (pass 2 for v2)
   * @param {boolean} [options.trace=false] - whether to trace the evaluation
   * @returns {string} - the evaluated script
   */
  static evaluate(script, context, options = {}) {
    return new RiScript(options).evaluate(script, context, options);
  }

  /**
   * Creates a new RiScript instance
   * @param {object} [options] - options for the object
   * @param {object} [options.RiTa] - optionals RiTa object to use in transforms
   * @param {number} [options.compatibility] - the RiTa compatibility level
   */
  constructor(options = {}) {

    /** @type {Object.<string, any>} */ this.Escaped = undefined
    /** @type {Object.<string, string>} */ this.Symbols = undefined;

    // created in evaluate() or passed as arg here
    /** @type {RiScriptVisitor} */this.visitor = undefined;

    /** @type {boolean} */ this.v2Compatible = (options.compatibility === 2);

    const { Constants, tokens } = getTokens(this.v2Compatible);

    ({ Escaped: this.Escaped, Symbols: this.Symbols } = Constants);

    this.pendingGateRe = new RegExp(`${this.Escaped.PENDING_GATE}([0-9]{9,11})`, 'g');

    /** @type {string[]} */ this.textTypes = TextTypes;

    /** @type {Object<string, any>} */ this.RiTa = options.RiTa || {
      VERSION: 0,
      randi: (k) => Math.floor(Math.random() * k)
    }

    /** @type {Object.<string, Function>} */
    this.transforms = this._createTransforms();

    /** @type {Object.<string, RegExp>} */
    this.regex = this._createRegexes(tokens);

    /** @type {Lexer} */
    this.lexer = new Lexer(tokens);

    /** @type {RiScriptParser} */
    this.parser = new RiScriptParser(tokens, TextTypes);
  }

  /** @private */
  lex(opts) {
    if (!opts.input) throw Error('no input');
    const lexResult = this.lexer.tokenize(opts.input);
    if (lexResult.errors.length) {
      console.error('Input: ' + opts.input + '\n', lexResult.errors[0].message);
      throw Error('[LEXING] ' + lexResult.errors[0].message);
    }
    if (opts.traceLex) this._printTokens(lexResult.tokens);
    opts.tokens = lexResult.tokens;
    // return lexResult;
  }

  /** @private */
  parse(opts) {
    opts.cst = this.parser.parse(opts);
  }

  /** @private */
  visit(opts) {
    // @ts-ignore
    return this.visitor.start(opts);
  }

  /**
   * Evaluates the input script via the RiScript parser
   * @param {string} script - the script to evaluate
   * @param {object} [context] - the context (or world-state) to evaluate in
   * @param {object} [options] - options for the evaluation
   * @returns {string}
   */
  evaluate(script, context, options) {
    if (typeof script !== 'string') {
      throw Error('evaluate() expects a string, got ' + typeof script);
    }
    if (typeof options !== 'object') {
      options = {};
    }
    options.input = script;
    options.visitor = new RiScriptVisitor(this, context);
    return this._evaluate(options);
  }

  /** @private */
  lexParseVisit(opts = {}) {
    this.lex(opts);
    this.parse(opts);
    return this.visit(opts);
  }

  /**
   * Add a transform function to this instance
   * @param {string} name - the name of the transform
   * @param {function} def - the transform function
   * @returns {RiScript} this instance
   */
  addTransform(name, def) {
    this.transforms[name] = def;
    return this;
  }

  /**
   * Returns the names of all current transforms
   * @returns {string[]} the names of the transforms
   */
  getTransforms() {
    return Object.keys(this.transforms);
  }

  /**
   * Removes a transform function from this instance
   * @param {string} name of transform to remove
   * @returns {RiScript} this instance
   */
  removeTransform(name) {
    delete this.transforms[name];
    return this;
  }

  ///////////////////////////////////// End API //////////////////////////////////////

  /**
   * Private version of evaluate taking all arguments in the options object
   * @param {object} options - options for the evaluation
   * @param {string} options.input - the script to evaluate
   * @param {object} options.visitor - the visitor to use for the evaluation
   * @param {boolean} [options.trace] - whether to trace the evaluation
   * @param {boolean} [options.onepass] - whether to only do one pass
   * @param {boolean} [options.silent] - whether to suppress warnings
   * @returns {string} - the evaluated script's output text
   * @package
   */
  _evaluate(options) {

    const { input, visitor, trace, onepass, silent } = options;

    if (!input) throw Error('no input');
    if (!visitor) throw Error('no visitor');

    // onepass = true; // TMP

    let last, endingBreak = this.regex.EndingBreak.test(input); // keep

    let expr = this._preParse(input, options);
    if (!expr) return '';

    if (!options.visitor) throw Error('no visitor');
    this.visitor = options.visitor;
    delete options.visitor; // remind me why?

    if (trace) {
      console.log(`\nInput:  '${escapeText(input)}' ctx=${visitor.lookupsToString()}`);
      if (input !== expr) {
        console.log(`Parsed: '${escapeText(expr)}'`);
      }
    }

    for (let i = 1; expr !== last && i <= 10; i++) {
      last = expr;

      if (trace) console.log('-'.repeat(20)
        + ' Pass#' + i + ' ' + '-'.repeat(20));

      options.input = expr;
      expr = this.lexParseVisit(options) ?? '';// do it
      
      if (trace) {
        console.log(`Result(${i}) -> "` + `${escapeText(expr||'')}"`
          + ` ctx=${this.visitor.lookupsToString()}`);
      }

      // end if no more riscript
      if (onepass || !this.isParseable(expr)) break;
    }

    // check for unresolved symbols ([$#]) after removing HTML entities
    if (!silent && !this.RiTa.SILENT) {
      if (this.regex.ValidSymbol.test(expr.replace(HtmlEntities, ''))) {
        console.warn('[WARN] Unresolved symbol(s) in "'
          + expr.replace(/\n/g, '\\n') + '" ');
      }
    }

    return this._postParse(expr, options) + (endingBreak ? '\n' : '');
  }

  /** @private */
  _printTokens(tokens) {
    let s = tokens.reduce((str, t) => {
      let { name } = t.tokenType;
      let tag = name;
      if (tag === 'TEXT') tag = escapeText(t.image, true);
      if (tag === 'Symbol') tag = 'sym(' + t.image + ')';
      if (tag === 'TX') tag = 'tx(' + t.image + ')';
      return str + tag + ', ';
    }, '')
      .slice(0, -2);
    console.log('\nTokens: [ ' + s + ' ]\n');//  Context:', this.visitor.lookupsToString());
  }

  /** @private */
  _preParse(script, opts) {
    if (typeof script !== 'string') return '';

    const $ = this.Symbols;

    let input = script;
    if (!this.v2Compatible) { // handle parenthesized weights
      input = input.replace(this.regex.ParenthesizedWeights, '^$1^');
    }

    let matches = input.match(this.regex.MarkdownLinks); // md-links
    matches && matches.forEach(m => input = input.replace(m, escapeMarkdownLink(m)));
    input = input.replace(this.regex.MultiLineComments, ''); // multi-line comments
    input = input.replace(this.regex.SingleLineComments, ''); // single-line comments
    input = input.replace(this.regex.Continue, ''); // line continuations
    input = slashEscToEntities(input); // double-backslashed escapes

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

  /**
   * Creates a new RiQuery object from the raw query string
   * @package 
   */
  createQuery(rawQuery, opts) {
    return new RiQuery(this, rawQuery, opts);
  }

  /** @private */
  _postParse(input, opts) {
    if (typeof input !== 'string') return '';

    //console.log('_postParse "' + input + '"', opts);

    // replace html entities
    let decoded = decode(input);

    // clean up whitespace, linebreaks
    let result = decoded
      .replace(this.regex.Whitespace, ' ')
      .replace(this.regex.EndingBreak, '');

    // handle unresolved gates
    let gates = [...result.matchAll(this.pendingGateRe)];
    //console.log(result, result.length, this.pendingGateRe.toString(), [...result.matchAll(this.pendingGateRe)]);
    if (opts.trace && gates.length) {
      console.log('-'.repeat(20) + ' pGates ' + '-'.repeat(20));
    }
    this.visitor.order = 0;
    gates.forEach((g) => {
      if (!g || !g[0] || !g[1]) throw Error('bad gate: ' + g);
      let deferredGate = this.visitor.pendingGates[g[1]];
      if (!deferredGate) throw Error('no deferredGate: ' + g[1]);
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

  /**
   * Parses a mingo query into JSON format
   * @package
   */
  parseJSOL(text) {
    const unescapeRegexProperty = (text) => {
      const RegexEscape = Util.RegexEscape
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

    let result = JSON.parse(escaped), urp = unescapeRegexProperty;

    Object.keys(result).forEach((k) => (result[k] = urp(result[k])));

    return result;
  }

  /**
   * True if input contains parseable script
   * @private
   */
  isParseable(s) {
    // conservatively assume non-string/numbers are always parseable
    // otherwise, if a string or num, test for special chars
    let result = true;
    if (typeof s === 'number') {
      s = s.toString();
    }
    if (typeof s === 'string') {
      result = this.regex.Special.test(s) || s.includes(this.Symbols.PENDING_GATE)
      // || this.pendingGateRe.test(s);
    }
    return result;
  }

  // ========================= statics ===============================

  /**
   * Default transform that pluralizes a string (uses RiTa if available for phonemes)
   * @param {string} s - the string to transform
   * @param {object} [pluralizer] - custom pluralizer with pluralize() function
   * @returns {string} the transformed string
   * @private
   */
  static pluralize(s, pluralizer) {
    if (!pluralizer?.pluralize) {
      if (!RiScript.RiTaWarnings.plurals && !RiScript.RiTaWarnings.silent) {
        RiScript.RiTaWarnings.plurals = true;
        console.warn('[WARN] Install RiTa for proper pluralization');
      }
      return s.endsWith('s') ? s : s + 's';
    }
    return pluralizer.pluralize(s);
  }

  /**
   * Default transform that adds an article (uses RiTa if available for phonemes)
   * @param {string} s - the string to transform
   * @param {object} [phonemeAnalyzer] - custom phoneme analyzer with phones() function
   * @returns {string} the transformed string
   * @private
   */
  static articlize(s, phonemeAnalyzer) {
    if (!s || !s.length) return '';

    let first = s.split(/\s+/)[0];

    if (!phonemeAnalyzer?.phones) {
      if (!RiScript.RiTaWarnings.phones && !RiScript.RiTaWarnings.silent) {
        console.warn('[WARN] Install RiTa for proper phonemes');
        RiScript.RiTaWarnings.phones = true;
      }
      // first.startsWith('a') ? 'an ' : 'a ') + s;
      return (/^[aeiou].*/i.test(first) ? 'an ' : 'a ') + s;
    }

    let phones = phonemeAnalyzer.phones(first, { silent: true });

    // could still be original word if no phones found
    return ((phones?.length && Vowels.test(phones[0]) ? 'an ' : 'a ') + s);
  }

  /**
   * Default transform that uppercases the first character of the string
   * @param {string} s - the string to transform
   * @returns {string} the transformed string
   * @private
   */
  static capitalize(s) {
    return s ? s[0].toUpperCase() + s.substring(1) : '';
  }

  /**
   * Default transform that capitalizes the string
   * @param {string} s - the string to transform
   * @returns {string} the transformed string
   * @private
   */
  static uppercase(s) {
    return s ? s.toUpperCase() : '';
  }

  /**
   * Default transform that wraps the string in (smart) quotes.
   * @param {string} s - the string to transform
   * @returns {string} the transformed string
   * @private
   */
  static quotify(s) {
    return '&#8220;' + (s || '') + '&#8221;';
  }

  /**
   * Default no-op transform
   * @param {string} s - the string to transform
   * @returns {string} the transformed string
   * @private
   */
  static identity(s) {
    return s;
  }

    // ========================= helpers ===============================

  /** @private */
  _createRegexes(tokens) {

    const Esc = this.Escaped;
    const open = Esc.OPEN_CHOICE;
    const close = Esc.CLOSE_CHOICE;
    const anysym = Esc.STATIC + Esc.DYNAMIC;

    return {
      LineBreaks: /\r?\n/,
      EndingBreak: /\r?\n$/,
      NonGateAtSigns: /([^}])@(?!{)/,
      AnySymbol: new RegExp(`[${anysym}]`),
      ParenthesizedWeights: /\(\s*(\d+)\s*\)/g, // TODO: change for negative weights
      MultiLineComments: /\/\*[^]*?(\r?\n)?\//g,
      SingleLineComments: /\/\/[^\n]+(\r?\n|$)/g,
      MarkdownLinks: /\[([^\]]+)\]\(([^)"]+)(?: \"([^\"]+)\")?\)/g,
      RawAssign: new RegExp(`^[${anysym}][A-Za-z_0-9][A-Za-z_0-9]*\\s*=`),
      JSOLIdent: new RegExp(`([${anysym}]?[A-Za-z_0-9][A-Za-z_0-9]*)\\s*:`, 'g'),
      ChoiceWrap: new RegExp('^' + open + '[^' + open + close + ']*' + close + '$'),
      ValidSymbol: new RegExp('(' + Esc.DYNAMIC + '|' + Esc.STATIC + '[A-Za-z_0-9])[A-Za-z_0-9]*'),
      Entity: tokens.filter(t => t.name === 'Entity')[0].PATTERN,
      StaticSymbol: new RegExp(Esc.STATIC + '[A-Za-z_0-9][A-Za-z_0-9]*'),
      Special: new RegExp(`[${Esc.SPECIAL.replace('&', '')}]`),
      Continue: new RegExp(Esc.CONTINUATION + '\\r?\\n', 'g'),
      Whitespace: /[\u00a0\u2000-\u200b\u2028-\u2029\u3000]+/g,
    };
  }

  /** @private */
  _createTransforms() {
    let transforms = {
      quotify: (w) => RiScript.quotify(w),
      pluralize: (w) => RiScript.pluralize(w, this.RiTa),
      articlize: (w) => RiScript.articlize(w, this.RiTa),
      capitalize: (w) => RiScript.capitalize(w),
      uppercase: (w) => RiScript.uppercase(w),
      norepeat: (w) => RiScript.identity(w),
    };

    // aliases
    transforms.art = transforms.articlize;
    transforms.nr = transforms.norepeat;
    transforms.cap = transforms.capitalize;
    transforms.uc = transforms.uppercase;
    transforms.qq = transforms.quotify;
    transforms.s = transforms.pluralize;
    transforms.ucf = transforms.capitalize; // @dep

    return transforms;
  }
}

function charCount(str, c) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === c) count++;
  }
  return count;
}

// Class ref hacks for testing
RiScript.Visitor = RiScriptVisitor;
RiScript.Util = Util;

export { RiScript };