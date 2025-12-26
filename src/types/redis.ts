export interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
  use_tls: boolean;
}

export interface ConnectionStatus {
  id: string;
  connected: boolean;
  error?: string;
}

export interface RedisKey {
  name: string;
  key_type: string;
  ttl: number;
  size?: number;
}

export interface RedisValue {
  value: string;
  key_type: string;
}

export type RedisDataType = 'string' | 'list' | 'set' | 'zset' | 'hash' | 'stream' | 'none';
