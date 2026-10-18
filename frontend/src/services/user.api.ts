import { apiClient } from "../lib/apiClient";

export interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  avatarBase64?: string;
  aiPreferences?: {
    tone?: string;
    autoTagging?: boolean;
    deepExtraction?: boolean;
  };
  google?: {
    connected?: boolean;
    email?: string;
  };
  subscriptionPlan?: string;
  subscriptionPeriodEnd?: string | null;
  aiCreditsRemaining?: number;
  billingCycleEnd?: string | null;
}

export const getMe = async (): Promise<UserProfile> => {
  const res = await apiClient.get<UserProfile>('/api/v1/me');
  return res.data;
};

export const updateMe = async (data: Partial<UserProfile>): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.put<{ success: boolean; message: string }>('/api/v1/me', data);
  return res.data;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.post<{ success: boolean; message: string }>('/api/v1/user/password', {
    currentPassword,
    newPassword,
  });
  return res.data;
};

export const deleteAccount = async (): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete<{ success: boolean; message: string }>('/api/v1/user/account');
  return res.data;
};

