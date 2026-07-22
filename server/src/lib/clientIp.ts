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
