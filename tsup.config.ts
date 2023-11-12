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
  bundle: true,
  dts: false,
  target: 'es2020',
  esbuildPlugins: [
    esbuildPluginVersionInjector(),
  ],
  outExtension({ format }) { return { js: `.js` } },
  // skipNodeModulesBundle: true, // ?
}

const esm: Options = {
  format: ['esm'],
  ...opts,
}

const cjs: Options = {
  format: ['cjs'],
  ...opts,
  noExternal: ['chevrotain'],
  platform: "node",
  cjsInterop: true,
  splitting: true,
  outExtension({ format }) { return { js: `.cjs` } },
}

const iife: Options = {
  format: ['iife'],
  ...opts,
  minify: false, // tmp
  platform: "browser",
  globalName: "RiScript",
  outExtension({ format }) { return { js: `.iife.min.js` } },
  footer: { js: "window.RiScript = RiScript.default" }
}

const testEsm: Options = {
  format: ['esm'],
  target: 'es2020', // ?
  platform: "node",
  name: "test",
  entry: ['test/*.tests.js'],
  outDir: 'test/dist',
  watch: false,
  clean: false,
  minify: false,
  sourcemap: false,
  dts: false,
  bundle: false,
}

export default defineConfig([esm, cjs, iife, testEsm]);
