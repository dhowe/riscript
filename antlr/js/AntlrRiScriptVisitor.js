/**
 * ANTLR-based RiScript Visitor
 * Implements the visitor pattern for ANTLR parse trees
 */

import riscriptVisitor from './riscriptVisitor.js';
import { Util } from '../../src/util.js';

const { escapeText, stringHash, formatAny } = Util;

class AntlrRiScriptVisitor extends riscriptVisitor {
  constructor(riScript, context = {}) {
    super();

    this.order = 0;
    this.trace = 0;
    this.indent = 0;
    this.choices = {};
    this.context = context;
    this.isNoRepeat = false;
    this.input = '';

    this.scripting = riScript;
    this.Symbols = riScript.Symbols;
    this.Escaped = riScript.Escaped;

    // lookups
    this.statics = {};
    this.dynamics = {};
    this.pendingGates = {};

    this.maxRecursionDepth = 10;
    this.nowarn = false;
  }

  start(opts = {}) {
    this.input = opts.input || '';
    this.trace = opts.trace || 0;
    this.nowarn = opts.silent || false;
    this.traceTx = opts.traceTx || false;
    if (!opts.tree) throw Error('no tree');
    return this.visit(opts.tree);
  }

  visitScript(ctx) {
    this.order = this.indent = 0;
    this.print('script', `'${escapeText(this.input)}'`);
    
    let result = '';
    const exprCtxs = ctx.expr();
    if (exprCtxs && exprCtxs.length > 0) {
      this.indent++;
      result = this.visit(exprCtxs[0]);
      this.indent--;
    }
    
    this.print('/script');
    return result;
  }

  visitExpr(ctx) {
    const atomCtxs = ctx.atom();
    const atoms = atomCtxs ? atomCtxs.map(a => this.visit(a)) : [];
    
    if (atoms.length === 1) return atoms[0];

    for (let i = 1; i < atoms.length - 1; i++) {
      if (atoms[i] && atoms[i].length === 0 &&
        atoms[i - 1] && atoms[i - 1].endsWith(' ') &&
        atoms[i + 1] && atoms[i + 1].startsWith(' ')) {
        atoms[i + 1] = atoms[i + 1].substring(1);
      }
    }
    return atoms.join('');
  }

  visitAtom(ctx) {
    const choiceCtxs = ctx.choice && ctx.choice();
    if (choiceCtxs && choiceCtxs.length > 0) {
      return this.visit(choiceCtxs[0]);
    }
    
    const symbolCtxs = ctx.symbol && ctx.symbol();
    if (symbolCtxs && symbolCtxs.length > 0) {
      return this.visit(symbolCtxs[0]);
    }
    
    const textCtxs = ctx.text && ctx.text();
    if (textCtxs && textCtxs.length > 0) {
      return this.visit(textCtxs[0]);
    }
    
    const silentCtxs = ctx.silent && ctx.silent();
    if (silentCtxs && silentCtxs.length > 0) {
      return this.visit(silentCtxs[0]);
    }
    
    const entityCtxs = ctx.entity && ctx.entity();
    if (entityCtxs && entityCtxs.length > 0) {
      return this.visit(entityCtxs[0]);
    }
    
    const pgateCtxs = ctx.pgate && ctx.pgate();
    if (pgateCtxs && pgateCtxs.length > 0) {
      return this.visit(pgateCtxs[0]);
    }
    
    const assignCtxs = ctx.assign && ctx.assign();
    if (assignCtxs && assignCtxs.length > 0) {
      return this.visit(assignCtxs[0]);
    }
    
    return '';
  }

