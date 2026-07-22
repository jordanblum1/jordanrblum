export type ErrorCode = 'rate_limited' | 'invalid_input' | 'internal_error';

export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; code: ErrorCode };

export function formatSseEvent(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
