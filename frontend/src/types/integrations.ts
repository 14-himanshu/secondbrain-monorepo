export type ProviderName = 'google' | 'notion' | 'slack' | string;

export type IntegrationStateRaw = {
  connected?: boolean;
  requires_reauth?: boolean;
  insufficient_permissions?: boolean;
  transient_error?: boolean;
  hasRefreshToken?: boolean;
  reconnectRequired?: boolean;
  expiresSoon?: boolean;
  lastFailureReason?: string | null;
  updatedAt?: string; // ISO
  permissions?: string[];
  // provider-specific metadata should live under `meta`
  meta?: Record<string, unknown>;
};

export type NormalizedIntegrationState = {
  provider: ProviderName;
  state:
    | 'connected'
    | 'needs_reauth'
    | 'insufficient_permissions'
    | 'transient_error'
    | 'disconnected'
    | 'unsupported';
  reconnectRequired?: boolean;
  expiresSoon?: boolean;
  lastFailureReason?: string | null;
  updatedAt?: string; // ISO
  permissions?: string[];
  details?: IntegrationStateRaw;
};

export interface IntegrationAPI {
  getIntegrationStatus(provider: ProviderName): Promise<IntegrationStateRaw | null>;
  reconnectIntegration?(provider: ProviderName): Promise<void>;
  disconnectIntegration?(provider: ProviderName): Promise<void>;
}
