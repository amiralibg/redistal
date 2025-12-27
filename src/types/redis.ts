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

export interface StoredConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
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

export interface ScanResult {
  keys: string[];
  cursor: number;
  has_more: boolean;
}

export type RedisDataType =
  | "string"
  | "list"
  | "set"
  | "zset"
  | "hash"
  | "stream"
  | "none";

export interface PaginatedListResult {
  items: string[];
  total_count: number;
  has_more: boolean;
}

export interface PaginatedSetResult {
  members: string[];
  cursor: number;
  has_more: boolean;
}

export interface PaginatedZSetResult {
  items: [string, number][];
  total_count: number;
  has_more: boolean;
}

export interface PaginatedHashResult {
  fields: Record<string, string>;
  cursor: number;
  has_more: boolean;
}

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface StreamRangeResult {
  entries: StreamEntry[];
  count: number;
}
