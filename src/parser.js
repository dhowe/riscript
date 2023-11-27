
import { CstParser } from "chevrotain"

class RiScriptParser extends CstParser {

  constructor(allTokens, textTypes) {
    super(allTokens, { nodeLocationTracking: "full" });
    this.atomTypes = ['assign', 'choice', 'silent', 'symbol', 'pgate', 'entity', 'text'];
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
      expr: (assign | choice | silent | symbol | pgate | entity | text)     
      orExpr: gate? options elseExpr?
      options: wexpr (OR wexpr)*
      wexpr: expr weight?
      elseExpr: ELSE options
      choice: OC orExpr CC transform*
      assign: $symbol EQ expr
      symbol: $symbol transform*
      silent: OS assign CS 
      text: Raw (=> from tokens.textTypes)
      gate: @mingo
  */
  buildRules() {

    const $ = this, Tokens = this.tokensMap;

    $.RULE("script", () => {
      $.MANY(() => $.SUBRULE($.expr));
    });

    $.RULE("expr", () => {
      $.OR(this.atomTypes.map(t => ({ ALT: () => $.SUBRULE($[t]) })));
    });

    $.RULE("orExpr", () => {
      $.OPTION(() => $.SUBRULE($.gate));
      $.SUBRULE($.options);
      $.OPTION2(() => $.SUBRULE($.elseExpr));
    });

    $.RULE("wexpr", () => {
      $.SUBRULE($.expr);
      $.OPTION(() => $.CONSUME(Tokens.Weight));
    });

    $.RULE("options", () => {
      $.MANY_SEP({
        SEP: Tokens.OR,
        DEF: () => $.SUBRULE2($.wexpr)
      });
    });

    $.RULE("elseExpr", () => {
      $.CONSUME(Tokens.ELSE);
      $.SUBRULE($.options);
    });

    $.RULE("choice", () => {
      $.CONSUME(Tokens.OC);
      $.SUBRULE($.orExpr);
      $.CONSUME(Tokens.CC);
      $.MANY(() => $.CONSUME(Tokens.Transform));
    });

    $.RULE("assign", () => {
      $.CONSUME(Tokens.Symbol);
      $.CONSUME(Tokens.EQ);
      $.SUBRULE($.expr);
    });

    $.RULE("silent", () => {
      $.CONSUME(Tokens.OS);
      $.SUBRULE($.assign);
      $.CONSUME(Tokens.CS);
    });

    $.RULE("symbol", () => {
      $.CONSUME(Tokens.Symbol);
      $.MANY(() => $.CONSUME(Tokens.Transform));
    });

    $.RULE("entity", () => {
      $.CONSUME(Tokens.Entity);
    });

    $.RULE("gate", () => {
      $.CONSUME(Tokens.Gate);
    });

    $.RULE("pgate", () => {
      $.CONSUME(Tokens.PendingGate);
    });

    $.RULE("text", () => {
      $.OR(this.textTypes.map(t => ({ ALT: () => $.CONSUME(Tokens[t]) })));
    });

    this.performSelfAnalysis(); // keep
  }


  buildRulesX() {

    const $ = this, Tokens = this.tokensMap;

    $.RULE("script", () => {
      $.MANY(() => $.SUBRULE($.expr));
    });

    $.RULE("pgate", () => {
      $.CONSUME(Tokens.PendingGate);
      $.MANY(() => $.CONSUME(Tokens.transform));
    });

    $.RULE("entity", () => {
      $.CONSUME(Tokens.Entity);
    });

    $.RULE("gate", () => {
      // $.CONSUME(Tokens.EnterGate);
      $.MANY(() => $.CONSUME(Tokens.Gate));
      // $.CONSUME(Tokens.ExitGate);
    });

    $.RULE("silent", () => {
      $.CONSUME(Tokens.OS);
      $.OPTION1(() => $.SUBRULE($.gate));
      $.CONSUME(Tokens.symbol);
      $.OPTION2(() => {
        $.CONSUME(Tokens.EQ);
        $.SUBRULE($.expr);
      });
      $.CONSUME(Tokens.CS);
    });

    $.RULE("assign", () => {
      $.CONSUME(Tokens.symbol);
      $.CONSUME(Tokens.EQ);
      $.SUBRULE($.expr);
    });

    $.RULE("symbol", () => {
      $.CONSUME(Tokens.symbol);
      $.MANY(() => $.CONSUME(Tokens.transform));
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
      $.OPTION2(() => {
        $.CONSUME(Tokens.ELSE);
        $.SUBRULE($.reject)
      });
      $.CONSUME(Tokens.CC);
      $.MANY(() => $.CONSUME(Tokens.transform));
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
      $.OR(this.textTypes.map(t => ({ ALT: () => $.CONSUME(Tokens[t]) })));
    });

    this.performSelfAnalysis(); // keep
  }
}

export { RiScriptParser };