
class BaseVisitor {
  constructor(riScript) {
    this.input = 0;
    this.path = '';
    this.nowarn = false;
    this.tracePath = true;
    this.scripting = riScript;
    this.warnOnInvalidGates = false;
    this.RiScript = this.scripting.constructor; // class hack
  }

  isCstNode(o) {
    return (typeof o === 'object' && ('accept' in o
      || ('name' in o && 'location' in o && 'children' in o)));
  }

  visit(cstNode, param) {
    if (Array.isArray(cstNode)) {
      cstNode = cstNode[0];
    }
    if (typeof cstNode === 'undefined') {
      return undefined;
    }
    if (!this.isCstNode(cstNode)) {
      throw Error('Non-cstNode passed to visit: ' + JSON.stringify(cstNode));
    }

    const { name, location } = cstNode;

    this.nodeText = this.input.substring(
      location.startOffset,
      location.endOffset + 1
    );

    if (typeof this[name] !== 'function') {
      throw Error('BaseVisitor.visit: expecting function for this[' +
        `${name}], found ${typeof this[name]}: ${JSON.stringify(this[name])}`);
    }

    if (this.tracePath && !/(expr|atom|silent)/.test(name)) {
      this.path += name + '.';
    }
    return this[name](cstNode.children, param);
  }

  validateVisitor() {
    /* no-op */
  }
}

class RiScriptVisitor extends BaseVisitor {
  constructor(riScript, context = {}) {
    super(riScript); // stored as global RiScript (TODO)
    this.context = context;

    this.trace = 0;
    this.choices = {};
    this.isNoRepeat = false;
    this.symbols = this.scripting.Symbols;
    this.escaped = this.scripting.Escaped;

    // lookups
    this.statics = {};
    this.dynamics = {};
    this.pendingGates = {};
    this.pendingSymbols = new Set();

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
    this.order = 0;
    const count = ctx.expr ? ctx.expr.length : 0;
    this.print('script', "'" + this.RiScript._escapeText(this.input)
      + "' :: " + count + ' expression(s)');
    if (!count) return '';
    if (Object.keys(ctx).length !== 1) throw Error('script: invalid expr');
    return this.visit(ctx.expr);
  }

  expr(ctx) {
    // this.print('expr', ctx);
    const types = Object.keys(ctx);
    if (types.length !== 1) throw Error('invalid expr: ' + types.length);
    const exprs = ctx.atom.map((c) => this.visit(c));
    
    // handle special cases of the form: "not [quite|] far enough"
    for (let i = 1; i < exprs.length - 1; i++) {
      if (
        exprs[i].length === 0 &&
        exprs[i - 1].endsWith(' ') &&
        exprs[i + 1].startsWith(' ')
      ) {
        exprs[i + 1] = exprs[i + 1].substring(1);
      }
    }
    return exprs.join('');
  }

  wexpr(ctx) {
    this.print('wexpr');
  }

