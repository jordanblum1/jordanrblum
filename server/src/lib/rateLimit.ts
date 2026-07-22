import { atomicIncrementWithLimit } from './dynamo.js';

export const MINUTE_LIMIT = 10;
export const DAY_LIMIT = 60;

const MINUTE_TTL_SECONDS = 180;
const DAY_TTL_SECONDS = 172_800;

export interface RateLimitResult {
  allowed: boolean;
}

export async function checkRateLimit(ipHash: string): Promise<RateLimitResult> {
  const now = new Date();
  const minuteBucket = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  const dayBucket = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const withinMinuteLimit = await atomicIncrementWithLimit(`RATE#${ipHash}#MIN#${minuteBucket}`, MINUTE_LIMIT, MINUTE_TTL_SECONDS);
  if (!withinMinuteLimit) {
    return { allowed: false };
  }

  const withinDayLimit = await atomicIncrementWithLimit(`RATE#${ipHash}#DAY#${dayBucket}`, DAY_LIMIT, DAY_TTL_SECONDS);
  return { allowed: withinDayLimit };
}
