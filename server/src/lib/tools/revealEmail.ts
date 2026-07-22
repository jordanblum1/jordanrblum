import { atomicIncrementWithLimit } from '../dynamo.js';

export const MIN_PRIOR_USER_TURNS = 2;
export const DAILY_REVEAL_CAP = 20;

const REVEAL_CAP_TTL_SECONDS = 172_800;

export interface RevealParams {
  priorUserTurns: number;
}

export interface RevealResult {
  allowed: boolean;
  reason: 'allowed' | 'insufficient_conversation' | 'daily_cap_reached' | 'contact_email_not_configured';
  email?: string;
  refusalInstruction: string;
}

/**
 * The handler — not the model — enforces the reveal gate. The model can call
 * this tool freely; whether an email actually comes back depends only on
 * this function's checks.
 */
export async function evaluateEmailReveal({ priorUserTurns }: RevealParams): Promise<RevealResult> {
  if (priorUserTurns < MIN_PRIOR_USER_TURNS) {
    return {
      allowed: false,
      reason: 'insufficient_conversation',
      refusalInstruction:
        'Explain that you can share direct contact details once you have chatted a bit more, and invite the visitor to keep asking questions.',
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const withinDailyCap = await atomicIncrementWithLimit(`REVEAL#${today}`, DAILY_REVEAL_CAP, REVEAL_CAP_TTL_SECONDS);
  if (!withinDailyCap) {
    return {
      allowed: false,
      reason: 'daily_cap_reached',
      refusalInstruction:
        'Explain that direct contact sharing has reached its limit for today, and suggest trying again tomorrow.',
    };
  }

  const email = process.env.CONTACT_EMAIL;
  if (!email) {
    return {
      allowed: false,
      reason: 'contact_email_not_configured',
      refusalInstruction: 'Explain that direct contact sharing is temporarily unavailable.',
    };
  }

  return { allowed: true, reason: 'allowed', email, refusalInstruction: '' };
}
