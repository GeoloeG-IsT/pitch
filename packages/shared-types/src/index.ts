export interface HealthResponse {
  status: 'healthy' | 'degraded';
  frontend: 'ok';
  backend: 'ok' | 'degraded' | 'unreachable';
  database: 'ok' | 'unreachable';
  timestamp: string;
}

export interface ApiHealthResponse {
  status: 'ok';
  service: string;
  version: string;
  database?: 'ok' | 'unreachable';
}
