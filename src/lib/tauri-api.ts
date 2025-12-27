import { invoke } from "@tauri-apps/api/core";
import {
  ConnectionConfig,
  ConnectionStatus,
  RedisKey,
  RedisValue,
  StoredConnection,
  ScanResult,
  PaginatedListResult,
  PaginatedSetResult,
  PaginatedZSetResult,
  PaginatedHashResult,
} from "../types/redis";
import { cache, cacheKeys } from "./cache";

export const redisApi = {
  async connect(config: ConnectionConfig): Promise<ConnectionStatus> {
    const result = await invoke<ConnectionStatus>("connect_to_redis", {
      config,
    });
    // Clear cache for this connection on connect
    cache.clearPattern(`*${config.id}*`);
    return result;
  },

  async disconnect(connectionId: string): Promise<boolean> {
    const result = await invoke<boolean>("disconnect_from_redis", {
      connectionId,
    });
    // Clear cache for this connection on disconnect
    cache.clearPattern(`*${connectionId}*`);
    return result;
  },

  async getKeys(
    connectionId: string,
    pattern: string,
    useCache = true,
  ): Promise<string[]> {
    const cacheKey = cacheKeys.keys(connectionId, pattern);

    // Check cache first
    if (useCache) {
      const cached = cache.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const keys = await invoke<string[]>("get_keys", { connectionId, pattern });

    // Cache for 30 seconds
    cache.set(cacheKey, keys, 30000);

    return keys;
  },

  async scanKeys(
    connectionId: string,
    pattern: string,
    cursor: number,
    count: number,
  ): Promise<ScanResult> {
    return invoke("scan_keys", { connectionId, pattern, cursor, count });
  },

  async getKeyInfo(
    connectionId: string,
    key: string,
    useCache = true,
  ): Promise<RedisKey> {
    const cacheKey = cacheKeys.keyInfo(connectionId, key);

    if (useCache) {
      const cached = cache.get<RedisKey>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const keyInfo = await invoke<RedisKey>("get_key_info", {
      connectionId,
      key,
    });

    // Cache for 10 seconds (shorter TTL since key info can change)
    cache.set(cacheKey, keyInfo, 10000);

    return keyInfo;
  },

  async getValue(
    connectionId: string,
    key: string,
    useCache = true,
  ): Promise<RedisValue> {
    const cacheKey = cacheKeys.value(connectionId, key);

    if (useCache) {
      const cached = cache.get<RedisValue>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const value = await invoke<RedisValue>("get_value", { connectionId, key });

    // Cache for 10 seconds
    cache.set(cacheKey, value, 10000);

    return value;
  },

  async setValue(
    connectionId: string,
    key: string,
    value: string,
  ): Promise<void> {
    await invoke("set_value", { connectionId, key, value });

    // Invalidate cache for this key
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async deleteKey(connectionId: string, key: string): Promise<void> {
    await invoke("delete_key", { connectionId, key });

    // Invalidate cache for this key and the keys list
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
    cache.clearPattern(cacheKeys.keys(connectionId, "*"));
  },

  async setTtl(connectionId: string, key: string, ttl: number): Promise<void> {
    await invoke("set_ttl", { connectionId, key, ttl });

    // Invalidate cache for this key
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async executeCommand(connectionId: string, command: string): Promise<string> {
    return invoke("execute_command", { connectionId, command });
  },

  // Connection Management
  async saveConnection(connection: ConnectionConfig): Promise<void> {
    return invoke("save_connection", { connection });
  },

  async loadConnections(): Promise<StoredConnection[]> {
    return invoke("load_connections");
  },

  async deleteSavedConnection(connectionId: string): Promise<boolean> {
    return invoke("delete_saved_connection", { connectionId });
  },

  async getConnectionPassword(connectionId: string): Promise<string | null> {
    return invoke("get_connection_password", { connectionId });
  },

  async testConnection(config: ConnectionConfig): Promise<ConnectionStatus> {
    return invoke("test_connection", { config });
  },

  async getKeyMemoryUsage(
    connectionId: string,
    key: string,
  ): Promise<number | null> {
    return invoke("get_key_memory_usage", { connectionId, key });
  },

  // Paginated collection fetching
  async getListRange(
    connectionId: string,
    key: string,
    start: number,
    count: number,
  ): Promise<PaginatedListResult> {
    return invoke("get_list_range", { connectionId, key, start, count });
  },

  async getSetMembers(
    connectionId: string,
    key: string,
    cursor: number,
    count: number,
  ): Promise<PaginatedSetResult> {
    return invoke("get_set_members", { connectionId, key, cursor, count });
  },

  async getZSetRange(
    connectionId: string,
    key: string,
    start: number,
    count: number,
  ): Promise<PaginatedZSetResult> {
    return invoke("get_zset_range", { connectionId, key, start, count });
  },

  async getHashFields(
    connectionId: string,
    key: string,
    cursor: number,
    count: number,
  ): Promise<PaginatedHashResult> {
    return invoke("get_hash_fields", { connectionId, key, cursor, count });
  },
};
