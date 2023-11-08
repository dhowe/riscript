var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/riscript.js
import he from "he";
import { Query } from "mingo";
import { Lexer } from "chevrotain";

// src/tokens.js
import { createToken } from "chevrotain";
function getTokens(v2Compatible) {
  let Symbols = {
    OR: "|",
    ELSE: "||",
    DYNAMIC: "$",
    STATIC: "#",
    ENTITY: "&",
    OPEN_GATE: "@",
    CLOSE_GATE: "@",
    PENDING_GATE: "@@",
    OPEN_SILENT: "{",
    CLOSE_SILENT: "}"
  };
  let v2Symbols = {
    OPEN_CHOICE: "(",
    CLOSE_CHOICE: ")",
    OPEN_WEIGHT: "[",
    CLOSE_WEIGHT: "]",
    CONTINUATION: "\\"
  };
  let v3Symbols = {
    OPEN_CHOICE: "[",
    CLOSE_CHOICE: "]",
    OPEN_WEIGHT: "^",
    // also allows (int), eg. (3)
    CLOSE_WEIGHT: "^",
    CONTINUATION: "~"
  };
  Object.assign(Symbols, v2Compatible ? v2Symbols : v3Symbols);
  const Escaped = {};
  Object.entries(Symbols).forEach(([k, v]) => {
    Escaped[k] = escapeRegex(v);
  });
  const PENDING_GATE_PATTERN = new RegExp(`${Escaped.PENDING_GATE}([0-9]{9,11})`);
  Escaped.SPECIAL = Object.values(Escaped).join("").replace(/[<>]/g, "");
  Symbols.PENDING_GATE_RE = new RegExp(PENDING_GATE_PATTERN.source, "g");
  const ExitGate = createToken({
    name: "ExitGate",
    pattern: new RegExp(`\\s*${Escaped.CLOSE_GATE}`),
    pop_mode: true
  });
  const Gate = createToken({
    name: "Gate",
    pattern: new RegExp(`[^${Escaped.CLOSE_GATE}]+`)
  });
  const PendingGate = createToken({
    name: "PendingGate",
    pattern: PENDING_GATE_PATTERN
  });
  const EnterGate = createToken({
    name: "EnterGate",
    pattern: new RegExp(`${Escaped.OPEN_GATE}\\s*`),
    push_mode: "gate_mode"
  });
  const OC = createToken({ name: "OC", pattern: new RegExp(Escaped.OPEN_CHOICE + "\\s*") });
  const CC = createToken({ name: "CC", pattern: new RegExp(`\\s*${Escaped.CLOSE_CHOICE}`) });
  const OR = createToken({ name: "OR", pattern: /\s*\|\s*/ });
  const ELSE = createToken({ name: "ELSE", pattern: /\s*\|\|\s*/ });
  const EQ = createToken({ name: "EQ", pattern: /\s*=\s*/ });
  const TF = createToken({ name: "TF", pattern: /\.[A-Za-z_0-9][A-Za-z_0-9]*(\(\))?/ });
  const OS = createToken({ name: "OS", pattern: new RegExp(`${Escaped.OPEN_SILENT}\\s*`) });
  const CS = createToken({ name: "CS", pattern: new RegExp(`\\s*${Escaped.CLOSE_SILENT}`) });
  const SYM = createToken({ name: "SYM", pattern: new RegExp(`[${Escaped.DYNAMIC}${Escaped.STATIC}][A-Za-z_0-9]*`) });
  const Entity = createToken({ name: "Entity", pattern: /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/i });
  const Weight = createToken({ name: "Weight", pattern: new RegExp(`\\s*${Escaped.OPEN_WEIGHT}.+${Escaped.CLOSE_WEIGHT}\\s*`) });
  const Raw = createToken({ name: "Raw", pattern: new RegExp(`[^${Escaped.SPECIAL}]+`) });
  const normalMode = [Entity, Weight, ELSE, OC, CC, OR, EQ, SYM, TF, OS, CS, PendingGate, Raw, EnterGate];
  const gateMode = [Gate, ExitGate];
  const multiMode = {
    modes: {
      normal: normalMode,
      gate_mode: gateMode
    },
    defaultMode: "normal"
  };
  return { tokens: multiMode, Constants: { Symbols, Escaped } };
}
function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// src/parser.js
import { CstParser } from "chevrotain";
var RiScriptParser = class extends CstParser {
  constructor(allTokens) {
    super(allTokens, { nodeLocationTracking: "full" });
    this.atomTypes = ["silent", "assign", "symbol", "choice", "pgate", "text", "entity"];
    this.buildRules();
  }
  parse(opts) {
    this.input = opts.tokens;
    let cst = this.script();
    if (this.errors.length > 0)
      throw Error("[PARSING]\n" + this.errors[0].message);
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
    $.RULE("choice", () => {
      $.CONSUME(Tokens.OC);
      $.OPTION1(() => $.SUBRULE($.gate));
      $.SUBRULE($.accept);
      $.OPTION2(() => {
        $.CONSUME(Tokens.ELSE);
        $.SUBRULE($.reject);
      });
      $.CONSUME(Tokens.CC);
      $.MANY(() => $.CONSUME(Tokens.TF));
    });
    $.RULE("wexpr", () => {
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.expr) },
          { ALT: () => $.CONSUME(Tokens.Weight) }
        ]);
      });
    });
    $.RULE("expr", () => {
      $.AT_LEAST_ONE(() => $.SUBRULE($.atom));
    });
    $.RULE("atom", () => {
      $.OR(this.atomTypes.map((t) => ({ ALT: () => $.SUBRULE($[t]) })));
    });
    $.RULE("text", () => {
      $.CONSUME(Tokens.Raw);
    });
    this.performSelfAnalysis();
  }
};

