import { isIP } from 'node:net';

export interface ClientIpEvent {
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      sourceIp?: string;
    };
  };
}

function findXffHeader(headers: Record<string, string | undefined> | undefined): string | undefined {
  if (!headers) return undefined;
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'x-forwarded-for') return value;
  }
  return undefined;
}

/**
 * Derive the visitor's IP address for rate limiting and transcript tagging.
 *
 * Behind the CloudFront OAC origin, `requestContext.http.sourceIp` is the
 * CloudFront POP's egress address — shared by every visitor routed through
 * that POP — so it must not be used as a per-visitor identity when the
 * request came through CloudFront.
 *
 * Per the CloudFront custom-origin docs ("Client IP addresses",
 * RequestAndResponseBehaviorCustomOrigin), CloudFront takes the viewer's IP
 * from the TCP connection and appends it to the END of any client-supplied
 * `X-Forwarded-For` value before forwarding. The Lambda Function URL is the
 * direct origin (nothing sits between CloudFront and Lambda to append its own
 * entry), so the RIGHTMOST entry is the only one CloudFront vouches for;
 * every entry to its left is client-forgeable junk.
 *
 * Falls back to `sourceIp` when the header is absent (direct IAM-signed
 * invoke) or when the rightmost entry does not parse as an IPv4/IPv6 address.
 */
export function clientIp(event: ClientIpEvent): string {
  const sourceIp = event.requestContext?.http?.sourceIp ?? 'unknown';
  const xff = findXffHeader(event.headers);
  if (!xff) return sourceIp;

  const entries = xff.split(',');
  const rightmost = (entries[entries.length - 1] ?? '').trim();
  return isIP(rightmost) !== 0 ? rightmost : sourceIp;
}

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Expand a valid IPv6 address into its 8 hextets (leading zeros stripped,
 * lower-cased). Handles `::` compression and an embedded dotted-quad tail
 * (e.g. `64:ff9b::192.0.2.1`). Input must already be validated with isIP.
 */
function expandIpv6(ip: string): string[] {
  let addr = ip.toLowerCase();

  const lastColon = addr.lastIndexOf(':');
  const tailPart = addr.slice(lastColon + 1);
  if (tailPart.includes('.')) {
    const [a = 0, b = 0, c = 0, d = 0] = tailPart.split('.').map(Number);
    addr = addr.slice(0, lastColon + 1) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  let hextets: string[];
  if (addr.includes('::')) {
    const [headStr = '', tailStr = ''] = addr.split('::');
    const head = headStr ? headStr.split(':') : [];
    const tail = tailStr ? tailStr.split(':') : [];
    hextets = [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail];
  } else {
    hextets = addr.split(':');
  }

  return hextets.map((h) => Number.parseInt(h || '0', 16).toString(16));
}

/**
 * Reduce an IP to the granularity used for rate-limit keys.
 *
 * IPv6 visitors typically control an entire /64 (a single SLAAC allocation),
 * so keying rate limits on the full address would let one visitor rotate
 * through 2^64 addresses without ever re-using a bucket. Bucket IPv6 by its
 * /64 prefix instead; IPv4 addresses (including IPv4-mapped IPv6 forms) pass
 * through unchanged. Only the RATE keys use this — transcripts keep the hash
 * of the full validated address.
 */
export function rateLimitBucket(ip: string): string {
  const mapped = IPV4_MAPPED.exec(ip)?.[1];
  if (mapped && isIP(mapped) === 4) return mapped;
  if (isIP(ip) !== 6) return ip;

  const hextets = expandIpv6(ip);
  return `${hextets.slice(0, 4).join(':')}::/64`;
}
