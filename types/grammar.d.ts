/**
 * A probabilistic context-free grammar for text-generation, supporting all RiScript
 *  features, including transforms, gates, choices, sequences and assignments.
 * @class RiGrammar
 */
export class RiGrammar {
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
    static expand(rules: string, context?: object, options?: {
        start?: string;
        trace?: boolean;
        onepass?: boolean;
        silent?: boolean;
    }): string;
    /**
     * Creates a new RiGrammar from the supplied JSON string
     * @param {string} json - a JSON string representing the grammar
     * @param {object} [context] - optional context for the grammar
     * @returns {RiGrammar} - the RiGrammar instance
     */
    static fromJSON(json: string, context?: object): RiGrammar;
    /**
     * Creates an instance of RiGrammar.
     * @param {Object<string, string>|string} [rules] - an object (or JSON string) containing the rules
     * @param {Object<string, any>} [context] - the context (or world-state)
     */
    constructor(rules?: {
        [x: string]: string;
    } | string, context?: {
        [x: string]: any;
    });
    /** @type {Object<string, string>} */ rules: {
        [x: string]: string;
    };
    /** @type {RiScript} */ scripting: RiScript;
    /** @type {Object<string, any>} */ context: {
        [x: string]: any;
    };
    /**
     * Adds a transform to the Grammar instance
     * @param {string} name - the name of the transform
     * @param {Function} def - a function that takes a string and returns a string
     * @returns {RiScript} - the RiScript instance
     */
    addTransform(name: string, def: Function): RiScript;
    /**
     * Removes a transform from the Grammar instance
     * @param {string} name
     * @returns {RiScript} - the RiScript instance
     */
    removeTransform(name: string): RiScript;
    /**
     * Returns the names of all current transforms
     * @returns {string[]} the names of the transforms
     */
    getTransforms(): string[];
    /**
     * Tests whether two grammars are equal and returns a boolean
     * @param {RiGrammar} rg - the grammar to compare to
     * @returns {boolean} - whether the grammars are equal
     */
    equals(rg: RiGrammar): boolean;
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
    expand(opts?: {}): string;
    /**
     * Validates a rule and adds a new rule to the grammar
     * @param {string} name - the name of the rule
     * @param {string} def - the definition of the rule
     * @returns {RiGrammar} - the RiGrammar instance
     */
    addRule(name: string, def: string): RiGrammar;
    /**
     * Sets the rules for the grammar, removing any previous rules
     * @param {object|string} rules - an object or JSON string holding the rules for the grammar
     * @returns {RiGrammar} - the RiGrammar instance
     */
    setRules(rules: object | string): RiGrammar;
    /**
     * Removes a rule from the grammar
     * @param {string} name - the name of the rule to remove
     * @returns {RiGrammar} - the RiGrammar instance
     */
    removeRule(name: string): RiGrammar;
    /**
     * Returns a JSON representation of the grammar rules, accepting the same options as `JSON.stringify()`
     * @returns {string} - the JSON representation of the grammar
     */
    toJSON(...args: any[]): string;
    /**
     * Returns a string representation of the grammar, accecpting the same options as `JSON.stringify()`
     * @param {object} [options] - options for the string representation
     * @param {string} [options.replacer] - a replacer function or array
     * @param {string} [options.space] - the number of spaces to indent
     * @param {string} [options.linebreak] - the linebreak character to use
     */
    toString(options?: {
        replacer?: string;
        space?: string;
        linebreak?: string;
    }): string;
    /**
     * Converts grammar to inline rules; rules are dynamic, unless otherwise specified with leading #
     * @private
     */
    private _toScript;
    /**
     * Validates a grammar rule
     * @private
     */
    private _validateRule;
}
import { RiScript } from './riscript.js';