// src/visitor.js
var BaseVisitor = class {
  constructor(riScript) {
    this.input = 0;
    this.path = "";
    this.tracePath = true;
    this.scripting = riScript;
    this.warnOnInvalidGates = false;
    this.RiScript = this.scripting.constructor;
  }
  isCstNode(o) {
    return typeof o === "object" && ("accept" in o || "name" in o && "location" in o && "children" in o);
  }
  visit(cstNode, param) {
    if (Array.isArray(cstNode)) {
      cstNode = cstNode[0];
    }
    if (typeof cstNode === "undefined") {
      return void 0;
    }
    if (!this.isCstNode(cstNode)) {
      throw Error("Non-cstNode passed to visit: " + JSON.stringify(cstNode));
    }
    const { name, location } = cstNode;
    this.nodeText = this.input.substring(
      location.startOffset,
      location.endOffset + 1
    );
    if (typeof this[name] !== "function") {
      throw Error(`BaseVisitor.visit: expecting function for this[${name}], found ${typeof this[name]}: ${JSON.stringify(this[name])}`);
    }
    if (this.tracePath && !/(expr|atom|silent)/.test(name)) {
      this.path += name + ".";
    }
    return this[name](cstNode.children, param);
  }
  validateVisitor() {
  }
};
var RiScriptVisitor = class extends BaseVisitor {
  constructor(riScript, context = {}) {
    super(riScript);
    this.context = context;
    this.trace = 0;
    this.choices = {};
    this.isNoRepeat = false;
    this.symbols = this.scripting.Symbols;
    this.escaped = this.scripting.Escaped;
    this.statics = {};
    this.dynamics = {};
    this.pendingGates = {};
    this.pendingSymbols = /* @__PURE__ */ new Set();
    this.validateVisitor();
  }
  start(opts = {}) {
    this.input = opts.input;
    this.trace = opts.trace;
    this.traceTx = opts.traceTx;
    if (!opts.cst)
      throw Error("no cst");
    return super.visit(opts.cst);
  }
  script(ctx) {
    this.order = 0;
    const count = ctx.expr ? ctx.expr.length : 0;
    this.print("script", "'" + this.RiScript._escapeText(this.input) + "' :: " + count + " expression(s)");
    if (!count)
      return "";
    if (Object.keys(ctx).length !== 1)
      throw Error("script: invalid expr");
    return this.visit(ctx.expr);
  }
  expr(ctx) {
    const types = Object.keys(ctx);
    if (types.length !== 1)
      throw Error("invalid expr: " + types.length);
    const exprs = ctx.atom.map((c) => this.visit(c));
    for (let i = 1; i < exprs.length - 1; i++) {
      if (exprs[i].length === 0 && exprs[i - 1].endsWith(" ") && exprs[i + 1].startsWith(" ")) {
        exprs[i + 1] = exprs[i + 1].substring(1);
      }
    }
    return exprs.join("");
  }
  wexpr(ctx) {
    this.print("wexpr");
  }
  gate(ctx) {
    if (ctx.Gate.length !== 1)
      throw Error("Invalid gate: " + ctx.Gate);
    let mingoQuery;
    const raw = ctx.Gate[0].image;
    try {
      mingoQuery = this.scripting._query(raw);
    } catch (e) {
      if (!this.warnOnInvalidGates) {
        throw Error(`Invalid gate[2]: "@${raw}@"

RootCause -> ${e}`);
      }
      if (!this.scripting.RiTa.SILENT && !this.scripting.silent) {
        console.warn(`[WARN] Ignoring invalid gate: @${raw}@
`, e);
      }
      return { decision: "accept" };
    }
    const resolvedOps = {};
    const unresolvedOps = [];
    const operands = mingoQuery.operands();
    operands.forEach((sym) => {
      let { result: result2, resolved, isStatic, isUser } = this.checkContext(sym);
      if (typeof result2 === "function") {
        result2 = result2.call();
        resolved = !this.scripting.isParseable(result2);
      }
      if (typeof result2 === "undefined" || !resolved) {
        unresolvedOps.push(sym);
      } else {
        if (isStatic) {
          this.statics[sym] = result2;
        } else if (isUser) {
          this.context[sym] = result2;
        } else {
          this.dynamics[sym] = result2;
        }
        resolvedOps[sym] = result2;
      }
    });
    if (Object.keys(resolvedOps).length + unresolvedOps.length !== operands.length) {
      throw Error("invalid operands");
    }
    if (unresolvedOps.length) {
      return { decision: "defer", operands: unresolvedOps };
    }
    let result = mingoQuery.test(resolvedOps);
    if (!result && this.castValues(resolvedOps)) {
      result = mingoQuery.test(resolvedOps);
    }
    return { decision: result ? "accept" : "reject" };
  }
  assign(ctx, opts) {
    const sym = ctx.SYM[0].image;
    let value;
    let info;
    const ident = sym.replace(this.scripting.AnySymbolRE, "");
    const isStatic = sym.startsWith(this.symbols.STATIC);
    if (isStatic) {
      value = this.visit(ctx.expr);
      if (this.scripting.isParseable(value)) {
        this.statics[ident] = value;
        value = this.inlineAssignment(ident, ctx.TF, value);
      } else {
        this.statics[ident] = value;
        this.pendingSymbols.delete(ident);
        this.trace && console.log(
          "  [pending.delete]",
          sym,
          this.pendingSymbols.length ? JSON.stringify(this.pendingSymbols) : ""
        );
      }
      info = `${sym} = ${this.RiScript._escapeText(value)} [#static] ${opts?.silent ? "{silent}" : ""}`;
    } else {
      const $ = this;
      value = () => $.visit(ctx.expr);
      info = `${sym} = <f*:pending>` + (opts?.silent ? "{silent}" : "");
      this.dynamics[ident] = value;
    }
    this.print("assign", info);
    return value;
  }
  silent(ctx) {
    if (ctx.EQ) {
      this.assign(ctx, { silent: true });
    } else {
      this.symbol(ctx, { silent: true });
    }
    return "";
  }
  atom(ctx) {
    let result;
    const types = Object.keys(ctx);
    if (types.length !== 1)
      throw Error("invalid atom: " + types);
    this.scripting.parser.atomTypes.forEach((type) => {
      const context = ctx[type];
      if (context) {
        if (context.length !== 1) {
          throw Error(type + ": bad length -> " + ctx[type].length);
        }
        result = this.visit(context[0]);
      }
    });
    if (typeof result === "function") {
      result = result.call();
    }
    return result;
  }
  text(ctx) {
    if (ctx.Raw.length !== 1)
      throw Error("[1] invalid text");
    if (Object.keys(ctx).length !== 1)
      throw Error("[2] invalid text");
    const image = ctx.Raw[0].image;
    this.print("text", this.RiScript._escapeText("'" + image + "'"));
    return image;
  }
  entity(ctx) {
    return this.nodeText;
  }
  symbol(ctx, opts) {
    if (ctx.SYM.length !== 1)
      throw Error("[1] invalid symbol");
    const original = this.nodeText;
    const symbol = ctx.SYM[0].image;
    const ident = symbol.replace(this.scripting.AnySymbolRE, "");
    this.isNoRepeat = this.hasNoRepeat(ctx.TF);
    if (this.pendingSymbols.has(ident)) {
      this.print("symbol", `${symbol} [is-pending]`);
      return original;
    }
    let { result, isStatic, isUser, resolved } = this.checkContext(ident);
    if (!isStatic && symbol.startsWith(this.symbols.STATIC)) {
      if (!this.scripting.EntityRE.test(symbol)) {
        throw Error(`Attempt to refer to dynamic symbol '${ident}' as ${this.symbols.STATIC}${ident}, did you mean $${ident}?`);
      }
    }
    if (typeof result === "function") {
      result = result.call();
      resolved = !this.scripting.isParseable(result);
    }
    if (this.isNoRepeat && (isStatic || isUser)) {
      this.isNoRepeat = false;
      const msg = "Attempt to call norepeat() on " + (isStatic ? "static symbol '" + symbol + "'. Did you mean to use '" + this.symbols.DYNAMIC + ident + "' ?" : "non-dynamic symbol '" + ident + "'. Did you mean to define '" + this.symbols.DYNAMIC + ident + "' in riscript?");
      throw Error(msg);
    }
    if (typeof result === "undefined") {
      this.print("symbol", symbol + " -> '" + original + "' ctx=" + this.lookupsToString(), "[deferred]", opts?.silent ? "{silent}" : "");
      return original;
    }
    let info = original + " -> '" + result + "'" + (opts?.silent ? " {silent}" : "");
    if (typeof result === "string" && !resolved) {
      if (isStatic) {
        this.pendingSymbols.add(ident);
        result = this.inlineAssignment(ident, ctx.TF, result);
        this.print("symbol*", `${original} -> ${result} :: pending.add(${ident})`);
      } else {
        if (ctx.TF)
          result = this.restoreTransforms(result, ctx.TF);
        this.print("symbol", info);
      }
      return result;
    }
    if (isStatic) {
      this.statics[ident] = result;
    }
    if (ctx.TF) {
      result = this.applyTransforms(result, ctx.TF);
      info += " -> '" + result + "'";
      if (this.isNoRepeat)
        info += " (norepeat)";
    }
    this.print("symbol", info);
    if (this.pendingSymbols.has(ident)) {
      this.trace && console.log(
        "  [$pending.delete]",
        (isStatic ? "#" : "$") + ident,
        this.pendingSymbols.length ? JSON.stringify(this.pendingSymbols) : ""
      );
      this.pendingSymbols.delete(ident);
    }
    this.isNoRepeat = false;
    return result;
  }
  pgate(ctx) {
    this.print("pgate", this.nodeText);
    const original = this.nodeText;
    const ident = original.replace(this.symbols.PENDING_GATE, "");
    const lookup = this.pendingGates[ident];
    if (!lookup) {
      throw Error('no pending gate="' + original + '" pgates=' + JSON.stringify(Object.keys(this.pendingGates)));
    }
    const stillUnresolved = lookup.operands.some((o) => {
      let { result: result2, resolved } = this.checkContext(o);
      if (typeof result2 === "function") {
        result2 = result2.call();
        resolved = !this.scripting.isParseable(result2);
      }
      return typeof result2 === "undefined" || !resolved;
    });
    if (stillUnresolved)
      return original;
    const result = this.choice(lookup.deferredContext);
    return result;
  }
  else(ctx) {
    return this.visit(ctx.expr).trim();
  }
  choice(ctx, opts) {
    const $ = this.symbols;
    let rawGate, gateResult;
    const original = this.nodeText;
    let info = original;
    const choiceKey = this.RiScript._stringHash(original + " #" + this.choiceId(ctx));
    if (!this.isNoRepeat && this.hasNoRepeat(ctx.TF)) {
      throw Error("noRepeat() not allowed on choice (use a $variable instead): " + original);
    }
    let decision = "accept";
    if (opts?.forceReject) {
      decision = "reject";
    } else {
      if (ctx.gate) {
        rawGate = ctx.gate[0].children.Gate[0].image;
        gateResult = this.visit(ctx.gate);
        decision = gateResult.decision;
        info += `
  [gate] ${rawGate} -> ${decision !== "defer" ? decision.toUpperCase() : `DEFER ${$.PENDING_GATE}${choiceKey}`}  ${this.lookupsToString()}`;
      }
      if (gateResult) {
        if (gateResult.decision === "defer") {
          this.pendingGates[choiceKey] = {
            deferredContext: ctx,
            operands: gateResult.operands
          };
          return `${$.PENDING_GATE}${choiceKey}`;
        }
      }
    }
    if (decision === "reject" && !("reject" in ctx)) {
      return "";
    }
    const orExpr = ctx[decision]?.[0]?.children?.or_expr?.[0];
    const options = this.parseOptions(orExpr);
    if (!options)
      throw Error("No options in choice: " + original);
    let value = null;
    const excluded = [];
    let restored = false;
    while (value === null) {
      value = this.choose(options, excluded).value;
      if (this.scripting.isParseable(value)) {
        if (ctx.TF)
          value = this.restoreTransforms(value, ctx.TF);
        restored = true;
        break;
      }
      if (ctx.TF)
        value = this.applyTransforms(value, ctx.TF);
      if (this.isNoRepeat && value === this.choices[choiceKey]) {
        this.print("choice.reject", value + " [norepeat]");
        excluded.push(value);
        value = null;
        continue;
      }
    }
    if (!restored)
      this.choices[choiceKey] = value;
    return value;
  }
  // Helpers ================================================
  hasNoRepeat(tfs) {
    const transforms = this.RiScript._transformNames(tfs);
    if (transforms.length) {
      return transforms.includes("nr") || transforms.includes("norepeat");
    }
    return false;
  }
  checkContext(ident) {
    let isStatic = false;
    let isUser = false;
    let result;
    if (ident.length === 0) {
      return { result: "", resolved: true, isStatic, isUser };
    }
    result = this.dynamics[ident];
    if (typeof result === "undefined") {
      result = this.statics[ident];
      if (typeof result !== "undefined") {
        isStatic = true;
      }
    }
    if (typeof result === "undefined") {
      result = this.context[ident];
      if (typeof result !== "undefined") {
        isUser = true;
      } else {
        result = this.context[this.symbols.DYNAMIC + ident];
        if (typeof result !== "undefined") {
        }
      }
    }
    const resolved = !this.scripting.isParseable(result);
    return { result, isStatic, isUser, resolved };
  }
  inlineAssignment(ident, tfs, result) {
    const $ = this.symbols;
    const lhs = $.STATIC + ident;
    const rhs = this.restoreTransforms(result, tfs);
    result = $.OPEN_CHOICE + (lhs + "=" + rhs) + $.CLOSE_CHOICE;
    return result;
  }
  choiceId(ctx) {
    if (!ctx.OC || !ctx.OC.length)
      throw Error("invalid choice");
    return ctx.OC[0].startOffset + "." + ctx.OC[0].endOffset;
  }
  parseOptions(ctx) {
    const options = [];
    if (ctx && ctx?.children?.wexpr) {
      const wexprs = ctx.children.wexpr;
      for (let i = 0; i < wexprs.length; i++) {
        const wexpr = wexprs[i];
        const expr = wexpr.children.expr;
        if (expr && expr.length != 1) {
          throw Error("invalid choice-expr: " + expr.length);
        }
        const weight = wexpr.children.Weight;
        if (weight) {
          if (weight.length != 1) {
            throw Error("invalid weight: " + weight.length);
          }
          let mult = 1;
          try {
            mult = parseInt(
              this.symbols.CLOSE_WEIGHT.length ? weight[0].image.trim().slice(1, -1) : weight[0].image.trim().slice(1)
            );
          } catch (e) {
            console.log("EX: " + mult);
          }
          Array.from({ length: mult }, () => options.push(expr));
        } else {
          options.push(expr || "");
        }
      }
    }
    return options;
  }
  chooseUnique(options, choiceKey) {
    const isUnique = false;
    while (options.length && !isUnique) {
      const { index, value } = this.choose(options);
      if (value !== this.choices[choiceKey])
        return value;
      options.splice(index, 1);
    }
    throw Error("No remaining options");
  }
  choose(options, excludes = []) {
    if (!options || !options.length) {
      throw Error("Invalid choice: no options");
    }
    const valid = options.filter((x) => !excludes.includes(x));
    if (!valid.length) {
      throw Error("Invalid choice: no valid options");
    }
    const index = this.scripting.RiTa.randi(valid.length);
    let value = "";
    const selected = valid[index];
    if (typeof selected === "string") {
      this.print("choice.text", "''");
    } else {
      this.path = "choice." + this.path;
      value = this.visit(selected);
    }
    if (typeof value === "string")
      value = value.trim();
    return { index, value };
  }
  applyTransforms(value, txs) {
    if (this.traceTx) {
      console.log("applyTransforms", this.formatTxs(...arguments));
    }
    for (let i = 0; i < txs.length; i++) {
      value = this.applyTransform(value, txs[i]);
    }
    return value;
  }
  // value is not yet resolved, so store with transform for later
  restoreTransforms(value, txs) {
    if (typeof value === "string") {
      const patt = new RegExp(
        "^" + this.escaped.OPEN_CHOICE + ".*" + this.escaped.CLOSE_CHOICE + "$"
      );
      if (!patt.test(value)) {
        value = this.symbols.OPEN_CHOICE + value + this.symbols.CLOSE_CHOICE;
      }
      if (txs) {
        txs.forEach((tx) => value += tx.image);
      }
      if (this.traceTx)
        console.log("restoreTransforms:", value);
    }
    return value;
  }
  castValues(obj) {
    let madeCast = false;
    Object.entries(obj).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num)) {
        madeCast = true;
        obj[k] = num;
      }
    });
    return madeCast;
  }
  contextIsResolved(table) {
    let allResolved = true;
    Object.entries(table).forEach(([key, val]) => {
      if (!this.scripting.isParseable(val)) {
        allResolved = false;
      }
    });
    return allResolved;
  }
  applyTransform(target, transform) {
    const image = transform.image;
    let result;
    const raw = target + image;
    const tx = image.substring(1).replace(/\(\)$/, "");
    if (typeof this.dynamics[tx] === "function") {
      result = this.dynamics[tx](target);
    } else if (typeof this.statics[tx] === "function") {
      result = this.statics[tx](target);
    } else if (typeof this.context[tx] === "function") {
      result = this.context[tx](target);
    } else if (typeof this.RiScript.transforms[tx] === "function") {
      result = this.RiScript.transforms[tx](target);
    } else if (typeof target[tx] === "function") {
      result = target[tx]();
    } else {
      if (target.hasOwnProperty(tx)) {
        result = target[tx];
      } else {
        if (!this.scripting.RiTa.SILENT && !this.scripting.silent) {
          console.warn("[WARN] Unresolved transform: " + raw);
        }
        result = raw.replace(/\(\)$/, "&lpar;&rpar;");
      }
    }
    if (this.trace) {
      console.log(`${this.tindent()}[transform] ${raw} -> '${result}'`);
    }
    return result;
  }
  lookupsToString() {
    const dyns = {};
    const stats = {};
    Object.entries(this.dynamics || {}).forEach(
      ([k, v]) => dyns[`$${k} `] = v
    );
    Object.entries(this.statics || {}).forEach(
      ([k, v]) => stats[`#${k} `] = v
    );
    return JSON.stringify(
      { ...this.context, ...stats, ...dyns },
      (k, v) => typeof v === "function" ? "<f*:pending>" : v
    ).replace(/"/g, "");
  }
  formatTxs(value, txs) {
    return value + txs.map((tx) => tx.image.replace(/()/, "") + "()").join("");
  }
  print(s, ...args) {
    if (this.trace) {
      if (this.path && s !== "script") {
        s = this.path.replace(/\.$/, "");
      }
      console.log(++this.order, `[${s}]`, ...args);
      this.path = "";
    }
  }
  tindent() {
    return " ".repeat((this.order + "").length + 1);
  }
};

