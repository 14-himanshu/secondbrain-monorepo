import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptToken, decryptToken, refreshAccessToken, getAccessTokenForUser } from '../services/google.auth.js';
import { UserModel } from '../db.js';
import { encrypt } from '../lib/crypto.js';
// Simple unit tests for Google auth lifecycle
test('encrypt/decrypt roundtrip', async () => {
    const plain = 'secret-value-123';
    const enc = encryptToken(plain);
    const dec = decryptToken(enc);
    assert.equal(dec, plain);
});
test('refreshAccessToken calls token endpoint and returns payload', async () => {
    process.env.GOOGLE_CLIENT_ID = 'CLIENT';
    process.env.GOOGLE_CLIENT_SECRET = 'SECRET';
    globalThis.fetch = async (url, opts) => {
        if (String(url).includes('oauth2.googleapis.com')) {
            return { ok: true, status: 200, json: async () => ({ access_token: 'new-access', expires_in: 3600 }) };
        }
        return { ok: false, status: 404, text: async () => 'not found' };
    };
    const payload = await refreshAccessToken('refresh-token-1');
    assert.equal(payload.access_token, 'new-access');
});
test('getAccessTokenForUser refreshes and persists new access token', async () => {
    // Prepare a fake user stored in DB
    const fakeUser = {
        _id: 'user-1',
        google: {
            connected: true,
            accessTokenEnc: null,
            refreshTokenEnc: encrypt('refresh-abc'),
            expiryDate: new Date(Date.now() - 1000 * 60 * 60),
        },
    };
    // Stub UserModel.findById and updateOne
    const origFind = UserModel.findById;
    const origUpdate = UserModel.updateOne;
    UserModel.findById = (id) => ({ select: async () => ({ ...fakeUser }) });
    let capturedUpdate = null;
    UserModel.updateOne = async (query, update) => { capturedUpdate = update; return { acknowledged: true }; };
    // Mock token endpoint
    globalThis.fetch = async (url, opts) => {
        if (String(url).includes('oauth2.googleapis.com')) {
            return { ok: true, status: 200, json: async () => ({ access_token: 'refreshed-access-xyz', expires_in: 3600 }) };
        }
        if (String(url).includes('/drive/v3/files')) {
            return { ok: true, status: 200, json: async () => ({ id: 'D1', name: 'Doc', mimeType: 'application/pdf' }) };
        }
        return { ok: false, status: 404, text: async () => 'not found' };
    };
    const token = await getAccessTokenForUser('user-1');
    assert.equal(token, 'refreshed-access-xyz');
    // Ensure updateOne wrote an encrypted token
    // updateOne is called with a $set payload
    assert.ok(capturedUpdate && capturedUpdate['$set'] && capturedUpdate['$set']['google.accessTokenEnc']);
    // Restore stubs
    UserModel.findById = origFind;
    UserModel.updateOne = origUpdate;
});
//# sourceMappingURL=google-auth.test.js.map