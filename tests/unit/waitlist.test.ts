import { describe, expect, it } from 'vitest';
import { waitlistEndpoint, waitlistSource } from '../../src/data/waitlist';
describe('waitlist configuration and bounded source',() => {
  it('requires explicit endpoint and permits localhost only in fixture test builds',() => {
    expect(waitlistEndpoint(undefined,'production')).toBeNull();
    expect(waitlistEndpoint('https://api.example.test/api/studio/waitlist','production')).toBe('https://api.example.test/api/studio/waitlist');
    expect(waitlistEndpoint('http://127.0.0.1:4334/api/studio/waitlist','test')).toContain('4334');
    for (const url of ['http://127.0.0.1:4334/api/studio/waitlist','https://user:password@api.example.test/api/studio/waitlist','https://api.example.test/other','https://api.example.test/api/studio/waitlist?email=private']) expect(() => waitlistEndpoint(url,'production')).toThrow();
  });
  it('uses only fixed first party categories, discarding arbitrary values',() => {
    for (const source of ['meta-planning','meta-drawer','organic']) expect(waitlistSource(source)).toBe(source);
    for (const source of [null,'other','https://somewhere.test/private']) expect(waitlistSource(source)).toBe('direct');
  });
});
