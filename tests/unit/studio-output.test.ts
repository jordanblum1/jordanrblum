import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { afterEach, expect, test } from 'vitest';

const script = resolve('scripts/prepare-studio-deploy.mjs');
const fixtures: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'studio-output-'));
  fixtures.push(root);
  return root;
}
afterEach(() => fixtures.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

test('prepares only static build output and exact clean-page routes', () => {
  const root = fixture();
  mkdirSync(join(root, 'dist-studio/apps/stamp-shift'), { recursive: true });
  mkdirSync(join(root, '.vercel/output/static'), { recursive: true });
  writeFileSync(join(root, '.vercel/output/static/stale.txt'), 'stale');
  writeFileSync(join(root, '.vercel/project.json'), 'retain linkage');
  writeFileSync(join(root, 'dist-studio/index.html'), 'home');
  writeFileSync(join(root, 'dist-studio/apps/stamp-shift/index.html'), 'game');
  writeFileSync(join(root, 'dist-studio/404.html'), 'not found');
  execFileSync(process.execPath, [script], { cwd: root });
  const output = join(root, '.vercel/output');
  const config = JSON.parse(readFileSync(join(output, 'config.json'), 'utf8'));
  expect(config.version).toBe(3);
  expect(config.routes).toContainEqual({ src: '^/?$', dest: '/index.html' });
  expect(config.routes).toContainEqual({ src: '^/apps/stamp-shift/?$', dest: '/apps/stamp-shift/index.html' });
  expect(config.routes.at(-1)).toEqual({ src: '/.*', status: 404, dest: '/404.html' });
  expect(readFileSync(join(output, 'static/apps/stamp-shift/index.html'), 'utf8')).toBe('game');
  expect(existsSync(join(output, 'static/stale.txt'))).toBe(false);
  expect(readFileSync(join(root, '.vercel/project.json'), 'utf8')).toBe('retain linkage');
});

test('a missing build leaves prior prepared output intact', () => {
  const root = fixture();
  mkdirSync(join(root, '.vercel/output/static'), { recursive: true });
  writeFileSync(join(root, '.vercel/output/static/index.html'), 'prior good output');
  expect(() => execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' })).toThrow();
  expect(readFileSync(join(root, '.vercel/output/static/index.html'), 'utf8')).toBe('prior good output');
});
