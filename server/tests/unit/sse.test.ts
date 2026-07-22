import { describe, expect, it } from 'vitest';
import { formatSseEvent } from '../../src/lib/sse.js';

describe('formatSseEvent', () => {
  it('formats a delta event as a data: line terminated by a blank line', () => {
    expect(formatSseEvent({ type: 'delta', text: 'hi' })).toBe('data: {"type":"delta","text":"hi"}\n\n');
  });

  it('formats a done event', () => {
    expect(formatSseEvent({ type: 'done' })).toBe('data: {"type":"done"}\n\n');
  });

  it('formats an error event with a code', () => {
    expect(formatSseEvent({ type: 'error', code: 'rate_limited' })).toBe('data: {"type":"error","code":"rate_limited"}\n\n');
    expect(formatSseEvent({ type: 'error', code: 'invalid_input' })).toBe('data: {"type":"error","code":"invalid_input"}\n\n');
  });
});
