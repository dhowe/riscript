declare class RiScript {
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

export = RiScript;