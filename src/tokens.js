import { createToken } from "chevrotain"

function getTokens(v2Compatible) {

  let Symbols = {
    OR: '|',
    ELSE: '||',
    DYNAMIC: '$',
    STATIC: '#',
    ENTITY: '&',
    OPEN_GATE: '@',
    CLOSE_GATE: '@',
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

  const PENDING_GATE_PATTERN = new RegExp(`${Escaped.PENDING_GATE}([0-9]{9,11})`)

  Escaped.SPECIAL = Object.values(Escaped).join('').replace(/[<>]/g, ''); // allow <>& for html 
  Symbols.PENDING_GATE_RE = new RegExp(PENDING_GATE_PATTERN.source, 'g'); // for unresolved gates

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

  
  const OC = createToken({ name: "OC", pattern: new RegExp(Escaped.OPEN_CHOICE + '\\s*') });
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
    defaultMode: 'normal'
  };

  return { tokens: multiMode, Constants: { Symbols, Escaped } };
}

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// console.log(getTokens().tokens.modes.normal.map(t => t.name));

export { getTokens };