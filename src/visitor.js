/** @module riscript */

import { Util } from './util.js';

const { escapeText, stringHash, formatAny, transformNames } = Util;

/**
 * @class
 * @memberof module:riscript
 */
class BaseVisitor {
  constructor(riScript) {
    /**@type {string}*/this.input = '';
    ///**@type {string}*/this.path = '';
    /**@type {boolean}*/this.nowarn = false;
    /**@type {boolean}*/this.tracePath = true;
    /**@type {object}*/this.scripting = riScript;
    /**@type {boolean}*/this.warnOnInvalidGates = false;
    /**@type {number}*/this.maxRecursionDepth = 10;
  }

  textFromCstNode(node) {
    if (Array.isArray(node)) node = node[0];
    return this.input.substring(
      node.location.startOffset,
      node.location.endOffset + 1
    );
  }

  isCstNode(o) {
    if (Array.isArray(o)) o = o[0];
    return (typeof o === 'object' && ('accept' in o
      || ('name' in o && 'location' in o && 'children' in o)));
  }

  visit(cstNode, options) {
    if (Array.isArray(cstNode)) {
      cstNode = cstNode[0];
    }
    if (typeof cstNode === 'undefined') {
      return undefined;
    }
    if (!this.isCstNode(cstNode)) {
      throw Error('Non-cstNode passed to visit: ' + JSON.stringify(cstNode));
    }
    this.nodeText = this.textFromCstNode(cstNode); // remove

    const name = cstNode.name;
    if (typeof this[name] !== 'function') {
      throw Error('BaseVisitor.visit: expecting function for this[' +
        `${name}], found ${typeof this[name]}: ${JSON.stringify(this[name])}`);
    }
    return this[name](cstNode.children, options);
  }

  validateVisitor() { /* no-op */ }
}

/**
 * @class
 * @memberof module:riscript
 */
class RiScriptVisitor extends BaseVisitor {
  constructor(riScript, context = {}) {
    super(riScript);
    this.context = context;

    this.order = 0;
    this.trace = 0;
    this.indent = 0;
    this.choices = {};
    this.isNoRepeat = false;

    this.Symbols = this.scripting.Symbols;
    this.Escaped = this.scripting.Escaped;

    // lookups
    this.statics = {}; // store static symbols as values, set once and re-used
    this.dynamics = {}; // store dynamic symbols as functions to be re-evaluated each time
    this.pendingGates = {}; // store gates for which operands are not resolved
    //this.pendingSymbols = new Set(); // when a symbol resolves with more riscript, store it here {static: store in this.statics?, dynamic: no-need}

    this.validateVisitor(); // keep
  }

  start(opts = {}) {

    this.input = opts.input;
    this.trace = opts.trace;
    this.nowarn = opts.silent;
    this.traceTx = opts.traceTx;
    if (!opts.cst) throw Error('no cst');
    return super.visit(opts.cst);
  }

  script(ctx) {
    this.order = this.indent = 0;
    if (Object.keys(ctx).length !== 1) throw Error('script: invalid expr');
    let count = ctx.expr[0].children.atom.length;
    this.print('script', `'${escapeText(this.input)}' :: ${count} atom(s)`);
    if (!count) return '';
    this.indent++;
    let value = this.visit(ctx.expr);
    this.indent--;
    this.print('/script');
    return value;
  }

  expr(ctx) {
    // this.print('expr', ctx);
    const types = Object.keys(ctx);
    if (types.length !== 1) throw Error('invalid expr: ' + types.length);
    const exprs = ctx.atom.map((c) => this.visit(c)); // collect each atom

    if (exprs.length === 1) return exprs[0];

    // handle special cases of the form: "not [quite|] far enough"
    for (let i = 1; i < exprs.length - 1; i++) {
      if (exprs[i].length === 0 &&
        exprs[i - 1].endsWith(' ') &&
        exprs[i + 1].startsWith(' ')) {
        exprs[i + 1] = exprs[i + 1].substring(1);
      }
    }
    return exprs.join('');
  }

  atom(ctx) {
    let result;
    const types = Object.keys(ctx);
    if (types.length !== 1) throw Error('invalid atom: ' + types);
    this.scripting.parser.atomTypes.forEach((type) => {
      if (ctx[type]) {
        if (ctx[type].length !== 1) {
          throw Error(type + ': bad length -> ' + ctx[type].length);
        }
        result = this.visit(ctx[type][0]);
        // pending function, call it
        if (typeof result === 'function') {
          result = result.call();
        }
      }
    });
    return result;
  }

