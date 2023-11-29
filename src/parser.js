
import { CstParser } from "chevrotain"

class RiScriptParser extends CstParser {

  constructor(allTokens, textTypes) {
    super(allTokens, { nodeLocationTracking: "full" });
    this.atomTypes = ['silent', 'assign', 'symbol', 'choice', 'pgate', 'text', 'entity'];
    this.textTypes = textTypes; // defined in tokens.js
    this.buildRules();
  }

  parse(opts) {
    this.input = opts.tokens; // superclass member (do not change)

    let cst = this.script();
    if (this.errors.length > 0) throw Error
      ("[PARSING]\n" + this.errors[0].message);
    return cst;
  }

  /*
    Specification:
      script: expr+
      expr: atom+
      atom: (choice | symbol | text | silent | entity | pgate | assign)
      wexpr: (expr | Weight)*
      symbol: SYM transform*
      choice: [ gate? accept (ELSE reject)? ] transform*
      assign: SYM EQ expr
      silent: { gate? SYM (EQ expr)? }
      or_expr: wexpr (OR wexpr)*
      accept: or_expr
      reject: or_expr
      pgate: PGate transform*
      entity: Entity
      gate: Mingo
      text: Raw | STAT | AMP 
  */
  buildRules() {

    const $ = this, Tokens = this.tokensMap;

    $.RULE("script", () => {
      $.MANY(() => $.SUBRULE($.expr));
    });

    $.RULE("expr", () => {
      $.AT_LEAST_ONE(() => $.SUBRULE($.atom));
    });

    $.RULE("atom", () => {
      $.OR(this.atomTypes.map(t => ({ ALT: () => $.SUBRULE($[t]) })));
    });

    $.RULE("wexpr", () => {
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.expr) },
          { ALT: () => $.CONSUME(Tokens.Weight) },
        ])
      });
    });

    $.RULE("symbol", () => {
      $.CONSUME(Tokens.SYM);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });

   // choice: (LP (wexpr OR)* wexpr RP) transform*;
   $.RULE("choice", () => {
    $.CONSUME(Tokens.OC)
    $.OPTION1(() => $.SUBRULE($.gate));
    $.SUBRULE($.accept)
    $.OPTION2(() => {
      $.CONSUME(Tokens.ELSE);
      $.SUBRULE($.reject)
    });
    $.CONSUME(Tokens.CC);
    $.MANY(() => $.CONSUME(Tokens.TF));
  });

    $.RULE("assign", () => {
      $.CONSUME(Tokens.SYM);
      $.CONSUME(Tokens.EQ);
      $.SUBRULE($.expr);
    });

    $.RULE("silent", () => {
      $.CONSUME(Tokens.OS);
      $.OPTION1(() => $.SUBRULE($.gate));
      $.CONSUME(Tokens.SYM);
      $.OPTION2(() => {
        $.CONSUME(Tokens.EQ);
        $.SUBRULE($.expr);
      });
      $.CONSUME(Tokens.CS);
    });

    $.RULE("or_expr", () => {
      $.MANY_SEP({
        SEP: Tokens.OR,
        DEF: () => $.SUBRULE($.wexpr)
      });
    });

    $.RULE("accept", () => {
      $.SUBRULE($.or_expr);
    });

    $.RULE("reject", () => {
      $.SUBRULE($.or_expr);
    });

    $.RULE("pgate", () => {
      $.CONSUME(Tokens.PendingGate);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });

    $.RULE("entity", () => {
      $.CONSUME(Tokens.Entity);
    });

    $.RULE("gate", () => {
      $.MANY(() => $.CONSUME(Tokens.Gate));
    });

    $.RULE("text", () => {
      $.OR(this.textTypes.map(t => ({ ALT: () => $.CONSUME(Tokens[t]) })));
    });

    this.performSelfAnalysis(); // keep
  }
}

export { RiScriptParser };