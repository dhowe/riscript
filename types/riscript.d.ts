export class RiScript {
    /** @type {string} */
    static VERSION: string;
    /** @type {typeof RiQuery} */
    static Query: typeof RiQuery;
    /** @type {Object.<string, boolean>} */
    static RiTaWarnings: {
        [x: string]: boolean;
    };
    /**
     * Evaluates the input script via the RiScript parser
     * @param {string} script - the script to evaluate
     * @param {object} context - the context (or world-state) to evaluate in
     * @param {object} [options] - options for the evaluation
     * @param {boolean} [options.trace] - whether to trace the evaluation=
     * @returns {string} - the evaluated script
     */
    static evaluate(script: string, context: object, options?: {
        trace?: boolean;
    }): string;
    static articlize(s: any, RiTa: any): string;
    static capitalize(s: any): any;
    static uppercase(s: any): any;
    static quotify(s: any): string;
    static pluralize(s: any, RiTa: any): any;
    static identity(s: any): any;
    constructor(opts?: {});
    /** @type {Object.<string, any>} */ Escaped: {
        [x: string]: any;
    };
    /** @type {Object.<string, string>} */ Symbols: {
        [x: string]: string;
    };
    /** @type {RiScriptVisitor} */
    visitor: RiScriptVisitor;
    v2Compatible: boolean;
    /** @type {string[]} */ textTypes: string[];
    /** @type {Object<string, any>} */ RiTa: {
        [x: string]: any;
    };
    /** @type {Object.<string, Function>} */
    transforms: {
        [x: string]: Function;
    };
    /** @type {Object.<string, RegExp>} */
    regex: {
        [x: string]: RegExp;
    };
    /** @type {Lexer} */
    lexer: Lexer;
    /** @type {RiScriptParser} */
    parser: RiScriptParser;
    lex(opts: any): void;
    parse(opts: any): void;
    visit(opts: any): any;
    /**
     * Evaluates the input script via the RiScript parser
     * @param {string} script - the script to evaluate
     * @param {object} context - the context (or world-state) to evaluate in
     * @param {object} opts - options for the evaluation
     * @returns {string}
     */
    evaluate(script: string, context: object, opts?: object): string;
    lexParseVisit(opts?: {}): any;
    /**
     * Add a transform function to this instance
     * @param {string} name - the name of the transform
     * @param {function} def - the transform function
     * @returns {RiScript} this instance
     */
    addTransform(name: string, def: Function): RiScript;
    /**
     * Returns the names of all current transforms
     * @returns {string[]} the names of the transforms
     */
    getTransforms(): string[];
    /**
     * Removes a transform function from this instance
     * @param {string} name of transform to remove
     * @returns {RiScript} this instance
     */
    removeTransform(name: string): RiScript;
    /**
      * Private version of evaluate taking all arguments in an options object
      * @param {object} [options] - options for the evaluation
      * @param {string} [options.input] - the script to evaluate
      * @param {object} [options.visitor] - the visitor to use for the evaluation
      * @param {boolean} [options.trace] - whether to trace the evaluation
      * @param {boolean} [options.onepass] - whether to only do one pass
      * @param {boolean} [options.silent] - whether to suppress warnings
      * @returns {string} - the evaluated script's output text
      */
    _evaluate(options?: {
        input?: string;
        visitor?: object;
        trace?: boolean;
        onepass?: boolean;
        silent?: boolean;
    }): string;
    /** @private */
    private _query;
    /** @private */
    private _printTokens;
    /** @private */
    private _preParse;
    /** @private */
    private _postParse;
    /**
     * Parses a mingo query into JSON format
     * @private
     */
    private parseJSOL;
    /**
     * True if input contains parseable script
     * @private
     */
    private isParseable;
    /** @private */
    private _createRegexes;
    /** @private */
    private _createTransforms;
}
export namespace RiScript {
    export { RiScriptVisitor as Visitor };
    export { RiGrammar as Grammar };
    export { Util };
}
import { RiScriptVisitor } from './visitor.js';
import { Lexer } from 'chevrotain';
import { RiScriptParser } from './parser.js';
/**@ignore */
declare class RiQuery extends Query {
    constructor(scripting: any, condition: any, options: any);
    test(obj: any): boolean;
    operands(): any[];
}
import { RiGrammar } from './rigrammar.js';
import { Util } from './util.js';
import { Query } from 'mingo';
export {};
