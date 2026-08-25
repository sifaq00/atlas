const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const extensionOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(extensionOptions);
    await ctx.watch();
    console.log('[esbuild] Watching for extension changes...');
  } else {
    await esbuild.build(extensionOptions);
    console.log('[esbuild] Extension built successfully.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
