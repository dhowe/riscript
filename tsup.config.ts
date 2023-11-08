import type { Options } from 'tsup';
import { defineConfig } from 'tsup';
import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';

const opts: Options = {
  name: "riscript",
  entry: { riscript: 'src/index.js' },
  outDir: 'dist',
  watch: false,
  clean: true,
  minify: false,
  sourcemap: true,
  dts: false,
  esbuildPlugins: [esbuildPluginVersionInjector()],
  outExtension({ format }) { return { js: `.js` } },
  // skipNodeModulesBundle: true, // ?
}

const esm: Options = {
  format: ['esm'],
  ...opts,
  target: 'es2020',
  splitting: true
}

const cjs: Options = {
  format: ['cjs'],
  ...opts,
  target: 'es2020', // ?
  noExternal: ['chevrotain'], // ?
  platform: "node",
  cjsInterop: true,
  splitting: true,
  outExtension({ format }) { return { js: `.cjs` } },
}

const iife: Options = {
  format: ['iife'],
  ...opts,
  bundle: true,
  minify: true,
  target: 'es2020', // ?
  platform: "browser",
  globalName: "RiScript",
  outExtension({ format }) { return { js: `.iife.js` } },
  footer: { js: "window.RiScript = RiScript.default" }
}

const testEsm: Options = {
  format: ['esm'],
  target: 'es2020', // ?
  platform: "node",
  name: "test",
  entry: ['test/riscript*.js'],
  outDir: 'test/dist',
  watch: false,
  clean: false,
  minify: false,
  sourcemap: false,
  dts: false,
  bundle: false,
}

export default defineConfig([esm, cjs, iife, testEsm]);
