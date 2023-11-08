
import { CstParser } from "chevrotain"

class RiScriptParser extends CstParser {

  constructor(allTokens) {
    super(allTokens, { nodeLocationTracking: "full" });
    this.atomTypes = ['silent', 'assign', 'symbol', 'choice', 'pgate', 'text', 'entity'];
    this.buildRules();
  }

  parse(opts) {
    this.input = opts.tokens; // superclass member (do not change)
    
    let cst = this.script();
    if (this.errors.length > 0) throw Error
      ("[PARSING]\n" + this.errors[0].message);
    return cst;
  }

  buildRules() {

    const $ = this, Tokens = this.tokensMap;

    $.RULE("script", () => {
      $.MANY(() => $.SUBRULE($.expr));
    });

    $.RULE("pgate", () => {
      $.CONSUME(Tokens.PendingGate);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });

    $.RULE("entity", () => {
      $.CONSUME(Tokens.Entity);
    });

    $.RULE("gate", () => {
      $.CONSUME(Tokens.EnterGate);
      $.MANY(() => $.CONSUME(Tokens.Gate));
      $.CONSUME(Tokens.ExitGate);
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

    $.RULE("assign", () => {
      $.CONSUME(Tokens.SYM);
      $.CONSUME(Tokens.EQ);
      $.SUBRULE($.expr);
    });

    $.RULE("symbol", () => {
      $.CONSUME(Tokens.SYM);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });

    $.RULE("accept", () => {
      $.SUBRULE($.or_expr);
    });

    $.RULE("reject", () => {
      $.SUBRULE($.or_expr);
    });

    $.RULE("or_expr", () => {
      $.MANY_SEP({
        SEP: Tokens.OR,
        DEF: () => $.SUBRULE($.wexpr)
      });
    });

    // choice: (LP (wexpr OR)* wexpr RP) transform*;
    $.RULE("choice", () => {
      $.CONSUME(Tokens.OC)
      $.OPTION1(() => $.SUBRULE($.gate));
      $.SUBRULE($.accept)
      // $.MANY_SEP({
      //   SEP: Tokens.OR,
      //   DEF: () => $.SUBRULE($.wexpr)
      // });
      $.OPTION2(() => {
        $.CONSUME(Tokens.ELSE);
        $.SUBRULE($.reject)
      });
      $.CONSUME(Tokens.CC);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });

    $.RULE("wexpr", () => {
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.expr) },
          { ALT: () => $.CONSUME(Tokens.Weight) },
        ])
      });
    });

    $.RULE("expr", () => {
      $.AT_LEAST_ONE(() => $.SUBRULE($.atom));
    });

    $.RULE("atom", () => {
      $.OR(this.atomTypes.map(t => ({ ALT: () => $.SUBRULE($[t]) })));
    });

    $.RULE("text", () => {
      $.CONSUME(Tokens.Raw);
    });

    this.performSelfAnalysis(); // keep
  }
}

export { RiScriptParser };