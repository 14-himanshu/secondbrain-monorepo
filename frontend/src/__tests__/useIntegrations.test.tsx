// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../services/integrations.api', () => ({
  getIntegrationStatus: vi.fn(),
  reconnectIntegration: vi.fn(),
  disconnectIntegration: vi.fn(),
}));

import * as api from '../services/integrations.api';
import { useIntegration } from '../hooks/useIntegrations';
import type { IntegrationStateRaw } from '../types/integrations';

const mockedApi = api as unknown as {
  getIntegrationStatus: ReturnType<typeof vi.fn> & { mockResolvedValue?: (v: unknown) => void };
  reconnectIntegration: ReturnType<typeof vi.fn>;
  disconnectIntegration: ReturnType<typeof vi.fn>;
};

import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useIntegrations hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns connected state when API says connected', async () => {
    const mock: IntegrationStateRaw = { connected: true, updatedAt: new Date().toISOString() };
    mockedApi.getIntegrationStatus.mockResolvedValue(mock);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('connected');
    expect(mockedApi.getIntegrationStatus).toHaveBeenCalledWith('google');
  });

  it('returns disconnected when API returns null', async () => {
    mockedApi.getIntegrationStatus.mockResolvedValue(null);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('disconnected');
  });

  it('maps requires_reauth to needs_reauth', async () => {
    const mock: IntegrationStateRaw = { requires_reauth: true } as IntegrationStateRaw;
    mockedApi.getIntegrationStatus.mockResolvedValue(mock);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('needs_reauth');
  });

  it('handles transient_error', async () => {
    const mock: IntegrationStateRaw = { transient_error: true, lastFailureReason: 'timeout' } as IntegrationStateRaw;
    mockedApi.getIntegrationStatus.mockResolvedValue(mock);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('transient_error');
    expect(result.current.data?.details?.lastFailureReason).toBe('timeout');
  });

  it('invalidates cache on disconnect action', async () => {
    mockedApi.getIntegrationStatus.mockResolvedValueOnce({ connected: true } as IntegrationStateRaw);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('connected');

    mockedApi.disconnectIntegration.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.disconnect?.();
    });

    // After disconnect, hook should refetch; simulate API returning null
    mockedApi.getIntegrationStatus.mockResolvedValueOnce(null);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.state).toBe('disconnected');
  });

  it('gracefully handles malformed API responses', async () => {
    mockedApi.getIntegrationStatus.mockResolvedValue({} as IntegrationStateRaw);
    const { result, waitFor } = renderHook(() => useIntegration('google'), { wrapper });
    await waitFor(() => result.current.isSuccess);
    // Unknown shapes should map to disconnected by default
    expect(result.current.data?.state).toBe('disconnected');
  });
});
