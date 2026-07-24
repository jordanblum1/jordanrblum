import { Writable } from 'node:stream';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type StreamHandler = (
  event: {
    rawPath?: string;
    requestContext?: { http?: { method?: string } };
  },
  responseStream: NodeJS.WritableStream,
) => Promise<void>;

let streamHandler: StreamHandler;
let responseMetadata: { statusCode?: number; headers?: Record<string, string> } | undefined;

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('%PDF-1.4\nreviewed resume')),
}));

beforeAll(async () => {
  vi.stubGlobal('awslambda', {
    streamifyResponse: (handler: StreamHandler) => {
      streamHandler = handler;
      return handler;
    },
    HttpResponseStream: {
      from: (
        responseStream: NodeJS.WritableStream,
        metadata: { statusCode?: number; headers?: Record<string, string> },
      ) => {
        responseMetadata = metadata;
        return responseStream;
      },
    },
  });
  await import('../../src/handler.js');
});

beforeEach(() => {
  responseMetadata = undefined;
});

async function invoke(path: string, method = 'POST'): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });

  await streamHandler({ rawPath: path, requestContext: { http: { method } } }, stream);
  return Buffer.concat(chunks);
}

describe('resume download route', () => {
  it('returns the bundled PDF directly without a verification token', async () => {
    const body = await invoke('/api/resume/download');

    expect(responseMetadata?.statusCode).toBe(200);
    expect(responseMetadata?.headers).toMatchObject({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Jordan_Blum_Product_Engineer.pdf"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(body.toString()).toBe('%PDF-1.4\nreviewed resume');
  });

  it('keeps the endpoint POST-only', async () => {
    const body = await invoke('/api/resume/download', 'GET');

    expect(responseMetadata?.statusCode).toBe(405);
    expect(JSON.parse(body.toString())).toEqual({ ok: false, error: 'method_not_allowed' });
  });
});
