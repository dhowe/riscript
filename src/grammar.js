
import { RiScript } from './riscript.js'
import { RiScriptVisitor } from './visitor.js' // 12/13/2023

/**
 * A probabilistic context-free grammar for text-generation, supporting all RiScript
 *  features, including transforms, gates, choices, sequences and assignments.
 * @class RiGrammar
 * @memberof module:riscript
 */
class RiGrammar {

  /**
   * Creates an instance of RiGrammar.
   * @param {Object<string, string>|string} [rules] - an object (or JSON string) containing the rules
   * @param {Object<string, any>} [context] - the context (or world-state)
   * @param {Object<string, any>} [options] - options for the grammar
   */
  constructor(rules = {}, context = {}, options = {}) {

    /** @type {Object<string, string>} */ this.rules = {};
    /** @type {Object<string, any>} */ this.context = context;
    /** @type {RiScript} */ this.scripting = new RiScript(options);


    if (typeof rules === 'string') {
      rules = parseJSON(rules);
    }

    if (typeof rules !== 'object') {
      throw Error('RiGrammar: expecting object, found ' + typeof rules);
    }

    this.setRules(rules);
  }

  /**
   * Creates a new RiGrammar from the `rules`, `context` and `options`, then calls `expand()` on it.
   * @param {string} rules - an object containing the rules
   * @param {object} [context] - the context (or world-state) for the expansion
   * @param {object} [options] - options for the expansion
   * @param {string} [options.start='$start'] - the rule to start from
   * @param {boolean} [options.trace=false] - whether to trace the evaluation to the console
   * @param {boolean} [options.onepass=false] - whether to only do one evaluation pass 
   * @param {boolean} [options.silent=false] - whether to suppress console warnings
   * @returns {string} - the expanded text
   */
  static expand(rules, context, options) {
    return new RiGrammar(rules, context).expand(options);
  }

  /**
   * Adds a transform to the Grammar instance
   * @param {string} name - the name of the transform
   * @param {Function} def - a function that takes a string and returns a string
   * @returns {RiGrammar} - the RiGrammar instance
   */
  addTransform(name, def) {
    this.scripting.addTransform(name, def);
    return this;
  }
  
  /**
   * Removes a transform from the Grammar instance
   * @param {string} name 
   * @returns {RiGrammar} - the RiGrammar instance
   */
  removeTransform(name) {
    this.scripting.removeTransform(name);
    return this;
  }

  /**
   * Returns the names of all current transforms
   * @returns {string[]} the names of the transforms
   */
  getTransforms() {
    return this.scripting.getTransforms();
  }

  /**
   * Tests whether two grammars are equal and returns a boolean
   * @param {RiGrammar} rg - the grammar to compare to 
   * @returns {boolean} - whether the grammars are equal
   */
  equals(rg) {
    return rg.toJSON() === this.toJSON();
  }

  /**
   * Expands a grammar from the supplied rule. If no rule is provided the `$start` and `<start>`
   *  symbols will be checked respectively. If a context is needed, it should be passed when the
   *  grammar is created.
   * @param {object} [options] - options for the expansion
   * @param {string} [options.start='$start'] - the rule to start from
   * @param {boolean} [options.trace=false] - whether to trace the evaluation to the console
   * @param {boolean} [options.onepass=false] - whether to only do one evaluation pass 
   * @param {boolean} [options.silent=false] - whether to suppress console warnings
   * @returns {string} - the expanded text
   */
  expand(options = {}) {
    if ('context' in options) {
      throw Error('pass context to RiScript.grammar() or new RiGrammar() instead');
    }

    let visitor = new RiScriptVisitor(this.scripting);
    visitor.context = this.context || {};

    let clonedOpts = { ...options, visitor, input: this._toScript(options) };

    return this.scripting._evaluate(clonedOpts);
  }

  /**
   * Validates a rule and adds a new rule to the grammar
   * @param {string} name - the name of the rule
   * @param {string} def - the definition of the rule
   * @returns {RiGrammar} - the RiGrammar instance
   */
  addRule(name, def) {
    this._validateRule(name, def);
    this.rules[name] = def;
    return this;
  }

