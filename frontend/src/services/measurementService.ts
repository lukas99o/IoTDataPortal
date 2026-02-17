import api from './api';
import type { Measurement, CreateMeasurement } from '../types';

export const measurementService = {
  getByDevice: async (
    deviceId: string,
    from?: string,
    to?: string
  ): Promise<Measurement[]> => {
    const params = new URLSearchParams({ deviceId });
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get<Measurement[]>(`/measurements?${params}`);
    return response.data;
  },

  create: async (data: CreateMeasurement): Promise<Measurement> => {
    const response = await api.post<Measurement>('/measurements', data);
    return response.data;
  },

  simulate: async (deviceId: string, count: number = 1): Promise<Measurement[]> => {
    const response = await api.post<Measurement[]>(
      `/simulator/generate?deviceId=${deviceId}&count=${count}`
    );
    return response.data;
  },

  generateHistorical: async (deviceId: string, days: number = 7): Promise<void> => {
    await api.post(`/simulator/generate-historical?deviceId=${deviceId}&days=${days}`);
  },
};
