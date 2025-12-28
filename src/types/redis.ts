export interface SshTunnelConfig {
  enabled: boolean;
  ssh_host: string;
  ssh_port: number;
  ssh_username: string;
  auth_method: "password" | "private_key";
  ssh_password?: string;
  ssh_private_key_path?: string;
  ssh_passphrase?: string;
  local_port?: number;
}

export interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
  use_tls: boolean;
  ssh_tunnel?: SshTunnelConfig;
}

export interface StoredConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  database: number;
  use_tls: boolean;
  ssh_tunnel?: SshTunnelConfig;
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
  encoding?: string;
  refcount?: number;
  memory_usage?: number;
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

// Monitoring Types
export interface ServerInfo {
  version: string;
  uptime_seconds: number;
  connected_clients: number;
  used_memory: number;
  used_memory_human: string;
  total_commands_processed: number;
  ops_per_sec: number;
  keyspace_hits: number;
  keyspace_misses: number;
  total_keys: number;
}

export interface ClientInfo {
  id: string;
  addr: string;
  name: string;
  age: number;
  idle: number;
  db: number;
  cmd: string;
}

export interface SlowLogEntry {
  id: number;
  timestamp: number;
  duration: number;
  command: string[];
}

export interface CommandStat {
  name: string;
  calls: number;
  usec: number;
  usec_per_call: number;
}
