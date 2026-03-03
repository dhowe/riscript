// Generated ANTLR grammar for RiScript language based on the Chevrotain
// implementation in the repository.  This is a first-pass translation;
// further tweaks might be necessary to capture subtle tokenisation rules
// such as nested gate bodies or the `Raw` text rule.

grammar riscript;

// Parser rules ------------------------------------------------------------

script
    : expr+ EOF
    ;

expr
    : atom+
    ;

atom
    : choice
    | symbol
    | text
    | silent
    | entity
    | pgate
    | assign
    ;

wexpr
    : (expr | Weight)*
    ;

symbol
    : Symbol Transform*
    ;

choice
    : OC gate? orExpr elseExpr? CC Transform*
    ;

assign
    : Symbol EQ expr
    ;

silent
    : OS gate? Symbol (EQ expr)? CS
    ;

orExpr
    : wexpr (OR wexpr)*
    ;

elseExpr
    : ELSE orExpr
    ;

pgate
    : PendingGate
    ;

entity
    : Entity
    ;

gate
    : Gate+
    ;

text
    : Raw
    | STAT
    | AMP
    ;

// Lexer rules -------------------------------------------------------------

DYN         : '$' ;
STAT        : '#' ;
OC          : '[' ;
CC          : ']' ;
OS          : '{' ;
CS          : '}' ;
ELSE        : '||' ;
OR          : '|' ;
EQ          : '=' ;
AMP         : '&' ;

Symbol
    : (DYN | STAT) [A-Za-z_] [A-Za-z0-9_]* ('(' ')')?
    ;

Transform
    : '.' [A-Za-z0-9_]+ ('(' ')')?
    ;

fragment DIGIT    : [0-9] ;

Entity
    : '&' ( [a-z0-9]+ | '#' [0-9]{1,6} | '#x' [0-9a-fA-F]{1,6} ) ';'
    ;

Weight
    : '^' '-'? [0-9]+ '^'
    ;

PendingGate
    : '@@' [0-9]{9,11}
    ;

// Gate allows nested braces; we define a recursive fragment to
// consume balanced curly-brace pairs.  The Chevrotain implementation
// also skips spaces after the '@' and insists on an opening '{'.  This
// lexer rule follows the same idea but further adjustments may be
// required for complete fidelity.

fragment GateContent
    : ~[{}]
    | '{' GateContent* '}'
    ;

Gate
    : '@' '{' GateContent* '}'
    ;

Raw
    : ( ~['^$#@{}|&=\u005B\u005D\\] )+   // any characters except special symbols
    ;

WS
    : [ \t\r\n]+ -> skip
    ;
