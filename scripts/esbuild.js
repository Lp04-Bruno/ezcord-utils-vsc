const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node16'],
  external: ['vscode'],
  sourcemap: true,
  sourcesContent: false,
  logLevel: 'info',
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    await new Promise(() => {});
  } else {
    await esbuild.build(config);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
