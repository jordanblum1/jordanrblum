import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/index.js',
  sourcemap: false,
  minify: false,
});

await mkdir('dist', { recursive: true });
await copyFile('assets/Jordan_Blum_Product_Engineer.pdf', 'dist/Jordan_Blum_Product_Engineer.pdf');