  // wexpr(ctx) {
  //   this.print('wexpr');
  // }

  silent(ctx) {
    this.print('silent', this.nodeText);
    this.indent++;
    if (ctx.EQ) {
      this.assign(ctx, { silent: true });
    } else {
      this.symbol(ctx, { silent: true });
    }
    this.indent--;
    this.print('silent/', 'statics=' + formatAny(this.statics));

    return '';
  }

  assign(ctx, opts) {

    const sym = ctx.Symbol[0].image;
    const original = this.nodeText;
    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    const isStatic = sym.startsWith(this.Symbols.STATIC);
    const isSilent = opts?.silent;

    let info = `${original} ${isStatic && isSilent ? '{#static,silent}' :
      (isStatic ? '{#static}' : '') + (isSilent ? '{silent}' : '')}`;
    this.print('assign', info);

    let value;
    if (isStatic) { // static: store as value, set once and re-use

      if (ident in this.statics && !this.scripting.isParseable(this.statics[ident])) {
        value = this.statics[ident];
        info = `${sym} = ${formatAny(value)} {#resolved}`;
      }
      else {

        this.indent++;
        value = this.visit(ctx.expr); // visit the right-hand side
        this.indent--;

        /*if (this.scripting.isParseable(value)) {
          // this.statics[ident] = value; // store in lookup table ??
          //value = this.inlineAssignment(ident, ctx.Transform, value);
        } else {
          //this.statics[ident] = value; // store in lookup table
          // let deleted = this.pendingSymbols.delete(ident); // no longer pending
          // info += (deleted ? ` :: pending.delete(${ident})` : ` ***FAILED-to-delete ${sym}!`);
          //this.trace && console.log('  [pending.delete]', sym,
          //this.pendingSymbols.size ? JSON.stringify(this.pendingSymbols) : '');
        }
  
        */
        this.statics[ident] = value;  // store in lookup table, resolved or not

        if (typeof value === 'string' && this.scripting.isParseable(value)) {
          value = this.inlineStaticAssign(ident, ctx.Transform, value);
        }
        info = `${sym} = ${formatAny(value)}`;
      }
      this.print('/assign', info);
    } else {
      const $ = this;

      // dynamic: store as func to be resolved later, perhaps many times
      // OPT: check if parseable. if not, remove the function and use the value directly?
      this.indent++;
      value = () => $.visit(ctx.expr); // the right-hand side
      this.indent--;


      // NOTE: this function may contain a choice, which needs to be handled
      // when called from a symbol with a norepeat transform (??) TODO: test

      this.dynamics[ident] = value; // store in lookup table
      this.print('/assign', `${sym} =  <f*:pending>`);
    }

    return value;
  } // end assign

