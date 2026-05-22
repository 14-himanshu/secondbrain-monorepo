import assert from "node:assert/strict";
import test from "node:test";

// Tests for Google extractor

test('parseGoogleFileId handles common URL formats', async () => {
  const mod = await import('../services/ingestion/extractors/google.extractor.js');
  const { parseGoogleFileId } = mod;

  const a = parseGoogleFileId(new URL('https://docs.google.com/document/d/ABC123/edit'));
  const b = parseGoogleFileId(new URL('https://drive.google.com/file/d/XYZ789/view'));
  const c = parseGoogleFileId(new URL('https://drive.google.com/open?id=QQQ111'));
  const d = parseGoogleFileId(new URL('https://docs.google.com/document/d/SHORT_ID'));

  assert.equal(a, 'ABC123');
  assert.equal(b, 'XYZ789');
  assert.equal(c, 'QQQ111');
  assert.equal(d, 'SHORT_ID');
});

test('extractGoogleContent -> Google Doc success path', async () => {
  // Stub auth to return a fake token
  const { UserModel } = await import('../db.js');
  const { encrypt } = await import('../lib/crypto.js');
  (UserModel as any).findById = (id: string) => ({ select: async () => ({ _id: id, google: { connected: true, accessTokenEnc: encrypt('FAKE_TOKEN'), refreshTokenEnc: null, expiryDate: new Date(Date.now() + 1000 * 60 * 60) } }) });

  // Mock fetch for Drive metadata and Docs API
  const calls: string[] = [];
  (globalThis as any).fetch = async (url: string, opts?: any) => {
    calls.push(String(url));
    if (String(url).includes('/drive/v3/files') && !String(url).includes('alt=media')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'DOC123', name: 'My Doc', mimeType: 'application/vnd.google-apps.document' }),
      } as any;
    }

    if (String(url).includes('docs.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ body: { content: [{ paragraph: { elements: [{ textRun: { content: 'Hello from Google Doc.' } }] } }] } }),
      } as any;
    }

    return { ok: false, status: 404, text: async () => 'not found' } as any;
  };

  const { extractGoogleContent } = await import('../services/ingestion/extractors/google.extractor.js');
  const target = { platform: 'google', url: new URL('https://docs.google.com/document/d/DOC123/edit'), normalizedUrl: 'https://docs.google.com/document/d/DOC123' } as any;

  const result = await extractGoogleContent(target, 'deep', { userId: 'user1' });
  assert.equal(result.source, 'google-docs');
  assert.ok(result.content.includes('Hello from Google Doc'));
  assert.equal(result.metadata.tags.includes('docs'), true);
});

test('extractGoogleContent -> insufficient permissions during metadata fetch', async () => {
  const { UserModel } = await import('../db.js');
  const { encrypt } = await import('../lib/crypto.js');
  (UserModel as any).findById = (id: string) => ({ select: async () => ({ _id: id, google: { connected: true, accessTokenEnc: encrypt('FAKE_TOKEN'), refreshTokenEnc: null, expiryDate: new Date(Date.now() + 1000 * 60 * 60) } }) });

  (globalThis as any).fetch = async (url: string, opts?: any) => {
    if (String(url).includes('/drive/v3/files')) {
      return { ok: false, status: 403, text: async () => 'forbidden' } as any;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as any;
  };

  const { extractGoogleContent } = await import('../services/ingestion/extractors/google.extractor.js');
  const target = { platform: 'google', url: new URL('https://drive.google.com/file/d/NOACCESS/view'), normalizedUrl: 'https://drive.google.com/file/d/NOACCESS' } as any;

  const res = await extractGoogleContent(target, 'deep', { userId: 'user1' });
  assert.equal(res.metadata.tags.includes('insufficient_permissions'), true);
});

test('extractGoogleContent -> requires_reauth when auth missing', async () => {
  const { UserModel } = await import('../db.js');
  const { encrypt } = await import('../lib/crypto.js');
  // Make the user appear disconnected so the extractor surfaces requires_reauth
  (UserModel as any).findById = (id: string) => ({ select: async () => ({ _id: id, google: { connected: false, accessTokenEnc: null, refreshTokenEnc: null } }) });

  const { extractGoogleContent } = await import('../services/ingestion/extractors/google.extractor.js');
  const target = { platform: 'google', url: new URL('https://drive.google.com/file/d/REAUTH/view'), normalizedUrl: 'https://drive.google.com/file/d/REAUTH' } as any;

  const res = await extractGoogleContent(target, 'deep', { userId: 'user1' });
  assert.equal(res.metadata.tags.includes('requires_reauth'), true);
});

test('extractGoogleContent -> unsupported mime returns unsupported_google_type', async () => {
  const { UserModel } = await import('../db.js');
  const { encrypt } = await import('../lib/crypto.js');
  (UserModel as any).findById = (id: string) => ({ select: async () => ({ _id: id, google: { connected: true, accessTokenEnc: encrypt('FAKE_TOKEN'), refreshTokenEnc: null, expiryDate: new Date(Date.now() + 1000 * 60 * 60) } }) });

  (globalThis as any).fetch = async (url: string, opts?: any) => {
    if (String(url).includes('/drive/v3/files') && !String(url).includes('alt=media')) {
      return { ok: true, status: 200, json: async () => ({ id: 'BIN', name: 'Binary', mimeType: 'application/octet-stream' }) } as any;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as any;
  };

  const { extractGoogleContent } = await import('../services/ingestion/extractors/google.extractor.js');
  const target = { platform: 'google', url: new URL('https://drive.google.com/file/d/BIN/view'), normalizedUrl: 'https://drive.google.com/file/d/BIN' } as any;

  const res = await extractGoogleContent(target, 'deep', { userId: 'user1' });
  assert.equal(res.metadata.tags.includes('unsupported_google_type'), true);
});