  visitSymbol(ctx) {
    const symbolTokens = ctx.Symbol();
    if (!symbolTokens || symbolTokens.length === 0) return '';
    
    const sym = symbolTokens[0].getText().replace(/\(\)$/, '');
    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    const transformTokens = ctx.Transform() || [];
    const transforms = transformTokens.map(t => ({ image: t.getText() }));
    
    this.isNoRepeat = this.hasNoRepeat(transforms);
    this.print('symbol', sym);

    let { result, isStatic, isUser, resolved } = this.checkContext(ident);

    for (let i = 0; typeof result === 'function'; i++) {
      result = result.call();
      resolved = !this.scripting.isParseable(result);
      if (i === this.maxRecursionDepth) throw Error('Max recursion depth reached');
    }

    if (this.isNoRepeat && (isStatic || isUser)) {
      this.isNoRepeat = false;
      throw Error(`Cannot use norepeat() on ${isStatic ? 'static' : 'non-dynamic'} symbol`);
    }

    if (typeof result === 'undefined') {
      return sym;
    }

    if (transforms.length > 0) {
      result = this.applyTransforms(result, transforms);
    }

    this.isNoRepeat = false;
    return result;
  }

  visitChoice(ctx) {
    const choiceKey = stringHash(this.input + ' #' + this.choiceId(ctx));
    this.print('choice', 'choice');

    let decision = 'accept';
    const gateCtxs = ctx.gate && ctx.gate();
    if (gateCtxs && gateCtxs.length > 0) {
      this.indent++;
      this.visit(gateCtxs[0]);
      this.indent--;
    }

    const orExprCtxs = ctx.orExpr();
    if (!orExprCtxs || orExprCtxs.length === 0) return '';

    const options = this.parseOrExpr(orExprCtxs[0]);
    if (!options || !options.length) return '';

    const value = this.choose(options, []);

    if (ctx.Transform && ctx.Transform().length > 0) {
      const transforms = ctx.Transform().map(t => ({ image: t.getText() }));
      const result = this.applyTransforms(value, transforms);
      this.choices[choiceKey] = result;
      return result;
    }

    this.choices[choiceKey] = value;
    return value;
  }

  visitAssign(ctx) {
    const symbolTokens = ctx.Symbol();
    if (!symbolTokens || symbolTokens.length === 0) return '';

    const sym = symbolTokens[0].getText();
    const ident = sym.replace(this.scripting.regex.AnySymbol, '');
    const isStatic = sym.startsWith(this.Symbols.STATIC);

    this.indent++;
    const exprCtxs = ctx.expr();
    const value = exprCtxs && exprCtxs.length > 0 ? this.visit(exprCtxs[0]) : '';
    this.indent--;

    if (isStatic) {
      this.statics[ident] = value;
    } else {
      const $ = this;
      this.dynamics[ident] = () => {
        const exprCtxs = ctx.expr();
        return exprCtxs && exprCtxs.length > 0 ? $.visit(exprCtxs[0]) : '';
      };
    }

    return '';
  }

  visitSilent(ctx) {
    return '';
  }

  visitOrExpr(ctx) {
    const wexprCtxs = ctx.wexpr && ctx.wexpr();
    if (!wexprCtxs) return [];
    return wexprCtxs.map(w => this.visit(w)).filter(w => w !== null);
  }

  visitElseExpr(ctx) {
    const orExprCtxs = ctx.orExpr && ctx.orExpr();
    if (!orExprCtxs || orExprCtxs.length === 0) return [];
    return this.visitOrExpr(orExprCtxs[0]);
  }

  visitPgate(ctx) {
    const text = ctx.PendingGate(0).getText();
    return text;
  }

  visitEntity(ctx) {
    const text = ctx.Entity(0).getText();
    return this.decodeEntity(text);
  }

  visitGate(ctx) {
    return true;
  }

  visitText(ctx) {
    const rawTokens = ctx.Raw && ctx.Raw();
    if (rawTokens && rawTokens.length > 0) {
      return rawTokens[0].getText();
    }
    const statTokens = ctx.STAT && ctx.STAT();
    if (statTokens && statTokens.length > 0) return '#';
    const ampTokens = ctx.AMP && ctx.AMP();
    if (ampTokens && ampTokens.length > 0) return '&';
    return '';
  }

