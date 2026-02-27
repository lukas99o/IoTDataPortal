import api from './api';
import type { AuthResponse, MessageResponse, RegisterResponse } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailData {
  userId: string;
  token: string;
}

export interface ResendVerificationEmailData {
  email: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/reset-password', data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailData): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/verify-email', data);
    return response.data;
  },

  resendVerificationEmail: async (data: ResendVerificationEmailData): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/resend-verification-email', data);
    return response.data;
  },

  wakeUp: async (): Promise<void> => {
    await api.get('/auth/wake-up');
  },
};
