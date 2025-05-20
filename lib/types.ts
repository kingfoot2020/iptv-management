export interface IPTVStream {
  id: string;
  name: string;
  key: string;
  link1: string;  // Input stream URL
  rtmp: string;   // RTMP URL base (without key)
  category1: string;
  bitrate: string;
  resolution: string;
  active: boolean;
  pid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StreamHealth {
  healthy: number;
  warning: number;
  error: number;
  unknown: number;
}

export interface StreamStats {
  total: number;
  active: number;
  inactive: number;
  health: StreamHealth;
}

export interface SystemStats {
  cpu: string; // CPU usage as percentage
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  uptime: string;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface CategoryStats {
  name: string;
  total: number;
  active: number;
}

export interface StreamFormData {
  name: string;
  key: string;
  link1: string;
  rtmp: string;
  category1: string;
  bitrate: string;
  resolution: string;
} 