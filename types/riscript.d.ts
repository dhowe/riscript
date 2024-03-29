export class RiScript {
    static VERSION: string;
    static evaluate(script: string, context?: object, options?: {
        trace?: boolean;
        onepass?: boolean;
        silent?: boolean;
    }): string;

    constructor(opts?: {});
    evaluate(script: string, context?: object, options?: {
        trace?: boolean;
        onepass?: boolean;
        silent?: boolean;
    }): string;
    addTransform(name: string, def: any): RiScript;
    getTransforms(): string[];
    removeTransform(name: string): RiScript;
}

export class RiGrammar {
  static expand(rules: string, context?: object, options?: {
      trace?: boolean;
      onepass?: boolean;
      silent?: boolean;
  }): string;
  static fromJSON(json: string, context?: object): RiGrammar;
  constructor(rules?: { [x: string]: string } | string, context?: { [x: string]: any }, options?: { [x: string]: any });
  addTransform(name: string, def: any): RiGrammar;
  removeTransform(name: string): RiGrammar;
  getTransforms(): string[];
  equals(rg: RiGrammar): boolean;
  expand(options?: {
      start?: string;
      trace?: boolean;
      onepass?: boolean;
      silent?: boolean;
  }): string;
  addRule(name: string, def: string): RiGrammar;
  setRules(rules: object | string): RiGrammar;
  removeRule(name: string): RiGrammar;
  toJSON(options?: {
      replacer?: string;
      space?: string;
  }): string;
  toString(options?: {
      replacer?: string;
      space?: string;
      linebreak?: string;
  }): string;
}