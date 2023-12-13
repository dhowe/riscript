/**
 * Generates TypeScript definitions for the dynamically created RiScriptParser
 */
import { generateCstDts } from "chevrotain";

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { RiScript } from "./src/index.js";

const productions = new RiScript().parser.getGAstProductions();

const dir = dirname(fileURLToPath(import.meta.url));
const dtsString = generateCstDts(productions);

writeFileSync(resolve(dir, "./types", "parser.d.ts"), dtsString);