  /**
   * Sets the rules for the grammar, removing any previous rules
   * @param {object|string} rules - an object or JSON string holding the rules for the grammar 
   * @returns {RiGrammar} - the RiGrammar instance
   */
  setRules(rules) {
    if (typeof rules === 'undefined') throw Error('undefined rules');
    this.rules = {};
    let incoming = typeof rules === 'string' ? parseJSON(rules) : rules;
    Object.entries(incoming).forEach((e) => this.addRule(...e));
    return this;
  }

  /**
   * Removes a rule from the grammar
   * @param {string} name - the name of the rule to remove
   * @returns {RiGrammar} - the RiGrammar instance
   */
  removeRule(name) {
    if (name in this.rules) {
      delete this.rules[name];
    }
    return this;
  }

  /**
   * Returns a JSON representation of the grammar rules, accepting options from `JSON.stringify()`
   * @param {any} [replacer] - a replacer function or array
   * @param {string | number} [space] - the number of spaces to indent
   * @returns {string} - the JSON representation of the grammar
   */
  toJSON(replacer, space) {
    return JSON.stringify(this.rules, replacer, space);
  }

  /** 
   * Returns a string representation of the grammar, accecpting the same options as `JSON.stringify()`
   * @param {object} [options] - options for the string representation
   * @param {any} [options.replacer] - a replacer function or array
   * @param {string | number} [options.space] - the number of spaces to indent
   * @param {string} [options.linebreak] - the linebreak character to use
   */
  toString(options = {}) {
    let replacer = options.replacer || 0;
    let space = options.space || 2;
    let lb = options?.linebreak;
    let res = this.toJSON(replacer, space);
    if (lb) res = res.replace(/\n/g, lb);
    return res;
  }

  /**
   * Creates a new RiGrammar from the supplied JSON string
   * @param {string} json - a JSON string representing the grammar
   * @param {object} [context] - optional context for the grammar
   * @returns {RiGrammar} - the RiGrammar instance
   */
  static fromJSON(json, context) {
    return new RiGrammar(JSON.parse(json), context);
  }

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Converts grammar to inline rules; rules are dynamic, unless otherwise specified with leading #
   * @private
   */
  _toScript(opts) {

    let script = '';
    let start = opts.start || 'start';

    let { Symbols } = this.scripting;

    if (start.startsWith(Symbols.DYNAMIC)) {
      start = start.substring(Symbols.DYNAMIC.length);
    }

    if (start.startsWith(Symbols.STATIC)) {
      start = start.substring(Symbols.STATIC.length);
    }

    if (!(start in this.rules || Symbols.STATIC + start in this.rules)) {
      throw Error('Rule: "' + start + '" not found in grammar');
    }

    Object.entries(this.rules).forEach(([name, rule], i) => {
      while (name.startsWith(Symbols.DYNAMIC)) {
        name = name.substring(1);
      }
      if (!name.startsWith(Symbols.STATIC)) {
        name = Symbols.DYNAMIC + name;
      }
      // console.log(i,name);
      if (!this.scripting.regex.ChoiceWrap.test(rule)) {
        // let orig = rule;
        rule = Symbols.OPEN_CHOICE + rule + Symbols.CLOSE_CHOICE;
        // console.log('WRAPPING: ' + orig + '->' + rule);
      }
      script += `${name}=${rule}\n`;
    });

    if (opts.trace) console.log('Grammar:\n' + script.replace(/^\$/gm, '  $'));

    script += `${Symbols.DYNAMIC}${start}`;

    return script;
  }

  /**
   * Validates a grammar rule
   * @private
   */
  _validateRule(name, def) {
    if (typeof name !== 'string' || name.length === 0) {
      throw Error('expected [string] name');
    }

    if (typeof def === 'undefined') {
      throw Error('undefined rule def: ' + name);
    }
    let { Symbols } = this.scripting;

    if (name.startsWith(Symbols.DYNAMIC)) {
      name = name.substring(Symbols.DYNAMIC.length);
      throw Error(
        'Grammar rules are dynamic by default;' +
        " if you need a static rule, use '" +
        Symbols.STATIC +
        name +
        "', otherwise just use '" +
        name +
        "'."
      );
    }
  }
}

//////////////////////////////////////////////////////////////////////////////

function parseJSON(json) {
  if (typeof json === 'string') {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw Error(
        'RiGrammar appears to be invalid JSON,' +
        ' please check it at http://jsonlint.com/\n' +
        json
      );
    }
  }
}

export { RiGrammar };
