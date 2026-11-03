import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('dist-studio');
const output = resolve('.vercel/output');
// Confirm the build exists before replacing generated deployment output.
const entries = await readdir(source);
if (!entries.includes('index.html')) throw new Error('Build the studio site first.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, `${output}/static`, { recursive: true });

const routes = [{ src: '/(.*)', headers: {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}, continue: true }];
async function addPageRoutes(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await addPageRoutes(`${directory}/${entry.name}`, path);
    else if (entry.name === 'index.html') {
      const page = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      routes.push({ src: `^${page}/?$`, dest: path });
    }
  }
}
await addPageRoutes(source);
routes.push({ handle: 'filesystem' }, { src: '/.*', status: 404, dest: '/404.html' });
await writeFile(`${output}/config.json`, JSON.stringify({ version: 3, routes }, null, 2) + '\n');
console.log('Prepared static studio deployment. No remote build or source upload required.');