  symbol(ctx, opts) {
    if (ctx.Symbol.length !== 1) throw Error('[1] invalid symbol');

    const isSilent = opts?.silent;
    const original = this.nodeText;
    const sym = ctx.Symbol[0].image;
    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    this.isNoRepeat = this.hasNoRepeat(ctx.Transform);

    this.print('symbol', `${original} ${isSilent ? ' {silent}' : ''}`);
    //    this.indent++;

    /*
      If have a #static that already exists in this.statics, we check if it parseable.
      If so, we inline it for later, otherwise we return the value directly.
    */

    // if (this.pendingSymbols.has(ident)) {
    //   this.print('/symbol', `${original} [is-pending]`);
    //   return original;
    // }

    // lookup: result is either a value, a function, or undef
    let { result, isStatic, isUser, resolved } = this.checkContext(ident);

    // if (isStatic) {
    //   if (resolved) {
    //     value = result;
    //   }
    //     if (this.scripting.isParseable(value)) {
    //       value = this.inlineAssignment(ident, ctx.Transform, value);
    //     }
    //     return value; 
    //   }
    // }

    if (!isStatic && this.scripting.regex.StaticSymbol.test(sym)) {
      if (!this.scripting.regex.Entity.test(sym)) {
        throw Error(`Attempt to refer to dynamic symbol '${ident}' as` +
          ` ${this.Symbols.STATIC}${ident}, did you mean $${ident}?`);
      }
    }

    for (let i = 0; typeof result === 'function'; i++) {
      result = result.call(); // call it
      resolved = !this.scripting.isParseable(result);
      if (i === this.maxRecursionDepth) throw Error('Max recursion depth reached');
    }

    if (this.isNoRepeat && (isStatic || isUser)) {
      this.isNoRepeat = false;
      const msg = 'Attempt to call norepeat() on ' + (isStatic
        ? "static symbol '" + sym + "'. Did you mean to use '" +
        this.Symbols.DYNAMIC + ident + "' ?"
        : "non-dynamic symbol '" + ident + "'. Did you mean to define '" +
        this.Symbols.DYNAMIC + ident + "' in riscript?");
      throw Error(msg);
    }

    if (typeof result === 'undefined') {       // nothing found, defer
      this.print('/symbol', sym + " -> '" + original + "' ctx=" +
        this.lookupsToString(), '[deferred]', opts?.silent ? '{silent}' : '');
      return original;
    }

    let info = `${original} -> ${formatAny(result)} ${opts?.silent ? ' {silent}' : ''}`;

    // defer if we still have unresolved riscript
    if (typeof result === 'string' && !resolved) {

      if (isStatic) {

        //this.pendingSymbols.add(ident);
        result = this.inlineStaticAssign(ident, ctx.Transform, result);
        this.print('/symbol', `${original} -> ${result}`);// :: pending.add(${ident})`);

      } else {

        if (ctx.Transform) result = this.restoreTransforms(result, ctx.Transform);
        this.print('/symbol', info);
      }

      return result;
    }

    if (isStatic) {
      // store !untransformed! result in static context
      this.statics[ident] = result; // ADDED 8/18/23,FIXED 10/8/23
    }

    if (ctx.Transform) {
      result = this.applyTransforms(result, ctx.Transform);
      info += "-> '" + result + "'";
      // info += " -> " + ctx.Transform.map(tf => ` ${tf.image} -> `) + '\'' + result + "'";
      // console.log("INFO: " + info);
      if (this.isNoRepeat) info += ' (norepeat)';
    }
    else if (result.length === 0) {
      // this is a raw $, without transform, keep it DCH: 1/21/24
      result = sym;
      info = '** $ **';
    }

    this.print('/symbol', info);

    // resolved, so remove from pending
    // if (this.pendingSymbols.has(ident)) {
    //   this.trace && console.log('  [$pending.delete]', (isStatic ? '#' : '$') + ident,
    //     this.pendingSymbols.size ? JSON.stringify(this.pendingSymbols) : '');
    //   this.pendingSymbols.delete(ident);
    // }
    this.isNoRepeat = false; // reset

    return result;
  } // end symbol

  choice(ctx, opts) {
    const $ = this.Symbols;
    const original = this.nodeText;
    const choiceKey = stringHash(original + ' #' + this.choiceId(ctx));

    let  gateText, gateResult, hasTransforms = ctx.Transform;

    if (!this.isNoRepeat && this.hasNoRepeat(ctx.Transform)) {
      throw Error('noRepeat() not allowed on choice '
        + '(use a $variable instead): ' + original);
    }

    this.print('choice', original);

    let decision = 'accept';
    if (opts?.forceReject) {
      decision = 'reject';
    } else {
      // TODO: make function -> handleGate(ctx) returns 
      //    { decision: [accept|reject] } or { decision: 'defer', pgateValue }
      let gateCtx = ctx?.gate?.[0]?.children?.Gate;
      if (gateCtx) {
        // do we have a gate?
        gateText = gateCtx[0].image;
        this.indent++;
        gateResult = this.visit(ctx.gate);
        this.indent--;
        decision = gateResult.decision;
        let ginfo = `${gateText} -> ${(decision !== 'defer' ? decision.toUpperCase()
          : `DEFER ${$.PENDING_GATE}${choiceKey}`)}  ${this.lookupsToString()}`;
        this.print('gate', ginfo);
      }

      if (gateResult && gateResult.decision === 'defer') {
        this.pendingGates[choiceKey] = {
          gateText,
          deferredContext: ctx,
          operands: gateResult.operands
        };
        return `${$.PENDING_GATE}${choiceKey}`; // gate defers
      }
    }

    let orExpr = ctx?.orExpr[0];
    if (decision === 'reject') {
      if (!('elseExpr' in ctx)) return ''; // rejected without else
      orExpr = ctx.elseExpr[0].children.orExpr[0];
    }

    const options = this.parseOptions(orExpr); // get options
    if (!options) throw Error('No options in choice: ' + original);

    let value = null;
    const excluded = [];
    let restored = false;
    while (value === null) {
      value = this.choose(options, excluded);

      // while we have a cstNode, visit it
      for (let i = 0; this.isCstNode(value); i++) {
        this.indent++;
        value = this.visit(value); // visit the node
        this.indent--;
        if (i === this.maxRecursionDepth) throw Error('Max recursion depth reached');
      }

      if (typeof value === 'string') {
        value = value.trim();
      }
      else if (typeof value !== 'number') { // some type of complex object
//console.log("HIThere1: " + value);
        if (ctx.Transform) value = this.applyTransforms(value, ctx.Transform);
//console.log("HIThere-value: " + value);
        hasTransforms = false; // applied the transform so don't do it again later;
      }

      // if we still have script, defer until its resolved
      if (this.scripting.isParseable(value)) {
//console.log("HIThere2: " + value);
        if (ctx.Transform) value = this.restoreTransforms(value, ctx.Transform);
        restored = true;
        break;
      }

      // apply any remaining transforms
      if (hasTransforms) value = this.applyTransforms(value, ctx.Transform);

      // we have 'norepeat' but value was already used, try again
      if (this.isNoRepeat && value === this.choices[choiceKey]) {
        this.print('choice-reject', value + ' [norepeat]');
        excluded.push(value);
        value = null;
        continue;
      }
    }

    if (!restored) this.choices[choiceKey] = value; // put in choice cache
    this.print('choice/', original + ' -> \'' + value + '\'');

    return value;
  } // end choice

