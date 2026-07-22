import { describe, expect, it } from 'vitest';
import { clientIp, rateLimitBucket, type ClientIpEvent } from '../../src/lib/clientIp.js';

function event(xff: string | undefined, sourceIp = '130.176.0.1', headerName = 'x-forwarded-for'): ClientIpEvent {
  return {
    headers: xff === undefined ? {} : { [headerName]: xff },
    requestContext: { http: { sourceIp } },
  };
}

describe('clientIp', () => {
  it('falls back to sourceIp when the X-Forwarded-For header is absent (direct IAM-signed invoke)', () => {
    expect(clientIp(event(undefined, '192.0.2.50'))).toBe('192.0.2.50');
  });

  it('falls back to "unknown" when neither the header nor sourceIp is present', () => {
    expect(clientIp({})).toBe('unknown');
  });

  it('uses a single X-Forwarded-For entry (the viewer IP CloudFront appended)', () => {
    expect(clientIp(event('192.0.2.2'))).toBe('192.0.2.2');
  });

  it('takes the RIGHTMOST entry when the client forged earlier entries', () => {
    // Left entries arrived from the viewer request and are attacker-controlled;
    // CloudFront appends the real viewer IP to the end.
    expect(clientIp(event('10.0.0.1, 203.0.113.99, 192.0.2.2'))).toBe('192.0.2.2');
  });

  it('trims whitespace around the rightmost entry', () => {
    expect(clientIp(event('203.0.113.99,   192.0.2.2  '))).toBe('192.0.2.2');
  });

  it('falls back to sourceIp when the rightmost entry is not a valid IP', () => {
    expect(clientIp(event('203.0.113.99, not-an-ip', '192.0.2.50'))).toBe('192.0.2.50');
  });

  it('falls back to sourceIp for a garbage-only header value', () => {
    expect(clientIp(event('"><script>alert(1)</script>', '192.0.2.50'))).toBe('192.0.2.50');
  });

  it('falls back to sourceIp for an empty header value', () => {
    expect(clientIp(event('', '192.0.2.50'))).toBe('192.0.2.50');
  });

  it('falls back to sourceIp for a trailing comma (empty rightmost entry)', () => {
    expect(clientIp(event('192.0.2.2,', '192.0.2.50'))).toBe('192.0.2.50');
  });

  it('accepts an IPv6 viewer address', () => {
    expect(clientIp(event('2001:db8:85a3::8a2e:370:7334'))).toBe('2001:db8:85a3::8a2e:370:7334');
  });

  it('takes the rightmost IPv6 entry past forged IPv4 entries', () => {
    expect(clientIp(event('10.0.0.1, 2001:db8::1'))).toBe('2001:db8::1');
  });

  it('matches the header name case-insensitively', () => {
    expect(clientIp(event('192.0.2.2', '130.176.0.1', 'X-Forwarded-For'))).toBe('192.0.2.2');
  });
});

describe('rateLimitBucket', () => {
  it('leaves IPv4 addresses unchanged', () => {
    expect(rateLimitBucket('192.0.2.2')).toBe('192.0.2.2');
  });

  it('leaves non-IP fallback values (e.g. "unknown") unchanged', () => {
    expect(rateLimitBucket('unknown')).toBe('unknown');
  });

  it('buckets two IPv6 addresses in the same /64 onto the same rate key', () => {
    const a = rateLimitBucket('2001:db8:85a3:1234::1');
    const b = rateLimitBucket('2001:db8:85a3:1234:ffff:ffff:ffff:ffff');
    expect(a).toBe(b);
    expect(a).toBe('2001:db8:85a3:1234::/64');
  });

  it('keeps different /64s in different buckets', () => {
    expect(rateLimitBucket('2001:db8:85a3:1234::1')).not.toBe(rateLimitBucket('2001:db8:85a3:1235::1'));
  });

  it('normalizes compressed and expanded spellings of the same address to one bucket', () => {
    expect(rateLimitBucket('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(rateLimitBucket('2001:db8::1'));
  });

  it('normalizes hextet case to one bucket', () => {
    expect(rateLimitBucket('2001:DB8:85A3:1234::1')).toBe(rateLimitBucket('2001:db8:85a3:1234::1'));
  });

  it('treats IPv4-mapped IPv6 addresses as their embedded IPv4', () => {
    expect(rateLimitBucket('::ffff:192.0.2.2')).toBe('192.0.2.2');
  });

  it('buckets an IPv6 address with an embedded dotted-quad tail by its /64', () => {
    expect(rateLimitBucket('64:ff9b:1:2:3:4:192.0.2.2')).toBe('64:ff9b:1:2::/64');
  });
});