// src/riscript.js
var { decode } = he;
var VowelRE = /[aeiou]/;
var RegexEscape = "_RE_";
var HtmlEntities = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi;
var RiQuery = class extends Query {
  constructor(scripting, condition, options) {
    if (typeof condition === "string") {
      let raw = condition;
      condition = scripting.parseJSOL(condition);
    }
    super(condition, options);
  }
  test(obj) {
    for (let i = 0, len = this.compiled.length; i < len; i++) {
      if (!this.compiled[i](obj))
        return false;
    }
    return true;
  }
  operands() {
    const stack = [this.condition];
    const keys = /* @__PURE__ */ new Set();
    while (stack?.length > 0) {
      const currentObj = stack.pop();
      Object.keys(currentObj).forEach((key) => {
        const value = currentObj[key];
        if (!key.startsWith("$"))
          keys.add(key);
        if (typeof value === "object" && value !== null) {
          const eles = Array.isArray(value) ? value : [value];
          eles.forEach((ele) => stack.push(ele));
        }
      });
    }
    return Array.from(keys);
  }
};
var _RiScript = class _RiScript {
  static evaluate(script, context, opts = {}) {
    return new _RiScript().evaluate(script, context, opts);
  }
  constructor(opts = {}) {
    this.visitor = 0;
    this.v2Compatible = opts.compatibility === 2;
    const { Constants, tokens } = getTokens(this.v2Compatible);
    this.Escaped = Constants.Escaped;
    this.Symbols = Constants.Symbols;
    const anysym = Constants.Escaped.STATIC + Constants.Escaped.DYNAMIC;
    const open = Constants.Escaped.OPEN_CHOICE;
    const close = Constants.Escaped.CLOSE_CHOICE;
    this.JSOLIdentRE = new RegExp(`([${anysym}]?[A-Za-z_0-9][A-Za-z_0-9]*)\\s*:`, "g");
    this.RawAssignRE = new RegExp(`^[${anysym}][A-Za-z_0-9][A-Za-z_0-9]*\\s*=`);
    this.ChoiceWrapRE = new RegExp("^" + open + "[^" + open + close + "]*" + close + "$");
    this.SpecialRE = new RegExp(`[${this.Escaped.SPECIAL.replace("&", "")}]`);
    this.ContinueRE = new RegExp(this.Escaped.CONTINUATION + "\\r?\\n", "g");
    this.WhitespaceRE = /[\u00a0\u2000-\u200b\u2028-\u2029\u3000]+/g;
    this.AnySymbolRE = new RegExp(`[${anysym}]`);
    this.silent = false;
    this.lexer = new Lexer(tokens);
    this.parser = new RiScriptParser(tokens);
    this.RiTa = opts.RiTa || {
      VERSION: 0,
      randi: (k) => Math.floor(Math.random() * k)
    };
  }
  lex(opts) {
    if (!opts.input)
      throw Error("no input");
    const lexResult = this.lexer.tokenize(opts.input);
    if (lexResult.errors.length) {
      console.error("Input: " + opts.input + "\n", lexResult.errors[0].message);
      throw Error("[LEXING] " + lexResult.errors[0].message);
    }
    if (opts.trace)
      this.printTokens(lexResult.tokens);
    opts.tokens = lexResult.tokens;
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
    if (typeof script !== "string") {
      throw Error("RiScript.evaluate() expects a string, got " + typeof script);
    }
    opts.input = script;
    opts.visitor = new RiScriptVisitor(this, context);
    return this._evaluate(opts);
  }
  _evaluate(opts) {
    const { input } = opts;
    let last, endingBreak = /\r?\n$/.test(input);
    let expr = this.preParse(input, opts);
    if (!expr)
      return "";
    if (opts.trace)
      console.log(`
Input:  '${_RiScript._escapeText(input)}'`);
    if (opts.trace && input !== expr) {
      console.log(`Parsed: '${_RiScript._escapeText(expr)}'`);
    }
    if (!opts.visitor)
      throw Error("no visitor");
    this.visitor = opts.visitor;
    delete opts.visitor;
    for (let i = 1; expr !== last && i <= 10; i++) {
      last = expr;
      if (opts.trace)
        console.log("-".repeat(20) + " Pass#" + i + " " + "-".repeat(20));
      opts.input = expr;
      expr = this.lexParseVisit(opts);
      if (opts.trace) {
        console.log(`Result(${i}) -> "${_RiScript._escapeText(expr)}" ctx=${this.visitor.lookupsToString()}`);
      }
      if (opts.onepass || !this.isParseable(expr))
        break;
    }
    if (!this.silent && !this.RiTa.SILENT) {
      if (this.AnySymbolRE.test(expr.replace(HtmlEntities, ""))) {
        console.warn('[WARN] Unresolved symbol(s) in "' + expr.replace(/\n/g, "\\n") + '" ');
      }
    }
    return this.postParse(expr, opts) + (endingBreak ? "\n" : "");
  }
  _query(rawQuery, opts) {
    return new RiQuery(this, rawQuery, opts);
  }
  printTokens(tokens) {
    let s = tokens.reduce((str, t) => {
      let { name } = t.tokenType;
      let tag = name;
      if (tag === "TEXT")
        tag = _RiScript._escapeText(t.image, 1);
      if (tag === "SYM")
        tag = "sym(" + t.image + ")";
      if (tag === "TX")
        tag = "tx(" + t.image + ")";
      return str + tag + ", ";
    }, "").slice(0, -2);
    console.log(
      "\nTokens: [ " + s + " ]  Context:",
      this.visitor.lookupsToString()
    );
  }
  postParse(input, opts) {
    if (typeof input !== "string")
      return "";
    let decoded = decode(input);
    let result = decoded.replace(this.WhitespaceRE, " ").replace(/\r?\n$/, "");
    let gates = [...result.matchAll(this.Symbols.PENDING_GATE_RE)];
    gates.forEach((g) => {
      if (!g || !g[0] || !g[1])
        throw Error("bad gate: " + g);
      let deferredGate = this.visitor.pendingGates[g[1]];
      let { deferredContext, operands } = deferredGate;
      if (!operands.length)
        throw Error("no operands");
      let reject = this.visitor.choice(deferredContext, { forceReject: true });
      result = result.replace(g[0], reject);
      if (opts.trace)
        console.log("  " + g[0] + "-> " + reject);
    });
    if (opts.trace)
      console.log(`
Final: '${result}'`);
    if (!opts.preserveLookups) {
      this.visitor.statics = void 0;
      this.visitor.dynamics = void 0;
    }
    return result;
  }
  preParse(script, opts) {
    if (typeof script !== "string")
      return "";
    const $ = this.Symbols;
    let input = script;
    if (!this.v2Compatible) {
      input = input.replace(/\((\s*\d+\s*)\)/g, "^$1^");
    }
    input = input.replace(/\/\*[^]*?(\r?\n)?\//g, "");
    input = input.replace(/\/\/[^\n]+(\r?\n|$)/g, "");
    input = input.replace(this.ContinueRE, "");
    input = slashEscapesToEntities(input);
    let result = "";
    let lines = input.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (
        /*!opts.noAddedSilence && */
        this.RawAssignRE.test(lines[i])
      ) {
        let eqIdx = lines[i].indexOf("=");
        if (eqIdx < 0)
          throw Error("invalid state: no assigment: " + lines[i]);
        let lhs = lines[i].substring(0, eqIdx), rhs = lines[i].substring(eqIdx + 1);
        let opens = charCount(rhs, $.OPEN_CHOICE);
        let closes = charCount(rhs, $.CLOSE_CHOICE);
        while (opens > closes) {
          let line = lines[++i];
          rhs += "\n" + line;
          opens += charCount(line, $.OPEN_CHOICE);
          closes += charCount(line, $.CLOSE_CHOICE);
        }
        result += $.OPEN_SILENT + (lhs + "=" + rhs) + $.CLOSE_SILENT;
      } else {
        result += lines[i];
        if (i < lines.length - 1)
          result += "\n";
      }
    }
    return result;
  }
  /*
   * Parses a mingo query into JSON format
   */
  parseJSOL(text) {
    const unescapeRegexProperty = (text2) => {
      let res = text2;
      if (typeof text2 === "string" && text2.startsWith(RegexEscape) && text2.endsWith(RegexEscape)) {
        let parts = text2.split(RegexEscape);
        if (parts.length !== 4)
          throw Error("invalid regex in unescape");
        res = new RegExp(parts[1], parts[2]);
      }
      return res;
    };
    let escaped = _RiScript._escapeJSONRegex(text).replace(this.JSOLIdentRE, '"$1":').replace(/'/g, '"');
    let result = JSON.parse(escaped), urp = unescapeRegexProperty;
    Object.keys(result).forEach((k) => result[k] = urp(result[k]));
    return result;
  }
  isParseable(s) {
    let result = true;
    let isStrOrNum = /(string|number)/.test(typeof s);
    if (isStrOrNum)
      result = this.SpecialRE.test(s.toString());
    return result;
  }
  // ========================= statics ===============================
  // Default transform that adds an article
  static articlize(s) {
    if (!s || !s.length)
      return "";
    let first = s.split(/\s+/)[0];
    if (!_RiScript.RiTa?.phones) {
      if (!_RiScript.RiTaWarnings.phones) {
        console.warn("[WARN] Install RiTa for proper phonemes");
        _RiScript.RiTaWarnings.phones = true;
      }
      return (/^[aeiou].*/i.test(first) ? "an " : "a ") + s;
    }
    let phones = _RiScript.RiTa.phones(first, { silent: true });
    return (phones && phones.length && VowelRE.test(phones[0]) ? "an " : "a ") + s;
  }
  // Default transform that capitalizes the first character
  static capitalize(s) {
    return s ? s[0].toUpperCase() + s.substring(1) : "";
  }
  // Default transform that capitalizes the string
  static uppercase(s) {
    return s ? s.toUpperCase() : "";
  }
  // Default transform that wraps the string in (smart) quotes.
  static quotify(s) {
    return "&#8220;" + (s || "") + "&#8221;";
  }
  // Default transform that pluralizes a string (requires RiTa)
  static pluralize(s) {
    if (!_RiScript.RiTa?.pluralize) {
      if (!_RiScript.RiTaWarnings.plurals) {
        _RiScript.RiTaWarnings.plurals = true;
        console.warn("[WARN] Install RiTa for proper pluralization");
      }
      return s.endsWith("s") ? s : s + "s";
    }
    return _RiScript.RiTa.pluralize(s);
  }
  // Default no-op transform
  static identity(s) {
    return s;
  }
  // static helpers
  static _transformNames(txs) {
    return txs && txs.length ? txs.map((tx) => tx.image.replace(/(^\.|\(\)$)/g, ""), []) : [];
  }
  static _escapeText(s, quotify) {
    if (typeof s !== "string")
      return s;
    let t = s.replace(/\r?\n/g, "\\n");
    return quotify || !t.length ? "'" + t + "'" : t;
  }
  static _escapeJSONRegex(text) {
    return text.replace(
      /\/([^/]+?)\/([igmsuy]*)/g,
      `"${RegexEscape}$1${RegexEscape}$2${RegexEscape}"`
    );
  }
  static _stringHash(s) {
    let chr, hash = 0;
    for (let i = 0; i < s.length; i++) {
      chr = s.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    let strHash = hash.toString();
    return hash < 0 ? strHash.replace("-", "0") : strHash;
  }
};
__publicField(_RiScript, "Query", RiQuery);
__publicField(_RiScript, "VERSION", "1.0.19");
__publicField(_RiScript, "RiTaWarnings", { plurals: false, phones: false });
var RiScript = _RiScript;
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
  ucf: RiScript.capitalize,
  // deprecated?
  uc: RiScript.uppercase,
  qq: RiScript.quotify,
  s: RiScript.pluralize
};
function slashEscapesToEntities(s) {
  s = replaceAll(s, "\\(", "&lpar;");
  s = replaceAll(s, "\\)", "&rpar;");
  s = replaceAll(s, "\\[", "&lsqb;");
  s = replaceAll(s, "\\]", "&rsqb;");
  s = replaceAll(s, "\\{", "&lcqb;");
  s = replaceAll(s, "\\}", "&rcqb;");
  s = replaceAll(s, "\\@", "&commat;");
  s = replaceAll(s, "\\#", "&num;");
  s = replaceAll(s, "\\|", " &vert");
  s = replaceAll(s, "\\=", " &equals");
  return s;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceAll(str, match, replacement) {
  return str.replace(new RegExp(escapeRegExp(match), "g"), () => replacement);
}
function charCount(str, c) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === c)
      count++;
  }
  return count;
}

