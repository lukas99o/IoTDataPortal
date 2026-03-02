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
  metricType: string;
  value: number;
  unit?: string;
}

export interface MetricValueInput {
  metricType: string;
  value: number;
  unit?: string;
}

export interface CreateMeasurement {
  deviceId: string;
  measurements: MetricValueInput[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
}
