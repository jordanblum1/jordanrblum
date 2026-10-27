export type WaitlistSource = 'direct' | 'organic' | 'meta-planning' | 'meta-drawer';
export function waitlistSource(value: string | null): WaitlistSource {
  return value === 'organic' || value === 'meta-planning' || value === 'meta-drawer' ? value : 'direct';
}
export function waitlistEndpoint(value: string | undefined, mode: string): string | null {
  if (!value) return null;
  const url = new URL(value);
  const fixture = mode === 'test' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname);
  if ((!fixture && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/api/studio/waitlist') throw new Error('PUBLIC_WAITLIST_API_URL must be an explicit HTTPS waitlist endpoint');
  return url.href;
}
