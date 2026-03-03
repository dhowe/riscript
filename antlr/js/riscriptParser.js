// Generated from riscript.g4 by ANTLR 4.13.0
// jshint ignore: start
import antlr4 from 'antlr4';
import riscriptListener from './riscriptListener.js';
import riscriptVisitor from './riscriptVisitor.js';

const serializedATN = [4,1,18,116,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,
4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,
2,13,7,13,1,0,4,0,30,8,0,11,0,12,0,31,1,0,1,0,1,1,4,1,37,8,1,11,1,12,1,38,
1,2,1,2,1,2,1,2,1,2,1,2,1,2,3,2,48,8,2,1,3,1,3,5,3,52,8,3,10,3,12,3,55,9,
3,1,4,1,4,5,4,59,8,4,10,4,12,4,62,9,4,1,5,1,5,3,5,66,8,5,1,5,1,5,3,5,70,
8,5,1,5,1,5,5,5,74,8,5,10,5,12,5,77,9,5,1,6,1,6,1,6,1,6,1,7,1,7,3,7,85,8,
7,1,7,1,7,1,7,3,7,90,8,7,1,7,1,7,1,8,1,8,1,8,5,8,97,8,8,10,8,12,8,100,9,
8,1,9,1,9,1,9,1,10,1,10,1,11,1,11,1,12,4,12,110,8,12,11,12,12,12,111,1,13,
1,13,1,13,0,0,14,0,2,4,6,8,10,12,14,16,18,20,22,24,26,0,1,3,0,2,2,10,10,
17,17,119,0,29,1,0,0,0,2,36,1,0,0,0,4,47,1,0,0,0,6,53,1,0,0,0,8,56,1,0,0,
0,10,63,1,0,0,0,12,78,1,0,0,0,14,82,1,0,0,0,16,93,1,0,0,0,18,101,1,0,0,0,
20,104,1,0,0,0,22,106,1,0,0,0,24,109,1,0,0,0,26,113,1,0,0,0,28,30,3,2,1,
0,29,28,1,0,0,0,30,31,1,0,0,0,31,29,1,0,0,0,31,32,1,0,0,0,32,33,1,0,0,0,
33,34,5,0,0,1,34,1,1,0,0,0,35,37,3,4,2,0,36,35,1,0,0,0,37,38,1,0,0,0,38,
36,1,0,0,0,38,39,1,0,0,0,39,3,1,0,0,0,40,48,3,10,5,0,41,48,3,8,4,0,42,48,
3,26,13,0,43,48,3,14,7,0,44,48,3,22,11,0,45,48,3,20,10,0,46,48,3,12,6,0,
47,40,1,0,0,0,47,41,1,0,0,0,47,42,1,0,0,0,47,43,1,0,0,0,47,44,1,0,0,0,47,
45,1,0,0,0,47,46,1,0,0,0,48,5,1,0,0,0,49,52,3,2,1,0,50,52,5,14,0,0,51,49,
1,0,0,0,51,50,1,0,0,0,52,55,1,0,0,0,53,51,1,0,0,0,53,54,1,0,0,0,54,7,1,0,
0,0,55,53,1,0,0,0,56,60,5,11,0,0,57,59,5,12,0,0,58,57,1,0,0,0,59,62,1,0,
0,0,60,58,1,0,0,0,60,61,1,0,0,0,61,9,1,0,0,0,62,60,1,0,0,0,63,65,5,3,0,0,
64,66,3,24,12,0,65,64,1,0,0,0,65,66,1,0,0,0,66,67,1,0,0,0,67,69,3,16,8,0,
68,70,3,18,9,0,69,68,1,0,0,0,69,70,1,0,0,0,70,71,1,0,0,0,71,75,5,4,0,0,72,
74,5,12,0,0,73,72,1,0,0,0,74,77,1,0,0,0,75,73,1,0,0,0,75,76,1,0,0,0,76,11,
1,0,0,0,77,75,1,0,0,0,78,79,5,11,0,0,79,80,5,9,0,0,80,81,3,2,1,0,81,13,1,
0,0,0,82,84,5,5,0,0,83,85,3,24,12,0,84,83,1,0,0,0,84,85,1,0,0,0,85,86,1,
0,0,0,86,89,5,11,0,0,87,88,5,9,0,0,88,90,3,2,1,0,89,87,1,0,0,0,89,90,1,0,
0,0,90,91,1,0,0,0,91,92,5,6,0,0,92,15,1,0,0,0,93,98,3,6,3,0,94,95,5,8,0,
0,95,97,3,6,3,0,96,94,1,0,0,0,97,100,1,0,0,0,98,96,1,0,0,0,98,99,1,0,0,0,
99,17,1,0,0,0,100,98,1,0,0,0,101,102,5,7,0,0,102,103,3,16,8,0,103,19,1,0,
0,0,104,105,5,15,0,0,105,21,1,0,0,0,106,107,5,13,0,0,107,23,1,0,0,0,108,
110,5,16,0,0,109,108,1,0,0,0,110,111,1,0,0,0,111,109,1,0,0,0,111,112,1,0,
0,0,112,25,1,0,0,0,113,114,7,0,0,0,114,27,1,0,0,0,13,31,38,47,51,53,60,65,
69,75,84,89,98,111];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class riscriptParser extends antlr4.Parser {

    static grammarFileName = "riscript.g4";
    static literalNames = [ null, "'$'", "'#'", "'['", "']'", "'{'", "'}'", 
                            "'||'", "'|'", "'='", "'&'" ];
    static symbolicNames = [ null, "DYN", "STAT", "OC", "CC", "OS", "CS", 
                             "ELSE", "OR", "EQ", "AMP", "Symbol", "Transform", 
                             "Entity", "Weight", "PendingGate", "Gate", 
                             "Raw", "WS" ];
    static ruleNames = [ "script", "expr", "atom", "wexpr", "symbol", "choice", 
                         "assign", "silent", "orExpr", "elseExpr", "pgate", 
                         "entity", "gate", "text" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = riscriptParser.ruleNames;
        this.literalNames = riscriptParser.literalNames;
        this.symbolicNames = riscriptParser.symbolicNames;
    }



	script() {
	    let localctx = new ScriptContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, riscriptParser.RULE_script);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 29; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 28;
	            this.expr();
	            this.state = 31; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while((((_la) & ~0x1f) === 0 && ((1 << _la) & 175148) !== 0));
	        this.state = 33;
	        this.match(riscriptParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	expr() {
	    let localctx = new ExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, riscriptParser.RULE_expr);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 36; 
	        this._errHandler.sync(this);
	        var _alt = 1;
	        do {
	        	switch (_alt) {
	        	case 1:
	        		this.state = 35;
	        		this.atom();
	        		break;
	        	default:
	        		throw new antlr4.error.NoViableAltException(this);
	        	}
	        	this.state = 38; 
	        	this._errHandler.sync(this);
	        	_alt = this._interp.adaptivePredict(this._input,1, this._ctx);
	        } while ( _alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER );
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	atom() {
	    let localctx = new AtomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, riscriptParser.RULE_atom);
	    try {
	        this.state = 47;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 40;
	            this.choice();
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 41;
	            this.symbol();
	            break;

	        case 3:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 42;
	            this.text();
	            break;

	        case 4:
	            this.enterOuterAlt(localctx, 4);
	            this.state = 43;
	            this.silent();
	            break;

	        case 5:
	            this.enterOuterAlt(localctx, 5);
	            this.state = 44;
	            this.entity();
	            break;

	        case 6:
	            this.enterOuterAlt(localctx, 6);
	            this.state = 45;
	            this.pgate();
	            break;

	        case 7:
	            this.enterOuterAlt(localctx, 7);
	            this.state = 46;
	            this.assign();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	wexpr() {
	    let localctx = new WexprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, riscriptParser.RULE_wexpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 53;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while((((_la) & ~0x1f) === 0 && ((1 << _la) & 191532) !== 0)) {
	            this.state = 51;
	            this._errHandler.sync(this);
	            switch(this._input.LA(1)) {
	            case 2:
	            case 3:
	            case 5:
	            case 10:
	            case 11:
	            case 13:
	            case 15:
	            case 17:
	                this.state = 49;
	                this.expr();
	                break;
	            case 14:
	                this.state = 50;
	                this.match(riscriptParser.Weight);
	                break;
	            default:
	                throw new antlr4.error.NoViableAltException(this);
	            }
	            this.state = 55;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	symbol() {
	    let localctx = new SymbolContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, riscriptParser.RULE_symbol);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 56;
	        this.match(riscriptParser.Symbol);
	        this.state = 60;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===12) {
	            this.state = 57;
	            this.match(riscriptParser.Transform);
	            this.state = 62;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	choice() {
	    let localctx = new ChoiceContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, riscriptParser.RULE_choice);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 63;
	        this.match(riscriptParser.OC);
	        this.state = 65;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===16) {
	            this.state = 64;
	            this.gate();
	        }

	        this.state = 67;
	        this.orExpr();
	        this.state = 69;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===7) {
	            this.state = 68;
	            this.elseExpr();
	        }

	        this.state = 71;
	        this.match(riscriptParser.CC);
	        this.state = 75;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===12) {
	            this.state = 72;
	            this.match(riscriptParser.Transform);
	            this.state = 77;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	assign() {
	    let localctx = new AssignContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, riscriptParser.RULE_assign);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 78;
	        this.match(riscriptParser.Symbol);
	        this.state = 79;
	        this.match(riscriptParser.EQ);
	        this.state = 80;
	        this.expr();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	silent() {
	    let localctx = new SilentContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, riscriptParser.RULE_silent);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 82;
	        this.match(riscriptParser.OS);
	        this.state = 84;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===16) {
	            this.state = 83;
	            this.gate();
	        }

	        this.state = 86;
	        this.match(riscriptParser.Symbol);
	        this.state = 89;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===9) {
	            this.state = 87;
	            this.match(riscriptParser.EQ);
	            this.state = 88;
	            this.expr();
	        }

	        this.state = 91;
	        this.match(riscriptParser.CS);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	orExpr() {
	    let localctx = new OrExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 16, riscriptParser.RULE_orExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 93;
	        this.wexpr();
	        this.state = 98;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===8) {
	            this.state = 94;
	            this.match(riscriptParser.OR);
	            this.state = 95;
	            this.wexpr();
	            this.state = 100;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	elseExpr() {
	    let localctx = new ElseExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 18, riscriptParser.RULE_elseExpr);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 101;
	        this.match(riscriptParser.ELSE);
	        this.state = 102;
	        this.orExpr();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	pgate() {
	    let localctx = new PgateContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 20, riscriptParser.RULE_pgate);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 104;
	        this.match(riscriptParser.PendingGate);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	entity() {
	    let localctx = new EntityContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 22, riscriptParser.RULE_entity);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 106;
	        this.match(riscriptParser.Entity);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	gate() {
	    let localctx = new GateContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 24, riscriptParser.RULE_gate);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 109; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 108;
	            this.match(riscriptParser.Gate);
	            this.state = 111; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===16);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	text() {
	    let localctx = new TextContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 26, riscriptParser.RULE_text);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 113;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 132100) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

