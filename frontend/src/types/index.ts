export interface AuthResponse {
  token: string;
  email: string;
  expiration: string;
}

export interface RegisterResponse {
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface Device {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
}

export interface CreateDevice {
  name: string;
  location?: string;
}

export interface Measurement {
  id: string;
  deviceId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  energyUsage: number;
}

export interface CreateMeasurement {
  deviceId: string;
  temperature: number;
  humidity: number;
  energyUsage: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
}
