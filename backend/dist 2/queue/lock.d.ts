export declare const withDistributedLock: <T>(key: string, ttlMs: number, callback: () => Promise<T>) => Promise<{
    acquired: boolean;
    value?: T;
}>;
//# sourceMappingURL=lock.d.ts.map