import { Writable } from 'node:stream';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type StreamHandler = (
  event: {
    body?: string;
    headers?: Record<string, string>;
    rawPath?: string;
    requestContext?: { http?: { method?: string } };
  },
  responseStream: NodeJS.WritableStream,
) => Promise<void>;

let streamHandler: StreamHandler;
let responseMetadata: { statusCode?: number; headers?: Record<string, string> } | undefined;

const contact = vi.hoisted(() => ({ handle: vi.fn() }));

vi.mock('../../src/lib/contact.js', () => ({
  handleContactRequest: contact.handle,
}));

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
  contact.handle.mockReset();
  contact.handle.mockResolvedValue({
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: '{"success":true}',
  });
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

describe('studio contact route', () => {
  it('delegates to the contact boundary and preserves its status, body, and CORS headers', async () => {
    const body = await invoke('/api/studio/contact');

    expect(contact.handle).toHaveBeenCalledOnce();
    expect(responseMetadata).toEqual({
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(body.toString()).toBe('{"success":true}');
  });
});
