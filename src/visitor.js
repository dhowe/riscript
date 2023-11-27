
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

    if (this.trace) console.log(`calling ${name}()`);

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

  // Parser rules ================================================

  script(ctx) {
    if (!ctx.expr) throw Error('invalid script');
    this.order = 0;
    this.print('script', "'" + this.RiScript._escapeText(this.input)
      + "' :: " + ctx.expr.length + ' expression(s)');
    return ctx.expr.length ? this.visit(ctx.expr) : '';
  }

  expr(ctx) {
    const types = Object.keys(ctx);
    if (types.length !== 1) throw Error('invalid expr: ' + types.length);
    return this.visit(ctx[types[0]]);
  }

  silent(ctx, opts = {}) {
    this.print('silent', this.nodeText);
    opts.silent = true;
    if (ctx.assign.length !== 1) throw Error('invalid silent');
    this.assign(ctx.assign, opts);
    return '';
  }

  assign(ctx, opts) {
    this.print('assign', this.nodeText);

    if (ctx.symbol.length !== 1) throw Error('invalid assign');
    return this.doAssign(ctx.symbol[0].image, ctx.transform, opts);
  }

  // gate(ctx, opts) {}

  symbol(ctx, opts) {
    if (ctx.symbol.length !== 1) throw Error('invalid symbol');
    return this.doSymbol(ctx.symbol[0].image, ctx.transform, opts);
  }

  orExpr(ctx, opts = {}) {
    if (ctx?.options?.length !== 1) throw Error('invalid orExpr');

    this.print('orExpr', this.nodeText);
    let exprKey = this.RiScript._stringHash(this.nodeText + ' #' + this.choiceId(ctx));

    let gateResult = this.doGate(ctx, exprKey);
    if (gateResult === 'reject' || opts.forceReject) {
      return ctx?.elseExpr ? this.visit(ctx.elseExpr) : '';
    }
    if (gateResult === 'defer') {
      return `${this.Symbols.PENDING_GATE}${exprKey}`;
    }
    return this.visit(ctx.options); // accept
  }

  options(ctx) {
    this.print('options', this.nodeText);
  }

  choice(ctx) {
    if (ctx?.orExpr?.length !== 1) throw Error('invalid choice');
    this.print('choice', this.nodeText);
    let result = this.visit(ctx.orExpr);
    return this.applyTransforms(result, ctx.transform);
  }

  elseExpr(ctx) {
    if (Object.keys(ctx.elseExpr).length !== 1) throw Error('invalid text');
    this.print('elseExpr', this.nodeText);
    return this.visit(ctx.expr)
  }

  text(ctx) {
    if (Object.keys(ctx).length !== 1) throw Error('invalid text');
    const type = this.scripting.textTypes.filter(t => ctx[t]);
    const image = ctx[type][0].image; // any of riscript.textTypes
    this.print('text', this.RiScript._escapeText("'" + image + "'"));
    return image;
  }

  // Helpers ================================================

  doGate(ctx, exprKey) {

    let gateText = ctx?.gate?.[0]?.children?.Gate?.[0]?.image;
    if (!gateText) return 'accept'; // no gate, accept

    let { decision, operands } = this.doMingoQuery(gateText);
    if (decision === 'defer') {
      this.pendingGates[exprKey] = {
        operands,
        gateText: rawGate,
        deferredContext: ctx
      };
    }
    let msg = `${gateText} -> ${(result !== 'defer' ? decision.toUpperCase()
      : `DEFER ${exprKey}`)}  ${this.lookupsToString()}`;

    this.print('gate', msg);
    return decision;
  }

  doChoice(ctx, choiceId, transform, opts) {
    const $ = this.symbols;
    const original = this.nodeText;
    const choiceKey = this.RiScript._stringHash(original + ' #' + choiceId);

    if (!this.isNoRepeat && this.hasNoRepeat(transform)) {
      throw Error('noRepeat() not allowed on choice (use a $variable instead): ' + original);
    }

    this.print('choice', original);

    // do we have a gate ?


    const orExpr = ctx.orExpr;
    if (decision === 'reject') {
      if (!('elseExpr' in ctx)) return ''; // rejected without else expr, return ''
      orExpr = elseExpr; // elseExpr is the only option
    }

    const options = this.parseOptions(orExpr); // get options
    if (!options) throw Error('No options in choice: ' + original);

    const excluded = [];
    let value = null, restored = false
    while (value === null) {
      value = this.choose(options, excluded).value;

      // if we still have script, defer until its resolved
      if (this.scripting.isParseable(value)) {
        if (transform) value = this.restoreTransforms(value, transformF);
        restored = true;
        break;
      }

      // apply any remaining transforms
      if (transform) value = this.applyTransforms(value, transform);

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

  doAssign(expr, transform, opts) {
    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    const isStatic = sym.startsWith(this.symbols.STATIC);

    let value, info;
    if (isStatic) {
      // static: can be resolved immediately
      value = this.visit(expr);
      if (this.scripting.isParseable(value)) {
        this.statics[ident] = value; // store in lookup table ??
        value = this.inlineAssignment(ident, transform, value);
      } else {
        this.statics[ident] = value; // store in lookup table
        this.pendingSymbols.delete(ident); // no longer pending
        this.trace && console.log('  [pending.delete]', sym,
          this.pendingSymbols.length ? JSON.stringify(this.pendingSymbols) : '');
      }
      info = `${sym} = ${this.RiScript._escapeText(value)}` +
        ` [#static] ${opts?.silent ? '{silent}' : ''}`;

    } else {

      // dynamic: store as func to be resolved later, perhaps many times
      value = () => this.visit(expr);
      info = `${sym} = <f*:pending> ` + (opts?.silent ? '{silent}' : '');
      this.dynamics[ident] = value; // store in lookup table
    }

    this.print('assign', info);

    return value;
  }

  doSymbol(symbol, transform, opts) {

    const original = this.nodeText;
    const ident = symbol.replace(this.scripting.regex.AnySymbol, '');

    this.isNoRepeat = this.hasNoRepeat(transform);

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
      this.print('symbol', `${symbol} -> "${original}" ctx=${this.lookupsToString()} [deferred]`);
      return original;
    }

    let info = original + " -> '" + result + "'";

    // defer if we still have unresolved riscript
    if (typeof result === 'string' && !resolved) {
      if (isStatic) {
        this.pendingSymbols.add(ident);
        result = this.inlineAssignment(ident, ctx.transform, result);
        this.print('symbol*', `${original} -> ${result} :: pending.add(${ident})`);
      } else {
        if (transform) result = this.restoreTransforms(result, transform);
        this.print('symbol', info);
      }
      return result;
    }

    if (isStatic) {
      // store !untransformed! result in static context
      this.statics[ident] = result;
    }

    if (transform) {
      result = this.applyTransforms(result, transform);
      info += " -> '" + result + "'";
      // info += " -> " + ctx.transform.map(tf => ` ${tf.image} -> `) + '\'' + result + "'";
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

  hasNoRepeat(tfs) {
    const transforms = transformNames(tfs);
    if (transforms.length) {
      return transforms.includes('nr') || transforms.includes('norepeat');
    }
    return false;
  }

  checkContext(ident, opts = {}) {
    let isStatic = false, isUser = false;

    if (ident.length === 0) {
      return { result: '', resolved: true, isStatic, isUser };
    }

    // check for dynamic symbol: $var
    let result = this.dynamics[ident];
    if (typeof result === 'undefined') {

      //  no dynamic, check for static symbol: #var
      result = this.statics[ident];
      if (typeof result !== 'undefined') {
        isStatic = true; // found static
      }
    }

    if (typeof result === 'undefined') {
      // no static, check for user/js symbol: context[var]
      result = this.context[ident];
      if (typeof result !== 'undefined') {
        isUser = true; // found user symbol
      } else {
        // check for user-defined dynamic? context[$var]
        result = this.context[this.symbols.DYNAMIC + ident];
        if (typeof result !== 'undefined') {
          // no user, note: treat as dynamic, isUser = false
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

  doMingoQuery(raw) {
    let mingoQuery;

    if (raw.startsWith(this.Symbols.OPEN_GATE)) raw = raw.substring(1);

    try {
      mingoQuery = this.scripting._query(raw);
    } catch (e) {
      if (!this.warnOnInvalidGates) {
        throw Error(`Invalid gate[2]: "@${raw}@"\n\nRootCause -> ${e}`);
      }
      if (!this.scripting.RiTa.SILENT && !this.nowarn) {
        console.warn(`[WARN] Ignoring invalid gate: @${raw}@\n`, e);
      }
      return { decision: 'accept', operands: undefined }; // error
    }

    const resolvedOps = {};
    const unresolvedOps = [];
    const operands = mingoQuery.operands();
    operands.forEach((sym) => {
      let { result, resolved, isStatic, isUser } = this.checkContext(sym);

      if (typeof result === 'function') {
        // while {} ?
        result = result.call(); // call it (silent?)
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

    let resolvedOpCount = Object.keys(resolvedOps).length;
    if (resolvedOpCount + unresolvedOps.length !== operands.length) {
      throw Error('invalid operands');
    }

    let optsToReturn;
    if (unresolvedOps.length) {
      optsToReturn = unresolvedOps;
    }
    else { // do the query
      let result = mingoQuery.test(resolvedOps);
      if (!result && this.castValues(resolvedOps)) {
        result = mingoQuery.test(resolvedOps); // redo query after casting
      }
    }

    return { decision: result ? 'accept' : 'reject', operands: optsToReturn };
  }

  parseOptions(orExpr) {
    const options = [];
    if (orExpr) {
      for (let i = 0; i < orExpr.length; i++) {
        const expr = orExpr[i].children.expr;
        const weight = orExpr[i].children.Weight;
        if (!expr) continue;
        if (expr.length != 1) { throw Error('invalid choice-expr: ' + expr.length); }
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


  parseOptionsX(ctx) {
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
