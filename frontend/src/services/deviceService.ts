import api from './api';
import type { Device, CreateDevice } from '../types';

export const deviceService = {
  getAll: async (): Promise<Device[]> => {
    const response = await api.get<Device[]>('/devices');
    return response.data;
  },

  getById: async (id: string): Promise<Device> => {
    const response = await api.get<Device>(`/devices/${id}`);
    return response.data;
  },

  create: async (data: CreateDevice): Promise<Device> => {
    const response = await api.post<Device>('/devices', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/devices/${id}`);
  },
};
