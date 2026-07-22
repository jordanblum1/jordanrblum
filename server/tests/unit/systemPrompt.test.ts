import { describe, expect, it } from 'vitest';
import { BIO_MARKDOWN } from '../../src/generated/bio.js';
import { buildSystemPrompt } from '../../src/lib/systemPrompt.js';

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

describe('buildSystemPrompt', () => {
  it('never contains an email address', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toMatch(EMAIL_PATTERN);
  });

  it('never contains a mailto: link', () => {
    const prompt = buildSystemPrompt().toLowerCase();
    expect(prompt).not.toContain('mailto:');
  });

  it('does not leak CONTACT_EMAIL even when the env var is set', () => {
    process.env.CONTACT_EMAIL = 'jordanblum16@gmail.com';
    try {
      const prompt = buildSystemPrompt();
      expect(prompt).not.toContain('jordanblum16@gmail.com');
      expect(prompt).not.toMatch(EMAIL_PATTERN);
    } finally {
      delete process.env.CONTACT_EMAIL;
    }
  });
});

describe('BIO_MARKDOWN (generated)', () => {
  it('is redacted at generation time, not just at prompt-assembly time', () => {
    expect(BIO_MARKDOWN).not.toMatch(EMAIL_PATTERN);
    expect(BIO_MARKDOWN.toLowerCase()).not.toContain('mailto:');
  });

  it('still contains real bio content (redaction did not eat everything)', () => {
    expect(BIO_MARKDOWN.length).toBeGreaterThan(500);
    expect(BIO_MARKDOWN).toContain('Jordan');
  });
});