  choose(options, excludes = []) {
    if (!options || !options.length) {
      throw Error('Invalid choice: no options');
    }
    const valid = options.filter(x => !excludes.includes(x));
    if (!valid.length) {
      throw Error('Invalid choice: no valid options');
    }
    const index = this.scripting.RiTa.randi(valid.length);
    let value = valid[index];
    return value;
  }

  text(ctx) {
    if (Object.keys(ctx).length !== 1) throw Error('[2] invalid text');
    const type = this.scripting.textTypes.filter(t => ctx[t]);
    const image = ctx[type][0].image; // any of riscript.textTypes
    this.print('text/', escapeText("'" + image + "'"));
    return image;
  }

  entity(ctx) {
    return this.nodeText;
  }

  gate(ctx) {
    // returns { decision: [accept|reject] } or { decision: 'defer', operands: [] }

    if (ctx.Gate.length !== 1) throw Error('Invalid gate: ' + ctx.Gate);

    let raw = ctx.Gate[0].image, mingoQuery;
    if (raw.startsWith(this.Symbols.OPEN_GATE)) {
      raw = raw.substring(1);
    }
    try {
      mingoQuery = this.scripting.createQuery(raw);
    } catch (e) {
      if (!this.warnOnInvalidGates) {
        throw Error(`Invalid gate[2]: "@${raw}@"\n\nRootCause -> ${e}`);
      }
      if (!this.scripting.RiTa.SILENT && !this.nowarn) {
        console.warn(`[WARN] Ignoring invalid gate: @${raw}@\n`, e);
      }
      return { decision: 'accept' };
    }

    const resolvedOps = {};
    const unresolvedOps = [];
    const operands = mingoQuery.operands();
    operands.forEach((sym) => {
      let { result, resolved, isStatic, isUser } = this.checkContext(sym);

      if (typeof result === 'function') {
        // while {} ?
        result = result.call(); // call it
        resolved = !this.scripting.isParseable(result);
      }
      if (typeof result === 'undefined' || !resolved) {
        unresolvedOps.push(sym);
      } else {
        // add to appropriate context
        if (isStatic) {
          this.statics[sym] = result;
        } else if (isUser) {
          this.context[sym] = result;
        } else {
          this.dynamics[sym] = result;
        }
        // store resolved result
        resolvedOps[sym] = result;
      }
    });

    if (Object.keys(resolvedOps).length + unresolvedOps.length !== operands.length) {
      throw Error('invalid operands');
    }

    // if we have unresolved operands, return them (and defer)
    if (unresolvedOps.length) {
      return { decision: 'defer', operands: unresolvedOps };
    }

    let result = mingoQuery.test(resolvedOps); // do test
    if (!result && this.castValues(resolvedOps)) {
      result = mingoQuery.test(resolvedOps); // redo test after casting
    }

    return { decision: result ? 'accept' : 'reject' };
  }

