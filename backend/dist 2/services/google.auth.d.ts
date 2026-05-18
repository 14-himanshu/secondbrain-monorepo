export declare const decryptToken: (enc?: string | null) => string | null;
export declare const encryptToken: (plain?: string | null) => string | null;
export declare const refreshAccessToken: (refreshToken: string) => Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type: string;
}>;
export declare const getAccessTokenForUser: (userId: string) => Promise<string>;
//# sourceMappingURL=google.auth.d.ts.map