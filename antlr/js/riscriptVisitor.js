// Generated from riscript.g4 by ANTLR 4.13.0
// jshint ignore: start
import antlr4 from 'antlr4';

// This class defines a complete generic visitor for a parse tree produced by riscriptParser.
// Default implementation returns visitChildren result.

export default class riscriptVisitor extends antlr4.tree.ParseTreeVisitor {

	// Visit a parse tree produced by riscriptParser#script.
	visitScript(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#expr.
	visitExpr(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#atom.
	visitAtom(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#wexpr.
	visitWexpr(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#symbol.
	visitSymbol(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#choice.
	visitChoice(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#assign.
	visitAssign(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#silent.
	visitSilent(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#orExpr.
	visitOrExpr(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#elseExpr.
	visitElseExpr(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#pgate.
	visitPgate(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#entity.
	visitEntity(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#gate.
	visitGate(ctx) {
	  return this.visitChildren(ctx);
	}


	// Visit a parse tree produced by riscriptParser#text.
	visitText(ctx) {
	  return this.visitChildren(ctx);
	}

}