  pgate(ctx) {
    this.print('pgate', this.nodeText);

    // new RegExp(`^${this.symbols.PENDING_GATE}`
    const original = this.nodeText;
    const ident = original.replace(this.Symbols.PENDING_GATE, '');
    const lookup = this.pendingGates[ident];

    if (!lookup) {
      throw Error('no pending gate="' + original + '" pgates=' +
        JSON.stringify(Object.keys(this.pendingGates)));
    }

    const stillUnresolved = lookup.operands.some((o) => {
      let { result, resolved } = this.checkContext(o);
      if (typeof result === 'function') {
        // while {} ?
        // let tracing = this.trace;
        // this.trace = false; // disable tracing
        result = result.call(); // call it
        //this.trace = tracing;
        resolved = !this.scripting.isParseable(result);
      }
      return typeof result === 'undefined' || !resolved;
    });

    if (stillUnresolved) return original; // still deferred

    return this.choice(lookup.deferredContext); // execute the gate
  }

  else(ctx) {
    // this.print('else', this.nodeText);
    return this.visit(ctx.expr).trim();
  }


  // Helpers ================================================

  hasNoRepeat(tfs) {
    const transforms = transformNames(tfs);
    if (transforms.length) {
      return transforms.includes('nr') || transforms.includes('norepeat');
    }
    return false;
  }

  checkContext(ident, opts = {}) {
    let isStatic = false;
    let isUser = false;
    let result;

    if (ident.length === 0) { // empty symbol
      return { result: '', resolved: true, isStatic, isUser };
    }

    // check for dynamic symbol: $var
    result = this.dynamics[ident];
    if (typeof result === 'undefined') {
      // no dynamic

      // check for static symbol: #var
      result = this.statics[ident];
      if (typeof result !== 'undefined') {
        isStatic = true; // found static
      }
    }

    if (typeof result === 'undefined') {
      // no static
      // check for user-defined symbol: context[var]
      result = this.context[ident];
      if (typeof result !== 'undefined') {
        isUser = true; // found user symbol
      } else {
        // check for user-defined dynamic? context[$var]
        result = this.context[this.Symbols.DYNAMIC + ident];
        if (typeof result !== 'undefined') {
          // no static
          // note: treat as normal dynamic, isUser = false
        }
      }
    }

    // do we have more script to deal with ?
    const resolved = !this.scripting.isParseable(result);

    return { result, isStatic, isUser, resolved }; // TODO: replace with 'type'
  }

  inlineStaticAssign(ident, tfs, result) {
    const $ = this.Symbols;
    const lhs = $.STATIC + ident;
    const rhs = result;
    //this.restoreTransforms(result, tfs);
    result = this.restoreTransforms($.OPEN_CHOICE + (lhs + '=' + rhs) + $.CLOSE_CHOICE, tfs);
    return result;
  }

  choiceId(ctx) {
    if (!ctx.OC || !ctx.OC.length) throw Error('invalid choice');
    return ctx.OC[0].startOffset + '.' + ctx.OC[0].endOffset;
  }

  parseOptions(ctx) {
    const options = [];
    if (ctx && ctx?.children?.wexpr) {
      const wexprs = ctx.children.wexpr;
      for (let i = 0; i < wexprs.length; i++) {
        const wexpr = wexprs[i];
        const expr = wexpr.children.expr;
        if (expr && expr.length != 1) { throw Error('invalid choice-expr: ' + expr.length); }

        const weight = wexpr.children.Weight;
        if (weight) {
          if (weight.length != 1) { throw Error('invalid weight: ' + weight.length); }
          let mult = 1;
          try {
            mult = parseInt(
              this.Symbols.CLOSE_WEIGHT.length
                ? weight[0].image.trim().slice(1, -1)
                : weight[0].image.trim().slice(1)
            );
          } catch (e) {
            console.log('EX: ' + mult);
          }
          Array.from({ length: mult }, () => options.push(expr));
        } else {
          options.push(expr || '');
        }
      }
    }
    return options;
  }

  chooseUnique(options, choiceKey) {
    // not used

    const isUnique = false;
    while (options.length && !isUnique) {
      const { index, value } = this.choose(options);
      if (value !== this.choices[choiceKey]) return value;
      // console.log(`Skipping ${index}: '${value}'`);
      options.splice(index, 1);
    }
    throw Error('No remaining options');
  }
  /*
choose(options, excludes = []) {
  if (!options || !options.length) {
    throw Error('Invalid choice: no options');
  }

  const valid = options.filter((x) => !excludes.includes(x));
  if (!valid.length) {
    throw Error('Invalid choice: no valid options');
  }

  const index = this.scripting.RiTa.randi(valid.length);

  let value = valid[index];

  let value = ''; 
  const selected = valid[index];
  if (typeof selected === 'string') {
    this.print('choice.text', "''");
  } 
  else {
    this.path = 'choice.' + this.path;  // ?
    this.indent++;
    value = this.visit(selected); // cstNode
    this.indent--;
  }
  if (typeof value === 'string') value = value.trim();

  return value;
}    */

