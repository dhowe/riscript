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
  const PENDING_GATE_PATTERN = new RegExp(`${Escaped.PENDING_GATE}([0-9]{9,11})`)

  Escaped.SPECIAL = Object.values(Escaped).join('').replace(/[<>]/g, ''); // allow <> for html 
  Symbols.PENDING_GATE_RE = new RegExp(PENDING_GATE_PATTERN.source, 'g'); // for unresolved gates

  const Gate = createToken({
    name: "Gate",
    pattern: bracketMatch,
    line_breaks: true,
   });

  function bracketMatch(text, startOffset) {
    const openGate = Symbols.OPEN_GATE.charCodeAt(0);
    let endOffset = startOffset, dbug = false;
    let charCode = text.charCodeAt(endOffset);
    if (charCode !== openGate) return null; // 64 = '@'
    
    if (dbug) console.log('bracketMatch', text, startOffset);
    endOffset++;
    charCode = text.charCodeAt(endOffset);
    
    // spaces between the @ and the open brace 
    while (charCode === 32) {
      endOffset++;
      charCode = text.charCodeAt(endOffset);
    }
    if (charCode !== 123) { // 123 = '{'
      if (dbug) console.log(`  "${text.substring(startOffset, endOffset)}" -> null1`);
      return null; 
    }
    endOffset++;
    charCode = text.charCodeAt(endOffset);
    let depth = 1;
    while (depth > 0) {
      if (charCode === 123) depth++; // 123 = '{'
      else if (charCode === 125) depth--; // 123 = '}'
      else if (charCode === openGate) {
        if (dbug) console.log(`"${text.substring(startOffset, endOffset)}" -> null2`);
        return null;
      }
      if (dbug) console.log('  depth', depth,text.substring(startOffset, endOffset));
      endOffset++;
      charCode = text.charCodeAt(endOffset);
    }

    // No match, must return null xsto conform with the RegExp.prototype.exec signature
    if (endOffset === startOffset) {
      if (dbug) console.log(`"${text.substring(startOffset, endOffset)}" -> null3`);
      return null;
    } else {
      let matchedString = text.substring(startOffset, endOffset);
      // according to the RegExp.prototype.exec API the first item in the returned array must be the whole matched string.
      if (dbug) console.log('  returned -> ',[matchedString]);
      return [matchedString];
    }
  }

  const PendingGate = createToken({
    name: "PendingGate",
    pattern: PENDING_GATE_PATTERN
  });

  // const EnterGate = createToken({
  //   name: "EnterGate",
  //   pattern: new RegExp(`${Escaped.OPEN_GATE}\\s*`),
  //   push_mode: "gate_mode"
  // });

  const AMP = createToken({ name: "AMP", pattern: /&/ });
  const DYN = createToken({ name: "DYN", pattern: new RegExp(Escaped.DYNAMIC) });
  const STAT = createToken({ name: "STAT", pattern: new RegExp(Escaped.STATIC) });
  const OC = createToken({ name: "OC", pattern: new RegExp(Escaped.OPEN_CHOICE + '\\s*') });
  const CC = createToken({ name: "CC", pattern: new RegExp(`\\s*${Escaped.CLOSE_CHOICE}`) });
  const OR = createToken({ name: "OR", pattern: /\s*\|\s*/ });
  const EQ = createToken({ name: "EQ", pattern: /\s*=\s*/ });
  const OS = createToken({ name: "OS", pattern: new RegExp(`${Escaped.OPEN_SILENT}\\s*`) });
  const CS = createToken({ name: "CS", pattern: new RegExp(`\\s*${Escaped.CLOSE_SILENT}`) });
  const ELSE = createToken({ name: "ELSE", pattern: /\s*\|\|\s*/ });

  const Transform = createToken({ name: "Transform", pattern: /\.[A-Za-z_0-9][A-Za-z_0-9]*(\(\))?/ });
  const Symbol = createToken({ name: "Symbol", pattern: new RegExp(`(${Escaped.DYNAMIC}|${Escaped.STATIC}[A-Za-z_0-9])[A-Za-z_0-9]*`) });
  const Entity = createToken({ name: "Entity", pattern: ENTITY_PATTERN });
  const Weight = createToken({ name: "Weight", pattern: new RegExp(`\\s*${Escaped.OPEN_WEIGHT}.+${Escaped.CLOSE_WEIGHT}\\s*`) });
  const Raw = createToken({ name: "Raw", pattern: new RegExp(`[^${Escaped.SPECIAL}]+`) });

  const tokens = [Gate, Entity, Weight, ELSE, OC, CC, OR, EQ, Symbol, DYN, STAT, AMP, Transform, OS, CS, PendingGate, Raw ];

  return { tokens, Constants: { Symbols, Escaped } };
}

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export { getTokens, TextTypes };