// src/grammar.js
var RiGrammar = class _RiGrammar {
  constructor(rules = {}, context = {}) {
    if (typeof rules !== "object") {
      throw Error("RiGrammar: expecting object, found " + typeof rules);
    }
    this.scripting = new RiScript();
    this.context = context;
    this.setRules(rules);
  }
  static expand(rules, context, opts) {
    return new _RiGrammar(rules, context).expand(opts);
  }
  addTransform() {
    return RiScript.addTransform(...arguments);
  }
  removeTransform() {
    return RiScript.removeTransform(...arguments);
  }
  getTransforms() {
    return RiScript.transforms;
  }
  equals(rg) {
    return rg.toJSON() === this.toJSON();
  }
  expand(opts = {}) {
    if ("context" in opts) {
      throw Error("pass context to RiScript.grammar() or new RiGrammar() instead");
    }
    opts.visitor = opts.visitor || new RiScript.Visitor(this.scripting);
    opts.visitor.context = this.context || {};
    opts.input = this._toScript(opts);
    return this.scripting._evaluate(opts);
  }
  addRule(name, def) {
    this._validateRule(name, def);
    this.rules[name] = def;
  }
  setRules(rules) {
    if (typeof rules === "undefined")
      throw Error("undefined rules");
    this.rules = {};
    let incoming = typeof rules === "string" ? parseJSON(rules) : rules;
    let self = this;
    Object.entries(incoming).forEach((e) => self.addRule(...e));
  }
  removeRule(name) {
    if (name in this.rules) {
      delete this.rules[name];
    }
  }
  toJSON() {
    return JSON.stringify(this.rules, ...arguments);
  }
  toString(opts = {}) {
    let replacer = opts.replacer || 0;
    let space = opts.space || 2;
    let lb = opts?.linebreak;
    let res = this.toJSON(replacer, space);
    if (lb)
      res = res.replace(/\n/g, lb);
    return res;
  }
  static fromJSON(str, opts) {
    return new _RiGrammar(JSON.parse(str), opts);
  }
  /* 
    Convert grammar to inline rules;
    rules are dynamic, unless otherwise specified with leading #
  */
  _toScript(opts) {
    let script = "", start = opts.start || "start";
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
      if (!this.scripting.ChoiceWrapRE.test(rule)) {
        rule = Symbols.OPEN_CHOICE + rule + Symbols.CLOSE_CHOICE;
      }
      script += `${name}=${rule}
`;
    });
    if (opts.trace)
      console.log("Grammar:\n" + script.replace(/^\$/gm, "  $"));
    script += `${Symbols.DYNAMIC}${start}`;
    return script;
  }
  _validateRule(name, def) {
    if (typeof name !== "string" || name.length === 0) {
      throw Error("expected [string] name");
    }
    if (typeof def === "undefined") {
      throw Error("undefined rule def: " + name);
    }
    let { Symbols } = this.scripting;
    if (name.startsWith(Symbols.DYNAMIC)) {
      name = name.substring(Symbols.DYNAMIC.length);
      throw Error(
        "Grammar rules are dynamic by default; if you need a static rule, use '" + Symbols.STATIC + name + "', otherwise just use '" + name + "'."
      );
    }
  }
};
function parseJSON(json) {
  if (typeof json === "string") {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw Error(
        "RiGrammar appears to be invalid JSON, please check it at http://jsonlint.com/\n" + json
      );
    }
  }
}

// src/index.js
RiScript.Grammar = RiGrammar;
RiScript.Visitor = RiScriptVisitor;
var src_default = RiScript;
export {
  src_default as default
};
//# sourceMappingURL=riscript.js.map