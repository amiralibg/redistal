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
  StreamRangeResult,
  ServerInfo,
  ClientInfo,
  SlowLogEntry,
  CommandStat,
  PubSubStats,
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
    keyTypeFilter?: string,
    useCache = true,
  ): Promise<string[]> {
    const cacheKey = cacheKeys.keys(
      connectionId,
      `${pattern}:${keyTypeFilter || "all"}`,
    );

    // Check cache first
    if (useCache) {
      const cached = cache.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const keys = await invoke<string[]>("get_keys", {
      connectionId,
      pattern,
      keyTypeFilter:
        keyTypeFilter && keyTypeFilter !== "all" ? keyTypeFilter : null,
    });

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

  async getSshPassword(connectionId: string): Promise<string | null> {
    return invoke("get_ssh_password", { connectionId });
  },

  async getSshPassphrase(connectionId: string): Promise<string | null> {
    return invoke("get_ssh_passphrase", { connectionId });
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

  // Collection editing operations

  // Hash operations
  async hashSetField(
    connectionId: string,
    key: string,
    field: string,
    value: string,
  ): Promise<void> {
    await invoke("hash_set_field", { connectionId, key, field, value });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async hashDeleteField(
    connectionId: string,
    key: string,
    field: string,
  ): Promise<void> {
    await invoke("hash_delete_field", { connectionId, key, field });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  // List operations
  async listPush(
    connectionId: string,
    key: string,
    value: string,
    side: "left" | "right",
  ): Promise<void> {
    await invoke("list_push", { connectionId, key, value, side });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async listPop(
    connectionId: string,
    key: string,
    side: "left" | "right",
  ): Promise<string | null> {
    const result = await invoke<string | null>("list_pop", {
      connectionId,
      key,
      side,
    });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
    return result;
  },

  async listSetIndex(
    connectionId: string,
    key: string,
    index: number,
    value: string,
  ): Promise<void> {
    await invoke("list_set_index", { connectionId, key, index, value });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
  },

  async listRemove(
    connectionId: string,
    key: string,
    count: number,
    value: string,
  ): Promise<void> {
    await invoke("list_remove", { connectionId, key, count, value });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  // Set operations
  async setAddMember(
    connectionId: string,
    key: string,
    member: string,
  ): Promise<void> {
    await invoke("set_add_member", { connectionId, key, member });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async setRemoveMember(
    connectionId: string,
    key: string,
    member: string,
  ): Promise<void> {
    await invoke("set_remove_member", { connectionId, key, member });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  // ZSet operations
  async zsetAddMember(
    connectionId: string,
    key: string,
    member: string,
    score: number,
  ): Promise<void> {
    await invoke("zset_add_member", { connectionId, key, member, score });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async zsetRemoveMember(
    connectionId: string,
    key: string,
    member: string,
  ): Promise<void> {
    await invoke("zset_remove_member", { connectionId, key, member });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async zsetIncrementScore(
    connectionId: string,
    key: string,
    member: string,
    increment: number,
  ): Promise<number> {
    const newScore = await invoke<number>("zset_increment_score", {
      connectionId,
      key,
      member,
      increment,
    });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    return newScore;
  },

  // Stream operations
  async streamAddEntry(
    connectionId: string,
    key: string,
    fields: Record<string, string>,
  ): Promise<string> {
    const entryId = await invoke<string>("stream_add_entry", {
      connectionId,
      key,
      fields,
    });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
    return entryId;
  },

  async streamDeleteEntry(
    connectionId: string,
    key: string,
    entryId: string,
  ): Promise<void> {
    await invoke("stream_delete_entry", { connectionId, key, entryId });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
  },

  async streamGetRange(
    connectionId: string,
    key: string,
    start: string,
    end: string,
    count?: number,
  ): Promise<StreamRangeResult> {
    return invoke("stream_get_range", {
      connectionId,
      key,
      start,
      end,
      count,
    });
  },

  async streamTrim(
    connectionId: string,
    key: string,
    strategy: "MAXLEN" | "MINID",
    threshold: string,
    approximate: boolean,
  ): Promise<number> {
    const removed = await invoke<number>("stream_trim", {
      connectionId,
      key,
      strategy,
      threshold,
      approximate,
    });
    // Invalidate cache
    cache.delete(cacheKeys.value(connectionId, key));
    cache.delete(cacheKeys.keyInfo(connectionId, key));
    return removed;
  },

  // Monitoring APIs
  async getServerInfo(connectionId: string): Promise<ServerInfo> {
    return invoke("get_server_info", { connectionId });
  },

  async getClientList(connectionId: string): Promise<ClientInfo[]> {
    return invoke("get_client_list", { connectionId });
  },

  async getSlowLog(
    connectionId: string,
    count: number = 128,
  ): Promise<SlowLogEntry[]> {
    return invoke("get_slow_log", { connectionId, count });
  },

  async getCommandStats(connectionId: string): Promise<CommandStat[]> {
    return invoke("get_command_stats", { connectionId });
  },

  async getPubSubStats(connectionId: string): Promise<PubSubStats> {
    return invoke("get_pubsub_stats", { connectionId });
  },
};