  gate(ctx) {
    // returns { decision: [accept | reject] } or { decision: 'defer', operands: [] }

    if (ctx.Gate.length !== 1) throw Error('Invalid gate: ' + ctx.Gate);

    let raw = ctx.Gate[0].image, mingoQuery;
    if (raw.startsWith('@')) {//this.Symbols.OPEN_GATE)) {
      raw = raw.substring(1);
    }
    try {
      mingoQuery = this.scripting._query(raw);
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

    if (
      Object.keys(resolvedOps).length + unresolvedOps.length !==
      operands.length
    ) { throw Error('invalid operands'); }

    // if we have unresolved operands, return them (and defer)
    if (unresolvedOps.length) { return { decision: 'defer', operands: unresolvedOps }; }

    let result = mingoQuery.test(resolvedOps); // do test
    if (!result && this.castValues(resolvedOps)) {
      result = mingoQuery.test(resolvedOps); // redo test after casting
    }

    return { decision: result ? 'accept' : 'reject' };
  }

  assign(ctx, opts) {
    const sym = ctx.SYM[0].image;

    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    const isStatic = sym.startsWith(this.symbols.STATIC);

    let value, info;
    if (isStatic) {
      value = this.visit(ctx.expr);
      if (this.scripting.isParseable(value)) {
        this.statics[ident] = value; // store in lookup table ??
        value = this.inlineAssignment(ident, ctx.TF, value);
      } else {
        this.statics[ident] = value; // store in lookup table
        this.pendingSymbols.delete(ident); // no longer pending
        this.trace &&
          console.log('  [pending.delete]', sym,
            this.pendingSymbols.length
              ? JSON.stringify(this.pendingSymbols)
              : ''
          );
      }
      info = `${sym} = ${this.RiScript._escapeText(value)}` +
        ` [#static] ${opts?.silent ? '{silent}' : ''}`;
    } else {
      const $ = this;

      // dynamic: store as func to be resolved later, perhaps many times
      value = () => $.visit(ctx.expr);
      info = `${sym} = <f*:pending> ` + (opts?.silent ? '{silent}' : '');

      // NOTE: this function may contain a choice, which needs to be handled
      // when called from a symbol with a norepeat transform (??) TODO: test

      this.dynamics[ident] = value; // store in lookup table
    }
    this.print('assign', info);

    return value;
  }

  silent(ctx) {
    if (ctx.EQ) {
      this.assign(ctx, { silent: true });
    } else {
      this.symbol(ctx, { silent: true });
    }
    return '';
  }

  atom(ctx) {
    let result;
    const types = Object.keys(ctx);
    if (types.length !== 1) throw Error('invalid atom: ' + types);
    this.scripting.parser.atomTypes.forEach((type) => {
      const context = ctx[type];
      if (context) {
        if (context.length !== 1) {
          throw Error(type + ': bad length -> ' + ctx[type].length);
        }
        // console.log(type + ':', context[0]);
        result = this.visit(context[0]);
      }
    });

    // pending function, call it
    if (typeof result === 'function') {
      result = result.call();
    }
    return result;
  }

  text(ctx) {
    if (Object.keys(ctx).length !== 1) throw Error('[2] invalid text');
    const type = this.scripting.textTypes.filter(t => ctx[t]);
    const image = ctx[type][0].image; // any of riscript.textTypes
    this.print('text', this.RiScript._escapeText("'" + image + "'"));
    return image;
  }

  entity(ctx) {
    return this.nodeText;
  }

  symbol(ctx, opts) {
    if (ctx.SYM.length !== 1) throw Error('[1] invalid symbol');

    const original = this.nodeText;
    const symbol = ctx.SYM[0].image;
    const ident = symbol.replace(this.scripting.regex.AnySymbol, '');

    this.isNoRepeat = this.hasNoRepeat(ctx.TF);

    if (this.pendingSymbols.has(ident)) {
      this.print('symbol', `${symbol} [is-pending]`);
      return original;
    }

    // lookup: result is either a value, a function, or undef
    let { result, isStatic, isUser, resolved } = this.checkContext(ident);

    if (!isStatic && this.scripting.regex.StaticSymbol.test(symbol)) {
      if (!this.scripting.regex.Entity.test(symbol)) {
        throw Error(`Attempt to refer to dynamic symbol '${ident}' as` +
          ` ${this.symbols.STATIC}${ident}, did you mean $${ident}?`);
      }
    }

    if (typeof result === 'function') {
      // while {} ?
      result = result.call(); // call it
      resolved = !this.scripting.isParseable(result);
    }

    if (this.isNoRepeat && (isStatic || isUser)) {
      this.isNoRepeat = false;
      const msg = 'Attempt to call norepeat() on ' + (isStatic
        ? "static symbol '" + symbol + "'. Did you mean to use '" +
        this.symbols.DYNAMIC + ident + "' ?"
        : "non-dynamic symbol '" + ident + "'. Did you mean to define '" +
        this.symbols.DYNAMIC + ident + "' in riscript?");
      throw Error(msg);
    }

    if (typeof result === 'undefined') {
      // nothing found, defer
      this.print('symbol', symbol + " -> '" + original + "' ctx=" +
        this.lookupsToString(), '[deferred]', opts?.silent ? '{silent}' : '');
      return original;
    }

    let info = original + " -> '" + result + "'" + (opts?.silent ? ' {silent}' : '');

    // defer if we still have unresolved riscript
    if (typeof result === 'string' && !resolved) {
      if (isStatic) {
        this.pendingSymbols.add(ident);
        result = this.inlineAssignment(ident, ctx.TF, result);
        this.print('symbol*', `${original} -> ${result} :: pending.add(${ident})`);
      } else {
        if (ctx.TF) result = this.restoreTransforms(result, ctx.TF);
        this.print('symbol', info);
      }
      return result;
    }

    if (isStatic) {
      // store !untransformed! result in static context
      this.statics[ident] = result; // ADDED 8/18/23 - FIXED 10/8/23
    }

    if (ctx.TF) {
      result = this.applyTransforms(result, ctx.TF);
      info += " -> '" + result + "'";
      // info += " -> " + ctx.TF.map(tf => ` ${tf.image} -> `) + '\'' + result + "'";
      // console.log("INFO: " + info);
      if (this.isNoRepeat) info += ' (norepeat)';
    }

    this.print('symbol', info);

    // resolved, so remove from pending
    if (this.pendingSymbols.has(ident)) {
      this.trace && console.log('  [$pending.delete]', (isStatic ? '#' : '$') + ident,
        this.pendingSymbols.length ? JSON.stringify(this.pendingSymbols) : '');
      this.pendingSymbols.delete(ident);
    }
    this.isNoRepeat = false; // reset

    return result;
  }

  pgate(ctx) {
    this.print('pgate', this.nodeText);

    // new RegExp(`^${this.symbols.PENDING_GATE}`
    const original = this.nodeText;
    const ident = original.replace(this.symbols.PENDING_GATE, '');
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

  choice(ctx, opts) {
    const $ = this.symbols;
    const original = this.nodeText;
    let gateText, gateResult, info = original;
    const choiceKey = this.RiScript._stringHash
      (original + ' #' + this.choiceId(ctx));

    if (!this.isNoRepeat && this.hasNoRepeat(ctx.TF)) {
      throw Error('noRepeat() not allowed on choice '
        + '(use a $variable instead): ' + original);
    }

    this.print('choice', info);
    info = ""

    let decision = 'accept';
    if (opts?.forceReject) {
      decision = 'reject';
    } else {
      if (ctx?.gate?.[0]?.children?.Gate) {
        // do we have a gate
        gateText = ctx.gate[0].children.Gate[0].image;
        gateResult = this.visit(ctx.gate);
        decision = gateResult.decision;
        let ginfo = `${gateText} -> ${(decision !== 'defer' ? decision.toUpperCase()
          : `DEFER ${$.PENDING_GATE}${choiceKey}`)}  ${this.lookupsToString()}`;
        this.print('gate', ginfo);
      }

      if (gateResult) {
        if (gateResult.decision === 'defer') {
          this.pendingGates[choiceKey] = {
            gateText,
            deferredContext: ctx,
            operands: gateResult.operands
          };
          return `${$.PENDING_GATE}${choiceKey}`; // gate defers
        }
      }
    }

    if (decision === 'reject' && !('reject' in ctx)) {
      return ''; // rejected without reject expr, return ''
    }

    const orExpr = ctx[decision]?.[0]?.children?.or_expr?.[0]; // yuck
    const options = this.parseOptions(orExpr); // get options
    if (!options) throw Error('No options in choice: ' + original);

    let value = null;
    const excluded = [];
    let restored = false;
    while (value === null) {
      value = this.choose(options, excluded).value;

      // if we still have script, defer until its resolved
      if (this.scripting.isParseable(value)) {
        if (ctx.TF) value = this.restoreTransforms(value, ctx.TF);
        restored = true;
        break;
      }

      // apply any remaining transforms
      if (ctx.TF) value = this.applyTransforms(value, ctx.TF);

      // we have 'norepeat' but value was already used, try again
      if (this.isNoRepeat && value === this.choices[choiceKey]) {
        this.print('choice.reject', value + ' [norepeat]');
        excluded.push(value);
        value = null;
        continue;
      }
    }

    if (!restored) this.choices[choiceKey] = value; // put in choice cache

    return value;
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

    if (ident.length === 0) {
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
        result = this.context[this.symbols.DYNAMIC + ident];
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

  inlineAssignment(ident, tfs, result) {
    const $ = this.symbols;
    const lhs = $.STATIC + ident;
    const rhs = this.restoreTransforms(result, tfs);
    result = $.OPEN_CHOICE + (lhs + '=' + rhs) + $.CLOSE_CHOICE;
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
              this.symbols.CLOSE_WEIGHT.length
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

  choose(options, excludes = []) {
    if (!options || !options.length) {
      throw Error('Invalid choice: no options');
    }

    const valid = options.filter((x) => !excludes.includes(x));
    if (!valid.length) {
      throw Error('Invalid choice: no valid options');
    }

    const index = this.scripting.RiTa.randi(valid.length);

    let value = ''; const selected = valid[index];

    if (typeof selected === 'string') {
      this.print('choice.text', "''");
    } else {
      // if (typeof selected === 'object') {
      this.path = 'choice.' + this.path;
      value = this.visit(selected); // cstNode
    }

    if (typeof value === 'string') value = value.trim();

    return { index, value };
  }

  applyTransforms(value, txs) {
    if (this.traceTx) { console.log('applyTransforms', this.formatTxs(...arguments)); }
    for (let i = 0; i < txs.length; i++) {
      value = this.applyTransform(value, txs[i]);
    }
    return value;
  }

  // value is not yet resolved, so store with transform for later
  restoreTransforms(value, txs) {
    if (typeof value === 'string') {
      const patt = new RegExp(
        '^' + this.escaped.OPEN_CHOICE + '.*' + this.escaped.CLOSE_CHOICE + '$'
      );
      if (!patt.test(value)) {
        // wrap in choice to preserve
        value = this.symbols.OPEN_CHOICE + value + this.symbols.CLOSE_CHOICE;
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
    let result;
    const raw = target + image;
    const tx = image.substring(1).replace(/\(\)$/, '');

    // function in dynamics
    if (typeof this.dynamics[tx] === 'function') {
      result = this.dynamics[tx](target);
    }
    // function in statics
    else if (typeof this.statics[tx] === 'function') {
      result = this.statics[tx](target);
    }
    // function in context
    else if (typeof this.context[tx] === 'function') {
      result = this.context[tx](target);
    }

    // function in transforms
    else if (typeof this.RiScript.transforms[tx] === 'function') {
      result = this.RiScript.transforms[tx](target);
    }
    // member functions (usually on String)
    else if (typeof target[tx] === 'function') {
      result = target[tx]();
    } else {
      // check for property
      if (target.hasOwnProperty(tx)) {
        result = target[tx];
      } else {
        if (!this.scripting.RiTa.SILENT && !this.silent) {
          console.warn('[WARN] Unresolved transform: ' + raw);
        }

        /* Replace transform parens so as not to trigger
           RiScript.isParseable (for example, in v2) 0 */
        result = raw.replace(/\(\)$/, '&lpar;&rpar;');
      }
    }

    if (this.trace) { console.log(`${this.tindent()}[transform] ${raw} -> '${result}'`); }

    return result;
  }

  lookupsToString() {
    const dyns = {};
    const stats = {};
    Object.entries(this.dynamics || {}).forEach(
      ([k, v]) => (dyns[`$${k} `] = v)
    );
    Object.entries(this.statics || {}).forEach(
      ([k, v]) => (stats[`#${k} `] = v)
    );
    return JSON.stringify({ ...this.context, ...stats, ...dyns }, (k, v) =>
      typeof v === 'function' ? '<f*:pending>' : v
    ).replace(/"/g, '');
  }

  formatTxs(value, txs) {
    return value + txs.map((tx) => tx.image.replace(/()/, '') + '()').join('');
  }

  print(s, ...args) {
    if (this.trace) {
      if (this.path && s !== 'script') {
        s = this.path.replace(/\.$/, '');
      }
      if (!s.endsWith('gate.text')) { // ignore these
        console.log(++this.order, `[${s}]`, ...args);
      }
      this.path = '';
    }
  }

  tindent() {
    return ' '.repeat((this.order + '').length + 1);
  }
}

function transformNames(txs) {
  return txs && txs.length
    ? txs.map((tx) => tx.image.replace(/(^\.|\(\)$)/g, ''), [])
    : [];
}

export { RiScriptVisitor };

// console.log('&#33; -> '+decode('&#33;'));
// console.log('&amp; -> '+decode('&amp;'));
