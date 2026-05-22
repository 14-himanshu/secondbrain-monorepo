import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIntegrationStatus, connectIntegration, disconnectIntegration } from "../services/integrations.api";

export type IntegrationState =
  | "connected"
  | "needs_reauth"
  | "insufficient_permissions"
  | "transient_error"
  | "unsupported"
  | "disconnected";

import type { IntegrationStateRaw, NormalizedIntegrationState } from '../types/integrations';

export const normalizeStatus = (raw: unknown): Pick<NormalizedIntegrationState, 'state' | 'details'> => {
  const state = (() => {
    if (!raw) return 'disconnected';
    const r = raw as Record<string, unknown>;
    if (r['connected']) return 'connected';
    if (r['requires_reauth'] || r['hasRefreshToken'] === false) return 'needs_reauth';
    if (r['insufficient_permissions']) return 'insufficient_permissions';
    if (r['transient_error']) return 'transient_error';
    return 'disconnected';
  })();
  return { state, details: raw as IntegrationStateRaw };
};



export const useIntegration = (provider: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["integration", provider];

  const q = useQuery({
    queryKey,
    queryFn: async () => getIntegrationStatus(provider),
    staleTime: 60_000, // 1 minute
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const connect = async () => {
    const url = await connectIntegration(provider);
    return url;
  };

  const disconnect = async () => {
    await disconnectIntegration(provider);
    await refresh();
  };

  return {
    ...q,
    normalized: q.data ? normalizeStatus(q.data) : { state: "disconnected" as IntegrationState },
    refresh,
    connect,
    disconnect,
  };
};

export const useIntegrations = () => {
  const queryClient = useQueryClient();
  const queryKey = ["integrations"];
  const q = useQuery({
    queryKey,
    queryFn: async () => {
      // Simple list of known providers; can be extended
      const providers = ["google"];
      const results: Record<string, IntegrationStateRaw | null> = {};
      await Promise.all(providers.map(async (p) => { results[p] = await getIntegrationStatus(p); }));
      return results;
    },
    staleTime: 60_000,
  });

  return {
    ...q,
    refresh: async () => queryClient.invalidateQueries({ queryKey }),
  };
};