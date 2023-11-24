import { createToken } from "chevrotain"

const TextTypes = ['Raw', 'STAT', 'AMP'];

function getTokens(v2Compatible) {

  let Symbols = {
    OR: '|',
    ELSE: '||',
    DYNAMIC: '$',
    STATIC: '#',
    ENTITY: '&',
    OPEN_GATE: '@',
    // CLOSE_GATE: '@',
    PENDING_GATE: '@@',
    OPEN_SILENT: '{',
    CLOSE_SILENT: '}',
  };

  let v2Symbols = {
    OPEN_CHOICE: '(',
    CLOSE_CHOICE: ')',
    OPEN_WEIGHT: '[',
    CLOSE_WEIGHT: ']',
    CONTINUATION: '\\',
  };

  let v3Symbols = {
    OPEN_CHOICE: '[',
    CLOSE_CHOICE: ']',
    OPEN_WEIGHT: '^', // also allows (int), eg. (3)
    CLOSE_WEIGHT: '^',
    CONTINUATION: '~',
  };

  Object.assign(Symbols, v2Compatible ? v2Symbols : v3Symbols);

  const Escaped = {};
  Object.entries(Symbols).forEach(([k, v]) => { Escaped[k] = escapeRegex(v) });

  const ENTITY_PATTERN = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/i;
  const PENDING_GATE_PATTERN = new RegExp(`${Escaped.PENDING_GATE}([0-9]{8,11})`)

  Escaped.SPECIAL = Object.values(Escaped).join('').replace(/[<>]/g, ''); // allow <> for html 
  Symbols.PENDING_GATE_RE = new RegExp(PENDING_GATE_PATTERN.source, 'g'); // for unresolved gates

  const EnterGate = createToken({
    name: "EnterGate",
    pattern: /@\s*{/,
    //new RegExp(`${Escaped.OPEN_GATE}\\s*{`),
    push_mode: "gate_mode"
  });
  const GateOpenBracket = createToken({
    name: "GateOpenBracket",
    pattern: /\s*{/,
    push_mode: "gate_mode"
  });
  const GateCloseBracket = createToken({
    name: "GateCloseBracket",
    pattern: /}\s*/,
    pop_mode: true,
  });
  const GateContent = createToken({
    name: "GateContent",
    pattern: new RegExp(/[^{}}]+/)
  });
  // const ExitGate = createToken({
  //   name: "GateCloseBracket",
  //   pattern: /}/,
  //   pop_mode: true,
  // });
  // const ExitGate = createToken({
  //   name: "ExitGate",
  //   //pattern: new RegExp(`\\s*${Escaped.CLOSE_GATE}`),
  //   pattern: /}\\s*/,
  //   pop_mode: true,
  //   // line_breaks: false,
  // });

  const PendingGate = createToken({
    name: "PendingGate",
    pattern: PENDING_GATE_PATTERN
  });

  const DYN = createToken({ name: "DYN", pattern: new RegExp(Escaped.DYNAMIC) });
  const STAT = createToken({ name: "STAT", pattern: new RegExp(Escaped.STATIC) });
  const AMP = createToken({ name: "AMP", pattern: /&/ });
  //const AT = createToken({ name: "AT", pattern: /@/ });

  const OC = createToken({ name: "OC", pattern: new RegExp(Escaped.OPEN_CHOICE + '\\s*') });
  const CC = createToken({ name: "CC", pattern: new RegExp(`\\s*${Escaped.CLOSE_CHOICE}`) });
  const OR = createToken({ name: "OR", pattern: /\s*\|\s*/ });
  const ELSE = createToken({ name: "ELSE", pattern: /\s*\|\|\s*/ });
  const EQ = createToken({ name: "EQ", pattern: /\s*=\s*/ });
  const TF = createToken({ name: "TF", pattern: /\.[A-Za-z_0-9][A-Za-z_0-9]*(\(\))?/ });
  const OS = createToken({ name: "OS", pattern: new RegExp(`${Escaped.OPEN_SILENT}\\s*`) });
  const CS = createToken({ name: "CS", pattern: new RegExp(`\\s*${Escaped.CLOSE_SILENT}`) });
  const SYM = createToken({ name: "SYM", pattern: new RegExp(`(${Escaped.DYNAMIC}|${Escaped.STATIC}[A-Za-z_0-9])[A-Za-z_0-9]*`) });

  const Entity = createToken({ name: "Entity", pattern: ENTITY_PATTERN });
  const Weight = createToken({ name: "Weight", pattern: new RegExp(`\\s*${Escaped.OPEN_WEIGHT}.+${Escaped.CLOSE_WEIGHT}\\s*`) });
  const Raw = createToken({ name: "Raw", pattern: new RegExp(`[^${Escaped.SPECIAL}]+`) });

  const normalMode = [Entity, Weight, ELSE, OC, CC, OR, EQ, SYM, DYN, STAT, AMP, TF, OS, CS, PendingGate, Raw, EnterGate];
  const gateMode = [ GateContent, GateOpenBracket, GateCloseBracket];

  const multiMode = {
    modes: {
      normal: normalMode,
      gate_mode: gateMode
    },
    defaultMode: 'normal'
  };

  return { tokens: multiMode, Constants: { Symbols, Escaped } };
}

/*function checkBracketDepth(str, offset) {
  let start = '{', end = '}', depth = 0;
  for (let i in str) {
    if (str[i] === start) {
      depth++;
    } else if (str[i] === end) {
      depth--;
    }
    if (depth < 0) return null;
  }
  return (depth > 0) ? null : str;
}*/

// our custom matcher
// function matchBrackets(text, startOffset = 0) {
//   let endOffset = startOffset;
//   let charCode, depth = 0;

//   // 0-9 digits
//   while (endOffset < text.length) {
//     charCode = text.charCodeAt(endOffset);
//     if (charCode === 123) depth++;
//     if (charCode === 125) depth--;
//     endOffset++;
//     if (depth == 0) return [text.substring(startOffset, endOffset)];
//   }
//   return null;

  // // No match, must return null to conform with the RegExp.prototype.exec signature
  // if (endOffset === startOffset) {
  //   return null;
  // } else {
  //   let matchedString = text.substring(startOffset, endOffset);
  //   // according to the RegExp.prototype.exec API the first item in the returned array must be the whole matched string.
  //   return [matchedString];
  // }
//}

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// console.log(getTokens().tokens.modes.normal.map(t => t.name));

export { getTokens,  TextTypes };