riscriptParser.EOF = antlr4.Token.EOF;
riscriptParser.DYN = 1;
riscriptParser.STAT = 2;
riscriptParser.OC = 3;
riscriptParser.CC = 4;
riscriptParser.OS = 5;
riscriptParser.CS = 6;
riscriptParser.ELSE = 7;
riscriptParser.OR = 8;
riscriptParser.EQ = 9;
riscriptParser.AMP = 10;
riscriptParser.Symbol = 11;
riscriptParser.Transform = 12;
riscriptParser.Entity = 13;
riscriptParser.Weight = 14;
riscriptParser.PendingGate = 15;
riscriptParser.Gate = 16;
riscriptParser.Raw = 17;
riscriptParser.WS = 18;

riscriptParser.RULE_script = 0;
riscriptParser.RULE_expr = 1;
riscriptParser.RULE_atom = 2;
riscriptParser.RULE_wexpr = 3;
riscriptParser.RULE_symbol = 4;
riscriptParser.RULE_choice = 5;
riscriptParser.RULE_assign = 6;
riscriptParser.RULE_silent = 7;
riscriptParser.RULE_orExpr = 8;
riscriptParser.RULE_elseExpr = 9;
riscriptParser.RULE_pgate = 10;
riscriptParser.RULE_entity = 11;
riscriptParser.RULE_gate = 12;
riscriptParser.RULE_text = 13;

class ScriptContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_script;
    }

	EOF() {
	    return this.getToken(riscriptParser.EOF, 0);
	};

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterScript(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitScript(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitScript(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_expr;
    }

	atom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(AtomContext);
	    } else {
	        return this.getTypedRuleContext(AtomContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class AtomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_atom;
    }

	choice() {
	    return this.getTypedRuleContext(ChoiceContext,0);
	};

	symbol() {
	    return this.getTypedRuleContext(SymbolContext,0);
	};

	text() {
	    return this.getTypedRuleContext(TextContext,0);
	};

	silent() {
	    return this.getTypedRuleContext(SilentContext,0);
	};

	entity() {
	    return this.getTypedRuleContext(EntityContext,0);
	};

	pgate() {
	    return this.getTypedRuleContext(PgateContext,0);
	};

	assign() {
	    return this.getTypedRuleContext(AssignContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterAtom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitAtom(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitAtom(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class WexprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_wexpr;
    }

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	Weight = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(riscriptParser.Weight);
	    } else {
	        return this.getToken(riscriptParser.Weight, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterWexpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitWexpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitWexpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class SymbolContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_symbol;
    }

	Symbol() {
	    return this.getToken(riscriptParser.Symbol, 0);
	};

	Transform = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(riscriptParser.Transform);
	    } else {
	        return this.getToken(riscriptParser.Transform, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterSymbol(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitSymbol(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitSymbol(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ChoiceContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_choice;
    }

	OC() {
	    return this.getToken(riscriptParser.OC, 0);
	};

	orExpr() {
	    return this.getTypedRuleContext(OrExprContext,0);
	};

	CC() {
	    return this.getToken(riscriptParser.CC, 0);
	};

	gate() {
	    return this.getTypedRuleContext(GateContext,0);
	};

	elseExpr() {
	    return this.getTypedRuleContext(ElseExprContext,0);
	};

	Transform = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(riscriptParser.Transform);
	    } else {
	        return this.getToken(riscriptParser.Transform, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterChoice(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitChoice(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitChoice(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class AssignContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_assign;
    }

	Symbol() {
	    return this.getToken(riscriptParser.Symbol, 0);
	};

	EQ() {
	    return this.getToken(riscriptParser.EQ, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterAssign(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitAssign(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitAssign(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class SilentContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_silent;
    }

	OS() {
	    return this.getToken(riscriptParser.OS, 0);
	};

	Symbol() {
	    return this.getToken(riscriptParser.Symbol, 0);
	};

	CS() {
	    return this.getToken(riscriptParser.CS, 0);
	};

	gate() {
	    return this.getTypedRuleContext(GateContext,0);
	};

	EQ() {
	    return this.getToken(riscriptParser.EQ, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterSilent(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitSilent(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitSilent(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class OrExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_orExpr;
    }

	wexpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(WexprContext);
	    } else {
	        return this.getTypedRuleContext(WexprContext,i);
	    }
	};

	OR = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(riscriptParser.OR);
	    } else {
	        return this.getToken(riscriptParser.OR, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterOrExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitOrExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitOrExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ElseExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_elseExpr;
    }

	ELSE() {
	    return this.getToken(riscriptParser.ELSE, 0);
	};

	orExpr() {
	    return this.getTypedRuleContext(OrExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterElseExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitElseExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitElseExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PgateContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_pgate;
    }

	PendingGate() {
	    return this.getToken(riscriptParser.PendingGate, 0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterPgate(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitPgate(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitPgate(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class EntityContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_entity;
    }

	Entity() {
	    return this.getToken(riscriptParser.Entity, 0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterEntity(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitEntity(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitEntity(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class GateContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_gate;
    }

	Gate = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(riscriptParser.Gate);
	    } else {
	        return this.getToken(riscriptParser.Gate, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterGate(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitGate(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitGate(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class TextContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = riscriptParser.RULE_text;
    }

	Raw() {
	    return this.getToken(riscriptParser.Raw, 0);
	};

	STAT() {
	    return this.getToken(riscriptParser.STAT, 0);
	};

	AMP() {
	    return this.getToken(riscriptParser.AMP, 0);
	};

	enterRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.enterText(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof riscriptListener ) {
	        listener.exitText(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof riscriptVisitor ) {
	        return visitor.visitText(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}




riscriptParser.ScriptContext = ScriptContext; 
riscriptParser.ExprContext = ExprContext; 
riscriptParser.AtomContext = AtomContext; 
riscriptParser.WexprContext = WexprContext; 
riscriptParser.SymbolContext = SymbolContext; 
riscriptParser.ChoiceContext = ChoiceContext; 
riscriptParser.AssignContext = AssignContext; 
riscriptParser.SilentContext = SilentContext; 
riscriptParser.OrExprContext = OrExprContext; 
riscriptParser.ElseExprContext = ElseExprContext; 
riscriptParser.PgateContext = PgateContext; 
riscriptParser.EntityContext = EntityContext; 
riscriptParser.GateContext = GateContext; 
riscriptParser.TextContext = TextContext; 