  visitWexpr(ctx) {
    const exprCtxs = ctx.expr && ctx.expr();
    if (exprCtxs && exprCtxs.length > 0) {
      return this.visit(exprCtxs[0]);
    }
    return '';
  }

  // ---- Helper Methods ----

  checkContext(ident) {
    let result = undefined;
    let isStatic = false;
    let isUser = false;
    let resolved = false;

    if (ident in this.statics) {
      result = this.statics[ident];
      isStatic = true;
      resolved = !this.scripting.isParseable(result);
    } else if (ident in this.dynamics) {
      result = this.dynamics[ident];
    } else if (ident in this.context) {
      result = this.context[ident];
      isUser = true;
      resolved = !this.scripting.isParseable(result);
    }

    return { result, isStatic, isUser, resolved };
  }

  parseOrExpr(orExprCtx) {
    const wexprCtxs = orExprCtx.wexpr && orExprCtx.wexpr();
    if (!wexprCtxs) return [];
    return wexprCtxs.map(w => {
      const value = this.visit(w);
      return value !== null ? value : '';
    });
  }

  choose(options, excludes = []) {
    if (!options || !options.length) {
      return '';
    }
    const valid = options.filter(x => !excludes.includes(x) && x !== null && x !== undefined);
    if (!valid.length) {
      return options[0] || '';
    }
    const index = this.scripting.RiTa.randi(valid.length);
    return valid[index];
  }

  applyTransforms(value, transforms) {
    this.indent++;
    for (const tx of transforms) {
      value = this.applyTransform(value, tx);
    }
    this.indent--;
    return value;
  }

  applyTransform(target, transform) {
    const image = transform.image;
    const tx = image.substring(1).replace(/\(\)$/, '');
    const RiTa = this.scripting.RiTa;

    let result;

    if (typeof this.dynamics[tx] === 'function') {
      result = this.dynamics[tx].bind(this.context)(target);
    }
    else if (typeof this.statics[tx] === 'function') {
      result = this.statics[tx].call(this.context, target);
    }
    else if (typeof this.context[tx] === 'function') {
      result = this.context[tx].call(this.context, target);
    }
    else if (typeof this.scripting.transforms[tx] === 'function') {
      result = this.scripting.transforms[tx].call(this.context, target);
    }
    else if (typeof target[tx] === 'function') {
      result = target[tx]();
    }
    else if (target && target.hasOwnProperty && target.hasOwnProperty(tx)) {
      result = target[tx];
    }
    else {
      if (!RiTa.SILENT && !this.nowarn) {
        // console.warn('[WARN] Unresolved transform: ' + image);
      }
      result = (target + image).replace(/\(\)$/, '&lpar;&rpar;');
    }

    return result;
  }

  hasNoRepeat(transforms) {
    if (!transforms) return false;
    return transforms.some(tx => 
      tx.image && (tx.image.includes('norepeat') || tx.image.includes('nr'))
    );
  }

  choiceId(ctx) {
    if (ctx.start && ctx.stop) {
      return `${ctx.start.start}-${ctx.stop.stop}`;
    }
    return Math.random().toString(36).substr(2, 9);
  }

  decodeEntity(entity) {
    if (entity.startsWith('&#x')) {
      const code = parseInt(entity.slice(3, -1), 16);
      return String.fromCharCode(code);
    } else if (entity.startsWith('&#')) {
      const code = parseInt(entity.slice(2, -1));
      return String.fromCharCode(code);
    }
    return entity;
  }

  print(s, ...args) {
    if (this.trace) {
      let indentStr = '  '.repeat(this.indent);
      let msg = `${indentStr}<${s}>${s.startsWith('/') ? '' : ' '}`;
      if (++this.order < 10) msg = ' ' + msg;
      // console.log(this.order, msg, ...args);
    }
  }
}

export { AntlrRiScriptVisitor };