  applyTransforms(value, txs) {
    this.indent++;
    if (this.traceTx) { console.log('applyTransforms', this.formatTxs(...arguments)); }
    for (let i = 0; i < txs.length; i++) {
      value = this.applyTransform(value, txs[i]);
    }
    this.indent--;
    return value;
  }

  // value is not yet resolved, so store with transform for later
  restoreTransforms(value, txs) {
    if (typeof value === 'string') {
      const choiceRE = new RegExp('^' + this.Escaped.OPEN_CHOICE + '.*' + this.Escaped.CLOSE_CHOICE + '$');
      const symbolRE = new RegExp(`(${this.Escaped.DYNAMIC}|${this.Escaped.STATIC}[A-Za-z_0-9])[A-Za-z_0-9]*`);
      if (!choiceRE.test(value) && !symbolRE.test(value)) {
        // wrap in choice to preserve
        value = this.Symbols.OPEN_CHOICE + value + this.Symbols.CLOSE_CHOICE;
      }
      if (txs) {
        txs.forEach((tx) => (value += tx.image)); // append transform strings
      }
      if (this.traceTx) console.log('restoreTransforms:', value);
    }
    return value;
  }

  castValues(obj) {
    let madeCast = false;
    Object.entries(obj).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num)) {
        madeCast = true;
        obj[k] = num; // update object with casted value
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
    const raw = target + image;
    const original = formatAny(target) + image;
    const tx = image.substring(1).replace(/\(\)$/, '');
    const RiTa = this.scripting.RiTa;

    let result;

    // function in dynamics
    if (typeof this.dynamics[tx] === 'function') {
      result = this.dynamics[tx].call(this.scripting, target);
    }
    // function in statics
    else if (typeof this.statics[tx] === 'function') {
      result = this.statics[tx].call(this.scripting, target);
    }
    // function in context
    else if (typeof this.context[tx] === 'function') {
      result = this.context[tx].call(this.scripting, target);
    }
    // function in transforms
    else if (typeof this.scripting.transforms[tx] === 'function') {
      result = this.scripting.transforms[tx].call(this.scripting, target);
    }
    // member functions (usually on String)
    else if (typeof target[tx] === 'function') {
      result = target[tx]();// .call() ?
    } else {
      // check for property
      if (target.hasOwnProperty(tx)) {
        result = target[tx];
      } else {
        if (!RiTa.SILENT && !this.silent) {
          console.warn('[WARN] Unresolved transform: ' + raw);
        }

        /* Replace transform parens so as not to trigger
           RiScript.isParseable (for example, in v2) 0 */
        result = raw.replace(/\(\)$/, '&lpar;&rpar;');
      }
    }

    this.print('transform/', `${original} -> '${result}'`);

    return result;
  }

  lookupsToString() {
    const dyns = {}, stats = {};
    Object.entries(this.dynamics || {}).forEach(([k, v]) => (dyns[`$${k}`] = v));
    Object.entries(this.statics || {}).forEach(([k, v]) => (stats[`#${k}`] = v));
    return JSON.stringify({ ...this.context, ...stats, ...dyns }, (k, v) =>
      typeof v === 'function' ? '<f*:pending>' : v).replace(/"/g, '');
  }

  formatTxs(value, txs) {
    return value + txs.map((tx) => tx.image.replace(/()/, '') + '()').join('');
  }

  print(s, ...args) {
    if (this.trace) {
      // if (this.path && s !== 'script') {
      //   s = this.path.replace(/\.$/, '');
      // }
      // if (!s.endsWith('gate.text')) { // ignore these
      //   let inspc = '  '.repeat(this.indent);
      //   console.log(++this.order, `${inspc}[${s}]`, ...args);
      // }

      let indentStr = '  '.repeat(this.indent);
      //if (s.endsWith('-resolve')) this.indent--;

      let msg = `${indentStr}<${s}>${s.startsWith('/') ? '' : ' '}`;
      if (++this.order < 10) msg = ' ' + msg;
      console.log(this.order, msg, ...args);
      //this.path = '';
    }
  }

  tindent() {
    return ' '.repeat((this.order + '').length + 1);
  }
}

export { RiScriptVisitor };

// console.log('&#33; -> '+decode('&#33;'));
// console.log('&amp; -> '+decode('&amp;'));
