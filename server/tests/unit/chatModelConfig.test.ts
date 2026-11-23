import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(serverRoot, '..');
const resolver = join(serverRoot, 'infra/resolve_chat_model.mjs');
const temporaryDirectories: string[] = [];

function resolveModel(existing = '', override = ''): string {
  return execFileSync(process.execPath, [resolver, existing, override], { encoding: 'utf8' });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('chat deployment model resolution', () => {
  it.each(['', 'claude-haiku-4-5-20251001', 'claude-sonnet-5'])(
    'migrates the known direct model %j to the exact OpenRouter default',
    (existing) => {
      expect(resolveModel(existing)).toBe('anthropic/claude-haiku-4.5');
    },
  );

  it('preserves an exact OpenRouter slug and accepts an exact manual override', () => {
    expect(resolveModel('anthropic/claude-sonnet-4.5')).toBe('anthropic/claude-sonnet-4.5');
    expect(resolveModel('anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5')).toBe(
      'anthropic/claude-haiku-4.5',
    );
  });

  it.each([
    ['claude-opus-4-1-20250805', ''],
    ['claude-opus-4-1-20250805', 'anthropic/claude-sonnet-4.5'],
    ['anthropic/claude-haiku-4.5', 'claude-haiku-4-5-20251001'],
    ['anthropic/claude-haiku-4.5', 'openrouter/auto'],
    ['Anthropic/claude-haiku-4.5', ''],
  ])('rejects unsupported existing or override models before deployment', (existing, override) => {
    const result = spawnSync(process.execPath, [resolver, existing, override], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CHAT_MODEL');
  });

  it.each([
    ['claude-opus-4-1-20250805', ''],
    ['claude-opus-4-1-20250805', 'anthropic/claude-sonnet-4.5'],
  ])('stops the shell before any Lambda mutation for existing %s with override %s', (existing, override) => {
    const fixture = mkdtempSync(join(tmpdir(), 'chat-model-config-'));
    temporaryDirectories.push(fixture);
    const mutationLog = join(fixture, 'aws-mutations');
    const fakeAws = join(fixture, 'aws');
    writeFileSync(fakeAws, `#!/bin/sh\nprintf '%s\\n' "$*" >> "$MUTATION_LOG"\n`);
    chmodSync(fakeAws, 0o700);

    const result = spawnSync(
      'bash',
      [
        '-c',
        'set -euo pipefail; target=$(node "$1" "$2" "$3"); aws lambda update-function-code --function-name fixture',
        'fixture',
        resolver,
        existing,
        override,
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, MUTATION_LOG: mutationLog },
      },
    );

    expect(result.status).toBe(1);
    expect(existsSync(mutationLog)).toBe(false);
  });

  it('keeps both workflow paths ordered as validate, then mutate', () => {
    const workflow = readFileSync(join(repoRoot, '.github/workflows/chat-backend.yml'), 'utf8');
    const provision = workflow.slice(
      workflow.indexOf('      - name: Create or update the Lambda function'),
      workflow.indexOf('      - name: Wire the CloudFront'),
    );
    const deploy = workflow.slice(
      workflow.indexOf('      - name: Deploy code to the existing Lambda function'),
      workflow.indexOf('  # Read-only diagnostics'),
    );

    expect(provision.indexOf('node infra/resolve_chat_model.mjs')).toBeGreaterThan(-1);
    expect(provision.indexOf('node infra/resolve_chat_model.mjs')).toBeLessThan(provision.indexOf('if create_function'));
    expect(deploy.indexOf('node server/infra/resolve_chat_model.mjs')).toBeGreaterThan(-1);
    expect(deploy.indexOf('node server/infra/resolve_chat_model.mjs')).toBeLessThan(
      deploy.indexOf('aws lambda update-function-configuration'),
    );
  });
});
