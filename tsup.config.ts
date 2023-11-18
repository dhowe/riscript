import type { Options } from 'tsup';
import { defineConfig } from 'tsup';
import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';
// import { umdWrapper } from "esbuild-plugin-umd-wrapper"

const baseConfig: Options = {
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
    // umdWrapper(),
  ],
  outExtension({ format }) { return { js: `.js` } },
}

const esm: Options = {
  ...baseConfig,
  format: ['esm'],
}

const cjs: Options = {
  ...baseConfig,
  format: ['cjs'],
  noExternal: ['chevrotain'],
  platform: "node",
  cjsInterop: true,
  splitting: true,
  outExtension({ format }) { return { js: `.cjs` } },
}

const iife: Options = {
  ...baseConfig,
  format: ['iife'],
  minify: false, // tmp
  platform: "browser",
  globalName: "iife",
  outExtension({ format }) { return { js: `.min.js` } },
  footer: { js: "RiScript = iife.RiScript" }
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
